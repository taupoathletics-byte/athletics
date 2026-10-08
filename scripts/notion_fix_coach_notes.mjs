// One-off: fix the "Coach note" text on the Season Plan rows that drifted from
// their athletics event (and got further out of sync after the event swap).
// Writes directly; the notes are printed before they are applied so the change
// is reviewable.
//
//   NOTION_TOKEN=... node scripts/notion_fix_coach_notes.mjs

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) { console.error('NOTION_TOKEN is not set.'); process.exit(1); }

const SEASON_PLAN_DB = process.env.SEASON_PLAN_DB || '431cfcb0-636f-4e23-bcc6-d6782fe125b0';

const NOTES = {
  2: 'Foam hurdles only — the kind that fall over when clipped. Never rigid hurdles at this age.',
  3: 'Hand the beanbag over — never throw it — and keep the changeover zone clear. Announce when every team has finished, never who finished first.',
  4: 'Never rank the jumps. Every child marks their own landing with their own cone, and in Week B they try to beat the cone they set in Week A.',
  6: 'First two weeks back after the break — re-walk the boundaries and re-learn names. Foam hurdles only for the hurdle station.',
  7: 'IMPORTANT: no Fosbury flop, no landing on the back, no high jump mats at this age. Scissor over a low ELASTIC — never a rope — landing on the feet, every time.',
  8: 'Hand the beanbag over — never throw it — and keep the changeover zone clear.',
};

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${String(json.message || text).slice(0, 300)}`);
  return json;
}

const title = (p) => (p?.title || []).map((t) => t.plain_text).join('');

(async () => {
  let cursor;
  const rows = [];
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const r = await notion('POST', `/databases/${SEASON_PLAN_DB}/query`, body);
    rows.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  for (const row of rows) {
    const series = row.properties.Series?.number;
    if (series == null || !NOTES[series]) continue;
    console.log(`Series ${series} — ${title(row.properties.Name)}`);
    console.log(`  note → "${NOTES[series]}"`);
    await notion('PATCH', `/pages/${row.id}`, {
      properties: { 'Coach note': { rich_text: [{ type: 'text', text: { content: NOTES[series] } }] } },
    });
    console.log('  ✓ updated');
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log('\nDone. Re-run notion_pull_lessons.mjs + build_sessions.mjs.');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
