// Sync the new 9-series season plan into Notion:
//   1. update the Series Rotations database schema (select options + Term + Course)
//   2. archive the old 40 rows
//   3. create the 36 new rows (9 series x 4 rotations)
//   4. update the Athletics page's stale text and tables
// Usage: NOTION_TOKEN=... node scripts/notion_sync.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.NOTION_TOKEN;
const VERSION = '2022-06-28';
const BASE = 'https://api.notion.com/v1';

const DB_ID = '4b0e60aef3294993b46bd2e8d489b413';
const PAGE_ID = '3e20d85f784c819ca575f22bfb38c49b';

const plan = JSON.parse(readFileSync(join(here, 'data', 'season_plan.json'), 'utf8'));

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const msg = json.message || json.raw || text;
    throw new Error(`${method} ${path} -> ${res.status}: ${String(msg).slice(0, 400)}`);
  }
  return json;
}

const rt = (content) => (content ? [{ type: 'text', text: { content } }] : []);
const opts = (list) => list.map(([name]) => ({ name }));

function termOption(term) {
  return term === 'Term 1' ? 'Term 1 (2027)' : 'Term 4 (2026)';
}

/* ---------------- 1. schema ---------------- */
async function updateSchema() {
  const schema = await api('GET', `/databases/${DB_ID}`);
  const has = (n) => Object.prototype.hasOwnProperty.call(schema.properties, n);

  if (has('Block')) {
    await api('PATCH', `/databases/${DB_ID}`, { properties: { Block: { name: 'Term' } } });
    console.log('Schema: renamed Block -> Term');
  }
  if (!has('Course')) {
    await api('PATCH', `/databases/${DB_ID}`, { properties: { Course: { rich_text: {} } } });
    console.log('Schema: added Course');
  }

  await api('PATCH', `/databases/${DB_ID}`, {
    properties: {
      Term: { select: { options: opts([['Term 4 (2026)'], ['Term 1 (2027)']]) } },
      Event: { select: { options: opts([['High jump'], ['Long jump'], ['Relays'], ['Hurdles']]) } },
      Category: { select: { options: opts([['Game'], ['Manipulative'], ['Fitness Circuit'], ['Athletics']]) } },
      'Led by': { select: { options: opts([['Coach'], ['Parent helper']]) } },
      Skill: {
        select: {
          options: opts([
            ['Running'], ['Dodging'], ['Hopping'], ['Skipping and galloping'],
            ['Jumping for distance'], ['Jumping for height'], ['Hurdling'], ['Relay changeover'],
            ['Underarm throwing'], ['Overarm throwing'], ['Catching'], ['Kicking'], ['Striking'],
            ['Fitness & balance'],
          ]),
        },
      },
    },
  });
  console.log('Schema: select options updated');
}

/* ---------------- 2. archive old rows ---------------- */
async function archiveOldRows() {
  let cursor;
  let archived = 0;
  do {
    const q = await api('POST', `/databases/${DB_ID}/query`, { page_size: 100, start_cursor: cursor });
    for (const r of q.results) {
      try {
        await api('PATCH', `/pages/${r.id}`, { archived: true });
        archived++;
      } catch (e) {
        console.log(`  archive failed ${r.id}: ${e.message}`);
      }
    }
    cursor = q.has_more ? q.next_cursor : undefined;
  } while (cursor);
  console.log(`Archived ${archived} old rows`);
}

/* ---------------- 3. create new rows ---------------- */
function buildRows() {
  const rows = [];
  for (const s of plan.series) {
    for (const r of s.rotations) {
      const course = r.stations && r.stations.length
        ? `${r.course || ''}\n${r.stations.map((st, i) => `${i + 1}. ${st.move} — ${st.how}`).join('\n')}`
        : '';
      rows.push({
        title: `S${s.series} · R${r.order} — ${r.skill} (${r.category})`,
        series: s.series,
        seriesName: s.name,
        weeks: s.weeksLabel,
        term: termOption(s.term),
        rotation: `Rotation ${r.order}`,
        category: r.category,
        skill: r.skill,
        event: s.athleticsEvent,
        ledBy: r.ledBy,
        weekA: r.weekA || '',
        weekB: r.weekB || '',
        course,
        equipment: r.equipment,
        cues: (r.cues || []).join(' · '),
        adaptation: r.adaptation || '',
        watchFor: r.watchFor || '',
      });
    }
  }
  return rows;
}

