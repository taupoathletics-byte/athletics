// Full re-sync of the 36 Series Rotations rows from season_plan.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const DB_ID = '4b0e60aef3294993b46bd2e8d489b413';
const plan = JSON.parse(readFileSync(join(here, 'data', 'season_plan.json'), 'utf8'));

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

const lookup = {};
for (const s of plan.series) {
  lookup[s.series] = {};
  for (const r of s.rotations) lookup[s.series][r.order] = r;
}

let cursor, patched = 0;
do {
  const q = await api('POST', `/databases/${DB_ID}/query`, { page_size: 100, start_cursor: cursor });
  for (const row of q.results) {
    const p = row.properties;
    const series = p.Series && p.Series.number;
    const rot = p.Rotation && p.Rotation.select && p.Rotation.select.name;
    const order = rot ? parseInt(rot.replace('Rotation ', ''), 10) : null;
    const r = series != null && order != null ? (lookup[series] && lookup[series][order]) : null;
    if (!r) continue;

    const course = r.stations && r.stations.length
      ? `${r.course}\n${r.stations.map((st, i) => `${i + 1}. ${st.move} — ${st.how}`).join('\n')}`
      : '';

    await api('PATCH', `/pages/${row.id}`, {
      properties: {
        Skill: { select: { name: r.skill } },
        Game: { rich_text: rt(r.game || '') },
        'Backup activity': { rich_text: rt(r.backup || '') },
        Course: { rich_text: rt(course) },
        Equipment: { rich_text: rt(r.equipment || '') },
        'Learning cues': { rich_text: rt((r.cues || []).join(' · ')) },
        'Adaptation (3-4yrs)': { rich_text: rt(r.adaptation || '') },
        'Watch for': { rich_text: rt(r.watchFor || '') },
      },
    });
    patched++;
    await new Promise(r2 => setTimeout(r2, 250));
  }
  cursor = q.has_more ? q.next_cursor : undefined;
} while (cursor);

console.log(`Re-synced ${patched} rows.`);
