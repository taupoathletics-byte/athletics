// Public self check-in for the QR poster.
//
// A member types their FULL NAME and is marked present for the given club night.
// This is deliberately different from the admin check-in:
//   - a GET prefix search returns only the names that match what has already
//     been typed — never the full roster and never ages,
//   - it only ever ADDS a presence mark (idempotent), never removes one,
//   - the POST that actually marks attendance is rate-limited.
export const config = { maxDuration: 60 };

const NOTION = process.env.NOTION_TOKEN;
const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const ATTENDANCE_DB = process.env.ATTENDANCE_DB_ID || '3e30d85f-784c-8176-9c98-f98cad30a39f';

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${NOTION}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${String(json.message || text).slice(0, 200)}`);
  return json;
}

async function queryAll(dbId, filter) {
  const out = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;
    const r = await notion('POST', `/databases/${dbId}/query`, body);
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

const title = (p) => (p.title || []).map((t) => t.plain_text).join('');
const richText = (p) => (p.rich_text || []).map((t) => t.plain_text).join('');

// Cached member list for the prefix search. The QR poster can be hit by many
// people in a short window, so we avoid a fresh Notion query on every keystroke.
let memberCache = null;
let memberCacheAt = 0;
const MEMBER_CACHE_TTL = 5 * 60 * 1000;

async function listMembers() {
  if (memberCache && Date.now() - memberCacheAt < MEMBER_CACHE_TTL) return memberCache;
  const members = await queryAll(MEMBERS_DB);
  memberCache = members.map((m) => ({
    id: m.id,
    name: title(m.properties.Name),
    firstName: richText(m.properties['First Name']) || '',
  }));
  memberCacheAt = Date.now();
  return memberCache;
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } });
    req.on('error', () => resolve({}));
  });
}

const attempts = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 60;

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'POST' && req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });

  // Name suggestions for the QR poster. Read-only (returns only names that
  // match what's already been typed), so it is not subject to the check-in
  // rate limit below.
  if (req.method === 'GET') {
    const url = new URL(req.url, 'https://taupoathletics.vercel.app');
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) return send(res, 200, { names: [] });
    try {
      const members = await listMembers();
      const names = members
        .filter((m) => m.name.toLowerCase().startsWith(q))
        .map((m) => ({ name: m.name, firstName: m.firstName }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8);
      return send(res, 200, { names });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now < rec.resetAt && rec.count >= MAX_ATTEMPTS) return send(res, 429, { error: 'Too many attempts. Ask at the desk.' });
  if (!rec || now >= rec.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;

  const body = await readBody(req);
  const name = String(body.name || '').trim().toLowerCase();
  const date = String(body.date || '').trim();
  if (!name) return send(res, 400, { error: 'Enter your full name.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return send(res, 400, { error: 'Invalid date.' });

  try {
    const members = await queryAll(MEMBERS_DB);
    const member = members.find((m) => title(m.properties.Name).toLowerCase() === name);
    if (!member) return send(res, 404, { error: "We couldn't find that name — check the spelling or ask at the desk." });

    const fullName = title(member.properties.Name);
    const firstName = richText(member.properties['First Name']) || fullName.split(' ')[0];

    const existing = await queryAll(ATTENDANCE_DB, {
      and: [
        { property: 'Member', relation: { contains: member.id } },
        { property: 'Date', date: { equals: date } },
      ],
    });
    if (existing.length) return send(res, 200, { ok: true, already: true, firstName });

    await notion('POST', '/pages', {
      parent: { database_id: ATTENDANCE_DB },
      properties: {
        Name: { title: [{ type: 'text', text: { content: `${fullName} — ${date}` } }] },
        Member: { relation: [{ id: member.id }] },
        Date: { date: { start: date } },
      },
    });
    return send(res, 200, { ok: true, firstName });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
