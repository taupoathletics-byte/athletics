// Vercel serverless function — email each family their children's results
// after a measure night (Resend). ADMIN ONLY.
//
//   GET ?date=YYYY-MM-DD        → measure nights on record, and for the chosen
//                                 night (default: the latest): families,
//                                 athletes, already emailed, a masked sample
//   POST { action: 'test', date, to } → the first family's email, sent to an
//                                 admin's own address to check it
//   POST { action: 'send', date, max } → the next `max` (≤ 50) families not
//                                 yet emailed for that night
//
// One email per family (siblings share it), listing each child's marks that
// night, flagging a new club record or a personal best (better than any
// earlier result on record), with the link to My Results. Families already
// emailed for a night are logged in Notion ("Results emails", a hash of email
// + date — no addresses), so Send can be pressed again safely.
import { createHash } from 'node:crypto';
import { requireAdmin } from './_guard.mjs';
import { EMAIL_RE, MEMBERS_DB, ensureDb, mailSettings, mask, notReady, notion, plain, queryAll, readBody, resend, send } from './_mail.mjs';
import { families } from './familyemails.mjs';
import { recordRows } from './records.mjs';
import { RECORD_EVENTS, markValue, newRecordsFor } from './_clubrecords.mjs';

export const config = { maxDuration: 60 };

const PER_REQUEST = 50;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UNIT = Object.fromEntries(RECORD_EVENTS.map((e) => [e.event, e.unit]));
const ORDER = RECORD_EVENTS.map((e) => e.event);

const logDbId = () => ensureDb('Results emails', {
  Family: { title: {} },
  Night: { date: {} },
  Sent: { date: {} },
}, process.env.RESULTS_EMAIL_LOG_DB_ID);

const nightKey = (email, date) => createHash('sha256').update(`results|${email}|${date}`).digest('hex').slice(0, 32);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A result as a parent reads it: "9.8s", "1:17.9", "3.24m", or a note for no mark. */
export function showResult(event, raw) {
  const r = String(raw || '').trim().replace(',', '.');
  if (/^NJ$/i.test(r)) return 'no measured jump this time';
  if (/^NT$/i.test(r)) return 'no measured throw this time';
  if (/^(DNF|DNS)$/i.test(r)) return r.toUpperCase();
  const m = r.match(/^(\d+):(\d{2}):(\d+)$/); // "1:17:9" = 1:17.9
  if (m) return `${Number(m[1])}:${m[2]}.${m[3]}`;
  if (/[a-z]/i.test(r) || r.includes(':')) return r;
  return UNIT[event] === 'time' ? `${r}s` : `${r}m`;
}

const nzDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Each family's lines for one night: { first, lines: [{ event, result, record,
 * pb }] } per child who has a result that night.
 */
export function familyResults(family, rows, date) {
  const recordIds = new Set(newRecordsFor(rows, rows.filter((r) => r.date === date).map((r) => r.id)).map((r) => `${r.event}|${r.name}`));
  const kids = [];
  for (const m of family.members) {
    const mine = rows.filter((r) => String(r.memberId).replace(/-/g, '') === String(m.id).replace(/-/g, ''));
    const tonight = mine.filter((r) => r.date === date).sort((a, b) => ORDER.indexOf(a.event) - ORDER.indexOf(b.event));
    if (!tonight.length) continue;
    const lines = tonight.map((r) => {
      const v = markValue(r.event, r.result);
      const earlier = mine.filter((x) => x.event === r.event && x.date && x.date < date).map((x) => markValue(x.event, x.result)).filter((x) => x != null);
      const best = earlier.length ? (UNIT[r.event] === 'time' ? Math.min(...earlier) : Math.max(...earlier)) : null;
      const pb = v != null && best != null && (UNIT[r.event] === 'time' ? v < best : v > best);
      return { event: r.event, result: showResult(r.event, r.result), record: recordIds.has(`${r.event}|${r.name}`), pb };
    });
    kids.push({ first: m.first, lines });
  }
  return kids;
}

