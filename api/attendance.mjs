// Vercel serverless function — proxy for the Get Set Go sign-in desk.
// Reads/writes Notion so the NOTION_TOKEN never reaches the browser.
import { requireAdmin } from './_guard.mjs';

export const config = { maxDuration: 60 };

const NOTION = process.env.NOTION_TOKEN;
const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const ATTENDANCE_DB = process.env.ATTENDANCE_DB_ID || '3e30d85f-784c-8176-9c98-f98cad30a39f';

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
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

const rich = (c) => (c ? [{ type: 'text', text: { content: c } }] : []);

function ageInYears(birth, onDate) {
  if (!birth) return null;
  const b = new Date(birth);
  const d = onDate ? new Date(onDate + 'T00:00:00') : new Date();
  if (isNaN(b.getTime()) || isNaN(d.getTime())) return null;
  let age = d.getFullYear() - b.getFullYear();
  const m = d.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  // Attendance exposes children's names and ages — never public.
  if (!requireAdmin(req, res)) return;
  const url = new URL(req.url, 'https://taupoathletics.vercel.app');
  const date = url.searchParams.get('date') || '';

  try {
    if (req.method === 'GET') {
      const members = await queryAll(MEMBERS_DB);
      const presentIds = new Set();
      if (date) {
        const rows = await queryAll(ATTENDANCE_DB, { property: 'Date', date: { equals: date } });
        for (const row of rows) {
          for (const rel of (row.properties.Member && row.properties.Member.relation) || []) presentIds.add(rel.id);
        }
      }
      const list = members
        .map((m) => {
          const birth = (m.properties['Birth Date'] && m.properties['Birth Date'].date && m.properties['Birth Date'].date.start) || '';
          return {
            id: m.id,
            name: (m.properties.Name && m.properties.Name.title || []).map((t) => t.plain_text).join(''),
            ageGroup: (m.properties['Age Group'] && m.properties['Age Group'].select && m.properties['Age Group'].select.name) || '',
            memberType: (m.properties['Member Type'] && m.properties['Member Type'].rich_text || []).map((t) => t.plain_text).join(''),
            gender: (m.properties.Gender && m.properties.Gender.select && m.properties.Gender.select.name) || '',
            age: ageInYears(birth, date),
            nights: (m.properties['Nights attended'] && m.properties['Nights attended'].rollup && m.properties['Nights attended'].rollup.number) || 0,
            present: presentIds.has(m.id),
          };
        })
        // Only the registered athletes check in — exclude committee members,
        // volunteers and social members (their Member Type does not start with
        // "Active"). This keeps the desk search and the printed sheet clean.
        .filter((m) => String(m.memberType || '').startsWith('Active'))
        .sort((a, b) => a.name.localeCompare(b.name));
      return send(res, 200, { date, members: list, total: list.length });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const { action, memberId, name, date: d, members } = body;

      if (action === 'checkin') {
        if (!d || !Array.isArray(members) || !members.length) {
          return send(res, 400, { error: 'date and members are required.' });
        }
        let created = 0;
        let skipped = 0;
        for (const m of members) {
          const id = (m && m.id) || m;
          const nm = (m && m.name) || '';
          const existing = await queryAll(ATTENDANCE_DB, {
            and: [
              { property: 'Member', relation: { contains: id } },
              { property: 'Date', date: { equals: d } },
            ],
          });
          if (existing.length === 0) {
            await notion('POST', '/pages', {
              parent: { database_id: ATTENDANCE_DB },
              properties: {
                Name: { title: rich(`${nm} — ${d}`) },
                Member: { relation: [{ id }] },
                Date: { date: { start: d } },
              },
            });
            created++;
          } else {
            skipped++;
          }
        }
        return send(res, 200, { ok: true, created, skipped, total: members.length });
      }

      if (!action || !memberId || !d) return send(res, 400, { error: 'action, memberId and date are required.' });

      if (action === 'markPresent') {
        await notion('POST', '/pages', {
          parent: { database_id: ATTENDANCE_DB },
          properties: {
            Name: { title: rich(`${name || memberId} — ${d}`) },
            Member: { relation: [{ id: memberId }] },
            Date: { date: { start: d } },
          },
        });
        return send(res, 200, { ok: true, present: true });
      }

      if (action === 'markAbsent') {
        const rows = await queryAll(ATTENDANCE_DB, {
          and: [
            { property: 'Member', relation: { contains: memberId } },
            { property: 'Date', date: { equals: d } },
          ],
        });
        for (const row of rows) await notion('PATCH', `/pages/${row.id}`, { archived: true });
        return send(res, 200, { ok: true, present: false });
      }

      return send(res, 400, { error: `unknown action: ${action}` });
    }

    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
