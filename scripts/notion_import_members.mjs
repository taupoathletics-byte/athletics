// Import members from membersBySeason CSV into the Notion Members database.
import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const MEMBERS_DB_ID = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const CSV_PATH = process.argv[2] || 'C:\\Users\\grant\\Downloads\\membersBySeason (2).csv';

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(method, path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { await sleep(1000 * (attempt + 1)); continue; }
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(json.message || text).slice(0, 300)}`);
    return json;
  }
  throw new Error('429 retries exhausted');
}

function toIsoDate(d) {
  const s = (d || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const rows = parseCSV(readFileSync(CSV_PATH, 'utf8'));
const header = rows[0];
const idx = (name) => header.indexOf(name);
const get = (row, name) => (idx(name) >= 0 ? (row[idx(name)] || '').trim() : '');

const data = rows.slice(1).filter((r) => r.some((c) => c.trim()));
const seen = new Set();
const members = [];
for (const r of data) {
  const name = get(r, 'Name');
  if (!name || seen.has(name)) continue;
  seen.add(name);
  members.push({
    name,
    first: get(r, 'First Name'),
    last: get(r, 'Last Name'),
    ageGroup: get(r, 'Age Group'),
    birthDate: toIsoDate(get(r, 'Birth Date')),
    mobile: get(r, 'Mobile'),
    email: get(r, 'Email'),
    memberType: get(r, 'Member Type'),
    status: get(r, 'Status'),
  });
}

const ageGroups = [...new Set(members.map((m) => m.ageGroup || '(blank)'))].sort();
const types = [...new Set(members.map((m) => m.memberType || '(blank)'))].sort();
console.log(`Unique members to import: ${members.length}`);
console.log('Age groups:', JSON.stringify(ageGroups));
console.log('Member types:', JSON.stringify(types));

const rt = (c) => (c ? [{ type: 'text', text: { content: c } }] : []);
let ok = 0;
for (let i = 0; i < members.length; i++) {
  const m = members[i];
  const props = {
    Name: { title: rt(m.name) },
    'First Name': { rich_text: rt(m.first) },
    'Last Name': { rich_text: rt(m.last) },
    'Mobile': { rich_text: rt(m.mobile) },
    'Email': { rich_text: rt(m.email) },
    'Member Type': { rich_text: rt(m.memberType) },
  };
  if (m.ageGroup) props['Age Group'] = { select: { name: m.ageGroup } };
  if (m.birthDate) props['Birth Date'] = { date: { start: m.birthDate } };
  if (m.status) props['Status'] = { select: { name: m.status } };

  try {
    await api('POST', '/pages', { parent: { database_id: MEMBERS_DB_ID }, properties: props });
    ok++;
  } catch (e) {
    console.log(`  FAIL ${m.name}: ${e.message}`);
  }
  await sleep(320);
}
console.log(`\nImported ${ok}/${members.length} members.`);
writeFileSync(new URL('./data/notion_ids.json', import.meta.url), JSON.stringify({
  membersDb: MEMBERS_DB_ID,
  attendanceDb: '3e30d85f-784c-8176-9c98-f98cad30a39f',
}, null, 2));
console.log('Wrote scripts/data/notion_ids.json');
