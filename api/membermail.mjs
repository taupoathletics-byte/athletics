// Vercel serverless function — "Email Members" in the admin portal (Resend).
//
// ADMIN ONLY. Compose an announcement or newsletter (plain text, or HTML pasted
// from elsewhere) and send it to everyone, to built-in audiences (e.g. Get Set
// Go families), to groups, or to hand-picked members. Members who share an
// email address (siblings) get ONE copy, and every email goes to one address
// only, so nobody sees anyone else's address.
//
// Groups are tags: a "Groups" multi-select on the Members database (added the
// first time a group is saved), so they're visible and filterable in Notion
// too. Tagging only ever adds or removes group names in that one field — no
// other member details are written.
//
//   GET                                       → members (email masked), groups,
//                                               audience counts, sender settings
//   POST { action: 'tag', group, add, remove } → add/remove members to a group
//   POST { action: 'rename-group', from, to }
//   POST { action: 'delete-group', group }
//   POST { action: 'count', audience }         → number of addresses
//   POST { action: 'test', to, subject, format, body }
//   POST { action: 'send', campaignId, subject, format, body, audience, offset }
//        → sends the next 100 addresses from `offset`; the page repeats it.
//          The same campaignId + offset can never send twice (Resend
//          idempotency key), so a retry after a network blip is safe.
//
// Each campaign is logged in the Notion "Member emails" database (subject,
// audience, count, when) — no addresses.
import { requireAdmin } from './_guard.mjs';
import { EMAIL_RE, MEMBERS_DB, ensureDb, mailSettings, mask, notReady, notion, plain, queryAll, readBody, resend, send } from './_mail.mjs';

export const config = { maxDuration: 60 };

const GROUPS = 'Groups';
const BATCH = 100; // Resend's batch endpoint limit
const MAX_BODY = 400_000; // pasted newsletter HTML can be large

/** Built-in audiences, by Notion "Member Type". */
export const AUDIENCES = {
  everyone: { label: 'All members', match: () => true },
  athletes: { label: 'All athlete families', match: (t) => t.startsWith('Active') },
  getsetgo: { label: 'Get Set Go families (3–6 yrs)', match: (t) => /6 Years and Under/i.test(t) },
  juniors: { label: 'Club night families (7–14 yrs)', match: (t) => /7 to 14/i.test(t) },
  seniors: { label: 'Competitive athletes (15+)', match: (t) => /Competitive/i.test(t) },
  helpers: { label: 'Volunteers & committee', match: (t) => /Volunteer|Committee/i.test(t) },
};

export function toMember(page) {
  const p = page.properties || {};
  const name = plain(p.Name?.title);
  return {
    id: page.id,
    name,
    first: plain(p['First Name']?.rich_text) || name.split(/\s+/)[0] || '',
    last: plain(p['Last Name']?.rich_text) || name.split(/\s+/).slice(1).join(' '),
    type: plain(p['Member Type']?.rich_text),
    ageGroup: p['Age Group']?.select?.name || '',
    email: plain(p.Email?.rich_text).toLowerCase(),
    groups: (p[GROUPS]?.multi_select || []).map((o) => o.name),
  };
}

/** Unique, valid addresses for an audience, in a stable order (so offsets resume correctly). */
export function recipients(members, audience = {}) {
  const types = new Set(audience.types || []);
  const groups = new Set(audience.groups || []);
  const ids = new Set(audience.members || []);
  const picked = members.filter((m) =>
    [...types].some((t) => AUDIENCES[t]?.match(m.type)) ||
    m.groups.some((g) => groups.has(g)) ||
    ids.has(m.id));
  return [...new Set(picked.map((m) => m.email).filter((e) => EMAIL_RE.test(e)))].sort();
}

