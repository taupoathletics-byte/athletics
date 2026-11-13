// Club-night notice (e.g. a weather cancellation).
//
//   GET                                   → public: today's notice, or none.
//                                           Cached at the edge for a minute.
//   POST { action: 'set', date, message } → admin: post a cancellation for a
//                                           club night (defaults to today)
//   POST { action: 'clear', date }        → admin: take it down
//
// Notices live in a Notion "Site notices" database (date + message), so the
// committee can also see or fix them there. A notice shows on the website from
// when it's posted until the end of its night (NZ time) and then disappears.
import { requireAdmin } from './_guard.mjs';
import { ensureDb, notion, plain, queryAll, readBody, send } from './_mail.mjs';

export const config = { maxDuration: 30 };

const nzToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const dbId = () => ensureDb('Site notices', {
  Message: { title: {} },
  Date: { date: {} },
  Type: { rich_text: {} },
}, process.env.NOTICE_DB_ID);

async function noticesFor(date) {
  const rows = await queryAll(await dbId());
  return rows
    .filter((r) => !r.archived && r.properties?.Date?.date?.start === date)
    .map((r) => ({ id: r.id, date, message: plain(r.properties.Message?.title), type: plain(r.properties.Type?.rich_text) || 'cancelled' }));
}

export default async function handler(req, res) {
  if (!process.env.NOTION_TOKEN) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'https://example.org');
      // Admins may look ahead to another date; the public only ever gets today.
      const date = url.searchParams.get('date');
      if (date && date !== nzToday()) {
        if (!requireAdmin(req, res)) return;
        if (!ISO.test(date)) return send(res, 400, { error: 'Bad date.' });
        return send(res, 200, { notice: (await noticesFor(date))[0] || null });
      }
      const notice = (await noticesFor(nzToday()))[0] || null;
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ notice: notice && { date: notice.date, message: notice.message, type: notice.type } }));
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req, 5000);
    const date = body.date || nzToday();
    if (!ISO.test(date)) return send(res, 400, { error: 'Bad date.' });
    const existing = await noticesFor(date);
    for (const n of existing) await notion('PATCH', `/pages/${n.id}`, { archived: true });
    if (body.action === 'clear') return send(res, 200, { ok: true, cleared: existing.length });
    if (body.action !== 'set') return send(res, 400, { error: 'Unknown action.' });
    const message = String(body.message || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!message) return send(res, 400, { error: 'Write the message for the website banner.' });
    await notion('POST', '/pages', {
      parent: { database_id: await dbId() },
      properties: {
        Message: { title: [{ type: 'text', text: { content: message } }] },
        Date: { date: { start: date } },
        Type: { rich_text: [{ type: 'text', text: { content: 'cancelled' } }] },
      },
    });
    return send(res, 200, { ok: true, date, message });
  } catch (e) {
    console.error('notice', e);
    return send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}
