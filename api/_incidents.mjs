// Admin-only safety registers, stored in Notion (the club's existing backend).
//
//   kind=incident       first-aid / incident reports   INCIDENTS_DB_ID
//   kind=hazard         hazard register                HAZARDS_DB_ID
//   kind=investigation  accident investigation         INVESTIGATIONS_DB_ID
//
// Create the databases with `node scripts/notion_safety_setup.mjs`, share them
// with the Notion integration, then set the three IDs in Vercel.
//
// Everything a form collects goes into the page body; the database columns are
// only the fields staff need to scan a list.
import { isIsoDate } from './_safety.mjs';
import { requireAdmin } from './_guard.mjs';

export const config = { maxDuration: 60 };

const NOTION = process.env.NOTION_TOKEN;

const TYPES = ['Injury', 'Illness', 'Environmental', 'Notifiable event', 'Other'];
const RISK = ['Low', 'Medium', 'High'];
const SEVERITY = ['Minor', 'Serious', 'Very serious'];
const LIKELIHOOD = ['Rare', 'Occasional', 'Frequent'];

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
const select = (p) => (p && p.select && p.select.name) || '';
const dateOf = (p) => (p && p.date && p.date.start) || '';

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

const clean = (v, max = 4000) => String(v ?? '').trim().slice(0, max);
const rt = (v, max = 2000) => ({ rich_text: v ? [{ type: 'text', text: { content: clean(v, max) } }] : [] });
const sel = (v) => (v ? { select: { name: clean(v, 80) } } : { select: null });
const dateProp = (v) => ({ date: v ? { start: v } : null });
const yes = (v) => v === true || v === 'Yes' || v === 'yes' || v === 'on';

/** A paragraph holding "Label: value" lines for the fields that live in the body. */
function detailBlock(pairs) {
  const text = pairs
    .map(([label, value]) => {
      const v = clean(value, 2000);
      return v ? `${label}: ${v}` : ''
    })
    .filter(Boolean)
    .join('\n')
    .slice(0, 1900);
  return [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: text || 'No further detail supplied.' } }] },
    },
  ];
}