function audienceLabel(audience = {}) {
  const parts = [
    ...(audience.types || []).map((t) => AUDIENCES[t]?.label).filter(Boolean),
    ...(audience.groups || []).map((g) => `Group: ${g}`),
  ];
  if ((audience.members || []).length) parts.push(`${audience.members.length} chosen member${audience.members.length === 1 ? '' : 's'}`);
  return parts.join(' · ') || '—';
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Plain text → simple HTML: paragraphs, line breaks, clickable links. */
function textToHtml(text) {
  return String(text).trim().split(/\n{2,}/).map((para) => {
    const html = esc(para).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:#b04f49">${u}</a>`).replace(/\n/g, '<br>');
    return `<p style="margin:0 0 16px;line-height:1.5">${html}</p>`;
  }).join('\n');
}

/** HTML → readable plain text for the text/plain part. */
export function htmlToText(html) {
  return String(html)
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `${label.replace(/<[^>]+>/g, '')} (${href})`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const FOOTER_TEXT = 'You’re receiving this because you’re a member of Taupō Athletics Club. Questions? Just reply to this email.';
const footerHtml = () => `<p style="margin:24px 0 0;font-size:12px;color:#55606e;font-family:Arial,Helvetica,sans-serif">${esc(FOOTER_TEXT)}</p>`;

/**
 * The email. `format` 'text' wraps the message in the club layout; 'html'
 * sends pasted HTML as written (a full document keeps its own layout) with the
 * club footer added.
 */
export function compose({ subject, format, body }) {
  const isHtml = format === 'html';
  const inner = isHtml ? String(body) : textToHtml(body);
  let html;
  if (isHtml && /<html[\s>]|<body[\s>]/i.test(inner)) {
    html = /<\/body>/i.test(inner) ? inner.replace(/<\/body>/i, `${footerHtml()}</body>`) : inner + footerHtml();
  } else {
    html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f3ee;font-family:Arial,Helvetica,sans-serif;color:#0e2a47">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<p style="margin:0 0 20px;font-weight:bold;color:#b04f49;letter-spacing:1px;text-transform:uppercase;font-size:13px">Taupō Athletics</p>
${inner}
${footerHtml()}
</div></body></html>`;
  }
  const text = `${isHtml ? htmlToText(body) : String(body).trim()}\n\n—\n${FOOTER_TEXT}`;
  return { subject: String(subject).trim(), html, text };
}

function checkMessage(b) {
  if (b.__tooLarge) return 'That email is too large to send (keep it under about 400 KB — host big images online and link them).';
  if (!String(b.subject || '').trim()) return 'Add a subject.';
  if (String(b.subject).length > 200) return 'Keep the subject under 200 characters.';
  if (!String(b.body || '').trim()) return 'Write a message (or paste the HTML).';
  if (!['text', 'html'].includes(b.format)) return 'Choose plain text or HTML.';
  return '';
}

/** Make sure the Members database has the "Groups" multi-select (added once). */
async function ensureGroupsProperty() {
  const db = await notion('GET', `/databases/${MEMBERS_DB}`);
  if (db.properties?.[GROUPS]) return;
  await notion('PATCH', `/databases/${MEMBERS_DB}`, { properties: { [GROUPS]: { multi_select: {} } } });
}

const cleanGroup = (g) => String(g || '').replace(/[,\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

async function setGroups(memberId, groups) {
  await notion('PATCH', `/pages/${memberId}`, { properties: { [GROUPS]: { multi_select: [...new Set(groups)].map((name) => ({ name })) } } });
}

const logDbId = () => ensureDb('Member emails', {
  Subject: { title: {} },
  Audience: { rich_text: {} },
  Recipients: { number: {} },
  Format: { rich_text: {} },
  Sent: { date: {} },
}, process.env.MEMBER_EMAIL_LOG_DB_ID);

export default async function handler(req, res) {
  if (!process.env.NOTION_TOKEN) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  if (!requireAdmin(req, res)) return;
  const cfg = mailSettings(req);

  try {
    const members = (await queryAll(MEMBERS_DB)).map(toMember).filter((m) => m.name);

    if (req.method === 'GET') {
      const groupCounts = {};
      for (const m of members) for (const g of m.groups) groupCounts[g] = (groupCounts[g] || 0) + 1;
      return send(res, 200, {
        ready: cfg.ready,
        from: cfg.from,
        replyTo: cfg.replyTo,
        members: members
          .map(({ email, ...m }) => ({ ...m, email: email ? mask(email) : '', hasEmail: EMAIL_RE.test(email) }))
          .sort((a, b) => (a.last || a.name).localeCompare(b.last || b.name, 'en-NZ') || a.first.localeCompare(b.first, 'en-NZ')),
        groups: Object.entries(groupCounts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'en-NZ')),
        audiences: Object.entries(AUDIENCES).map(([key, a]) => ({ key, label: a.label, count: recipients(members, { types: [key] }).length })),
      });
    }

    const body = await readBody(req, MAX_BODY);
    const byId = new Map(members.map((m) => [m.id, m]));

    if (body.action === 'tag') {
      const group = cleanGroup(body.group);
      if (!group) return send(res, 400, { error: 'Give the group a name.' });
      const add = (body.add || []).filter((id) => byId.has(id));
      const remove = (body.remove || []).filter((id) => byId.has(id));
      if (add.length + remove.length > 300) return send(res, 400, { error: 'Change at most 300 members at a time.' });
      await ensureGroupsProperty();
      let changed = 0;
      for (const id of add) {
        const m = byId.get(id);
        if (!m.groups.includes(group)) { await setGroups(id, [...m.groups, group]); changed++; }
      }
      for (const id of remove) {
        const m = byId.get(id);
        if (m.groups.includes(group)) { await setGroups(id, m.groups.filter((g) => g !== group)); changed++; }
      }
      return send(res, 200, { ok: true, changed });
    }

    if (body.action === 'rename-group' || body.action === 'delete-group') {
      const from = cleanGroup(body.action === 'rename-group' ? body.from : body.group);
      const to = body.action === 'rename-group' ? cleanGroup(body.to) : '';
      if (!from || (body.action === 'rename-group' && !to)) return send(res, 400, { error: 'Give the group name.' });
      const inGroup = members.filter((m) => m.groups.includes(from));
      for (const m of inGroup) await setGroups(m.id, m.groups.filter((g) => g !== from).concat(to ? [to] : []));
      return send(res, 200, { ok: true, changed: inGroup.length });
    }

    if (body.action === 'count') return send(res, 200, { recipients: recipients(members, body.audience).length });

    if (body.action === 'test' || body.action === 'send') {
      const problem = checkMessage(body);
      if (problem) return send(res, 400, { error: problem });
      if (!cfg.ready) return send(res, 400, { error: notReady });
      const mail = compose(body);

      if (body.action === 'test') {
        const to = String(body.to || '').trim();
        if (!EMAIL_RE.test(to)) return send(res, 400, { error: 'Enter one email address for the test.' });
        await resend('/emails', { from: cfg.from, to: [to], reply_to: cfg.replyTo, ...mail, subject: `[TEST] ${mail.subject}` });
        return send(res, 200, { ok: true });
      }

      const campaignId = String(body.campaignId || '');
      if (!/^[A-Za-z0-9-]{8,64}$/.test(campaignId)) return send(res, 400, { error: 'Missing campaign id.' });
      const all = recipients(members, body.audience);
      const offset = Math.max(0, Number(body.offset) || 0);
      const chunk = all.slice(offset, offset + BATCH);
      if (!chunk.length) return send(res, 200, { ok: true, sent: 0, total: all.length, next: offset });
      if (offset === 0) {
        await notion('POST', '/pages', {
          parent: { database_id: await logDbId() },
          properties: {
            Subject: { title: [{ type: 'text', text: { content: mail.subject.slice(0, 200) } }] },
            Audience: { rich_text: [{ type: 'text', text: { content: audienceLabel(body.audience).slice(0, 1900) } }] },
            Recipients: { number: all.length },
            Format: { rich_text: [{ type: 'text', text: { content: body.format === 'html' ? 'HTML' : 'Plain text' } }] },
            Sent: { date: { start: new Date().toISOString() } },
          },
        });
      }
      await resend('/emails/batch', chunk.map((to) => ({ from: cfg.from, to: [to], reply_to: cfg.replyTo, ...mail })), `member-mail-${campaignId}-${offset}`);
      return send(res, 200, { ok: true, sent: chunk.length, total: all.length, next: offset + chunk.length });
    }

    return send(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