async function createRows() {
  const rows = buildRows();
  let created = 0;
  for (const r of rows) {
    try {
      await api('POST', '/pages', {
        parent: { database_id: DB_ID },
        properties: {
          Name: { title: rt(r.title) },
          Series: { number: r.series },
          'Series name': { rich_text: rt(r.seriesName) },
          Weeks: { rich_text: rt(r.weeks) },
          Term: { select: { name: r.term } },
          Rotation: { select: { name: r.rotation } },
          Category: { select: { name: r.category } },
          Skill: { select: { name: r.skill } },
          Event: { select: { name: r.event } },
          'Led by': { select: { name: r.ledBy } },
          'Week A game': { rich_text: rt(r.weekA) },
          'Week B game': { rich_text: rt(r.weekB) },
          Course: { rich_text: rt(r.course) },
          Equipment: { rich_text: rt(r.equipment) },
          'Learning cues': { rich_text: rt(r.cues) },
          'Adaptation (3-4yrs)': { rich_text: rt(r.adaptation) },
          'Watch for': { rich_text: rt(r.watchFor) },
        },
      });
      created++;
    } catch (e) {
      console.log(`  create failed [${r.title}]: ${e.message}`);
    }
  }
  console.log(`Created ${created}/${rows.length} rows`);
}

/* ---------------- 4. page text ---------------- */
async function patchText(id, type, text) {
  await api('PATCH', `/blocks/${id}`, { [type]: { rich_text: rt(text) } });
}

async function updatePageText() {
  await patchText('0b467c79-3503-4261-916e-2ac17c21709d', 'paragraph',
    'Get Set Go — the Taupō Athletics programme for 3–6 year olds, as an editable board.');
  await patchText('dd28d6bb-0156-4202-8b1c-978ffa6f0490', 'paragraph',
    'Current structure: 9 series × 2 weeks, then a final mini-meet/prizegiving night. Each series keeps the same four rotations for two consecutive weeks — the same skill both weeks, a fresh game the second week.');
  await patchText('c3dcb0df-cc3f-4740-8b2a-ca47012632de', 'paragraph',
    'Get Set Go — Series Rotations — the live board. 36 rows: 9 series × 4 rotations. Views: Series plan (grouped by series — all four rotations together), Board — by category, Board — by event.');
  await patchText('202195f4-d32b-4378-a9c8-cd48cff5f278', 'heading_2', 'The nine series');
  await patchText('1c017f61-de3e-48a6-b8c7-5636f1cfb264', 'paragraph',
    'Every series runs exactly one Game, one Manipulative, one Fitness Circuit and one Athletics rotation — 36 rotations, no gaps.');
  await patchText('ed130c76-c2d3-4fd3-8016-354943465602', 'paragraph',
    'Athletics covers high jump, long jump, relays and hurdles. Shot put and discus are dropped — throwing is covered in the Manipulative rotation. Sprints stay as the weekly warm-down.');
  await patchText('768c5af8-e4b9-46c3-8084-8c2279bf51a4', 'paragraph',
    'Manipulative skills are spread evenly across the season: throwing (underarm and overarm), catching, kicking and striking.');
  await patchText('285b77eb-9839-4e0c-b272-968c68be0355', 'heading_2', 'The terms');
  await patchText('b24edb2c-0b5e-4a6a-b457-2106546755e8', 'bulleted_list_item',
    'Beanbags before balls. Foam before real. No rigid hurdles, no real discus, no high jump mats at this age — high jump is a scissor over a low elastic.');
  console.log('Page text updated');
}

/* ---------------- 5. tables ---------------- */
async function deleteBlock(id) {
  try { await api('DELETE', `/blocks/${id}`); }
  catch (e) { console.log(`  delete ${id} skipped: ${e.message}`); }
}

