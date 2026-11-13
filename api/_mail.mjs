// Shared helpers for the email features (api/familyemails.mjs, api/membermail.mjs).
// Files prefixed with "_" are shared modules, not deployed as functions.

export const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
export const ATHLETICS_PAGE = process.env.ATHLETICS_PAGE_ID || '3e20d85f-784c-819c-a575-f22bfb38c49b';
const RESEND = 'https://api.resend.com';

export async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${String(json.message || text).slice(0, 200)}`);
  return json;
}

export async function queryAll(dbId) {
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

export const plain = (arr) => (arr || []).map((t) => t.plain_text).join('').trim();

export function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export function readBody(req, limit = 10_000) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = '';
    let over = false;
    req.on('data', (c) => { raw += c; if (raw.length > limit) over = true; });
    req.on('end', () => {
      if (over) return resolve({ __tooLarge: true });
      try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
    });
  });
}

export const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** "jane.smith@gmail.com" → "j•••@gmail.com". */
export const mask = (email) => String(email).replace(/^(.).*(@.*)$/, '$1•••$2');

/**
 * A database under the Athletics page, found by exact title or created with
 * `properties` the first time. `envId` (a database id) skips the lookup.
 */
export async function ensureDb(title, properties, envId) {
  if (envId) return envId;
  const found = await notion('POST', '/search', { query: title, filter: { property: 'object', value: 'database' } });
  const hit = (found.results || []).find((d) => plain(d.title) === title && !d.archived);
  if (hit) return hit.id;
  const created = await notion('POST', '/databases', {
    parent: { type: 'page_id', page_id: ATHLETICS_PAGE },
    title: [{ type: 'text', text: { content: title } }],
    properties,
  });
  return created.id;
}

export async function resend(path, payload, idempotencyKey) {
  const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${RESEND}${path}`, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Resend ${res.status}: ${String(json.message || json.name || text).slice(0, 200)}`);
  return json;
}

/** Sender settings from the environment; `ready` once Resend is configured. */
export function mailSettings(req) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'taupoathletics.vercel.app';
  return {
    from: process.env.EMAIL_FROM || '',
    replyTo: process.env.EMAIL_REPLY_TO || 'taupoathletics@gmail.com',
    siteUrl: process.env.SITE_URL || `https://${host}`,
    ready: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  };
}

export const notReady = 'Email is not set up yet: add RESEND_API_KEY and EMAIL_FROM in Vercel (Settings → Environment Variables), then redeploy.';
