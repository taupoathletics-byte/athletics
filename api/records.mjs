// Vercel serverless function — read/write the Club Records database (Notion proxy).
import { hasAdmin, requireAdmin } from './_guard.mjs';

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

const rich = (c) => (c ? [{ type: 'text', text: { content: c } }] : []);
const title = (p) => (p.title || []).map((t) => t.plain_text).join('');

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

  try {
    if (req.method === 'GET') {
      // Public: the records themselves - the club publishes these, names and all.
      // Admin: additionally the member detail the result-entry form needs.
      // The roster is sent to admins only; publicly the records carry each
      // athlete's name inline, so the member list is not needed and must not be
      // exposed (it names children who may have no published record at all).
      const isAdmin = hasAdmin(req);
      const [memberRows, recordRows] = await Promise.all([queryAll(MEMBERS_DB), queryAll(RECORDS_DB)]);
      const nameById = {};
      const members = [];
      for (const m of memberRows) {
        const name = title(m.properties.Name || {});
        nameById[m.id] = name;
        if (!isAdmin) continue;
        const birth = (m.properties['Birth Date']?.date?.start) || '';
        const age = birth ? 2026 - Number(String(birth).slice(0, 4)) : NaN;
        members.push({
          id: m.id,
          name,
          ageGroup: (m.properties['Age Group']?.select?.name) || '',
          gender: (m.properties.Gender?.select?.name) || '',
          birthDate: birth,
          grade: age >= 7 && age <= 14 ? String(age) : '',
          accessCode: ((m.properties['Access code']?.rich_text) || []).map((t) => t.plain_text).join(''),
        });
      }
      members.sort((a, b) => a.name.localeCompare(b.name));

      const records = recordRows.map((r) => {
        const p = r.properties;
        const memberId = (p.Member?.relation || [])[0]?.id || '';
        const event = p.Event?.select?.name || '';
        const grade = p.Grade?.select?.name || '';
        const gender = p.Gender?.select?.name || '';
        const date = p.Date?.date?.start || '';
        const result = (p.Result?.rich_text || []).map((t) => t.plain_text).join('') || '';
        const season = p.Season?.select?.name || '';
        return {
          id: r.id,
          memberId,
          memberName: nameById[memberId] || '',
          event, grade, gender, date, result, season,
          value: parseValue(event, result),
          isTime: TIME_EVENTS.includes(event),
        };
      });

      return send(res, 200, isAdmin ? { records, members } : { records });
    }

    if (req.method === 'POST') {
      // Writing a record requires an admin session. GET stays public (records
      // are meant to be read by everyone).
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);

      // Bulk measure-night entry: one event + grade, with a result for each
      // member. Empty results are skipped so only entered rows are written.
      if (body.action === 'bulk') {
        const { event, grade, date, season, results } = body;
        if (!event || !Array.isArray(results)) return send(res, 400, { error: 'event and a results array are required.' });
        let created = 0;
        const skipped = [];
        for (const r of results) {
          const memberId = r && r.memberId;
          const resultText = String((r && r.result) || '').trim();
          if (!memberId || !resultText) continue;
          try {
            await notion('POST', '/pages', {
              parent: { database_id: RECORDS_DB },
              properties: {
                Name: { title: rich(`${(r && r.memberName) || memberId} — ${event}${grade || ''}${(r && r.gender) || ''}`) },
                Member: { relation: [{ id: memberId }] },
                Event: { select: { name: event } },
                Grade: grade ? { select: { name: grade } } : {},
                Gender: (r && r.gender) ? { select: { name: r.gender } } : {},
                Date: date ? { date: { start: date } } : {},
                Result: { rich_text: rich(resultText) },
                Season: season ? { select: { name: season } } : {},
              },
            });
            created += 1;
          } catch (e) {
            skipped.push(`${(r && r.memberName) || memberId}: ${e.message}`);
          }
        }
        return send(res, 200, { ok: true, created, skipped });
      }

      // Delete a record (archive it) — fixes a result entered against the wrong
      // member or a bad measurement. Archive rather than hard-delete so it stays
      // recoverable from Notion's trash.
      if (body.action === 'delete') {
        const { id } = body;
        if (!id) return send(res, 400, { error: 'record id is required.' });
        await notion('PATCH', `/pages/${id}`, { archived: true });
        return send(res, 200, { ok: true });
      }

      const { memberId, memberName, event, grade, gender, date, result, season } = body;
      if (!memberId || !event || !result) return send(res, 400, { error: 'memberId, event and result are required.' });

      const page = await notion('POST', '/pages', {
        parent: { database_id: RECORDS_DB },
        properties: {
          Name: { title: rich(`${memberName || memberId} — ${event}${grade || ''}${gender || ''}`) },
          Member: { relation: [{ id: memberId }] },
          Event: { select: { name: event } },
          Grade: grade ? { select: { name: grade } } : {},
          Gender: gender ? { select: { name: gender } } : {},
          Date: date ? { date: { start: date } } : {},
          Result: { rich_text: rich(result) },
          Season: season ? { select: { name: season } } : {},
        },
      });
      return send(res, 200, { ok: true, id: page.id });
    }

    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
