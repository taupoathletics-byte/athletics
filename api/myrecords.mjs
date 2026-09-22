// Public lookup: a family enters their access code and sees their own children's
// records. The code is the only credential — no names, emails or birth dates of
// anyone else are ever returned. A modest in-memory rate limit slows guessing.
export const config = { maxDuration: 60 };

const NOTION = process.env.NOTION_TOKEN;
const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const RECORDS_DB = process.env.CLUB_RECORDS_DB_ID || '3e30d85f-784c-81e4-a908-f87400031506';

const TIME_EVENTS = ['60m', '100m', '200m', '400m', '800m', '1500m'];

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
const rich = (p) => (p.rich_text || []).map((t) => t.plain_text).join('');

function parseValue(event, text) {
  const s = String(text || '').trim().replace(/[ms]/gi, '').trim();
  if (TIME_EVENTS.includes(event)) {
    const parts = s.split(':').map((x) => parseFloat(x));
    if (parts.some((x) => isNaN(x))) return null;
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

const attempts = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 30;

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now < rec.resetAt && rec.count >= MAX_ATTEMPTS) return send(res, 429, { error: 'Too many attempts. Try again shortly.' });
  if (!rec || now >= rec.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;

  const url = new URL(req.url, 'https://taupoathletics.vercel.app');
  const code = (url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6) return send(res, 400, { error: 'Enter the access code.' });

  try {
    const memberRows = await queryAll(MEMBERS_DB, { property: 'Access code', rich_text: { equals: code } });
    if (!memberRows.length) return send(res, 404, { error: 'No members match that code.' });

    const nameById = {};
    const members = memberRows.map((m) => {
      const name = title(m.properties.Name || {});
      nameById[m.id] = name;
      const birth = (m.properties['Birth Date']?.date?.start) || '';
      const age = birth ? 2026 - Number(String(birth).slice(0, 4)) : NaN;
      return {
        name,
        grade: age >= 7 && age <= 14 ? String(age) : '',
        gender: (m.properties.Gender?.select?.name) || '',
      };
    });

    const ids = memberRows.map((m) => m.id);
    const recordRows = await queryAll(RECORDS_DB, {
      or: ids.map((id) => ({ property: 'Member', relation: { contains: id } })),
    });
    const records = recordRows
      .map((r) => {
        const p = r.properties;
        const memberId = (p.Member?.relation || [])[0]?.id || '';
        const event = p.Event?.select?.name || '';
        const result = rich(p.Result);
        return {
          memberName: nameById[memberId] || '',
          event,
          grade: p.Grade?.select?.name || '',
          gender: p.Gender?.select?.name || '',
          date: p.Date?.date?.start || '',
          result,
          season: p.Season?.select?.name || '',
          value: parseValue(event, result),
          isTime: TIME_EVENTS.includes(event),
        };
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return send(res, 200, { members, records });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