async function createTable(parentId, afterId, header, rows) {
  const children = [header, ...rows].map((cells) => ({
    type: 'table_row',
    table_row: { cells: cells.map((c) => rt(c)) },
  }));
  const body = {
    children: [{
      type: 'table',
      table: { table_width: header.length, has_column_header: true, has_row_header: false, children },
    }],
  };
  if (afterId) body.after = afterId;
  await api('POST', `/blocks/${parentId}/children`, body);
}

async function updateTables() {
  // four rotations table
  await deleteBlock('e6e62eca-b512-4a3c-b63e-65b63ac355b7');
  await createTable(PAGE_ID, '4dcb24b2-9256-4acf-8a8f-79f4ddc1490c',
    ['Rotation', 'What happens', 'Led by'], [
      ['Game', 'A movement game to warm everyone up — this IS the warm-up', 'Parent helper'],
      ['Manipulative', 'One skill per series: throwing, catching, kicking or striking (even spread across the season)', 'Coach'],
      ['Fitness Circuit', 'An obstacle course with balance stations (e.g. bear crawl from A to B), different every series', 'Parent helper'],
      ['Athletics', 'High jump, long jump, relays or hurdles — no shot put or discus (throwing is covered in Manipulative)', 'Coach'],
    ]);

  // nine series table
  await deleteBlock('fa0bb502-ec5b-49e1-b82c-5fc45d18e07a');
  await createTable(PAGE_ID, '202195f4-d32b-4378-a9c8-cd48cff5f278',
    ['S', 'Weeks', 'Series name', 'Athletics event'], [
      ['1', '1–2 · 15 & 22 Oct', 'Finding our feet', 'Long jump'],
      ['2', '3–4 · 29 Oct & 5 Nov', 'Catch and jump', 'High jump'],
      ['3', '5–6 · 12 & 19 Nov', 'Throw it far', 'Hurdles'],
      ['4', '7–8 · 26 Nov & 3 Dec', 'Kick it up', 'Relays'],
      ['5', '9–10 · 10 & 17 Dec', 'Swing and hit', 'Long jump'],
      ['6', '11–12 · 4 & 11 Feb', 'Catch it again', 'High jump'],
      ['7', '13–14 · 18 & 25 Feb', 'Kick and chase', 'Hurdles'],
      ['8', '15–16 · 4 & 11 Mar', 'Strike again', 'Relays'],
      ['9', '17–18 · 18 & 25 Mar', 'Beat your best', 'Long jump'],
    ]);

  // terms table (replaces four blocks)
  await deleteBlock('c954fc03-fe98-4e6e-9e45-70ee6ffbb8f8');
  await createTable(PAGE_ID, '285b77eb-9839-4e0c-b272-968c68be0355',
    ['Term', 'Dates', 'Series'], [
      ['Term 4 (2026)', 'Thu 15 Oct – Thu 17 Dec', 'Series 1–5'],
      ['Term 1 (2027)', 'Thu 4 Feb – Thu 1 Apr', 'Series 6–9 + mini meet'],
    ]);

  // event coverage table
  await deleteBlock('79c4927d-dc60-41ff-8bc3-6cf4059d823d');
  await createTable(PAGE_ID, '85ddab8d-9baa-4e74-87ac-67bdc3feedb9',
    ['Coverage', 'Series'], [
      ['Long jump', '1, 5, 9'],
      ['High jump', '2, 6'],
      ['Hurdles', '3, 7'],
      ['Relays', '4, 8'],
      ['Throwing', '1, 3, 9'],
      ['Catching', '2, 6'],
      ['Kicking', '4, 7'],
      ['Striking', '5, 8'],
      ['Fitness circuits', '1–9 (all different)'],
    ]);
  console.log('Tables rebuilt');
}

/* ---------------- run ---------------- */
async function main() {
  await archiveOldRows();
  await updateSchema();
  await createRows();
  await updatePageText();
  await updateTables();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
