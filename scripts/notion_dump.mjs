const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const PAGE_ID = '3e20d85f784c819ca575f22bfb38c49b';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28' },
  });
  return res.json();
}
const txt = (b) => {
  const t = b[b.type] || {};
  const arr = t.rich_text || t.title;
  if (Array.isArray(arr)) return arr.map(x => x.plain_text).join('');
  if (typeof arr === 'string') return arr;
  return '';
};

const children = (await get(`/blocks/${PAGE_ID}/children?page_size=100`)).results;
console.log('=== PAGE CHILDREN (' + children.length + ') ===');
for (const c of children) {
  console.log(`${c.id}  ${c.type.padEnd(16)}  "${txt(c).slice(0, 60)}"`);
}
console.log('\n=== TABLES ===');
for (const c of children.filter(b => b.type === 'table')) {
  const rows = (await get(`/blocks/${c.id}/children?page_size=100`)).results;
  console.log(`\nTABLE ${c.id} (${rows.length} rows)`);
  for (const r of rows) {
    const cells = r.table_row.cells.map(cell => cell.map(x => x.plain_text).join(' | '));
    console.log(`  ${r.id}  ${JSON.stringify(cells)}`);
  }
}
