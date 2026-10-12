// Add an "Age (years)" Select column to the Members DB and populate it from each
// member's Birth Date (age as of today). Re-run any time to refresh ages as the
// season progresses.
//
//   NOTION_TOKEN=... node scripts/notion_set_age_groups.mjs
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error('NOTION_TOKEN is not set.\n  NOTION_TOKEN=... node scripts/notion_set_age_groups.mjs');
  process.exit(1);
}

// Resolve the members DB id, preferring the committed notion_ids.json.
let MEMBERS_DB = process.env.MEMBERS_DB_ID;
if (!MEMBERS_DB) {
  try {
    MEMBERS_DB = JSON.parse(readFileSync(join(here, 'data', 'notion_ids.json'), 'utf8')).membersDb;
  } catch {
    MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
  }
}

const BASE = 'https://api.notion.com/v1';
const H = { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };

const PROP = 'Age (years)';
const OPTIONS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12-14', '15+'];

async function notion(method, path, body) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: H,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = 700 * attempt;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
    if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${String(json.message || text).slice(0, 300)}`);
    return json;
  }
  throw new Error(`Notion ${method} ${path}: gave up after retries`);
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

function ageInYears(birth) {
  const b = new Date(birth);
  const d = new Date();
  if (isNaN(b.getTime())) return null;
  let age = d.getFullYear() - b.getFullYear();
  const m = d.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age -= 1;
  return age;
}

function bucket(age) {
  if (age == null) return null;
  if (age >= 2 && age <= 11) return String(age);
  if (age >= 12 && age <= 14) return '12-14';
  if (age >= 15) return '15+';
  return null; // under 2 — leave empty
}

(async () => {
  const schema = await notion('GET', `/databases/${MEMBERS_DB}`);
  const existing = schema.properties[PROP];

  if (!existing) {
    await notion('PATCH', `/databases/${MEMBERS_DB}`, {
      properties: { [PROP]: { select: { options: OPTIONS.map((name) => ({ name, color: 'default' })) } } },
    });
    console.log(`Created Select property "${PROP}" with options: ${OPTIONS.join(', ')}`);
  } else {
    const have = new Set((existing.select?.options || []).map((o) => o.name));
    const missing = OPTIONS.filter((o) => !have.has(o));
    if (missing.length) {
      const all = [...(existing.select?.options || []).map((o) => ({ name: o.name })), ...missing.map((name) => ({ name, color: 'default' }))];
      await notion('PATCH', `/databases/${MEMBERS_DB}`, { properties: { [PROP]: { select: { options: all } } } });
      console.log(`Property "${PROP}" existed; added missing options: ${missing.join(', ')}`);
    } else {
      console.log(`Property "${PROP}" already exists with all options.`);
    }
  }

  const members = await queryAll(MEMBERS_DB);
  console.log(`Members to update: ${members.length}`);

  let updated = 0;
  let skipped = 0;
  for (const m of members) {
    const birth = (m.properties['Birth Date']?.date?.start) || '';
    const val = bucket(ageInYears(birth));
    if (!val) { skipped += 1; continue; }
    await notion('PATCH', `/pages/${m.id}`, { properties: { [PROP]: { select: { name: val } } } });
    updated += 1;
    if (updated % 25 === 0) console.log(`  updated ${updated}…`);
    await new Promise((r) => setTimeout(r, 340)); // stay under Notion's ~3 req/s
  }

  console.log(`\nDone. Updated ${updated} members, skipped ${skipped} (no Birth Date or under 2).`);
  console.log('You can now group the Members board by "' + PROP + '".');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
