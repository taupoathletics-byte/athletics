// Vercel serverless function — email each FAMILY their access code (Resend).
//
// ADMIN ONLY. Families are the members who share a registration email (that is
// how access codes are issued — scripts/notion_access_codes.mjs), so siblings
// get ONE email listing all of them, with their one code and a link straight to
// their results.
//
//   GET                              → preview: counts + one sample email (no
//                                      addresses or codes leave the server)
//   POST { action: 'test', to }      → one sample email (placeholder child and
//                                      code) to an address the admin chooses
//   POST { action: 'send', max }     → the next `max` (≤ 50) families not yet
//                                      emailed; the admin page repeats it
//
// Every family emailed is logged in a Notion database ("Access code emails")
// as a hash of email + code, so pressing Send again — or the next day, to stay
// under a daily sending limit — only reaches families still waiting. Member
// records are only read, never written.
//
// Config: RESEND_API_KEY, EMAIL_FROM (an address on a domain verified in
// Resend, e.g. "Taupō Athletics <results@mail.taupoathletics.org.nz>"),
// optional EMAIL_REPLY_TO (default taupoathletics@gmail.com), SITE_URL
// (default: this deployment), FAMILY_EMAIL_LOG_DB_ID (else found or created
// under ATHLETICS_PAGE_ID by title).
import { createHash } from 'node:crypto';
import { requireAdmin } from './_guard.mjs';

export const config = { maxDuration: 60 };

const NOTION = process.env.NOTION_TOKEN;
const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const ATHLETICS_PAGE = process.env.ATHLETICS_PAGE_ID || '3e20d85f-784c-819c-a575-f22bfb38c49b';
const LOG_TITLE = 'Access code emails';
const RESEND = 'https://api.resend.com';
/**
 * Families per request. Resend's batch endpoint takes up to 100, but each one
 * also gets a Notion log row (~3 writes a second), so 50 keeps a request well
 * inside the 60-second limit. The admin page repeats the call for more.
 */
