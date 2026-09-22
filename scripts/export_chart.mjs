// Export the 9-series board as (1) a CSV and (2) a printable one-sheet HTML chart.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(join(here, 'data', 'season_plan.json'), 'utf8'));

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- CSV ---------------- */
const csvHeader = ['Series', 'Series name', 'Weeks', 'Term', 'Rotation', 'Category', 'Skill', 'Led by', 'Game', 'Backup activity', 'Course (fitness)', 'Equipment', 'Athletics event (series)', 'Learning cues', 'Adaptation (3-4yrs)', 'Watch for', 'Coach note (series)'];
const csvRows = [csvHeader];
for (const s of plan.series) {
  for (const r of s.rotations) {
    const course = r.stations && r.stations.length
      ? `${r.course} — ${r.stations.map((st, i) => `${i + 1}. ${st.move} (${st.how})`).join(' | ')}`
      : '';
    csvRows.push([
      s.series, s.name, s.weeksLabel, s.term, `Rotation ${r.order}`, r.category, r.skill, r.ledBy,
      r.game || '', r.backup || '', course, r.equipment, s.athleticsEvent,
      (r.cues || []).join(' · '), r.adaptation || '', r.watchFor || '', s.coachNote,
    ].map(csvCell));
  }
}
const csvText = '\uFEFF' + csvRows.map((r) => r.join(',')).join('\r\n');

/* ---------------- HTML chart ---------------- */
const catClass = { Game: 'cat-g', Manipulative: 'cat-m', 'Fitness Circuit': 'cat-f', Athletics: 'cat-a' };
const rows = plan.series.map((s) => {
  const byCat = {};
  for (const r of s.rotations) byCat[r.category] = r;
  const cell = (r) => {
    if (!r) return '<td></td>';
    const cls = catClass[r.category] || '';
    if (r.category === 'Fitness Circuit') {
      return `<td class="${cls}"><span class="rot">Balance obstacle course</span><br><span class="game">${esc(r.course)}</span><br><span class="bk">${esc((r.stations || []).length)} stations</span></td>`;
    }
    const bk = r.backup ? `<br><span class="bk">&#8635; ${esc(r.backup)}</span>` : '';
    return `<td class="${cls}"><span class="rot">${esc(r.skill)}</span><br><span class="game">${esc(r.game || '')}</span>${bk}</td>`;
  };
  return `<tr>
    <td><span class="sname">S${s.series} · ${esc(s.name)}</span><br><span class="weeks">${esc(s.dates.join(' & '))}</span></td>
    ${cell(byCat.Game)}${cell(byCat.Manipulative)}${cell(byCat['Fitness Circuit'])}${cell(byCat.Athletics)}
  </tr>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Get Set Go — 9 Series</title>
<style>
  @page { size: A4 landscape; margin: 7mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 6.6pt; color: #1a1a1a; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2mm; }
  h1 { font-size: 13pt; margin: 0; }
  .sub { font-size: 7.5pt; color: #444; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 0.6pt solid #b8b8b8; padding: 1.5mm 1.4mm; vertical-align: top; }
  th { background: #f0f0f0; text-align: left; font-size: 6.3pt; text-transform: uppercase; letter-spacing: .03em; }
  .sname { font-weight: 700; }
  .weeks { color: #555; font-size: 5.9pt; }
  .rot { font-weight: 700; font-size: 6.1pt; }
  .game { font-weight: 600; }
  .bk { color: #666; font-size: 5.7pt; }
  td.cat-g { border-left: 2pt solid #2e7d32; }
  td.cat-m { border-left: 2pt solid #c62828; }
  td.cat-f { border-left: 2pt solid #1565c0; }
  td.cat-a { border-left: 2pt solid #f9a825; }
  footer { margin-top: 2mm; font-size: 5.9pt; color: #555; line-height: 1.35; }
</style></head><body>
<header><div><h1>Get Set Go — 9 Series</h1></div>
<div class="sub">Term 4 2026 · Thu 15 Oct – 17 Dec &nbsp;|&nbsp; Term 1 2027 · Thu 4 Feb – 1 Apr &nbsp;|&nbsp; Thursdays 5:30–6:30 pm</div></header>
<table>
<thead><tr><th style="width:13%">Series</th><th style="width:21.75%">Game (warm-up)</th><th style="width:21.75%">Manipulative</th><th style="width:21.75%">Fitness Circuit</th><th style="width:21.75%">Athletics</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
<footer>
Final night: <b>Thu 1 Apr 2027 — Mini meet + prizegiving</b> (no rotations). Fitness circuits are obstacle courses with balance stations (different every series). The &#8635; backup activity uses the <b>same equipment</b> as the main game — no extra gear to bring out. Full station detail + equipment: taupoathletics.vercel.app/getsetgo
</footer>
</body></html>`;

const dl = join(homedir(), 'Downloads');
const csvPath = join(dl, 'Get Set Go - 9 series rotations.csv');
const htmlPath = join(dl, 'Get Set Go - 9 series wallchart.html');
writeFileSync(csvPath, csvText, 'utf8');
writeFileSync(htmlPath, html, 'utf8');
console.log(`Wrote ${csvPath}`);
console.log(`Wrote ${htmlPath}`);
