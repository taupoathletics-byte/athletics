// Add "Set up" and "How to play" to the Series Rotations board so each row is
// fully self-contained (matching what the website shows per rotation).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const DB_ID = '4b0e60aef3294993b46bd2e8d489b413';
const plan = JSON.parse(readFileSync(join(here, 'data', 'season_plan.json'), 'utf8'));
const games = JSON.parse(readFileSync(join(here, 'data', 'games.json'), 'utf8'));

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
const rt = (c) => (c ? [{ type: 'text', text: { content: c } }] : []);

// 1. add the two properties
await api('PATCH', `/databases/${DB_ID}`, {
  properties: { 'Set up': { rich_text: {} }, 'How to play': { rich_text: {} } },
});
console.log('Added "Set up" and "How to play" properties');

// 2. lookup series -> order -> rotation
const lookup = {};
for (const s of plan.series) {
  lookup[s.series] = {};
  for (const r of s.rotations) lookup[s.series][r.order] = r;
}

// 3. patch each row
let cursor, patched = 0, withDetail = 0;
do {
  const q = await api('POST', `/databases/${DB_ID}/query`, { page_size: 100, start_cursor: cursor });
  for (const row of q.results) {
    const p = row.properties;
    const series = p.Series && p.Series.number;
    const rot = p.Rotation && p.Rotation.select && p.Rotation.select.name;
    const order = rot ? parseInt(rot.replace('Rotation ', ''), 10) : null;
    const r = series != null && order != null ? (lookup[series] && lookup[series][order]) : null;
    if (!r) continue;
    const g = r.game ? games[r.game] : null;
    await api('PATCH', `/pages/${row.id}`, {
      properties: {
        'Set up': { rich_text: rt(g ? g.setup : '') },
        'How to play': { rich_text: rt(g ? g.how : '') },
      },
    });
    if (g) withDetail++;
    patched++;
    await new Promise(r2 => setTimeout(r2, 200));
  }
  cursor = q.has_more ? q.next_cursor : undefined;
} while (cursor);

console.log(`Patched ${patched} rows (${withDetail} with set up / how to play).`);
