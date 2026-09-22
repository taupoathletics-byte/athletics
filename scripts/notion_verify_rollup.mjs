const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const MEMBERS = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const ATTENDANCE = '3e30d85f-784c-8176-9c98-f98cad30a39f';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let j; try { j = text ? JSON.parse(text) : {}; } catch { j = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(j.message || text).slice(0, 300)}`);
  return j;
}

const q = await api('POST', `/databases/${MEMBERS}/query`, { page_size: 1 });
const member = q.results[0];
const name = member.properties.Name.title.map(t => t.plain_text).join('');
console.log('Test member:', member.id, name);

// create a test attendance row
const row = await api('POST', '/pages', {
  parent: { database_id: ATTENDANCE },
  properties: {
    Name: { title: [{ text: { content: `${name} — 2026-10-15` } }] },
    Member: { relation: [{ id: member.id }] },
    Date: { date: { start: '2026-10-15' } },
  },
});
console.log('Attendance row created:', row.id);

// re-fetch member, check rollup
const m2 = await api('GET', `/pages/${member.id}`);
const rollup = m2.properties['Nights attended'];
console.log('Rollup "Nights attended":', JSON.stringify(rollup.rollup));
console.log('  value:', rollup.rollup?.number ?? rollup.rollup?.array ?? '(see above)');

// clean up test row
await api('PATCH', `/pages/${row.id}`, { archived: true });
console.log('Test row archived.');