export function compose(kids, family, date, siteUrl) {
  const link = `${siteUrl.replace(/\/+$/, '')}/my-results#code=${encodeURIComponent(family.code)}`;
  const when = nzDate(date);
  const names = kids.map((k) => k.first);
  const who = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const tag = (l) => (l.record ? ' — NEW CLUB RECORD!' : l.pb ? ' — personal best!' : '');
  const subject = `${who}'s results from club night, ${when}`;
  const text = [
    'Kia ora,',
    '',
    `Here are ${who}'s results from our measure night on ${when}.`,
    '',
    ...kids.flatMap((k) => [`${k.first}`, ...k.lines.map((l) => `  ${l.event}: ${l.result}${tag(l)}`), '']),
    `See every result so far: ${link}`,
    '',
    'Results are measured by our volunteers on the night. If something looks wrong, just reply and we’ll check it.',
    '',
    'Ngā mihi,',
    'Taupō Athletics',
  ].join('\n');
  const badge = (l) => (l.record
    ? ' <span style="background:#b04f49;color:#fff;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:bold">New club record!</span>'
    : l.pb ? ' <span style="background:#e7eef6;color:#0e2a47;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:bold">Personal best</span>' : '');
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f3ee;font-family:Arial,Helvetica,sans-serif;color:#0e2a47">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<p style="margin:0 0 20px;font-weight:bold;color:#b04f49;letter-spacing:1px;text-transform:uppercase;font-size:13px">Taupō Athletics</p>
<p style="margin:0 0 16px">Kia ora,</p>
<p style="margin:0 0 20px">Here are <strong>${esc(who)}</strong>&rsquo;s results from our measure night on ${esc(when)}.</p>
${kids.map((k) => `<h2 style="margin:0 0 8px;font-size:18px">${esc(k.first)}</h2>
<table style="width:100%;border-collapse:collapse;margin:0 0 20px">${k.lines.map((l) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(l.event)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right"><strong>${esc(l.result)}</strong>${badge(l)}</td></tr>`).join('')}</table>`).join('\n')}
<p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#b04f49;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">See all results</a></p>
<p style="margin:0 0 16px;font-size:14px">Results are measured by our volunteers on the night. If something looks wrong, just reply and we&rsquo;ll check it.</p>
<p style="margin:0">Ngā mihi,<br>Taupō Athletics</p>
</div></body></html>`;
  return { subject, text, html };
}

export default async function handler(req, res) {
  if (!process.env.NOTION_TOKEN) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  if (!requireAdmin(req, res)) return;
  const cfg = mailSettings(req);
  try {
    const [memberPages, rows] = await Promise.all([queryAll(MEMBERS_DB), recordRows()]);
    const nights = Object.entries(rows.reduce((acc, r) => { if (r.date) acc[r.date] = (acc[r.date] || 0) + 1; return acc; }, {}))
      .map(([date, results]) => ({ date, results }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const body = req.method === 'POST' ? await readBody(req) : {};
    const date = (req.method === 'GET' ? new URL(req.url, 'https://x').searchParams.get('date') : body.date) || nights[0]?.date || '';
    if (date && !ISO.test(date)) return send(res, 400, { error: 'Bad date.' });
    const fams = families(memberPages).list
      .map((f) => ({ ...f, kids: familyResults(f, rows, date) }))
      .filter((f) => f.kids.length);

    if (req.method === 'GET') {
      let done = new Set();
      let logReady = true;
      try { done = new Set((await queryAll(await logDbId())).map((p) => plain(p.properties?.Family?.title))); } catch { logReady = false; }
      const waiting = fams.filter((f) => !done.has(nightKey(f.email, date)));
      const sample = fams[0] ? compose(fams[0].kids, fams[0], date, cfg.siteUrl) : null;
      return send(res, 200, {
        ready: cfg.ready,
        logReady,
        nights,
        date,
        families: fams.length,
        athletes: fams.reduce((n, f) => n + f.kids.length, 0),
        sent: fams.length - waiting.length,
        waiting: waiting.length,
        records: fams.reduce((n, f) => n + f.kids.reduce((m, k) => m + k.lines.filter((l) => l.record).length, 0), 0),
        sample: sample && { to: mask(fams[0].email), subject: sample.subject, text: sample.text.replace(/#code=[A-Z0-9]+/, '#code=••••••••') },
      });
    }

    if (!cfg.ready) return send(res, 400, { error: notReady });
    if (!date) return send(res, 400, { error: 'No measure night chosen.' });

    if (body.action === 'test') {
      const to = String(body.to || '').trim();
      if (!EMAIL_RE.test(to)) return send(res, 400, { error: 'Enter one email address for the test.' });
      if (!fams[0]) return send(res, 400, { error: 'No results for that night.' });
      const mail = compose(fams[0].kids, fams[0], date, cfg.siteUrl);
      await resend('/emails', { from: cfg.from, to: [to], reply_to: cfg.replyTo, ...mail, subject: `[TEST] ${mail.subject}` });
      return send(res, 200, { ok: true });
    }

    if (body.action === 'send') {
      const max = Math.max(1, Math.min(PER_REQUEST, Number(body.max) || PER_REQUEST));
      const db = await logDbId();
      const done = new Set((await queryAll(db)).map((p) => plain(p.properties?.Family?.title)));
      const todo = fams.filter((f) => !done.has(nightKey(f.email, date))).slice(0, max);
      if (todo.length) {
        const key = createHash('sha256').update(todo.map((f) => nightKey(f.email, date)).join(',')).digest('hex').slice(0, 48);
        await resend('/emails/batch', todo.map((f) => ({ from: cfg.from, to: [f.email], reply_to: cfg.replyTo, ...compose(f.kids, f, date, cfg.siteUrl) })), `results-${date}-${key}`);
        const now = new Date().toISOString();
        for (const f of todo) {
          await notion('POST', '/pages', {
            parent: { database_id: db },
            properties: {
              Family: { title: [{ type: 'text', text: { content: nightKey(f.email, date) } }] },
              Night: { date: { start: date } },
              Sent: { date: { start: now } },
            },
          });
        }
      }
      const waiting = fams.filter((f) => !done.has(nightKey(f.email, date))).length - todo.length;
      return send(res, 200, { ok: true, sent: todo.length, waiting });
    }

    return send(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
