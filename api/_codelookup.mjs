// Public self-service: recover a family's access code by proving the child's
// first name, last name and date of birth. Returns only the code and the
// matched child's first name (for confirmation) — never a date of birth, email,
// other children, or the roster. Rate-limited per IP.
//
//   POST /api/codelookup  { firstName, lastName, birthDate }
//
// Weaker than the emailed code (names are semi-public), so the date of birth
// must match exactly and lookups are throttled.
import { clientIp, publicError, rateLimiter } from './_safety.mjs';

export const config = { maxDuration: 60 };

const NOTION = process.env.NOTION_TOKEN;
const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b';

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

const title = (p) => ((p && p.title) || []).map((t) => t.plain_text).join('');
const rich = (p) => ((p && p.rich_text) || []).map((t) => t.plain_text).join('');

/** Lowercase, strip diacritics (macrons), collapse whitespace. */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

const lookupLimited = rateLimiter({ max: 20, windowMs: 10 * 60 * 1000 });

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  if (lookupLimited(clientIp(req))) {
    return send(res, 429, { error: 'Too many attempts. Please try again shortly.' });
  }

  const body = await readBody(req);
  const firstName = norm(body.firstName);
  const lastName = norm(body.lastName);
  const birthDate = String(body.birthDate || '').trim();

  if (!firstName || !lastName) return send(res, 400, { error: 'Enter the child’s first and last name.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return send(res, 400, { error: 'Enter the child’s date of birth.' });

  try {
    const members = await queryAll(MEMBERS_DB);
    const match = members.find((m) => {
      const p = m.properties;
      const name = title(p.Name);
      const fn = rich(p['First Name']) || name.split(' ')[0] || '';
      const ln = rich(p['Last Name']) || '';
      const aliases = rich(p.Aliases);

      // Exact date of birth and exact first name; the last name can match the
      // surname, a blended-family alias (e.g. "Webb" → "Lempriere-Webb") or the
      // full name, so hyphenated families are found under any of their names.
      if ((p['Birth Date'] && p['Birth Date'].date && p['Birth Date'].date.start) !== birthDate) return false;
      if (norm(fn) !== firstName) return false;
      return `${norm(ln)} ${norm(aliases)} ${norm(name)}`.includes(lastName);
    });

    if (!match) return send(res, 404, { error: 'No member matches those details. Check the spelling and date of birth.' });

    const code = rich(match.properties['Access code']).trim().toUpperCase();
    if (!code) return send(res, 404, { error: 'No access code is set for that member yet. Ask at the check-in desk on club night.' });

    const matchName = title(match.properties.Name);
    const matchFirst = rich(match.properties['First Name']) || matchName.split(' ')[0] || '';
    return send(res, 200, { code, firstName: matchFirst });
  } catch (e) {
    return publicError(res, send, e);
  }
}
