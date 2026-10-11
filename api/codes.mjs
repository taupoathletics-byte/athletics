// Vercel serverless function — family access codes for the sign-in desk.
//
// ADMIN ONLY. Returns just what the printed A–Z sheet needs: names, age group
// and the family's access code. No birth dates, emails or phone numbers — the
// access code is the only thing a family needs to see their own results.
import { requireAdmin } from './_guard.mjs';

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

/** Surname for sorting: the Last Name field, else the last word of the full name. */
export function toCodeRow(page) {
  const p = page.properties || {};
  const name = plain(p.Name && p.Name.title);
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = plain(p['First Name'] && p['First Name'].rich_text) || parts.slice(0, -1).join(' ') || name;
  const lastName = plain(p['Last Name'] && p['Last Name'].rich_text) || (parts.length > 1 ? parts[parts.length - 1] : '');
  return {
    id: page.id,
    name,
    firstName,
    lastName,
    ageGroup: (p['Age Group'] && p['Age Group'].select && p['Age Group'].select.name) || '',
    memberType: plain(p['Member Type'] && p['Member Type'].rich_text),
    accessCode: plain(p['Access code'] && p['Access code'].rich_text).toUpperCase(),
  };
}

export function sortByLastName(rows) {
  const key = (r) => [r.lastName || r.name, r.firstName].map((s) => s.toLocaleLowerCase('en-NZ'));
  return rows.sort((a, b) => {
    const [al, af] = key(a);
    const [bl, bf] = key(b);
    return al.localeCompare(bl, 'en-NZ') || af.localeCompare(bf, 'en-NZ');
  });
}

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
  if (!requireAdmin(req, res)) return;
  try {
    const rows = sortByLastName((await queryAll(MEMBERS_DB)).map(toCodeRow).filter((r) => r.name));
    return send(res, 200, {
      members: rows,
      total: rows.length,
      missing: rows.filter((r) => !r.accessCode).length,
    });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
