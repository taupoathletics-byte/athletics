// Reassign the Get Set Go athletics events so the juniors never need the long
// jump pit or high jump mat on a night the Run Jump Throw (seniors) squad is
// using it.
//
// DRY-RUN BY DEFAULT. Nothing is written to Notion unless you pass --apply.
//
//   NOTION_TOKEN=... node scripts/notion_swap_events.mjs           # show the plan
//   NOTION_TOKEN=... node scripts/notion_swap_events.mjs --apply   # write to Notion
//
// Result:  Long jump = series 4, 5, 9
//          High jump = series 1, 7
//          Hurdles   = series 2, 6
//          Relays    = series 3, 8
//
// The rotation-4 (Athletics) coaching content is MOVED, not rewritten: the
// first occurrence of each event keeps the "intro" version and the second keeps
// the "revisit" version, so the skill progression across the season is intact.

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error('NOTION_TOKEN is not set.');
  process.exit(1);
}
const APPLY = process.argv.includes('--apply');

const SEASON_PLAN_DB = process.env.SEASON_PLAN_DB || '431cfcb0-636f-4e23-bcc6-d6782fe125b0';
const ROTATIONS_DB = process.env.ROTATIONS_DB || '4b0e60ae-f329-4993-b46b-d2e8d489b413';

/** series -> { newEvent, newSkill, contentFromSeries } */
const SWAP = {
  1: { event: 'High jump', skill: 'Jumping for height', from: 2 },
  2: { event: 'Hurdles', skill: 'Hurdling', from: 3 },
  3: { event: 'Relays', skill: 'Relay changeover', from: 4 },
  4: { event: 'Long jump', skill: 'Jumping for distance', from: 1 },
  6: { event: 'Hurdles', skill: 'Hurdling', from: 7 },
  7: { event: 'High jump', skill: 'Jumping for height', from: 6 },
};

/** Fields that carry the event-specific coaching content (copied wholesale). */
const CONTENT_FIELDS = [
  'Event', 'Skill', 'Discovery Activity', 'Developing Activity', 'Consolidating Activity',
  'Week B Progression', 'Set up', 'How to play', 'Equipment', 'Adaptation (3-4yrs)',
  '5–6 Year Extension', 'Watch for', 'Coach Observation', 'Backup activity',
  'Learning cues', 'Game', 'Skills Covered',
];

async function notion(method, path, body) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
      continue;
    }
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${String(json.message || text).slice(0, 300)}`);
    return json;
  }
  throw new Error(`Notion ${method} ${path}: gave up after 4 attempts`);
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

function value(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title': return (prop.title || []).map((t) => t.plain_text).join('');
    case 'rich_text': return (prop.rich_text || []).map((t) => t.plain_text).join('');
    case 'select': return prop.select?.name ?? null;
    case 'multi_select': return (prop.multi_select || []).map((s) => s.name);
    case 'number': return prop.number ?? null;
    default: return null;
  }
}

const richText = (text) => (text ? { rich_text: [{ type: 'text', text: { content: text } }] } : { rich_text: [] });
const select = (name) => ({ select: { name } });
const multiSelect = (names) => ({ multi_select: (names || []).map((name) => ({ name })) });
const title = (text) => ({ title: [{ type: 'text', text: { content: text } }] });

(async () => {
  console.log(APPLY ? 'APPLYING (writing to Notion)…' : 'DRY RUN (no writes)…\n');

  const [planRows, rotationRows] = await Promise.all([queryAll(SEASON_PLAN_DB), queryAll(ROTATIONS_DB)]);

  // Series plan rows keyed by series number.
  const planBySeries = {};
  for (const row of planRows) {
    const series = value(row.properties.Series);
    if (series != null) planBySeries[series] = { id: row.id, properties: row.properties };
  }

  // The four Athletics rotations per series.
  const rotationBySeries = {};
  for (const row of rotationRows) {
    const series = value(row.properties.Series);
    const category = value(row.properties.Category);
    if (category === 'Athletics') rotationBySeries[series] = { id: row.id, properties: row.properties };
  }

  console.log('Found plan rows for series:', Object.keys(planBySeries).sort((a, b) => a - b).join(', '));
  console.log('Found athletics rotations for series:', Object.keys(rotationBySeries).sort((a, b) => a - b).join(', '));
  console.log();

  const changes = [];
  for (const [seriesStr, s] of Object.entries(SWAP)) {
    const series = Number(seriesStr);
    const target = rotationBySeries[series];
    const source = rotationBySeries[s.from];
    const plan = planBySeries[series];
    if (!target || !source || !plan) {
      console.error(`  ✗ series ${series}: missing target/source/plan row (target=${!!target} source=${!!source} plan=${!!plan})`);
      process.exit(1);
    }
    changes.push({ series, target, source, plan, event: s.event, skill: s.skill });
  }

  // Print the plan (snapshot sources BEFORE any write so the cycle is safe).
  const patches = [];
  for (const c of changes) {
    const srcProps = c.source.properties;
    const newName = `S${c.series} · R4 — ${c.skill} (Athletics)`;
    const properties = {};
    for (const f of CONTENT_FIELDS) {
      const prop = srcProps[f];
      if (!prop) continue;
      if (prop.type === 'select') properties[f] = select(f === 'Event' ? c.event : f === 'Skill' ? c.skill : value(prop));
      else if (prop.type === 'multi_select') properties[f] = multiSelect(value(prop));
      else if (prop.type === 'rich_text') properties[f] = richText(value(prop));
    }
    properties.Name = title(newName);

    patches.push({ id: c.target.id, properties, plan: { id: c.plan.id, event: c.event } });

    console.log(`Series ${c.series}: ${value(c.target.properties.Event)} → ${c.event}`);
    console.log(`  ${newName}`);
    console.log(`  content copied from series ${SWAP[c.series].from} (${value(c.source.properties.Skill)})`);
    console.log(`  Season Plan "Athletics event" → ${c.event}`);
    console.log();
  }

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to write these changes to Notion.');
    return;
  }

  console.log('Writing…');
  for (const p of patches) {
    await notion('PATCH', `/pages/${p.id}`, { properties: p.properties });
    await notion('PATCH', `/pages/${p.plan.id}`, { properties: { 'Athletics event': select(p.plan.event) } });
    console.log(`  ✓ series done (${p.plan.event})`);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log('\nDone. Re-run scripts/notion_pull_lessons.mjs, then npm run build:sessions to rebuild the site.');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