const PER_REQUEST = 50;

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${NOTION}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${String(json.message || text).slice(0, 200)}`);
  return json;
}

async function queryAll(dbId) {
  const out = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const r = await notion('POST', `/databases/${dbId}/query`, body);
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

const plain = (arr) => (arr || []).map((t) => t.plain_text).join('').trim();

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 10_000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
  });
}

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** Stable key for "this family has been sent this code" — no address stored. */
export const familyKey = (email, code) => createHash('sha256').update(`${email}|${code}`).digest('hex').slice(0, 32);

/**
 * Group members into families by registration email. Only athletes ("Active …"
 * member types) are listed — volunteers and committee members have no results.
 */
export function families(memberPages) {
  const byEmail = new Map();
  const skipped = { noEmail: 0, badEmail: 0, noCode: 0, mixedCodes: 0 };
  for (const page of memberPages) {
    const p = page.properties || {};
    if (!plain(p['Member Type']?.rich_text).startsWith('Active')) continue;
    const email = plain(p.Email?.rich_text).toLowerCase();
    const code = plain(p['Access code']?.rich_text).toUpperCase();
    const name = plain(p.Name?.title);
    const first = plain(p['First Name']?.rich_text) || name.split(/\s+/)[0] || name;
    if (!email) { skipped.noEmail++; continue; }
    if (!EMAIL_RE.test(email)) { skipped.badEmail++; continue; }
    if (!code) { skipped.noCode++; continue; }
    if (!byEmail.has(email)) byEmail.set(email, { email, codes: new Set(), children: [] });
    const f = byEmail.get(email);
    f.codes.add(code);
    f.children.push(first);
  }
  const list = [];
  for (const f of byEmail.values()) {
    // One email must carry one code; a family split across codes needs fixing
    // in Notion first (re-run scripts/notion_access_codes.mjs).
    if (f.codes.size !== 1) { skipped.mixedCodes++; continue; }
    const code = [...f.codes][0];
    list.push({ email: f.email, code, children: [...new Set(f.children)].sort((a, b) => a.localeCompare(b, 'en-NZ')), key: familyKey(f.email, code) });
  }
  list.sort((a, b) => a.email.localeCompare(b.email));
  return { list, skipped };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function namesList(names) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The email itself. The link carries the code after "#", which never reaches a server. */
export function compose({ children, code }, siteUrl, replyTo) {
  const link = `${siteUrl.replace(/\/+$/, '')}/my-results#code=${encodeURIComponent(code)}`;
  const who = namesList(children);
  const spaced = `${code.slice(0, 4)} ${code.slice(4)}`;
  const subject = 'Your Taupō Athletics family access code';
  const text = [
    'Kia ora,',
    '',
    `You can now see ${who}'s club night results on the Taupō Athletics website.`,
    '',
    `Your family access code: ${spaced}`,
    `Open your results: ${link}`,
    '',
    `The code is the same for every child in your family. Please keep it to your family — anyone with it can see ${children.length > 1 ? 'your children’s' : 'your child’s'} results.`,
    '',
    `This is new, so if anything looks wrong or doesn't work, just reply to this email (${replyTo}) and we'll sort it out.`,
    '',
    'Ngā mihi,',
    'Taupō Athletics',
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f3ee;font-family:Arial,Helvetica,sans-serif;color:#0e2a47">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<p style="margin:0 0 16px">Kia ora,</p>
<p style="margin:0 0 16px">You can now see <strong>${esc(who)}</strong>&rsquo;s club night results on the Taupō Athletics website.</p>
<p style="margin:0 0 6px;font-size:14px;color:#55606e">Your family access code</p>
<p style="margin:0 0 20px;font-size:28px;font-weight:bold;letter-spacing:3px;font-family:'Courier New',monospace">${esc(spaced)}</p>
<p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#b04f49;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">View our results</a></p>
<p style="margin:0 0 16px;font-size:14px">The code is the same for every child in your family. Please keep it to your family &mdash; anyone with it can see ${children.length > 1 ? 'your children&rsquo;s' : 'your child&rsquo;s'} results.</p>
<p style="margin:0 0 16px;font-size:14px">This is new, so if anything looks wrong or doesn&rsquo;t work, just reply to this email and we&rsquo;ll sort it out.</p>
<p style="margin:0">Ngā mihi,<br>Taupō Athletics</p>
</div></body></html>`;
  return { subject, text, html };
}

/** "jane.smith@gmail.com" → "j•••@gmail.com" for the preview. */
const mask = (email) => email.replace(/^(.).*(@.*)$/, '$1•••$2');

async function logDbId() {
  if (process.env.FAMILY_EMAIL_LOG_DB_ID) return process.env.FAMILY_EMAIL_LOG_DB_ID;
  const found = await notion('POST', '/search', { query: LOG_TITLE, filter: { property: 'object', value: 'database' } });
  const hit = (found.results || []).find((d) => plain(d.title) === LOG_TITLE && !d.archived);
  if (hit) return hit.id;
  const created = await notion('POST', '/databases', {
    parent: { type: 'page_id', page_id: ATHLETICS_PAGE },
    title: [{ type: 'text', text: { content: LOG_TITLE } }],
    properties: {
      Family: { title: {} },
      Children: { rich_text: {} },
      Sent: { date: {} },
      'Resend id': { rich_text: {} },
    },
  });
  return created.id;
}

async function sentKeys(dbId) {
  return new Set((await queryAll(dbId)).map((p) => plain(p.properties?.Family?.title)).filter(Boolean));
}

async function resend(path, payload, idempotencyKey) {
  const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${RESEND}${path}`, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Resend ${res.status}: ${String(json.message || json.name || text).slice(0, 200)}`);
  return json;
}

function settings(req) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'taupoathletics.vercel.app';
  return {
    from: process.env.EMAIL_FROM || '',
    replyTo: process.env.EMAIL_REPLY_TO || 'taupoathletics@gmail.com',
    siteUrl: process.env.SITE_URL || `https://${host}`,
    ready: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  };
}

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  if (!requireAdmin(req, res)) return;
  const cfg = settings(req);

  try {
    if (req.method === 'GET') {
      const { list, skipped } = families(await queryAll(MEMBERS_DB));
      let done = new Set();
      let logReady = true;
      try { done = await sentKeys(await logDbId()); } catch { logReady = false; }
      const waiting = list.filter((f) => !done.has(f.key));
      const sample = list[0] ? { to: mask(list[0].email), children: list[0].children.length, ...compose(list[0], cfg.siteUrl, cfg.replyTo) } : null;
      return send(res, 200, {
        ready: cfg.ready,
        from: cfg.from,
        replyTo: cfg.replyTo,
        logReady,
        families: list.length,
        children: list.reduce((n, f) => n + f.children.length, 0),
        sent: list.length - waiting.length,
        waiting: waiting.length,
        skipped,
        sample: sample && { to: sample.to, subject: sample.subject, text: sample.text.replace(/[A-Z0-9]{4} [A-Z0-9]{4}/, '•••• ••••').replace(/#code=[A-Z0-9]+/, '#code=••••••••') },
      });
    }

    const body = await readBody(req);
    if (!cfg.ready) return send(res, 400, { error: 'Email is not set up yet: add RESEND_API_KEY and EMAIL_FROM in Vercel (Settings → Environment Variables), then redeploy.' });

    if (body.action === 'test') {
      const to = String(body.to || '').trim();
      if (!EMAIL_RE.test(to)) return send(res, 400, { error: 'Enter one email address for the test.' });
      const mail = compose({ children: ['Test Child', 'Sample Sibling'], code: 'ABCD2345' }, cfg.siteUrl, cfg.replyTo);
      const r = await resend('/emails', { from: cfg.from, to: [to], reply_to: cfg.replyTo, ...mail, subject: `[TEST] ${mail.subject}` });
      return send(res, 200, { ok: true, id: r.id || '' });
    }

    if (body.action === 'send') {
      const max = Math.max(1, Math.min(PER_REQUEST, Number(body.max) || PER_REQUEST));
      const dbId = await logDbId();
      const done = await sentKeys(dbId);
      const { list } = families(await queryAll(MEMBERS_DB));
      const todo = list.filter((f) => !done.has(f.key)).slice(0, max);
      let sent = 0;
      if (todo.length) {
        const chunk = todo;
        const payload = chunk.map((f) => ({ from: cfg.from, to: [f.email], reply_to: cfg.replyTo, ...compose(f, cfg.siteUrl, cfg.replyTo) }));
        // Same families → same key, so a retried request can't send twice.
        const key = createHash('sha256').update(chunk.map((f) => f.key).join(',')).digest('hex').slice(0, 64);
        const r = await resend('/emails/batch', payload, `family-codes-${key}`);
        const ids = (r.data || []).map((x) => x.id || '');
        const now = new Date().toISOString();
        for (let k = 0; k < chunk.length; k++) {
          await notion('POST', '/pages', {
            parent: { database_id: dbId },
            properties: {
              Family: { title: [{ type: 'text', text: { content: chunk[k].key } }] },
              Children: { rich_text: [{ type: 'text', text: { content: chunk[k].children.join(', ') } }] },
              Sent: { date: { start: now } },
              'Resend id': { rich_text: [{ type: 'text', text: { content: ids[k] || '' } }] },
            },
          });
          sent++;
        }
      }
      const waiting = list.filter((f) => !done.has(f.key)).length - sent;
      return send(res, 200, { ok: true, sent, waiting });
    }

    return send(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
