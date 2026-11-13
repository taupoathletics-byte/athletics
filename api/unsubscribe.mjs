// Public: unsubscribe an address from club NEWSLETTERS (club notices such as
// cancellations still arrive). Needs the signed link from an email — the
// address and its HMAC token — so nobody can unsubscribe someone else.
//
//   POST /api/unsubscribe { e, t }            → unsubscribe (the page's button)
//   POST /api/unsubscribe?e=…&t=…             → one-click unsubscribe from the
//                                               email app (RFC 8058)
//   POST { e, t, action: 'resubscribe' }      → undo
//
// GET does nothing, so link scanners that open every URL can't unsubscribe anyone.
import { checkUnsubToken, emailHash, mask, notion, optOutDbId, plain, queryAll, readBody, send } from './_mail.mjs';

export const config = { maxDuration: 30 };

function decodeEmail(e) {
  try { return Buffer.from(String(e || ''), 'base64url').toString('utf8').trim().toLowerCase(); } catch { return ''; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  if (!process.env.NOTION_TOKEN) return send(res, 500, { error: 'Not configured.' });
  const url = new URL(req.url, 'https://example.org');
  const body = await readBody(req, 2000);
  const e = (body && body.e) || url.searchParams.get('e');
  const t = (body && body.t) || url.searchParams.get('t');
  const email = decodeEmail(e);
  if (!checkUnsubToken(email, t)) return send(res, 400, { error: 'This unsubscribe link is not valid. Reply to any club email and we will take you off the list.' });
  try {
    const db = await optOutDbId();
    const hash = emailHash(email);
    const rows = (await queryAll(db)).filter((r) => plain(r.properties?.Address?.title) === hash);
    if (body && body.action === 'resubscribe') {
      for (const r of rows) await notion('PATCH', `/pages/${r.id}`, { archived: true });
      return send(res, 200, { ok: true, subscribed: true, email: mask(email) });
    }
    if (!rows.length) {
      await notion('POST', '/pages', {
        parent: { database_id: db },
        properties: { Address: { title: [{ type: 'text', text: { content: hash } }] }, Since: { date: { start: new Date().toISOString() } } },
      });
    }
    return send(res, 200, { ok: true, subscribed: false, email: mask(email) });
  } catch (err) {
    console.error('unsubscribe', err);
    return send(res, 500, { error: 'Something went wrong on our side. Please try again in a moment.' });
  }
}