const KINDS = {
  incident: {
    env: 'INCIDENTS_DB_ID',
    validate(body) {
      if (!clean(body.injuredPerson, 120)) return 'Enter the name of the injured person.'
      if (!clean(body.description, 4000)) return 'Describe what happened.'
      if (!TYPES.includes(body.type)) return 'Choose the type of incident.'
      return null
    },
    properties(body) {
      const date = clean(body.date, 10);
      const person = clean(body.injuredPerson, 120);
      return {
        Name: { title: [{ type: 'text', text: { content: `${person} — ${date}`.slice(0, 2000) } }] },
        Date: dateProp(date),
        Type: sel(body.type),
        Status: sel(body.status === 'Closed' ? 'Closed' : 'Open'),
        Location: rt(body.location, 200),
        'Injured person': rt(person, 120),
        'Reported by': rt(body.reportedBy, 120),
        Summary: rt(clean(body.summary, 400) || String(body.description || '').slice(0, 400)),
      }
    },
    children(body) {
      return detailBlock([
        ['Time', body.time],
        ['Reported by', body.reportedBy],
        ['Reporter phone', body.phone],
        ['Reporter email', body.email],
        ['Injured person', body.injuredPerson],
        ['Age', body.age],
        ['First aider', body.firstAider],
        ['Nature of injury', body.injury],
        ['Part of body', body.bodyPart],
        ['Treatment provided', body.treatment],
        ['Referred to', body.referredTo],
        ['Witnesses', body.witnesses],
        ['Description of incident', body.description],
        ['Property damage', body.propertyDamage],
        ['Causes / analysis', body.analysis],
        ['Prevention', body.prevention],
        ['Follow-up', body.followUp],
      ])
    },
    read(page) {
      const p = page.properties || {};
      return {
        category: select(p.Type),
        person: rich(p['Injured person']),
        summary: rich(p.Summary),
      }
    },
  },

  hazard: {
    env: 'HAZARDS_DB_ID',
    validate(body) {
      if (!clean(body.hazard, 500)) return 'Describe the hazard.'
      if (!RISK.includes(body.riskRating)) return 'Choose a risk rating.'
      return null
    },
    properties(body) {
      const date = clean(body.date, 10);
      const hazard = clean(body.hazard, 200);
      return {
        Name: { title: [{ type: 'text', text: { content: `${hazard} — ${date}`.slice(0, 2000) } }] },
        Date: dateProp(date),
        Location: rt(body.location, 200),
        Hazard: rt(hazard, 200),
        'Potential harm': rt(body.potentialHarm, 400),
        'Risk rating': sel(body.riskRating),
        Significant: sel(yes(body.significant) ? 'Yes' : 'No'),
        Controls: rt(body.controls, 1000),
        'Person responsible': rt(body.responsible, 120),
        'Action date': dateProp(clean(body.actionDate, 10) || null),
        'Completed by': rt(body.completedBy, 120),
        Status: sel(body.status === 'Closed' ? 'Closed' : 'Open'),
      }
    },
    children(body) {
      return detailBlock([
        ['Hazard and potential harm', body.hazard],
        ['Potential harm', body.potentialHarm],
        ['Significant hazard', yes(body.significant) ? 'Yes' : 'No'],
        ['Controls required', body.controls],
        ['Person responsible', body.responsible],
        ['Eliminate', yes(body.eliminate) ? 'Yes' : 'No'],
        ['Isolate', yes(body.isolate) ? 'Yes' : 'No'],
        ['Minimise', yes(body.minimise) ? 'Yes' : 'No'],
        ['Date of action', body.actionDate],
        ['Completed by', body.completedBy],
      ])
    },
    read(page) {
      const p = page.properties || {};
      return {
        category: select(p['Risk rating']),
        person: rich(p['Person responsible']),
        summary: rich(p.Hazard),
      }
    },
  },

  investigation: {
    env: 'INVESTIGATIONS_DB_ID',
    validate(body) {
      if (!clean(body.injuredPerson, 120)) return 'Enter the name of the injured person.'
      if (!clean(body.description, 4000)) return 'Describe what happened.'
      if (!SEVERITY.includes(body.severity)) return 'Choose how bad it could have been.'
      return null
    },
    properties(body) {
      const date = clean(body.date, 10);
      const person = clean(body.injuredPerson, 120);
      return {
        Name: { title: [{ type: 'text', text: { content: `${person} — ${date}`.slice(0, 2000) } }] },
        Date: dateProp(date),
        Location: rt(body.location, 200),
        'Injured person': rt(person, 120),
        'Reported by': rt(body.reportedBy, 120),
        Severity: sel(body.severity),
        Likelihood: sel(body.likelihood),
        Status: sel(body.status === 'Closed' ? 'Closed' : 'Open'),
      }
    },
    children(body) {
      return detailBlock([
        ['Name of organisation', body.organisation || 'Taupō Athletics Club'],
        ['Department', body.department],
        ['Time', body.time],
        ['Date reported', body.dateReported],
        ['Age', body.age],
        ['Date of accident', body.date],
        ['Contact number', body.phone],
        ['Job title', body.jobTitle],
        ['Address', body.address],
        ['Length of employment', body.employmentLength],
        ['Type of injury', body.injury],
        ['Injured part of body', body.bodyPart],
        ['Property damaged', body.propertyDamaged],
        ['Nature of damage', body.damageNature],
        ['What happened', body.description],
        ['Causes of the accident', body.analysis],
        ['How bad could it have been', body.severity],
        ['Chance of it happening again', body.likelihood],
        ['What will be done to prevent it', body.prevention],
        ['Type of treatment given', body.treatment],
        ['Name of first aider', body.firstAider],
        ['Doctor / hospital', body.doctorHospital],
        ['Accident investigated by', body.investigatedBy],
        ['Date investigated', body.investigatedDate],
        ['OSH / WorkSafe advised', body.oshAdvised],
        ['Date advised', body.oshDate],
      ])
    },
    read(page) {
      const p = page.properties || {};
      return {
        category: select(p.Severity),
        person: rich(p['Injured person']),
        summary: '',
      }
    },
  },
};

function kindOf(req, body) {
  const fromQuery = (() => {
    try { return new URL(req.url, 'https://taupoathletics.vercel.app').searchParams.get('kind') } catch { return null }
  })()
  const kind = String(body.kind || fromQuery || 'incident')
  return KINDS[kind] ? kind : 'incident'
}

export default async function handler(req, res) {
  if (!NOTION) return send(res, 500, { error: 'NOTION_TOKEN is not configured on the server.' });
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const kind = kindOf(req, {});
    const spec = KINDS[kind];
    const db = process.env[spec.env];
    if (!db) return send(res, 500, { error: `${spec.env} is not configured on the server. Run scripts/notion_safety_setup.mjs.` });
    try {
      const data = await notion('POST', `/databases/${db}/query`, {
        page_size: 60,
        sorts: [{ property: 'Date', direction: 'descending' }],
      });
      const reports = data.results.map((page) => {
        const detail = spec.read(page);
        return {
          id: page.id,
          url: page.url,
          kind,
          title: title(page.properties.Name),
          date: dateOf(page.properties.Date),
          status: select(page.properties.Status) || 'Open',
          location: rich(page.properties.Location),
          ...detail,
        };
      });
      return send(res, 200, { kind, reports });
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: 'Could not load the register.' });
    }
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  const body = await readBody(req);
  const kind = kindOf(req, body);
  const spec = KINDS[kind];
  const db = process.env[spec.env];
  if (!db) return send(res, 500, { error: `${spec.env} is not configured on the server. Run scripts/notion_safety_setup.mjs.` });

  const date = clean(body.date, 10);
  if (!isIsoDate(date)) return send(res, 400, { error: 'Enter the date.' });
  const problem = spec.validate(body);
  if (problem) return send(res, 400, { error: problem });

  try {
    const page = await notion('POST', '/pages', {
      parent: { database_id: db },
      properties: spec.properties({ ...body, date }),
      children: spec.children(body),
    });
    return send(res, 201, { ok: true, kind, id: page.id, url: page.url });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Could not save the report.' });
  }
}
