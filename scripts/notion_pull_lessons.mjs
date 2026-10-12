// Pull the Get Set Go 2026/27 lesson data out of Notion.
//
//   NOTION_TOKEN=... node scripts/notion_pull_lessons.mjs
//
// Sources (all read-only — this never writes back to Notion):
//   1. "Get Set Go — 19 Weekly Lessons (2026–27)"  page + its 19 week sub-pages
//   2. "Get Set Go — Series Rotations"             database (36 rows)
//   3. scripts/data/series-meta.json               series-level metadata (the old
//      "Season Plan" database was deleted; its static fields live here now)
//
// Writes a committed snapshot to scripts/data/lessons.json. The snapshot is
// written to disk deliberately rather than generated only at build time, so a
// bad pull is a revertable commit rather than a silent change.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'data', 'lessons.json');

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error('NOTION_TOKEN is not set. Pass it in the environment:\n  NOTION_TOKEN=... node scripts/notion_pull_lessons.mjs');
  process.exit(1);
}

const LESSONS_PAGE = process.env.LESSONS_PAGE || '3f30d85f-784c-810a-9a86-d6fb222ecb7f';
const ROTATIONS_DB = process.env.ROTATIONS_DB || '4b0e60ae-f329-4993-b46b-d2e8d489b413';

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
      const wait = 600 * attempt;
      console.warn(`  Notion ${res.status} — retry ${attempt} in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
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

async function children(blockId) {
  const out = [];
  let cursor;
  do {
    const q = `?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const r = await notion('GET', `/blocks/${blockId}/children${q}`);
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

/** Table blocks hold their rows in child blocks; fetch them inline. */
async function expandTables(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'table') {
      const rows = await children(b.id);
      out.push({
        type: 'table',
        text: rows.map((r) => (r.table_row?.cells || []).map((cell) => cell.map((t) => t.plain_text).join('')).join(' | ')).join('\n'),
        rows: rows.map((r) => (r.table_row?.cells || []).map((cell) => cell.map((t) => t.plain_text).join(''))),
      });
    } else {
      out.push(b);
    }
  }
  return out;
}

const textOf = (arr) => (arr || []).map((t) => t.plain_text).join('').trim();
const blockText = (b) => textOf((b[b.type] || {}).rich_text);
const blockType = (b) => b.type;

/** Walk a page's blocks into { type, text } pairs, tracking headings. */
function toFlat(blocks) {
  return blocks.map((b) => ({ type: blockType(b), text: blockText(b) }));
}

/** Pull the section that follows a given heading_2 (or heading_3). */
function sectionAfter(flat, headingMatch) {
  const start = flat.findIndex((b) => /^heading_/.test(b.type) && headingMatch.test(b.text));
  if (start < 0) return null;
  const out = { heading: flat[start].text, items: [], paragraph: '' };
  for (let i = start + 1; i < flat.length; i += 1) {
    if (/^heading_/.test(flat[i].type)) break;
    if (flat[i].type === 'paragraph' && flat[i].text) out.paragraph += (out.paragraph ? ' ' : '') + flat[i].text;
    if (flat[i].type === 'bulleted_list_item' && flat[i].text) out.items.push(flat[i].text);
    if (flat[i].type === 'numbered_list_item' && flat[i].text) out.items.push(flat[i].text);
  }
  return out;
}

function value(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title': return textOf(prop.title);
    case 'rich_text': return textOf(prop.rich_text);
    case 'select': return prop.select?.name ?? null;
    case 'multi_select': return (prop.multi_select || []).map((s) => s.name);
    case 'number': return prop.number ?? null;
    case 'checkbox': return prop.checkbox;
    case 'url': return prop.url || null;
    case 'date': return prop.date?.start || null;
    case 'status': return prop.status?.name ?? null;
    default: return null;
  }
}

function rowToObject(row) {
  const out = { _id: row.id };
  for (const [name, prop] of Object.entries(row.properties)) out[name] = value(prop);
  return out;
}

/** "Week A: x | Week B: y" -> { a, b } */
function splitWeeks(text) {
  if (!text) return { a: '', b: '' };
  const norm = String(text).replace(/\r/g, '').replace(/\s*\|\s*$/, '');
  const a = norm.match(/Week\s*A\s*:?\s*([\s\S]*?)(?=Week\s*B\s*:|$)/i);
  const b = norm.match(/Week\s*B\s*:?\s*([\s\S]*)$/i);
  if (a || b) return { a: (a?.[1] || '').replace(/\s*\|\s*$/, '').trim(), b: (b?.[1] || '').replace(/\s*\|\s*$/, '').trim() };
  return { a: norm.trim(), b: '' };
}

/** "Name A → Name B" -> the two week challenges. */
function splitChallenges(text) {
  if (!text) return { a: '', b: '' };
  const parts = String(text).split(/\s*(?:→|->)\s*/);
  return { a: (parts[0] || '').trim(), b: (parts[1] || '').trim() };
}

