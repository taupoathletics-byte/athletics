// Generate a date-ordered "Coming Up" wallchart (one row per club night) for the Under 6 programme.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(join(here, 'data', 'season_plan.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const catClass = { Game: 'cat-g', Manipulative: 'cat-m', 'Fitness Circuit': 'cat-f', Athletics: 'cat-a' };

// expand series -> one row per night
const nights = [];
for (const s of plan.series) {
  const byCat = {};
  for (const r of s.rotations) byCat[r.category] = r;
  s.dates.forEach((date, i) => {
    nights.push({ term: s.term, date, series: s.name, seriesNum: s.series, week: i + 1, byCat });
  });
}

function cell(r) {
  if (!r) return '<td></td>';
  const cls = catClass[r.category] || '';
  const label = r.category === 'Fitness Circuit' ? 'Obstacle course' : r.skill;
  const activity = r.category === 'Fitness Circuit' ? r.course : (r.game || '');
  return `<td class="${cls}"><span class="rot">${esc(label)}</span><br><span class="game">${esc(activity)}</span></td>`;
}

let rows = '';
let prevTerm = null;
for (const n of nights) {
  if (n.term !== prevTerm) {
    rows += `<tr class="term-row"><td colspan="6">${esc(n.term)}</td></tr>`;
    prevTerm = n.term;
  }
  rows += `<tr>
    <td class="date">${esc(n.date)}</td>
    <td><span class="sname">${esc(n.series)}</span> <span class="wk">Wk ${n.week}</span></td>
    ${cell(n.byCat.Game)}${cell(n.byCat.Manipulative)}${cell(n.byCat['Fitness Circuit'])}${cell(n.byCat.Athletics)}
  </tr>`;
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Get Set Go — Coming Up</title>
<style>
  @page { size: A4 landscape; margin: 7mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 6.4pt; color: #1a1a1a; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2mm; }
  h1 { font-size: 13pt; margin: 0; }
  .sub { font-size: 7.5pt; color: #444; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 0.6pt solid #b8b8b8; padding: 1.2mm 1.3mm; vertical-align: top; }
  th { background: #f0f0f0; text-align: left; font-size: 6.2pt; text-transform: uppercase; letter-spacing: .03em; }
  .date { font-weight: 700; white-space: nowrap; }
  .sname { font-weight: 700; }
  .wk { color: #777; font-size: 5.7pt; }
  .rot { font-weight: 700; font-size: 5.9pt; }
  .game { font-weight: 600; }
  .term-row td { background: #eef2f6; font-weight: 800; font-size: 6.6pt; text-transform: uppercase; letter-spacing: .04em; padding: 1mm 1.3mm; }
  td.cat-g { border-left: 2pt solid #2e7d32; }
  td.cat-m { border-left: 2pt solid #c62828; }
  td.cat-f { border-left: 2pt solid #1565c0; }
  td.cat-a { border-left: 2pt solid #f9a825; }
  footer { margin-top: 2mm; font-size: 5.8pt; color: #555; line-height: 1.35; }
</style></head><body>
<header><div><h1>Get Set Go — Under 6 · Coming Up</h1></div>
<div class="sub">Term 4 2026 · Thu 15 Oct – 17 Dec &nbsp;|&nbsp; Term 1 2027 · Thu 4 Feb – 1 Apr &nbsp;|&nbsp; Thursdays 5:30–6:30 pm</div></header>
<table>
<thead><tr><th style="width:11%">Date</th><th style="width:15%">Series</th><th style="width:18.5%">Game (warm-up)</th><th style="width:18.5%">Manipulative</th><th style="width:18.5%">Fitness Circuit</th><th style="width:18.5%">Athletics</th></tr></thead>
<tbody>
${rows}
<tr class="term-row"><td colspan="6">Thu 1 Apr — Mini meet + prizegiving (no rotations)</td></tr>
</tbody>
</table>
<footer>
Each series runs two weeks with the same four rotations (a fresh same-gear game is the backup if they get restless). Every night ends with a warm-down: sprints in age groups — 3–4yrs 15m, 5yrs 20m, 6yrs 25–30m, two runs each. Full station detail + equipment: taupoathletics.vercel.app/getsetgo
</footer>
</body></html>`;

const dl = join(homedir(), 'Downloads');
const htmlPath = join(dl, 'Get Set Go - Coming Up wallchart.html');
writeFileSync(htmlPath, html, 'utf8');
console.log(`Wrote ${htmlPath} (${nights.length} nights)`);
