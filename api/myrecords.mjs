// Public family self-service: a family enters their access code and sees their
// own children's records, or recovers their code by proving a child's first
// name, last name and date of birth. The response never includes another
// family's names, a date of birth, or the roster. In-memory rate limits slow
// guessing.
import { clientIp, publicError, rateLimiter } from './_safety.mjs';
import { buildBoard } from './_clubrecords.mjs';

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

const title = (p) => ((p && p.title) || []).map((t) => t.plain_text).join('');
const rich = (p) => ((p && p.rich_text) || []).map((t) => t.plain_text).join('');

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

/** Lowercase, strip diacritics (macrons), collapse whitespace. */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

const lookupLimited = rateLimiter({ max: 20, windowMs: 10 * 60 * 1000 });

/**
 * Recover a family's access code from a child's first name, last name and exact
 * date of birth. Returns only the code and the matched child's first name.
 */
async function lookupCode(req, res) {
  if (lookupLimited(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Please try again shortly.' });

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

      // Exact date of birth and first name; the last name can match the
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

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });

  if (req.method === 'POST') return lookupCode(req, res);
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });

  const ip = clientIp(req);
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
    const rows = recordRows.map((r) => {
      const p = r.properties;
      const memberId = (p.Member?.relation || [])[0]?.id || '';
      const event = p.Event?.select?.name || '';
      const result = rich(p.Result);
      return {
        id: r.id,
        memberId,
        memberName: nameById[memberId] || '',
        event,
        grade: p.Grade?.select?.name || '',
        gender: p.Gender?.select?.name || '',
        date: p.Date?.date?.start || '',
        result,
        season: p.Season?.select?.name || '',
      };
    });

    // Flag the rows that are (or equal) a club record, using the same merge the
    // public Club Records board uses. The key mirrors buildBoard's slot.
    const normGender = (g) => {
      const c = String(g || '').trim().charAt(0).toUpperCase()
      return c === 'F' || c === 'G' ? 'F' : c === 'M' || c === 'B' ? 'M' : ''
    }
    const holder = new Set();
    for (const slot of buildBoard(rows)) {
      for (const h of slot.holders) {
        if (h.source !== 'club-night') continue;
        holder.add(`${slot.event}|${slot.grade}|${slot.gender}|${h.name}|${h.date}`);
      }
    }

    const records = rows
      .map((r) => ({
        ...r,
        value: parseValue(r.event, r.result),
        isTime: TIME_EVENTS.includes(r.event),
        record: holder.has(`${r.event}|${String(r.grade).trim()}|${normGender(r.gender)}|${r.memberName}|${r.date}`),
      }))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return send(res, 200, { members, records });
  } catch (e) {
    return publicError(res, send, e);
  }
}
