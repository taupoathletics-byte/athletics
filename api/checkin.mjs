// Public self check-in for the QR poster.
//
// A family types each child's name, taps it from the suggestions and is marked
// present for the club night. This is deliberately different from the admin
// check-in:
//   - the GET search needs at least two letters and is rate-limited. It shows
//     first and last name so a parent can tell their children apart, but never
//     returns ages or the full roster, so the list cannot be scraped in bulk.
//   - it only ever ADDS a presence mark (idempotent), never removes one,
//   - it only accepts a club night from the last week (not any date),
//   - the POST that actually marks attendance is rate-limited.
import { clientIp, daysBetween, isIsoDate, isNotionId, nzToday, publicError, rateLimiter } from './_safety.mjs';

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

// The junior club night is ages ~2–14. Only these two Member Types are the
// junior athletes; committee, volunteers, social and 15+ competitive members
// are excluded from the public self check-in.
const JUNIOR_TYPES = ['Active Member 6 Years and Under', 'Active Member 7 to 14 Years'];
const memberType = (m) => richText(m.properties['Member Type']);
const isJunior = (m) => JUNIOR_TYPES.includes(memberType(m));

// Cached member list for the prefix search. The QR poster can be hit by many
// people in a short window, so we avoid a fresh Notion query on every keystroke.
let memberCache = null;
let memberCacheAt = 0;
const MEMBER_CACHE_TTL = 5 * 60 * 1000;

async function listMembers() {
  if (memberCache && Date.now() - memberCacheAt < MEMBER_CACHE_TTL) return memberCache;
  const members = await queryAll(MEMBERS_DB);
  memberCache = members.filter(isJunior).map((m) => {
    const name = title(m.properties.Name);
    const firstName = richText(m.properties['First Name']) || name.split(' ')[0] || '';
    const lastName = richText(m.properties['Last Name']) || name.split(' ').slice(1).join(' ');
    return { id: m.id, name, firstName, label: lastName ? `${firstName} ${lastName}` : firstName };
  });
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

// A family of three typing names makes a few dozen lookups at most.
const searchLimited = rateLimiter({ max: 60, windowMs: 10 * 60 * 1000 });
const checkinLimited = rateLimiter({ max: 60, windowMs: 5 * 60 * 1000 });
const MIN_QUERY = 2;

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'POST' && req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });

  // Name suggestions for the QR poster. Read-only (returns only names that
  // match what's already been typed), so it is not subject to the check-in
  // rate limit below.
  if (req.method === 'GET') {
    const url = new URL(req.url, 'https://taupoathletics.vercel.app');
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 60);
    if (q.length < MIN_QUERY) return send(res, 200, { names: [] });
    if (searchLimited(clientIp(req))) return send(res, 429, { error: 'Too many searches. Ask at the desk.' });
    try {
      const members = await listMembers();
      const names = members
        .filter((m) => m.name.toLowerCase().startsWith(q))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
        // `name` is the masked label kept for older cached clients.
        .map((m) => ({ id: m.id, label: m.label, name: m.label, firstName: m.firstName }));
      return send(res, 200, { names });
    } catch (e) {
      return publicError(res, send, e);
    }
  }

  if (checkinLimited(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Ask at the desk.' });

  const body = await readBody(req);
  // Batch check-in: accept { names: [...] } for a whole family at once, with
  // { name } still accepted for a single member (backward compatible). Names are
  // deduplicated so tapping the same child twice can't double-mark them.
  // Current clients send { ids } picked from the suggestions. { names } (exact
  // full names) is still accepted for anyone on an older cached page.
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).filter(isNotionId))].slice(0, 12);
  const raw = Array.isArray(body.names) ? body.names : (body.name != null ? [body.name] : []);
  const names = [...new Set(raw.map((n) => String(n || '').trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  const date = String(body.date || '').trim();
  if (!ids.length && !names.length) return send(res, 400, { error: 'Enter a name.' });
  if (!isIsoDate(date)) return send(res, 400, { error: 'Invalid date.' });
  // Tonight, or the most recent club night if the page was opened late.
  const age = daysBetween(date, nzToday());
  if (age < -1 || age > 7) return send(res, 400, { error: 'Check-in is only open for this week’s club night.' });

  try {
    const members = (await queryAll(MEMBERS_DB)).filter(isJunior);
    const wanted = [
      ...ids.map((id) => ({ key: id, member: members.find((m) => m.id.replace(/-/g, '') === id.replace(/-/g, '').toLowerCase()) })),
      ...names.map((name) => ({ key: name, member: members.find((m) => title(m.properties.Name).toLowerCase() === name) })),
    ];
    const results = [];
    let created = 0;
    let already = 0;
    const seen = new Set();
    for (const { key, member } of wanted) {
      if (!member) {
        results.push({ name: isNotionId(key) ? 'Unknown' : key, firstName: null, status: 'notfound' });
        continue;
      }
      if (seen.has(member.id)) continue;
      seen.add(member.id);
      const fullName = title(member.properties.Name);
      const firstName = richText(member.properties['First Name']) || fullName.split(' ')[0];

      const existing = await queryAll(ATTENDANCE_DB, {
        and: [
          { property: 'Member', relation: { contains: member.id } },
          { property: 'Date', date: { equals: date } },
        ],
      });
      if (existing.length) {
        results.push({ name: firstName, firstName, status: 'already' });
        already += 1;
        continue;
      }
      await notion('POST', '/pages', {
        parent: { database_id: ATTENDANCE_DB },
        properties: {
          Name: { title: [{ type: 'text', text: { content: `${fullName} — ${date}` } }] },
          Member: { relation: [{ id: member.id }] },
          Date: { date: { start: date } },
        },
      });
      results.push({ name: firstName, firstName, status: 'ok' });
      created += 1;
    }
    return send(res, 200, { ok: true, created, already, results });
  } catch (e) {
    return publicError(res, send, e);
  }
}
