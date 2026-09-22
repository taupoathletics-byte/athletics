// Query a Notion database: dump schema (incl. select options) + all rows to JSON.
import { writeFileSync } from 'node:fs';

const TOKEN = process.env.NOTION_TOKEN;
const VERSION = '2022-06-28';
const BASE = 'https://api.notion.com/v1';
const DB_ID = process.argv[2];

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(j).slice(0, 600)}`);
  return j;
}

const db = await post(`/databases/${DB_ID}/query`, { page_size: 100 });
console.log(`Total rows: ${db.results.length}  has_more=${db.has_more}`);

// schema with options
const schemaRes = await fetch(`${BASE}/databases/${DB_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': VERSION },
});
const schema = await schemaRes.json();
console.log('\n=== Select options ===');
for (const [name, p] of Object.entries(schema.properties)) {
  if (p.type === 'select' || p.type === 'multi_select') {
    const opts = (p.select?.options || p.multi_select?.options || []).map(o => o.name);
    console.log(`  ${name}: [${opts.join(' | ')}]`);
  }
}

const rows = db.results.map(r => {
  const p = r.properties;
  const get = (k) => {
    const v = p[k];
    if (!v) return null;
    switch (v.type) {
      case 'title': return v.title.map(t => t.plain_text).join('');
      case 'rich_text': return v.rich_text.map(t => t.plain_text).join('');
      case 'number': return v.number;
      case 'select': return v.select?.name ?? null;
      case 'multi_select': return v.multi_select.map(s => s.name);
      default: return v[v.type];
    }
  };
  return {
    id: r.id,
    Name: get('Name'), Series: get('Series'), 'Series name': get('Series name'),
    Weeks: get('Weeks'), Block: get('Block'), Rotation: get('Rotation'),
    Category: get('Category'), Skill: get('Skill'), Event: get('Event'),
    'Led by': get('Led by'), 'Week A game': get('Week A game'), 'Week B game': get('Week B game'),
    Equipment: get('Equipment'), 'Learning cues': get('Learning cues'),
    'Adaptation (3-4yrs)': get('Adaptation (3-4yrs)'), 'Watch for': get('Watch for'),
  };
});

writeFileSync(process.env.TEMP + '\\notion_rows.json', JSON.stringify(rows, null, 2), 'utf8');
console.log('\n=== Rows (title · series · rotation · category · skill · event) ===');
for (const r of rows) {
  console.log(`${String(r.Series).padStart(2)} · ${r.Rotation} · ${r.Category} · ${r.Skill} · ${r.Event}  —  ${r.Name}`);
}
console.log(`\nSaved ${rows.length} rows to ${process.env.TEMP}\\notion_rows.json`);
