// Add a "Gender" property to the Members database and populate it from the
// registration CSV (Gender At Birth -> F/M).
import { readFileSync } from 'node:fs';

const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const CSV_PATH = process.argv[2] || 'C:\\Users\\grant\\Downloads\\membersBySeason (2).csv';

async function api(method, path, body) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { await new Promise(r => setTimeout(r, 800 * (a + 1))); continue; }
    const text = await res.text();
    let j; try { j = text ? JSON.parse(text) : {}; } catch { j = { raw: text }; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(j.message || text).slice(0, 300)}`);
    return j;
  }
  throw new Error('429 exhausted');
}

// 1. add Gender property
await api('PATCH', `/databases/${MEMBERS_DB}`, {
  properties: { Gender: { select: { options: [{ name: 'F' }, { name: 'M' }] } } },
});
console.log('Added Gender property');

// 2. parse CSV (simple parser, no embedded commas expected in name/gender)
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCSV(readFileSync(CSV_PATH, 'utf8'));
const header = rows[0];
const idx = (n) => header.indexOf(n);
const genderByName = new Map();
for (const r of rows.slice(1)) {
  const name = (r[idx('Name')] || '').trim();
  const g = (r[idx('Gender At Birth')] || '').trim().toLowerCase();
  if (!name || genderByName.has(name)) continue;
  genderByName.set(name, g.startsWith('f') ? 'F' : g.startsWith('m') ? 'M' : '');
}

// 3. query members + patch
let cursor, patched = 0, matched = 0;
do {
  const q = await api('POST', `/databases/${MEMBERS_DB}/query`, { page_size: 100, start_cursor: cursor });
  for (const row of q.results) {
    const name = (row.properties.Name.title || []).map((t) => t.plain_text).join('');
    const g = genderByName.get(name);
    if (!g) continue;
    await api('PATCH', `/pages/${row.id}`, { properties: { Gender: { select: { name: g } } } });
    matched++;
    patched++;
    await new Promise(r => setTimeout(r, 150));
  }
  cursor = q.has_more ? q.next_cursor : undefined;
} while (cursor);
console.log(`Set Gender on ${patched} members (of ${genderByName.size} in CSV).`);
