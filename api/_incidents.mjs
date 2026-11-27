// Admin-only first-aid / incident reports, stored in a Notion database.
//
// The club already runs its members, results and attendance on Notion, so the
// incident register lives there too — no extra account or key to manage.
//
// The "Incident Reports" database needs these properties (extra ones are
// ignored, missing ones simply come back blank):
//   Name            title
//   Date            date
//   Type            select   (Injury / Illness / Environmental / Notifiable event / Other)
//   Status          select   (Open / Closed)
//   Location        rich_text
//   Injured person  rich_text
//   Reported by     rich_text
//   Summary         rich_text
//
// Everything else the form collects is written into the page body, so the
// database can stay small and staff can still read a full report.
import { isIsoDate } from './_safety.mjs';
import { requireAdmin } from './_guard.mjs';

export const config = { maxDuration: 60 };

const NOTION = process.env.NOTION_TOKEN;
const DB = process.env.INCIDENTS_DB_ID;

const TYPES = ['Injury', 'Illness', 'Environmental', 'Notifiable event', 'Other'];

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

const title = (p) => ((p && p.title) || []).map((t) => t.plain_text).join('');
const rich = (p) => ((p && p.rich_text) || []).map((t) => t.plain_text).join('');

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

/** Trim a value to a sane length — this is a form, not a file upload. */
const clean = (v, max = 4000) => String(v ?? '').trim().slice(0, max);

const DETAIL_FIELDS = [
  ['Time', 'time'],
  ['Reported by', 'reportedBy'],
  ['Reporter phone', 'phone'],
  ['Reporter email', 'email'],
  ['Injured person', 'injuredPerson'],
  ['Age', 'age'],
  ['First aider', 'firstAider'],
  ['Nature of injury', 'injury'],
  ['Part of body', 'bodyPart'],
  ['Treatment provided', 'treatment'],
  ['Referred to', 'referredTo'],
  ['Witnesses', 'witnesses'],
  ['Description of incident', 'description'],
  ['Property damage', 'propertyDamage'],
  ['Causes / analysis', 'analysis'],
  ['Prevention', 'prevention'],
  ['Follow-up', 'followUp'],
];

function reportText(body) {
  const lines = [];
  for (const [label, key] of DETAIL_FIELDS) {
    const value = clean(body[key], 2000);
    if (value) lines.push(`${label}: ${value}`);
  }
  return lines.join('\n').slice(0, 1800) || 'No further detail supplied.';
}

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    if (!DB) return send(res, 500, { error: 'INCIDENTS_DB_ID is not configured on the server.' });
    try {
      const data = await notion('POST', `/databases/${DB}/query`, {
        page_size: 60,
        sorts: [{ property: 'Date', direction: 'descending' }],
      });
      const reports = data.results.map((page) => {
        const p = page.properties || {};
        return {
          id: page.id,
          url: page.url,
          title: title(p.Name),
          date: (p.Date && p.Date.date && p.Date.date.start) || '',
          type: (p.Type && p.Type.select && p.Type.select.name) || '',
          status: (p.Status && p.Status.select && p.Status.select.name) || 'Open',
          location: rich(p.Location),
          injuredPerson: rich(p['Injured person']),
          reportedBy: rich(p['Reported by']),
          summary: rich(p.Summary),
        };
      });
      return send(res, 200, { reports });
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: 'Could not load incident reports.' });
    }
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  if (!DB) return send(res, 500, { error: 'INCIDENTS_DB_ID is not configured on the server.' });

  const body = await readBody(req);
  const date = clean(body.date, 10);
  if (!isIsoDate(date)) return send(res, 400, { error: 'Enter the date of the incident.' });
  if (!TYPES.includes(body.type)) return send(res, 400, { error: 'Choose the type of incident.' });
  const injuredPerson = clean(body.injuredPerson, 120);
  if (!injuredPerson) return send(res, 400, { error: 'Enter the name of the injured person.' });
  const description = clean(body.description, 4000);
  if (!description) return send(res, 400, { error: 'Describe what happened.' });

  const status = body.status === 'Closed' ? 'Closed' : 'Open';
  const type = body.type;
  const name = `${injuredPerson} — ${date}`;
  const summary = clean(body.summary, 400) || description.slice(0, 400);

  try {
    const page = await notion('POST', '/pages', {
      parent: { database_id: DB },
      properties: {
        Name: { title: [{ type: 'text', text: { content: name.slice(0, 2000) } }] },
        Date: { date: { start: date } },
        Type: { select: { name: type } },
        Status: { select: { name: status } },
        Location: { rich_text: [{ type: 'text', text: { content: clean(body.location, 200) } }] },
        'Injured person': { rich_text: [{ type: 'text', text: { content: injuredPerson } }] },
        'Reported by': { rich_text: [{ type: 'text', text: { content: clean(body.reportedBy, 120) } }] },
        Summary: { rich_text: [{ type: 'text', text: { content: summary } }] },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: reportText(body) } }] },
        },
      ],
    });
    return send(res, 201, { ok: true, id: page.id, url: page.url });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Could not save the report.' });
  }
}