(async () => {
  console.log('Pulling from Notion…');

  const [rotationRows, introBlocks] = await Promise.all([
    queryAll(ROTATIONS_DB),
    children(LESSONS_PAGE),
  ]);
  console.log(`  rotation rows:    ${rotationRows.length}`);

  const introExpanded = await expandTables(introBlocks);
  const introFlat = toFlat(introExpanded);

  const childPages = introExpanded.filter((b) => b.type === 'child_page');
  console.log(`  weekly lesson pages: ${childPages.length}`);

  const weeks = [];
  for (const cp of childPages) {
    const blocks = await expandTables(await children(cp.id));
    const flat = toFlat(blocks);
    const title = cp.child_page?.title || '';
    const num = Number((title.match(/Week\s*(\d+)/i) || [])[1]) || null;
    const phase = (title.match(/\((Discover|Apply)\)/i) || [])[1] || '';
    const header = flat.find((b) => b.type === 'quote')?.text || '';
    const seriesBits = flat.find((b) => b.type === 'paragraph' && /^Series\s*\d/i.test(b.text))?.text || '';
    weeks.push({
      week: num,
      title,
      phase,
      header,
      seriesBits,
      intendedLearning: sectionAfter(flat, /intended learning/i)?.paragraph || '',
      runOfShow: sectionAfter(flat, /run of show/i)?.items || [],
      sections: flat.filter((b) => /^heading_/.test(b.type)).map((h) => h.text),
    });
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 120)); // be kind to the API
  }
  console.log();

  const programme = {
    title: 'Get Set Go — 19 Weekly Lessons (2026–27)',
    intro: introFlat.filter((b) => b.type === 'paragraph').map((b) => b.text).filter(Boolean),
    howEverySessionWorks: sectionAfter(introFlat, /how every teaching session works/i),
    coachingPrinciples: sectionAfter(introFlat, /coaching principles/i),
    sourceOfTruth: sectionAfter(introFlat, /source of truth/i),
    recordWhatMatters: sectionAfter(introFlat, /record only what matters/i),
    weeklyOverview: introExpanded.find((b) => b.type === 'table')?.rows || [],
  };

  // The old "Season Plan" database is deleted. Series-level metadata (name, term,
  // weeks, dates, coach note, circuit) is static and kept in series-meta.json;
  // only the athletics event is read fresh, from the overview table on the
  // lessons page, so a future event swap is picked up automatically.
  const seriesMeta = JSON.parse(readFileSync(join(here, 'data', 'series-meta.json'), 'utf8'));
  const overviewEvents = {};
  for (const row of (programme.weeklyOverview || []).slice(1)) {
    const num = Number(String(row[0] || '').replace(/\D/g, ''));
    if (num && row[2]) overviewEvents[num] = String(row[2]).trim();
  }
  const series = seriesMeta
    .map((s) => ({ ...s, athleticsEvent: overviewEvents[s.series] || s.athleticsEvent }))
    .sort((a, b) => (a.series ?? 0) - (b.series ?? 0));

  const rotations = rotationRows.map((r) => {
    const o = rowToObject(r);
    const cues = splitWeeks(o['Learning cues']);
    const challenges = splitChallenges(o.Game);
    return {
      series: o.Series,
      seriesName: o['Series name'],
      term: o.Term,
      weeks: o.Weeks,
      rotation: o.Rotation,
      order: Number(String(o.Rotation || '').replace(/\D/g, '')) || null,
      category: o.Category,
      skill: o.Skill,
      ledBy: o['Led by'],
      event: o.Event,
      skillsCovered: o['Skills Covered'] || [],
      course: o.Course || '',
      weekA: { challenge: challenges.a, cues: cues.a },
      weekB: { challenge: challenges.b, cues: cues.b },
      discovery: o['Discovery Activity'] || '',
      developing: o['Developing Activity'] || '',
      consolidating: o['Consolidating Activity'] || '',
      weekBProgression: o['Week B Progression'] || '',
      setup: o['Set up'] || '',
      how: o['How to play'] || '',
      equipment: o.Equipment || '',
      adaptation: o['Adaptation (3-4yrs)'] || '',
      extension: o['5–6 Year Extension'] || '',
      watchFor: o['Watch for'] || '',
      coachObservation: o['Coach Observation'] || '',
      backup: o['Backup activity'] || '',
      name: o.Name,
      _id: o._id,
    };
  }).sort((a, b) => (a.series ?? 0) - (b.series ?? 0) || (a.order ?? 0) - (b.order ?? 0));

  const payload = {
    pulledAt: new Date().toISOString(),
    source: { lessonsPage: LESSONS_PAGE, rotationsDb: ROTATIONS_DB },
    programme,
    weeks: weeks.sort((a, b) => (a.week ?? 0) - (b.week ?? 0)),
    series,
    rotations,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log();
  console.log(`Wrote ${OUT}`);
  console.log(`  programme sections: ${Object.keys(programme).length}`);
  console.log(`  week pages:         ${weeks.length}`);
  console.log(`  series:             ${series.length}`);
  console.log(`  rotations:          ${rotations.length}`);
  const perSeries = {};
  for (const r of rotations) perSeries[r.series] = (perSeries[r.series] || 0) + 1;
  console.log('  rotations per series:', JSON.stringify(perSeries));
  const noRun = weeks.filter((w) => !w.runOfShow.length);
  if (noRun.length) console.log(`  WARNING: ${noRun.length} week page(s) have no run-of-show bullets: ${noRun.map((w) => w.week).join(', ')}`);
  const noPhase = rotations.filter((r) => !r.discovery && !r.developing && !r.consolidating);
  if (noPhase.length) console.log(`  WARNING: ${noPhase.length} rotation(s) have no phase content`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
