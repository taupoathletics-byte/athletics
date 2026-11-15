'use strict';

/* ============================================================
   Get Set Go — Volunteer Portal
   Vanilla HTML/CSS/JS single-page app.
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------- rotation-category accents (traffic-light) ---------- */
function categoryClass(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('manipulat')) return 'cat-manipulative';
  if (c.includes('fitness') || c.includes('stability')) return 'cat-stability';
  if (c.includes('athletic')) return 'cat-athletics';
  return 'cat-locomotor';
}

function initials(name) {
  return String(name || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ---------- admin auth ----------
   The attendance + records APIs require an admin session cookie. On a 401 we
   ask for the shared passcode once, exchange it for a cookie via /api/auth,
   then retry the original request. The passcode is never stored in the browser. */
let authInFlight = null;

async function authedFetch(url, options) {
  let res = await fetch(url, options);
  if (res.status !== 401) return res;
  if (!authInFlight) authInFlight = promptPasscode();
  const ok = await authInFlight;
  authInFlight = null;
  if (!ok) return res;
  return fetch(url, options);
}

/** The admin account's email. Not a secret — it is the club's public address. */
const CLUB_ADMIN_EMAIL = 'taupoathletics@gmail.com';

/**
 * Exchange the admin password for a signed session cookie.
 *
 * The comparison happens SERVER-SIDE in /api/auth against ADMIN_PASSCODE. It
 * must never happen in this file: everything here is served publicly at
 * /getsetgo/script.js, so a credential written here is readable by anyone who
 * views the source — and that would hand out a session that can read every
 * child's name, age and attendance record.
 */
async function submitPasscode(passcode) {
  try {
    const r = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function promptPasscode() {
  return new Promise((resolve) => {
    const passcode = window.prompt('Enter the club passcode to continue:');
    if (!passcode) return resolve(false);
    submitPasscode(passcode).then((ok) => {
      if (!ok) window.alert('Incorrect passcode.');
      resolve(ok);
    });
  });
}

/* ---------- mock data (no source files provided for these yet) ---------- */
const MOCK_MEMBERS = [
  { name: 'Jane Doe', group: 'Group A', age: 4 },
  { name: 'Tom Smith', group: 'Group B', age: 5 },
  { name: 'Elijah Jones', group: 'Group A', age: 4 },
  { name: 'Mia Thompson', group: 'Group C', age: 6 },
  { name: 'Leo Carmichael', group: 'Group B', age: 5 },
  { name: 'Ava Robinson', group: 'Group A', age: 3 },
  { name: 'Sam Rivera', group: 'Coach', age: 0, role: 'Junior Coach' },
  { name: 'Noah Williams', group: 'Group C', age: 6 },
  { name: 'Isla Brown', group: 'Group B', age: 5 },
  { name: 'Kai Nguyen', group: 'Group A', age: 4 },
  { name: 'Zoe Miller', group: 'Group C', age: 6 },
  { name: 'Oscar Taylor', group: 'Group B', age: 5 }
];

const MOCK_ATTENDANCE = [
  { name: 'Liam Smith', weeks: [1, 1, 1, 0, 1] },
  { name: 'Olivia Johnson', weeks: [1, 1, 1, 1, 1] },
  { name: 'Noah Williams', weeks: [0, 1, 1, 1, 0] },
  { name: 'Emma Brown', weeks: [1, 0, 1, 1, 1] },
  { name: 'James Taylor', weeks: [1, 1, 0, 0, 1] },
  { name: 'Ava Wilson', weeks: [1, 1, 1, 1, 0] }
];

const MOCK_STATS = {
  totalMembers: 142,
  avgAttendance: 85,
  pendingTshirts: 18
};

const MOCK_INVENTORY = [
  { size: 'Size 4', ordered: 12, purchased: 15, delivered: 10 },
  { size: 'Size 6', ordered: 24, purchased: 24, delivered: 24 },
  { size: 'Size 8', ordered: 18, purchased: 20, delivered: 15 }
];

const MOCK_ORDERS = [
  { name: 'Noah Williams', personalisation: 'NOAH W', age: 'Age 5', size: 'Size 6', status: 'Personalised' },
  { name: 'Liam Smith', personalisation: 'SPEEDY LIAM', age: 'Age 4', size: 'Size 4', status: 'Ready for Pickup' },
  { name: 'Isla Brown', personalisation: 'ISLA B', age: 'Age 5', size: 'Size 6', status: 'Delayed' }
];

/* ---------- state ---------- */
let season = null;
let series = [];
let adminLoggedIn = false;

/* ============================================================
   Run Sheets
   ============================================================ */
/* The run sheets are fetched from the gated /api/sessions endpoint, not from a
   static file. They used to live at public/getsetgo/sessions.json, which anyone
   could download without signing in. */
function loadSessions() {
  authedFetch('/api/sessions').then(r => {
    if (!r.ok) throw new Error('no sessions');
    return r.json();
  }).then(data => {
    season = data.season || null;
    series = data.series || [];
    if (adminLoggedIn && adminSection === 'runsheets') renderRunSheets();
  }).catch(() => {
    console.warn('Could not load the run sheets.');
    season = null; series = [];
    if (adminLoggedIn && adminSection === 'runsheets') renderRunSheets();
  });
}

function ledClass(ledBy) {
  return /coach/i.test(ledBy || '') ? 'led-coach' : 'led-helper';
}

/* One of the three phases offered inside every 11-minute station: a 2–3 minute
   Discovery invitation, 3–4 minutes of Developing practice, then 4–5 minutes
   Consolidating through a game. Nobody has to progress past their readiness. */
function phaseHTML(label, text, mins) {
  if (!text) return '';
  return `
    <div class="phase">
      <div class="phase__head"><span class="phase__label">${esc(label)}</span><span class="phase__mins">${esc(mins)}</span></div>
      <p>${esc(text)}</p>
    </div>`;
}

function weekPairHTML(r) {
  const a = r.weekA || {};
  const b = r.weekB || {};
  if (!a.challenge && !b.challenge) return '';
  const block = (label, w, cls) => `
    <div class="week-block ${cls}">
      <span class="week-block__label">${label}</span>
      ${w.challenge ? `<strong>${esc(w.challenge)}</strong>` : ''}
      ${w.cues ? `<p>${esc(w.cues)}</p>` : ''}
    </div>`;
  return `<div class="week-pair">
    ${block('Week A', a, 'week-block--a')}
    ${block('Week B', b, 'week-block--b')}
  </div>`;
}

function rotationHTML(r) {
  const skills = (r.skillsCovered || []).map(s => `<span class="skill-tag">${esc(s)}</span>`).join('');
  const phases = [
    phaseHTML('Discovery', r.discovery, '2–3 min'),
    phaseHTML('Developing', r.developing, '3–4 min'),
    phaseHTML('Consolidating', r.consolidating, '4–5 min'),
  ].filter(Boolean).join('');

  return `
    <div class="rotation ${categoryClass(r.category)}">
      <div class="rotation__head">
        <div>
          <div class="rotation__num">Rotation ${r.order} · ${esc(r.category)}</div>
          <h4 class="rotation__title">${esc(r.skill)}${r.event ? ' — ' + esc(r.event) : ''}</h4>
          ${skills ? `<div class="skill-tags">${skills}</div>` : ''}
        </div>
        ${r.ledBy ? `<span class="chip ${ledClass(r.ledBy)}">${esc(r.ledBy)}</span>` : ''}
      </div>
      ${r.course ? `<p class="course-name"><span class="material-symbols-outlined">route</span> ${esc(r.course)}</p>` : ''}
      ${weekPairHTML(r)}
      ${r.equipment ? `<div class="equip-bar"><span class="material-symbols-outlined">shopping_basket</span><div><strong>You need:</strong> ${esc(r.equipment)}</div></div>` : ''}
      ${r.setup ? `<p><strong>Set up.</strong> ${esc(r.setup)}</p>` : ''}
      ${r.how ? `<p><strong>How to play.</strong> ${esc(r.how)}</p>` : ''}
      ${phases ? `<div class="phases">${phases}</div>` : ''}
      ${r.weekBProgression ? `<details class="weekb" open><summary>Week B progression</summary><p>${esc(r.weekBProgression)}</p></details>` : ''}
      ${r.adaptation ? `<div class="adaptation"><strong>3–4 year olds:</strong> ${esc(r.adaptation)}</div>` : ''}
      ${r.extension ? `<div class="adaptation adapt-56"><strong>5–6 year extension:</strong> ${esc(r.extension)}</div>` : ''}
      ${r.watchFor ? `<div class="watchfor"><strong>Watch for:</strong> ${esc(r.watchFor)}</div>` : ''}
      ${r.coachObservation ? `<div class="observe"><strong>Coach observation:</strong> ${esc(r.coachObservation)}</div>` : ''}
      ${r.category === 'Athletics' && season && season.athleticsNote ? `<div class="athletics-note"><span class="material-symbols-outlined">stadium</span> ${esc(season.athleticsNote)}</div>` : ''}
      ${r.backup ? `<div class="backup"><strong>If they get restless:</strong> <strong>${esc(r.backup)}</strong>${r.backupSummary ? ` — ${esc(r.backupSummary)}` : ''}</div>` : ''}
    </div>`;
}

/** One week of a series was previously rendered as its own block (intended
   learning + timed run of show). That has been removed — each series now goes
   straight into its four rotations, with the shared "how the night runs" living
   once at the top of the page. */

function seriesHTML(s) {
  const rotations = (s.rotations || []).map(r => rotationHTML(r)).join('');
  return `
    <article class="series-card">
      <div class="series-card__head">
        <div>
          <div class="session-card__meta">${s.isFinal ? 'Final night' : 'Series ' + s.series} · ${esc(s.term)}${s.weeksLabel ? ' · ' + esc(s.weeksLabel) : ''}</div>
          <h3 class="series-card__title">${esc(s.name)}</h3>
          <div class="series-card__event">
            ${s.athleticsEvent ? `Athletics event: <strong>${esc(s.athleticsEvent)}</strong>` : ''}
            ${s.manipulative ? ` · Object skill: <strong>${esc(s.manipulative)}</strong>` : ''}
            ${s.fitnessCircuit && s.fitnessCircuit !== '—' ? ` · Circuit: <strong>${esc(s.fitnessCircuit)}</strong>` : ''}
          </div>
        </div>
        <span class="material-symbols-outlined chev">keyboard_arrow_down</span>
      </div>
      <div class="series-details">
        ${s.coachNote ? `<div class="coach-note"><strong>Coach note.</strong> ${esc(s.coachNote)}</div>` : ''}
        ${rotations}
      </div>
    </article>`;
}

function seasonInfoHTML() {
  if (!season) return '';
  const rules = (season.rules || []).map(r => `<li>${esc(r)}</li>`).join('');
  const w = season.warmdown || {};
  const hw = season.howEverySessionWorks || {};
  const steps = (hw.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  const principles = (season.coachingPrinciples || []).map(s => `<li>${esc(s)}</li>`).join('');
  return `
    <div class="season-banner">
      <div class="season-banner__time"><span class="material-symbols-outlined">schedule</span> ${esc(season.time)}</div>
      <div class="season-banner__terms">
        <div class="season-banner__term">${esc(season.term4)}</div>
        <div class="season-banner__term">${esc(season.term1)}</div>
      </div>
      <div class="season-banner__final"><span class="material-symbols-outlined">celebration</span> ${esc(season.finalNight)}</div>
    </div>
    <div class="warmdown-card">
      <p class="section-label">${esc(hw.title || 'How every session works')}</p>
      ${steps ? `<ol class="run-list">${steps}</ol>` : ''}
      ${hw.teachingNote ? `<p class="teaching-note"><strong>Teaching note.</strong> ${esc(hw.teachingNote)}</p>` : ''}
      ${hw.stationStructure ? `<p class="station-structure">${esc(hw.stationStructure)}</p>` : ''}
      ${principles ? `<details class="rules"><summary>Coaching principles</summary><ul>${principles}</ul></details>` : ''}
    </div>
    <div class="warmdown-card">
      <p class="section-label">Warm-down — every night</p>
      <p><strong>${esc(w.name)}</strong></p>
      ${w.setup ? `<p><em>Set up.</em> ${esc(w.setup)}</p>` : ''}
      ${w.how ? `<p><em>How to play.</em> ${esc(w.how)}</p>` : ''}
      ${w.equipment && w.equipment !== 'None' ? `<p><em>Equipment.</em> ${esc(w.equipment)}</p>` : ''}
      ${w.adaptation ? `<div class="adaptation"><strong>3–4 year olds:</strong> ${esc(w.adaptation)}</div>` : ''}
      ${w.watchFor ? `<div class="watchfor"><strong>Watch for:</strong> ${esc(w.watchFor)}</div>` : ''}
      ${rules ? `<details class="rules"><summary>Standing rules for every night</summary><ul>${rules}</ul></details>` : ''}
    </div>`;
}

/* The Get Set Go Sessions screen is the visual volunteer dashboard in
   stations.js (tonight's four stations, station cards, editor and card
   exports). seriesHTML() and seasonInfoHTML() above still render the full
   board text inside its "Whole season" and "How the night runs" panels. */
function renderRunSheets() {
  renderSessionsDashboard();
}

/* ============================================================
   Run Jump Throw — the weekly circuit timetable
   ============================================================ */
let rjt = null;
let rjtTerm = 'all';
let rjtFailed = false;

/* Gated: served by /api/rjt, which returns 401 without an admin session. The
   station content comes from ANZ's Run Jump Throw coaching material used under
   the club's resource-provider licence, so it is never publicly fetchable. */
function loadRJT() {
  authedFetch('/api/rjt').then(r => {
    if (!r.ok) throw new Error('no rjt');
    return r.json();
  }).then(data => {
    rjt = data;
    rjtFailed = false;
    if (adminLoggedIn && adminSection === 'rjt') renderRJT();
  }).catch(() => {
    console.warn('Could not load the Run Jump Throw timetable.');
    rjt = null;
    rjtFailed = true;
    if (adminLoggedIn && adminSection === 'rjt') renderRJT();
  });
}

function rjtSkill(id) {
  return (rjt && id && rjt.skills && rjt.skills[id]) ? rjt.skills[id] : null;
}

function rjtBullets(arr, cls) {
  if (!arr || !arr.length) return '';
  return `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}

/* The activity / event cards from āhei, each tagged with the skill category it
   belongs to. Rendered as a plain list of what to run at this station — the full
   card (set-up, how to play, video) is on āhei. */
function rjtCardsHTML(items, cls) {
  if (!items || !items.length) return '';
  return `<ul class="${cls}">${items.map((a) => {
    const flag = a.benchmark ? ' <span class="rjt-flag">benchmark</span>' : '';
    return `<li><strong>${esc(a.name)}</strong> — ${esc(a.description)}${flag}</li>`;
  }).join('')}</ul>`;
}

function rjtSkillBodyHTML(sk) {
  if (!sk) return '<p class="rjt-muted">No station detail recorded.</p>';
  const cues = rjtBullets(sk.cues, 'rjt-cues');
  const modify = rjtBullets(sk.modify, 'rjt-modify');
  const activities = rjtCardsHTML(sk.activities, 'rjt-cards');
  const events = rjtCardsHTML(sk.events, 'rjt-cards');
  const parts = [
    activities ? `<h4>Activities for this station${sk.activities.length ? ` (${sk.activities.length})` : ''}</h4>${activities}` : '',
    events ? `<h4>Event cards</h4>${events}` : '',
    sk.setup ? `<p><strong>Set up.</strong> ${esc(sk.setup)}</p>` : '',
    sk.equipment ? `<p><strong>Equipment.</strong> ${esc(sk.equipment)}</p>` : '',
    /* Headings are only emitted when there is actually a list under them. */
    cues ? `<h4>Coaching points</h4>${cues}` : '',
    modify ? `<h4>Adapt &amp; include</h4>${modify}` : '',
    sk.watchFor ? `<p class="rjt-watch"><strong>Watch for.</strong> ${esc(sk.watchFor)}</p>` : '',
    `<p class="rjt-source">Cards from āhei (Athletics NZ). Open the card in āhei for the full set-up and video.</p>`,
  ].filter(Boolean).join('');
  return `<div class="rjt-detail">
    <p class="rjt-detail__what">${esc(sk.what || '')}</p>
    ${parts}
  </div>`;
}

function rjtStationHTML(st) {
  if (!st) return '';
  if (!st.station) {
    return `<li class="rjt-station rjt-station--empty">
      <span class="rjt-station__slot">Station ${esc(String(st.slot || ''))}</span>
      <span class="rjt-station__name">Not running this week</span>
    </li>`;
  }
  const sk = rjtSkill(st.skill);
  return `<li>
    <details class="rjt-station">
      <summary>
        <span class="rjt-station__slot">Station ${esc(String(st.slot))}</span>
        <span class="rjt-station__name">${esc(st.station)}</span>
        ${sk ? `<span class="rjt-tag">${esc(sk.category)}</span>` : ''}
        ${st.unconfirmed ? '<span class="rjt-flag">to confirm</span>' : ''}
      </summary>
      ${rjtSkillBodyHTML(sk)}
    </details>
  </li>`;
}

function rjtNightHTML(n) {
  const head = `<div class="rjt-night__head">
      <span class="rjt-night__date">${esc(n.label || n.date || '')}</span>
      ${n.measure ? '<span class="chip status-ordered">Measure night</span>' : ''}
      ${n.note ? `<span class="rjt-night__note">${esc(n.note)}</span>` : ''}
    </div>`;
  if (n.blank || !n.stations || !n.stations.length) {
    return `<article class="rjt-night rjt-night--blank">${head}</article>`;
  }
  return `<article class="rjt-night">
    ${head}
    ${n.needsAttention ? `<p class="rjt-attention"><span class="material-symbols-outlined">help</span> ${esc(n.needsAttention)}</p>` : ''}
    <ol class="rjt-stations">${n.stations.map(rjtStationHTML).join('')}</ol>
  </article>`;
}

function rjtProgrammeHTML(p) {
  const step = p.step ? `
    <div class="rjt-step">
      <h3>${esc(p.step.title)}</h3>
      <div class="rjt-step__grid">
        ${p.step.items.map(i => `<div class="rjt-step__card">
          <span class="rjt-step__letter">${esc(i.letter)}</span>
          <strong>${esc(i.label)}</strong>
          <span>${esc(i.detail)}</span>
        </div>`).join('')}
      </div>
    </div>` : '';
  return `
    <div class="panel">
      <div class="panel__head"><h2><span class="material-symbols-outlined">sports_score</span> ${esc(p.title)}</h2></div>
      <p>${esc(p.about)}</p>
      <p class="rjt-structure">${esc(p.structure)}</p>
      <h3>How a night runs</h3>
      ${rjtBullets(p.howItRuns, 'rjt-list')}
      <div class="rjt-phases">
        <div><strong>Jumping</strong><span>${esc(p.phases.jumping)}</span></div>
        <div><strong>Throwing</strong><span>${esc(p.phases.throwing)}</span></div>
        <div><strong>Running</strong><span>${esc(p.phases.running)}</span></div>
      </div>
      ${step}
      <h3>Adapt &amp; include</h3>
      ${rjtBullets(p.inclusionNotes, 'rjt-list')}
      <p class="rjt-source">${esc(p.source.skills)} · ${esc(p.source.manualNote)}</p>
    </div>`;
}

function rjtRotationHTML(rot) {
  if (!rot) return '';
  const head = rot.stations.map(s => `<th>${esc(s)}</th>`).join('');
  const rows = rot.weeks.map(w => `<tr>
      <td><strong>Week ${esc(String(w.week))}</strong>${w.derived ? ' <span class="rjt-flag">derived</span>' : ''}</td>
      ${w.grades.map(g => `<td>${esc(g)}</td>`).join('')}
    </tr>`).join('');
  return `
    <div class="panel">
      <div class="panel__head"><h2><span class="material-symbols-outlined">autorenew</span> Weekly grade rotation</h2></div>
      <p>${esc(rot.note)}</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Rotation</th>${head}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="rjt-attention"><span class="material-symbols-outlined">help</span> ${esc(rot.derivedNote)}</p>
    </div>`;
}

function rjtPentathlonHTML(pen) {
  if (!pen) return '';
  return `
    <div class="panel">
      <div class="panel__head"><h2><span class="material-symbols-outlined">emoji_events</span> ${esc(pen.title)}</h2></div>
      <p>${esc(pen.about)}</p>
      <ol class="rjt-list">${pen.events.map(e => `<li>${esc(e)}</li>`).join('')}</ol>
    </div>`;
}

/* Warm-up games, plus the cards whose category tag was cut off in the capture.
   Those are shown rather than guessed at, so nothing is silently misfiled. */
function rjtLibraryHTML(lib) {
  if (!lib) return '';
  const warmUp = rjtCardsHTML(lib.warmUp, 'rjt-cards');
  const adaptive = rjtCardsHTML(lib.adaptiveEvents, 'rjt-cards');
  const unfiled = rjtCardsHTML(lib.uncategorised, 'rjt-cards');
  return `
    <div class="panel">
      <div class="panel__head"><h2><span class="material-symbols-outlined">sports_martial_arts</span> Warm-up games</h2></div>
      <p>Run one of these before the circuit starts.</p>
      ${warmUp || '<p class="rjt-muted">None captured.</p>'}
      ${adaptive ? `
        <h3>Adaptive &amp; seated events</h3>
        <p class="rjt-muted">From Athletics NZ's Adaptive Run Jump Throw resource — the alternatives to reach for when a station needs adapting.</p>
        ${adaptive}` : ''}
      ${unfiled ? `
        <h3>Not yet filed to a station</h3>
        <p class="rjt-muted">The category tag on these cards fell below the screen edge when they were captured, so they are listed here rather than guessed into a station. Most are obviously run, jump or throw.</p>
        ${unfiled}` : ''}
      <p class="rjt-source">${esc(lib.source || '')}</p>
    </div>`;
}

function renderRJTNights() {
  const terms = (rjt.terms || []).filter(t => rjtTerm === 'all' || t.term === rjtTerm);
  const html = terms.map(t => `
    <h3 class="rjt-term">${esc(t.term)}<span class="rjt-term__sub">${esc(t.weeksLabel || '')}</span></h3>
    ${t.nights.map(rjtNightHTML).join('')}`).join('');
  $('#rjt-nights').innerHTML = html || '<p>No nights found.</p>';
}

function renderRJTTabs() {
  const tabs = [
    { id: 'all', label: 'All nights' },
    ...(rjt.terms || []).map(t => ({ id: t.term, label: t.term })),
  ];
  $('#rjt-tabs').innerHTML = tabs.map(t =>
    `<button class="block-tab ${t.id === rjtTerm ? 'active' : ''}" data-term="${esc(t.id)}">${esc(t.label)}</button>`
  ).join('');
}

function renderRJT() {
  if (!rjt) {
    $('#admin-content').innerHTML = `
      <div class="page-head"><h1>ASB Run Jump Throw Sessions</h1></div>
      <p>${rjtFailed ? 'Could not load the Run Jump Throw timetable.' : 'Loading the timetable\u2026'}</p>`;
    return;
  }
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>ASB Run Jump Throw Sessions</h1>
      <p>Five stations a night — a different circuit every week. Tap a station for the set-up and coaching points.</p>
    </div>
    ${rjtProgrammeHTML(rjt.programme)}
    <div class="block-tabs" id="rjt-tabs"></div>
    <div id="rjt-nights"></div>
    ${rjtRotationHTML(rjt.rotation)}
    ${rjtLibraryHTML(rjt.library)}
    ${rjtPentathlonHTML(rjt.pentathlon)}`;
  renderRJTTabs();
  renderRJTNights();
  $('#rjt-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.block-tab');
    if (!tab) return;
    rjtTerm = tab.dataset.term;
    renderRJTTabs();
    renderRJTNights();
  });
}

/* ============================================================
   Attendance
   ============================================================ */
let attendanceDate = localDateString();
let attendanceMembers = [];
let selectedMembers = [];

function localDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadAttendance() {
  $('#attendance-date').textContent = formatDateLabel(attendanceDate);
  selectedMembers = [];
  renderSelected();
  $('#checkin-confirm').classList.add('hidden');
  try {
    const res = await authedFetch(`/api/attendance?date=${encodeURIComponent(attendanceDate)}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    attendanceMembers = data.members || [];
  } catch (e) {
    /* keep the last-known member list; the count still updates below */
  }
  updateCheckedinCount();
}

function updateCheckedinCount() {
  $('#checkedin-count').textContent = attendanceMembers.filter((m) => m.present).length;
}

function searchMatches() {
  const t = ($('#member-search').value || '').toLowerCase().trim();
  if (!t) return [];
  return attendanceMembers.filter((m) => m.name.toLowerCase().includes(t)).slice(0, 8);
}

function renderDropdown() {
  const dd = $('#checkin-dropdown');
  const matches = searchMatches();
  if (!matches.length) { dd.classList.add('hidden'); dd.innerHTML = ''; return; }
  dd.innerHTML = matches.map((m) => {
    const here = m.present || selectedMembers.some((s) => s.id === m.id);
    const meta = [m.grade != null ? `Grade ${m.grade}` : '', m.ageGroup].filter(Boolean).join(' · ');
    return `
      <button type="button" class="checkin-option ${here ? 'is-here' : ''}" data-id="${esc(m.id)}">
        <span class="checkin-option__name">${esc(m.name)}</span>
        ${meta ? `<span class="checkin-option__meta">${esc(meta)}</span>` : ''}
        ${here ? `<span class="material-symbols-outlined checkin-option__here">check_circle</span>` : ''}
      </button>`;
  }).join('');
  dd.classList.remove('hidden');
  $$('#checkin-dropdown .checkin-option').forEach((btn) => {
    btn.addEventListener('click', () => selectMember(btn.dataset.id));
  });
}

function selectMember(id) {
  const member = attendanceMembers.find((m) => m.id === id);
  if (!member || member.present || selectedMembers.some((s) => s.id === id)) return;
  selectedMembers.push({ id, name: member.name });
  $('#member-search').value = '';
  $('#checkin-dropdown').classList.add('hidden');
  $('#checkin-dropdown').innerHTML = '';
  renderSelected();
  $('#member-search').focus();
}

function removeSelected(id) {
  selectedMembers = selectedMembers.filter((s) => s.id !== id);
  renderSelected();
}

function renderSelected() {
  const box = $('#checkin-selected');
  if (!selectedMembers.length) {
    box.innerHTML = '<p class="checkin-selected__hint">Search and tap each child\u2019s name above, then submit.</p>';
  } else {
    box.innerHTML = selectedMembers.map((s) => `
      <span class="checkin-tag">
        <span class="material-symbols-outlined">check_circle</span>
        ${esc(s.name)}
        <button type="button" class="checkin-tag__x" data-id="${esc(s.id)}" aria-label="Remove ${esc(s.name)}">\u00d7</button>
      </span>`).join('');
    $$('#checkin-selected .checkin-tag__x').forEach((btn) => {
      btn.addEventListener('click', () => removeSelected(btn.dataset.id));
    });
  }
  $('#checkin-submit').disabled = selectedMembers.length === 0;
}

async function submitCheckin() {
  if (!selectedMembers.length) return;
  const btn = $('#checkin-submit');
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Saving…';
  try {
    const res = await authedFetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin', date: attendanceDate, members: selectedMembers }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Save failed');
    const names = selectedMembers.map((s) => s.name).join(', ');
    showConfirm(`\u2713 Recorded as attending tonight: ${names}`, data.skipped);
    selectedMembers = [];
    renderSelected();
    await loadAttendance();
  } catch (e) {
    showConfirm(`\u26a0 ${e.message}`, 0);
  } finally {
    btn.innerHTML = original;
    btn.disabled = selectedMembers.length === 0;
  }
}

function showConfirm(msg, skipped) {
  const box = $('#checkin-confirm');
  box.innerHTML = `<p>${esc(msg)}</p>${skipped ? `<p class="checkin-confirm__note">${skipped} already checked in tonight — not counted twice.</p>` : ''}`;
  box.classList.remove('hidden');
}

/** The document-level dismiss listener must only ever be attached once. */
let attendanceOutsideClickBound = false;

function bindAttendance() {
  const search = $('#member-search');
  search.addEventListener('input', renderDropdown);
  search.addEventListener('focus', renderDropdown);
  if (!attendanceOutsideClickBound) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.checkin-search')) $('#checkin-dropdown').classList.add('hidden');
    });
    attendanceOutsideClickBound = true;
  }
  $('#checkin-submit').addEventListener('click', submitCheckin);
  $('#print-sheet').addEventListener('click', openPrintSheet);
  $('#attendance-report').addEventListener('click', openAttendanceReport);
  const dateInput = $('#attendance-date-input');
  dateInput.value = attendanceDate;
  dateInput.addEventListener('change', () => {
    attendanceDate = dateInput.value || localDateString();
    loadAttendance();
  });
}

/* ---- printable attendance sheet (paper backup) ---- */

/** Group the roster for printing: grade → girls / boys / unassigned, A–Z. */
function buildAttendanceGroups(members) {
  const buckets = {};
  const bucketFor = (group) => (buckets[group] || (buckets[group] = { F: [], M: [], X: [] }));
  for (const m of members || []) {
    const grade = m.grade;
    let group;
    if (grade == null) group = 'Age not set';
    else if (grade < 2) group = 'Under 2';
    else if (grade <= 11) group = String(grade);
    else if (grade <= 14) group = '12-14';
    else group = '15+';
    const g = String(m.gender || '').toUpperCase();
    bucketFor(group)[g === 'F' ? 'F' : g === 'M' ? 'M' : 'X'].push(m.name);
  }
  for (const b of Object.values(buckets)) {
    b.F.sort((x, y) => x.localeCompare(y));
    b.M.sort((x, y) => x.localeCompare(y));
    b.X.sort((x, y) => x.localeCompare(y));
  }
  return buckets;
}

/** Open a print-friendly roster (grouped by grade, boys/girls, A–Z) in a new tab. */
function openPrintSheet() {
  const buckets = buildAttendanceGroups(attendanceMembers);
  const order = ['Under 2'];
  for (let g = 2; g <= 11; g += 1) order.push(String(g));
  order.push('12-14', '15+', 'Age not set');

  const namesHTML = (list) => list.map((n) => `<span class="name"><span class="box">\u2610</span>${esc(n)}</span>`).join('');
  const col = (title, list) => `
    <div class="col">
      <h3>${esc(title)} <span class="count">${list.length}</span></h3>
      ${list.length ? namesHTML(list) : '<p class="empty">\u2014</p>'}
    </div>`;

  const sections = order
    .filter((g) => buckets[g])
    .map((g) => {
      const b = buckets[g];
      const total = b.F.length + b.M.length + b.X.length;
      return `<section class="grade">
        <h2>${esc(g)} <span class="count">Total ${total}</span></h2>
        <div class="cols">
          ${col('Girls', b.F)}
          ${col('Boys', b.M)}
          ${b.X.length ? col('No gender', b.X) : ''}
        </div>
      </section>`;
    }).join('');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Attendance — ${esc(formatDateLabel(attendanceDate))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 18px; color: #1d1b17; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #5b84a8; padding-bottom: 6px; margin-bottom: 12px; }
  header h1 { font-size: 20px; margin: 0; }
  header .date { color: #57423b; }
  .total { font-size: 14px; font-weight: 700; }
  .grade { margin-bottom: 16px; }
  .grade h2 { font-size: 15px; margin: 0 0 6px; background: #cfe1f0; padding: 3px 8px; }
  .cols { display: flex; gap: 20px; }
  .col { flex: 1; }
  .col h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #57423b; margin: 4px 0; }
  .count { font-weight: 400; }
  .name { display: block; font-size: 13px; padding: 1px 0; white-space: nowrap; }
  .box { display: inline-block; width: 14px; }
  .empty { color: #8b7169; font-style: italic; margin: 0; }
  button.print { margin: 10px 0 4px; padding: 8px 16px; font-size: 14px; }
  @media print { button.print { display: none; } .grade { page-break-inside: avoid; } }
</style></head><body>
<header><h1>Taupō Athletics — Attendance</h1><div class="date">${esc(formatDateLabel(attendanceDate))}</div><div class="total">Total registrations: <strong>${attendanceMembers.length}</strong></div></header>
<button class="print" onclick="window.print()">🖨 Print / Save as PDF</button>
${sections}
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Please allow pop-ups to print the attendance sheet.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
}

/** Open a print-friendly attendance report: members ranked by nights attended. */
function openAttendanceReport() {
  const rows = [...attendanceMembers]
    .sort((a, b) => (b.nights || 0) - (a.nights || 0) || a.name.localeCompare(b.name));

  const bodyRows = rows.map((m, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${esc(m.name)}</td>
      <td>${esc(m.grade != null ? 'Grade ' + m.grade : '')}</td>
      <td class="num">${esc(m.nights ?? 0)}</td>
    </tr>`).join('');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Attendance report — ${esc(formatDateLabel(attendanceDate))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 18px; color: #1d1b17; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #5b84a8; padding-bottom: 6px; margin-bottom: 12px; }
  header h1 { font-size: 20px; margin: 0; }
  header .date { color: #57423b; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #e7e2db; }
  th { background: #cfe1f0; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  td.num { text-align: right; }
  tr:nth-child(even) td { background: #faf6f0; }
  button.print { margin: 10px 0 4px; padding: 8px 16px; font-size: 14px; }
  @media print { button.print { display: none; } }
</style></head><body>
<header><h1>Taupō Athletics — Attendance report</h1><div class="date">${esc(formatDateLabel(attendanceDate))}</div></header>
<button class="print" onclick="window.print()">🖨 Print / Save as PDF</button>
<table>
  <thead><tr><th class="num">#</th><th>Name</th><th>Grade</th><th class="num">Nights attended</th></tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Please allow pop-ups to open the attendance report.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
}

/* ============================================================
   Admin
   ============================================================ */
function renderLogin() {
  $('#admin-login').innerHTML = `
    <div class="login-card">
      <img class="login-logo" src="/logo.svg" alt="Taupō Athletics Club logo">
      <h1>Taupō Athletics Club</h1>
      <p class="sub">Admin Portal</p>
      <form id="login-form">
        <div class="field">
          <label for="email">Email Address</label>
          <div class="input-wrap">
            <span class="material-symbols-outlined">mail</span>
            <input id="email" type="email" value="taupoathletics@gmail.com" required>
          </div>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrap">
            <span class="material-symbols-outlined">lock</span>
            <input id="password" type="password" placeholder="••••••••" required>
          </div>
        </div>
        <button class="btn btn-primary" type="submit">
          Log In <span class="material-symbols-outlined">arrow_forward</span>
        </button>
      </form>
      <p class="login-error hidden" id="login-error">Incorrect email or password.</p>
    </div>`;

  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = ($('#email').value || '').trim().toLowerCase();
    const password = $('#password').value;
    const errorEl = $('#login-error');
    errorEl.classList.add('hidden');

    // The email only names the account. The password is verified by /api/auth
    // on the server — see submitPasscode() for why it cannot be checked here.
    if (email !== CLUB_ADMIN_EMAIL) {
      errorEl.classList.remove('hidden');
      return;
    }
    if (!(await submitPasscode(password))) {
      errorEl.classList.remove('hidden');
      return;
    }
    adminLoggedIn = true;
    renderAdmin();
    // Run sheets and the RJT timetable are gated, so they are fetched only once
    // there is a session — fetching them here rather than at page load avoids
    // firing the passcode prompt at someone who has not signed in yet.
    loadSessions();
    loadRJT();
  });
}

function statusChip(status) {
  const map = {
    'Personalised': 'status-ordered',
    'Ordered': 'status-ordered',
    'Ready for Pickup': 'status-delivered',
    'Delivered': 'status-delivered',
    'Delayed': 'status-issue',
    'Issue': 'status-issue'
  };
  const cls = map[status] || 'status-ordered';
  return `<span class="chip ${cls}"><span class="dot"></span>${esc(status)}</span>`;
}

function renderDashboard() {
  const present = `<span class="material-symbols-outlined present">check_circle</span>`;
  const absent = `<span class="material-symbols-outlined absent">cancel</span>`;

  const attendanceRows = MOCK_ATTENDANCE.map(row => {
    const cells = row.weeks.map(w => `<td class="num">${w ? present : absent}</td>`).join('');
    const total = row.weeks.filter(Boolean).length;
    return `<tr>
      <td class="sticky-col">${esc(row.name)}</td>
      ${cells}
      <td class="num" style="font-weight:700">${total}/${row.weeks.length}</td>
    </tr>`;
  }).join('');

  const inventoryRows = MOCK_INVENTORY.map(r => {
    const deficit = r.purchased - r.delivered;
    return `<tr>
      <td><strong>${esc(r.size)}</strong></td>
      <td class="num">${r.ordered}</td>
      <td class="num">${r.purchased}</td>
      <td class="num">${r.delivered}</td>
      <td class="num ${deficit > 0 ? 'deficit' : 'ok'}">${deficit}</td>
    </tr>`;
  }).join('');

  const orderRows = MOCK_ORDERS.map(o => `
    <tr>
      <td><strong>${esc(o.name)}</strong></td>
      <td><code>${esc(o.personalisation)}</code></td>
      <td>${esc(o.age)}</td>
      <td>${esc(o.size)}</td>
      <td>${statusChip(o.status)}</td>
      <td class="num">
        <button class="icon-btn"><span class="material-symbols-outlined">edit</span></button>
      </td>
    </tr>`).join('');

  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Overview Dashboard</h1>
      <p>Season 2024 · Week 5</p>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="--accent:var(--mint-go)">
        <div>
          <div class="stat-card__label">Total Members</div>
          <div class="stat-card__value">${MOCK_STATS.totalMembers}</div>
        </div>
        <div class="stat-card__icon"><span class="material-symbols-outlined" style="color:var(--tertiary)">groups</span></div>
      </div>
      <div class="stat-card" style="--accent:var(--sunflower-caution)">
        <div>
          <div class="stat-card__label">Avg. Attendance</div>
          <div class="stat-card__value">${MOCK_STATS.avgAttendance}<span style="font-size:var(--font-body-md);color:var(--on-surface-variant)"> / wk</span></div>
        </div>
        <div class="stat-card__icon"><span class="material-symbols-outlined" style="color:var(--secondary)">event_available</span></div>
      </div>
      <div class="stat-card" style="--accent:var(--coral-active)">
        <div>
          <div class="stat-card__label">Pending T-Shirts</div>
          <div class="stat-card__value">${MOCK_STATS.pendingTshirts}</div>
        </div>
        <div class="stat-card__icon"><span class="material-symbols-outlined" style="color:var(--primary)">checkroom</span></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel__head">
        <h2><span class="material-symbols-outlined">calendar_month</span> Season Attendance</h2>
        <div class="chip status-delivered"><span class="dot"></span>Present</div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th class="sticky-col">Member Name</th><th class="num">W1</th><th class="num">W2</th><th class="num">W3</th><th class="num">W4</th><th class="num">W5</th><th class="num">Total</th>
          </tr></thead>
          <tbody>${attendanceRows}</tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel__head">
        <h2><span class="material-symbols-outlined">inventory_2</span> Inventory Tracking</h2>
        <button class="btn btn-ghost"><span class="material-symbols-outlined">add_circle</span> Log Delivery</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>T-Shirt Size</th><th class="num">Total Ordered</th><th class="num">Purchased (Kmart)</th><th class="num">Delivered</th><th class="num">Stock Deficit</th>
          </tr></thead>
          <tbody>${inventoryRows}</tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel__head">
        <h2><span class="material-symbols-outlined" style="color:var(--tertiary)">assignment_turned_in</span> Order Fulfillment</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Child Name</th><th>Personalisation</th><th>Age Group</th><th>Size</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>${orderRows}</tbody>
        </table>
      </div>
    </div>`;
}

const RECORD_EVENTS = ['60m', '100m', '200m', '400m', '800m', '1500m', 'Long Jump', 'High Jump', 'Shot Put', 'Discus'];
const RECORD_GRADES = ['7', '8', '9', '10', '11', '12', '13', '14'];
let recordMembers = [];
let recordAll = [];

/** Which admin section is showing. Resets to run sheets on login and logout. */
let adminSection = 'runsheets';

function renderAdmin() {
  $('#admin-login').classList.toggle('hidden', adminLoggedIn);
  $('#admin-dashboard').classList.toggle('hidden', !adminLoggedIn);
  if (!adminLoggedIn) return;

  const section = (id, icon, label) =>
    `<button class="sidenav__item${adminSection === id ? ' active' : ''}" data-section="${id}">` +
    `<span class="material-symbols-outlined filled">${icon}</span> ${label}</button>`;

  $('#sidenav').innerHTML = `
    ${section('runsheets', 'description', 'ASB Get Set Go Sessions')}
    ${section('rjt', 'sports_score', 'ASB Run Jump Throw Sessions')}
    ${section('checkin', 'how_to_reg', 'Check In')}
    ${section('records', 'emoji_events', 'Record Results')}
    ${section('lookup', 'manage_search', 'Member Records')}
    ${section('codes', 'key', 'Access Codes')}
    ${section('email', 'mail', 'Email Members')}
    ${section('certs', 'workspace_premium', 'Certificates')}
    <button class="sidenav__item" id="logout-btn"><span class="material-symbols-outlined">logout</span> Logout</button>`;

  $$('#sidenav [data-section]').forEach((b) => {
    b.addEventListener('click', () => {
      adminSection = b.dataset.section;
      renderAdmin();
    });
  });

  $('#logout-btn').addEventListener('click', async () => {
    // End the session on the server too, so the cookie can't be reused on a shared device.
    try { await fetch('/api/auth', { method: 'DELETE' }); } catch { /* offline: cookie still expires in 12h */ }
    adminLoggedIn = false;
    adminSection = 'runsheets';
    renderAdmin();
  });

  if (adminSection === 'records') renderRecordsEntry();
  else if (adminSection === 'lookup') renderMemberRecords();
  else if (adminSection === 'codes') renderAccessCodes();
  else if (adminSection === 'email') renderEmailMembers();
  else if (adminSection === 'certs') renderCertificates();
  else if (adminSection === 'checkin') renderCheckin();
  else if (adminSection === 'rjt') renderRJT();
  else renderRunSheets();
}

/**
 * The check-in desk.
 *
 * This lives inside the gated Admin view rather than as its own tab: the
 * /api/attendance endpoint returns every child's name and age, so the screen
 * that uses it must sit behind the login.
 */
function renderCheckin() {
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Check In</h1>
      <p id="attendance-date"></p>
    </div>
    <div class="attendance-toolbar">
      <label class="date-field">
        <span class="material-symbols-outlined">event</span>
        <input type="date" id="attendance-date-input" title="Club night">
      </label>
      <span class="chip status-delivered"><span class="dot"></span><span id="checkedin-count">0</span>&nbsp;here tonight</span>
      <button class="btn btn-ghost" id="print-sheet"><span class="material-symbols-outlined">print</span> Print sheet</button>
      <button class="btn btn-ghost" id="attendance-report"><span class="material-symbols-outlined">leaderboard</span> Attendance report</button>
    </div>

    <div class="checkin-box">
      <div class="checkin-search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" id="member-search" placeholder="Type a child's name…" autocomplete="off">
        <div class="checkin-dropdown hidden" id="checkin-dropdown"></div>
      </div>

      <div class="checkin-selected" id="checkin-selected"></div>

      <button class="btn btn-primary checkin-submit" id="checkin-submit" disabled>
        <span class="material-symbols-outlined">how_to_reg</span> Submit check-in
      </button>
    </div>

    <div class="checkin-confirm hidden" id="checkin-confirm"></div>`;

  bindAttendance();
  loadAttendance();
}

function renderRecordsEntry() {
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Record a Result</h1>
      <p>Search a member for a single result, or use the measure-night grid to enter a whole grade at once.</p>
    </div>
    <div class="records-box">
      <div class="checkin-search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" id="record-search" placeholder="Type a member's name…" autocomplete="off">
        <div class="checkin-dropdown hidden" id="record-dropdown"></div>
      </div>
      <p class="record-saved hidden" id="record-saved"></p>
    </div>
    <div class="panel">
      <div class="panel__head"><h2><span class="material-symbols-outlined">groups</span> Measure night — bulk entry</h2></div>
      <p>Pick the event and grade, then enter a result next to each name in the girls and boys tables (A–Z) and save once.</p>
      <div class="bulk-controls">
        <div class="field">
          <label for="bulk-event">Event</label>
          <select id="bulk-event">${RECORD_EVENTS.map((e) => `<option value="${e}">${e}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="bulk-grade">Grade</label>
          <select id="bulk-grade">${RECORD_GRADES.map((g) => `<option value="${g}">${g}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="bulk-date">Date</label>
          <input type="date" id="bulk-date" value="${localDateString()}">
        </div>
        <div class="field">
          <label for="bulk-season">Season</label>
          <select id="bulk-season"><option value="2026-27">2026-27</option><option value="2025-26">2025-26</option><option value="2024-25">2024-25</option></select>
        </div>
      </div>
      <div id="bulk-tables"></div>
      <div class="bulk-actions">
        <button class="btn btn-primary" id="bulk-save" disabled>Save results</button>
        <button class="btn btn-ghost" id="bulk-print"><span class="material-symbols-outlined">print</span> Print this event</button>
        <button class="btn btn-ghost" id="bulk-print-all"><span class="material-symbols-outlined">library_books</span> Print all events</button>
      </div>
      <p class="record-saved hidden" id="bulk-saved"></p>
    </div>`;
  bindRecordSearch();
  bindBulk();
  loadRecordMembers().then(renderBulkTables);
}

/** NZ-time stamp for "when this result was logged" on the measure-night grid. */
const NZ_LOGGED_FMT = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland',
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
});
function formatLoggedAt(iso) {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return '';
  return NZ_LOGGED_FMT.format(d);
}

/**
 * The most recently *logged* result per member, for one event + season.
 *
 * Keyed by member id so the grid can show what is already recorded before
 * anyone re-types it. Saving skips empty inputs; typing a value overwrites the
 * member's existing mark in place (the API updates the row rather than adding a
 * duplicate).
 */
function latestResultsFor(event, season) {
  const latest = new Map();
  for (const r of recordAll || []) {
    if (!r.memberId || r.event !== event) continue;
    if (season && r.season !== season) continue;
    // createdTime is the log moment; fall back to the measured date for any row
    // written before the API exposed it.
    const at = r.createdTime || (r.date ? `${r.date}T00:00:00Z` : '');
    const prev = latest.get(r.memberId);
    if (!prev || at > prev.at) latest.set(r.memberId, { at, result: r.result || '', record: r });
  }
  return latest;
}

/** The measure-night grid: girls and boys tables for the selected grade. */
const MEASURE_TIME_EVENTS = ['60m', '100m', '200m', '400m', '800m', '1500m'];

/** The grade sections (girls/boys tables) for one event, ready to embed. */
function measureSections(event, latest) {
  const unit = MEASURE_TIME_EVENTS.includes(event) ? 'seconds' : 'metres';
  const grades = [...new Set(recordMembers.map((m) => m.grade).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));

  const table = (title, list) => {
    if (!list.length) return '';
    return `
      <div class="col">
        <h3>${esc(title)} <span class="count">${list.length}</span></h3>
        <table>
          <thead><tr><th>Name</th><th class="last">Last</th><th class="res">Result (${unit})</th></tr></thead>
          <tbody>${list.map((m) => {
            const prev = latest.get(m.id);
            return `<tr><td>${esc(m.name)}</td><td class="last">${prev ? esc(prev.result) : ''}</td><td class="res"></td></tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
  };

  return grades.map((grade) => {
    const girls = recordMembers.filter((m) => m.grade === grade && m.gender === 'F').sort((a, b) => a.name.localeCompare(b.name));
    const boys = recordMembers.filter((m) => m.grade === grade && m.gender === 'M').sort((a, b) => a.name.localeCompare(b.name));
    if (!girls.length && !boys.length) return '';
    return `<section class="grade">
      <h2>Grade ${esc(grade)}</h2>
      <div class="cols">${table('Girls', girls)}${table('Boys', boys)}</div>
    </section>`;
  }).join('');
}

/** Build the printable measure-sheet document. */
function measureSheetDoc(heading, meta, body, perEventPageBreak) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(heading)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 18px; color: #1d1b17; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #5b84a8; padding-bottom: 6px; margin-bottom: 12px; }
  header h1 { font-size: 20px; margin: 0; }
  header .meta { color: #57423b; font-size: 13px; }
  .grade { margin-bottom: 14px; }
  .grade h2 { font-size: 15px; margin: 0 0 6px; background: #cfe1f0; padding: 3px 8px; }
  .cols { display: flex; gap: 18px; }
  .col { flex: 1; }
  .col h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #57423b; margin: 4px 0; }
  .count { font-weight: 400; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 3px 6px; border-bottom: 1px solid #e7e2db; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #57423b; }
  th.last, td.last { width: 70px; color: #8b7169; font-size: 12px; }
  th.res, td.res { width: 110px; border-left: 1px solid #e7e2db; height: 22px; }
  tr:nth-child(even) td { background: #faf6f0; }
  .event-block { margin-bottom: 10px; }
  .event-title { font-size: 22px; margin: 0 0 10px; padding: 6px 10px; background: #5b84a8; color: #fff; }
  button.print { margin: 10px 0 4px; padding: 8px 16px; font-size: 14px; }
  @media print {
    button.print { display: none; }
    .grade { page-break-inside: avoid; }
    ${perEventPageBreak ? '.event-block { page-break-after: always; } .event-block:last-child { page-break-after: auto; }' : ''}
  }
</style></head><body>
<header>
  <h1>${esc(heading)}</h1>
  <div class="meta">${esc(meta)}</div>
</header>
<button class="print" onclick="window.print()">🖨 Print / Save as PDF</button>
${body || '<p>No members with a grade set.</p>'}
</body></html>`;
}

function printDoc(html, what) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert(`Please allow pop-ups to open the ${what}.`); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
}

/** Open a print-friendly measure sheet: the selected event, every grade, girls/boys. */
function openMeasureSheet() {
  const event = $('#bulk-event').value;
  const season = $('#bulk-season').value;
  const date = $('#bulk-date').value;
  const sections = measureSections(event, latestResultsFor(event, season));
  printDoc(measureSheetDoc(`Measure sheet: ${event}`, `${formatDateLabel(date)} · Season ${season}`, sections, false), 'measure sheet');
}

/** Open one document with every measured event, each starting on a new page. */
function openAllMeasureSheets() {
  const season = $('#bulk-season').value;
  const date = $('#bulk-date').value;
  const blocks = RECORD_EVENTS.map((event) => {
    const sections = measureSections(event, latestResultsFor(event, season));
    return `<section class="event-block"><h1 class="event-title">${esc(event)}</h1>${sections}</section>`;
  }).join('');
  printDoc(measureSheetDoc('Measure sheets — all events', `${formatDateLabel(date)} · Season ${season}`, blocks, true), 'measure sheets');
}

function renderBulkTables() {
  const grade = $('#bulk-grade').value;
  const event = $('#bulk-event').value;
  const season = $('#bulk-season').value;
  const girls = recordMembers.filter((m) => m.grade === grade && m.gender === 'F').sort((a, b) => a.name.localeCompare(b.name));
  const boys = recordMembers.filter((m) => m.grade === grade && m.gender === 'M').sort((a, b) => a.name.localeCompare(b.name));
  const latest = latestResultsFor(event, season);

  const rowHTML = (m, gender) => {
    const prev = latest.get(m.id);
    const when = prev ? formatLoggedAt(prev.at) : '';
    const tip = prev
      ? `${prev.result} — logged ${when}${prev.record.date ? `, measured ${prev.record.date}` : ''}`
      : '';
    return `
      <tr${prev ? ' class="bulk-row--done"' : ''}>
        <td>${esc(m.name)}</td>
        <td class="bulk-last">${prev
          ? `<span class="bulk-last__value" title="${esc(tip)}">${esc(prev.result)}</span><span class="bulk-last__when">${esc(when)}</span>`
          : '<span class="bulk-last__none">not recorded</span>'}</td>
        <td><input type="text" class="bulk-result" data-id="${esc(m.id)}" data-name="${esc(m.name)}" data-gender="${gender}" placeholder="e.g. 10.73"></td>
      </tr>`;
  };

  const tableHTML = (title, list, gender) => {
    const done = list.filter((m) => latest.has(m.id)).length;
    return `
    <div class="bulk-table">
      <h3>${esc(title)} <span class="bulk-table__count">${list.length}</span>${
        done ? ` <span class="bulk-table__done">${done} recorded</span>` : ''}</h3>
      ${list.length ? `
      <div class="table-wrap">
        <table class="data-table bulk-rows">
          <thead><tr><th>Name</th><th class="bulk-last-col">Last recorded</th><th class="bulk-result-col">Result</th></tr></thead>
          <tbody>${list.map((m) => rowHTML(m, gender)).join('')}</tbody>
        </table>
      </div>` : `<p class="bulk-empty">No ${gender === 'F' ? 'girls' : 'boys'} in grade ${esc(grade)}.</p>`}
    </div>`;
  };

  $('#bulk-tables').innerHTML = tableHTML('Girls', girls, 'F') + tableHTML('Boys', boys, 'M');
  $('#bulk-save').disabled = !(girls.length || boys.length);
}

function bindBulk() {
  // The "Last recorded" column depends on event + season, so those controls have
  // to redraw the grid too (previously only the grade did — nothing else showed).
  ['#bulk-event', '#bulk-grade', '#bulk-season'].forEach((sel) => {
    $(sel).addEventListener('change', renderBulkTables);
  });
  $('#bulk-save').addEventListener('click', saveBulk);
  $('#bulk-print').addEventListener('click', openMeasureSheet);
  $('#bulk-print-all').addEventListener('click', openAllMeasureSheets);
}

async function saveBulk() {
  const event = $('#bulk-event').value;
  const grade = $('#bulk-grade').value;
  const date = $('#bulk-date').value;
  const season = $('#bulk-season').value;
  const results = [];
  $$('#bulk-tables .bulk-result').forEach((input) => {
    const v = input.value.trim();
    if (v) results.push({ memberId: input.dataset.id, memberName: input.dataset.name, gender: input.dataset.gender, result: v });
  });
  if (results.length && !(await confirmResults(event, grade, results))) return;
  if (!results.length) {
    const saved = $('#bulk-saved');
    saved.textContent = 'Enter at least one result first.';
    saved.classList.remove('hidden');
    return;
  }
  const btn = $('#bulk-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const res = await authedFetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk', event, grade, date, season, results }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Save failed');
    const saved = $('#bulk-saved');
    saved.textContent = `\u2713 Saved ${(data.created || 0) + (data.updated || 0)} \u00d7 ${event} for grade ${grade}` + (data.skipped && data.skipped.length ? ` — ${data.skipped.length} failed, see console.` : '');
    saved.classList.remove('hidden');
    showNewRecords(data.newRecords, saved);
    if (data.skipped && data.skipped.length) console.warn('bulk save skipped:', data.skipped);
    $$('#bulk-tables .bulk-result').forEach((i) => { i.value = ''; });
    // Re-pull so the marks just saved show up in the "Last recorded" column.
    refreshAfterBulkSave();
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = !$$('#bulk-tables .bulk-result').length;
    btn.textContent = 'Save results';
  }
}

/**
 * Reload records after a bulk save so the new marks appear in "Last recorded".
 * Deliberately not loadRecordMembers(): that blanks the grid when a fetch
 * fails, and here we would rather keep showing the results we already have.
 */
async function refreshAfterBulkSave() {
  try {
    const res = await authedFetch('/api/records');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.members)) recordMembers = data.members;
    if (Array.isArray(data.records)) recordAll = data.records;
    renderBulkTables();
  } catch { /* offline — leave the grid as it is */ }
}

async function loadRecordMembers() {
  try {
    // authedFetch so the member list carries gender/grade/birth date and access
    // codes — the public GET returns names only.
    const res = await authedFetch('/api/records');
    if (!res.ok) throw new Error();
    const data = await res.json();
    recordMembers = data.members || [];
    recordAll = data.records || [];
  } catch (e) {
    recordMembers = [];
    recordAll = [];
  }
}

/* ============================================================
   Family access codes — the A–Z sheet for the sign-in desk
   ============================================================ */

/* Codes are per FAMILY (members sharing a registration email share one code),
   so each child gets a row A–Z by surname and siblings on the same code are
   shown alongside — whichever child a parent asks about, the desk finds them. */
let codeMembers = [];
let codesQuery = '';
let codesScope = 'juniors';
const JUNIOR_MEMBER_TYPES = ['Active Member 6 Years and Under', 'Active Member 7 to 14 Years'];

/** "DWK495RC" → "DWK4 95RC": easier to read out and type. */
function formatCode(code) {
  return code ? `${code.slice(0, 4)} ${code.slice(4)}` : '';
}

/** A–Z bucket by surname, folding macrons (Ō → O). */
function codeLetter(m) {
  const c = (m.lastName || m.name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

function codeSiblings(m) {
  if (!m.accessCode) return [];
  return codeMembers.filter((x) => x.accessCode === m.accessCode && x.id !== m.id);
}

function visibleCodeMembers() {
  const q = codesQuery.toLowerCase().replace(/\s+/g, ' ').trim();
  const qCode = q.replace(/[^a-z0-9]/g, '').toUpperCase();
  return codeMembers.filter((m) => {
    if (codesScope === 'juniors' && !JUNIOR_MEMBER_TYPES.includes(m.memberType)) return false;
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || (qCode.length >= 3 && (m.accessCode || '').includes(qCode));
  });
}

function groupByLetter(list) {
  const groups = new Map();
  for (const m of list) {
    const l = codeLetter(m);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(m);
  }
  return groups;
}

function renderAccessCodes() {
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Access Codes</h1>
      <p>Each family's code, A–Z by surname. Families enter it at <strong>${esc(location.host)}/my-results</strong> to see their own children's results. Treat the printed sheet like a list of passwords.</p>
    </div>
    <div class="records-box codes-toolbar">
      <div class="checkin-search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" id="codes-search" placeholder="Search a name or code…" autocomplete="off" value="${esc(codesQuery)}">
      </div>
      <div class="codes-scope" role="group" aria-label="Who to show">
        <button type="button" class="codes-scope__btn${codesScope === 'juniors' ? ' active' : ''}" data-scope="juniors">Junior athletes</button>
        <button type="button" class="codes-scope__btn${codesScope === 'all' ? ' active' : ''}" data-scope="all">Everyone</button>
      </div>
      <div class="codes-actions">
        <button type="button" class="btn btn-primary" id="codes-print-list"><span class="material-symbols-outlined">print</span> Print A–Z list</button>
        <button type="button" class="btn btn-ghost" id="codes-print-slips"><span class="material-symbols-outlined">content_cut</span> Print hand-out slips</button>
        <button type="button" class="btn btn-ghost" id="codes-email-open" aria-expanded="false" aria-controls="codes-email"><span class="material-symbols-outlined">forward_to_inbox</span> Email codes to families</button>
      </div>
    </div>
    <section id="codes-email" class="records-box codes-email" hidden></section>
    <div id="codes-summary" class="codes-summary"></div>
    <nav id="codes-jump" class="codes-jump" aria-label="Jump to letter"></nav>
    <div id="codes-list" class="codes-list"><p class="codes-empty">Loading codes…</p></div>`;

  $('#codes-search').addEventListener('input', (e) => { codesQuery = e.target.value; renderCodesList(); });
  $$('.codes-scope__btn').forEach((b) => b.addEventListener('click', () => {
    codesScope = b.dataset.scope;
    $$('.codes-scope__btn').forEach((x) => x.classList.toggle('active', x === b));
    renderCodesList();
  }));
  $('#codes-print-list').addEventListener('click', printCodesList);
  $('#codes-print-slips').addEventListener('click', printCodeSlips);
  $('#codes-email-open').addEventListener('click', toggleCodesEmail);
  loadAccessCodes();
}

/* ---------- email each family their code (api/familyemails.mjs) ----------
   One email per registration email, listing that family's children. The
   server keeps the addresses and codes; this page only sees counts and a
   sample. Already-emailed families are skipped, so Send can be pressed again
   (e.g. the next day, under the sending provider's daily limit). */
function toggleCodesEmail() {
  const box = $('#codes-email');
  const open = box.hidden;
  box.hidden = !open;
  $('#codes-email-open').setAttribute('aria-expanded', String(open));
  if (open) loadCodesEmail();
}

async function loadCodesEmail() {
  const box = $('#codes-email');
  box.innerHTML = '<p class="codes-empty">Checking families…</p>';
  try {
    const res = await authedFetch('/api/familyemails');
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Could not load the family list.');
    renderCodesEmail(d);
  } catch (e) {
    box.innerHTML = `<p class="codes-empty">⚠ ${esc(e.message)}</p>`;
  }
}

function renderCodesEmail(d) {
  const sk = d.skipped || {};
  const notes = [
    sk.noEmail ? `${sk.noEmail} athlete${sk.noEmail > 1 ? 's have' : ' has'} no email — use a printed slip` : '',
    sk.badEmail ? `${sk.badEmail} email${sk.badEmail > 1 ? 's look' : ' looks'} invalid — fix in Notion` : '',
    sk.noCode ? `${sk.noCode} athlete${sk.noCode > 1 ? 's have' : ' has'} no code yet` : '',
    sk.mixedCodes ? `${sk.mixedCodes} famil${sk.mixedCodes > 1 ? 'ies have' : 'y has'} more than one code — re-run the access-code script` : '',
  ].filter(Boolean);
  $('#codes-email').innerHTML = `
    <h2 class="codes-email__title">Email codes to families</h2>
    <p>One email per family (children who share a registration email share a code). Only athletes are included — not volunteers or committee.</p>
    <ul class="codes-email__stats">
      <li><strong>${d.families}</strong> families · ${d.children} athletes</li>
      <li><strong>${d.sent}</strong> already emailed</li>
      <li><strong>${d.waiting}</strong> still to email</li>
    </ul>
    ${notes.length ? `<p class="codes-summary__warn"><span class="material-symbols-outlined">warning</span> ${esc(notes.join(' · '))}</p>` : ''}
    ${!d.ready ? `<p class="codes-email__setup"><strong>Not set up yet.</strong> Verify the club's domain in Resend, then add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> (e.g. <code>Taupō Athletics &lt;results@mail.taupoathletics.org.nz&gt;</code>) in Vercel and redeploy. Replies go to ${esc(d.replyTo)}.</p>` : `<p>From <strong>${esc(d.from)}</strong> · replies to <strong>${esc(d.replyTo)}</strong></p>`}
    ${!d.logReady && d.ready ? '<p class="codes-summary__warn">⚠ Could not open the “Access code emails” log in Notion — sending will try to create it.</p>' : ''}
    ${d.sample ? `<details class="codes-email__sample"><summary>Preview the email (sample family: ${esc(d.sample.to)})</summary><p><strong>${esc(d.sample.subject)}</strong></p><pre>${esc(d.sample.text)}</pre></details>` : ''}
    <div class="codes-email__row">
      <label>Send a test to <input type="email" id="codes-email-test-to" placeholder="you@example.com" autocomplete="email"></label>
      <button type="button" class="btn btn-ghost" id="codes-email-test" ${d.ready ? '' : 'disabled'}><span class="material-symbols-outlined">send</span> Send test</button>
    </div>
    <div class="codes-email__row">
      <label>How many families now <input type="number" id="codes-email-max" min="1" max="${d.waiting}" value="${Math.min(d.waiting, 100)}"></label>
      <button type="button" class="btn btn-primary" id="codes-email-send" ${d.ready && d.waiting ? '' : 'disabled'}><span class="material-symbols-outlined">forward_to_inbox</span> Send to families</button>
    </div>
    <p class="codes-email__hint">Resend's free plan sends up to 100 emails a day — send the rest tomorrow; families already emailed are skipped.</p>
    <p id="codes-email-status" class="codes-email__status" role="status"></p>`;
  $('#codes-email-test').addEventListener('click', sendCodesTest);
  $('#codes-email-send').addEventListener('click', () => sendCodesToFamilies(d.waiting));
}

async function postFamilyEmails(body) {
  const res = await authedFetch('/api/familyemails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Sending failed.');
  return d;
}

async function sendCodesTest() {
  const to = $('#codes-email-test-to').value.trim();
  const status = $('#codes-email-status');
  if (!to) { status.textContent = 'Enter an address for the test.'; return; }
  status.textContent = 'Sending test…';
  try {
    await postFamilyEmails({ action: 'test', to });
    status.textContent = `Test sent to ${to} (with a made-up code). Check it looks right before sending to families.`;
  } catch (e) {
    status.textContent = `⚠ ${e.message}`;
  }
}

async function sendCodesToFamilies(waiting) {
  const want = Math.max(0, Math.min(waiting, Number($('#codes-email-max').value) || 0));
  const status = $('#codes-email-status');
  if (!want) { status.textContent = 'Nothing to send.'; return; }
  if (!confirm(`Email ${want} famil${want > 1 ? 'ies' : 'y'} their access code now? This can't be undone.`)) return;
  const btn = $('#codes-email-send');
  btn.disabled = true;
  let sent = 0;
  try {
    while (sent < want) {
      status.textContent = `Sending… ${sent} of ${want}`;
      const r = await postFamilyEmails({ action: 'send', max: Math.min(50, want - sent) });
      if (!r.sent) break;
      sent += r.sent;
    }
    status.textContent = `Sent ${sent} email${sent === 1 ? '' : 's'}.`;
  } catch (e) {
    status.textContent = `⚠ Stopped after ${sent}: ${e.message} Families already emailed won't be emailed again.`;
  }
  setTimeout(loadCodesEmail, 1500);
}

async function loadAccessCodes() {
  try {
    const res = await authedFetch('/api/codes');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load access codes.');
    codeMembers = data.members || [];
    renderCodesList();
  } catch (e) {
    $('#codes-list').innerHTML = `<p class="codes-empty">⚠ ${esc(e.message)}</p>`;
  }
}

function renderCodesList() {
  const list = visibleCodeMembers();
  const missing = list.filter((m) => !m.accessCode).length;
  const families = new Set(list.map((m) => m.accessCode).filter(Boolean)).size;
  $('#codes-summary').innerHTML = `
    <span><strong>${list.length}</strong> ${codesScope === 'juniors' ? 'junior athletes' : 'members'}</span>
    <span><strong>${families}</strong> family codes</span>
    ${missing ? `<span class="codes-summary__warn"><span class="material-symbols-outlined">warning</span> ${missing} without a code — add one in Notion or run <code>scripts/notion_access_codes.mjs</code></span>` : ''}`;

  const groups = groupByLetter(list);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
  $('#codes-jump').innerHTML = letters.map((l) => groups.has(l)
    ? `<a href="#codes-${l === '#' ? 'other' : l}" class="codes-jump__l">${l}</a>`
    : `<span class="codes-jump__l is-empty" aria-hidden="true">${l}</span>`).join('');
  $$('#codes-jump a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  if (!list.length) {
    $('#codes-list').innerHTML = `<p class="codes-empty">${codeMembers.length ? 'No one matches that search.' : 'No members found.'}</p>`;
    return;
  }
  $('#codes-list').innerHTML = [...groups.entries()].map(([letter, rows]) => `
    <section class="codes-letter" id="codes-${letter === '#' ? 'other' : letter}">
      <h2 class="codes-letter__h">${letter}</h2>
      <table class="codes-table">
        <thead><tr><th>Surname</th><th>First name</th><th>Age group</th><th>Access code</th><th>Same code</th></tr></thead>
        <tbody>${rows.map((m) => {
          const sibs = codeSiblings(m).map((x) => x.firstName || x.name);
          return `<tr>
            <td class="codes-table__last">${esc(m.lastName || m.name)}</td>
            <td>${esc(m.firstName)}</td>
            <td class="codes-table__muted">${esc(m.ageGroup)}</td>
            <td>${m.accessCode ? `<span class="code-pill">${esc(formatCode(m.accessCode))}</span>` : '<span class="code-pill code-pill--none">Not assigned</span>'}</td>
            <td class="codes-table__muted">${sibs.length ? esc(sibs.join(', ')) : '—'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </section>`).join('');
}

/** Opens a print-ready page in a new tab (same approach as the attendance sheet). */
function openPrintWindow(title, css, body) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 16px; color: #1d1b17; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; border-bottom: 2px solid #5b84a8; padding-bottom: 6px; margin-bottom: 10px; }
  header h1 { font-size: 19px; margin: 0; }
  header p { margin: 2px 0 0; font-size: 11px; color: #57423b; }
  .meta { text-align: right; font-size: 11px; color: #57423b; }
  .code { font-family: 'Courier New', ui-monospace, monospace; font-weight: 700; letter-spacing: .06em; white-space: nowrap; }
  button.print { margin: 0 0 10px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
  @media print { button.print { display: none; } @page { size: A4; margin: 11mm; } }
  ${css}
</style></head><body>${body}</body></html>`;
  const w = window.open('', '_blank', 'width=960,height=760');
  if (!w) { alert('Please allow pop-ups to print the access codes.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
}

function printedOn() {
  return new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function printCodesList() {
  const list = visibleCodeMembers();
  if (!list.length) { alert('Nothing to print yet.'); return; }
  const groups = groupByLetter(list);
  const sections = [...groups.entries()].map(([letter, rows]) => `
    <section class="letter">
      <h2>${letter}</h2>
      ${rows.map((m) => {
        const sibs = codeSiblings(m).map((x) => x.firstName || x.name);
        return `<div class="row">
          <span class="who"><strong>${esc(m.lastName || m.name)}</strong>, ${esc(m.firstName)}${sibs.length ? ` <span class="sib">+ ${esc(sibs.join(', '))}</span>` : ''}</span>
          <span class="code">${m.accessCode ? esc(formatCode(m.accessCode)) : '—'}</span>
        </div>`;
      }).join('')}
    </section>`).join('');

  openPrintWindow('Family access codes — Taupō Athletics', `
    .cols { column-count: 2; column-gap: 22px; }
    .letter { break-inside: avoid-column; margin-bottom: 8px; }
    .letter h2 { font-size: 13px; margin: 0 0 2px; background: #cfe1f0; padding: 2px 6px; break-after: avoid; }
    .row { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; padding: 2px 6px; border-bottom: 1px dotted #dec0b6; break-inside: avoid; }
    .who { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sib { color: #57423b; font-size: 10.5px; }
    footer { margin-top: 12px; font-size: 10px; color: #57423b; border-top: 1px solid #dec0b6; padding-top: 6px; }
  `, `
    <header>
      <div><h1>Taupō Athletics — Family access codes</h1>
      <p>A–Z by surname · ${codesScope === 'juniors' ? 'Junior athletes' : 'All members'} · families enter the code at ${esc(location.host)}/my-results</p></div>
      <div class="meta">Printed ${esc(printedOn())}<br>${list.length} names</div>
    </header>
    <button class="print" onclick="window.print()">🖨 Print / Save as PDF</button>
    <div class="cols">${sections}</div>
    <footer>Confidential — keep at the sign-in desk and shred old copies. A code shows that family's results only; never read one out to anyone else.</footer>`);
}

function printCodeSlips() {
  const list = visibleCodeMembers().filter((m) => m.accessCode);
  if (!list.length) { alert('No codes to print yet.'); return; }
  // One slip per family, ordered by the first child's surname.
  const families = new Map();
  for (const m of list) {
    if (!families.has(m.accessCode)) families.set(m.accessCode, []);
    families.get(m.accessCode).push(m);
  }
  const slips = [...families.keys()].map((code) => {
    const names = [...new Set(codeMembers.filter((x) => x.accessCode === code).map((x) => x.name))];
    return `<div class="slip">
      <div class="brand">Taupō Athletics Club</div>
      <div class="names">${esc(names.join(' · '))}</div>
      <div class="label">Your family access code</div>
      <div class="code big">${esc(formatCode(code))}</div>
      <div class="how">See results &amp; club nights at <strong>${esc(location.host)}/my-results</strong></div>
    </div>`;
  }).join('');
  openPrintWindow('Access code slips — Taupō Athletics', `
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
    .slip { border: 1px dashed #8b7169; padding: 10px 10px 9px; min-height: 44mm; display: flex; flex-direction: column; gap: 3px; break-inside: avoid; }
    .brand { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5b84a8; }
    .names { font-size: 12px; font-weight: 700; line-height: 1.25; }
    .label { margin-top: auto; font-size: 9.5px; color: #57423b; text-transform: uppercase; letter-spacing: .06em; }
    .big { font-size: 20px; }
    .how { font-size: 9.5px; color: #57423b; }
    .how strong { white-space: nowrap; }
  `, `
    <header>
      <div><h1>Family access code slips</h1><p>Cut along the dashed lines and hand each family their own slip.</p></div>
      <div class="meta">Printed ${esc(printedOn())}<br>${families.size} families</div>
    </header>
    <button class="print" onclick="window.print()">🖨 Print / Save as PDF</button>
    <div class="grid">${slips}</div>`);
}

/** Admin lookup: search a member and see their results + family access code. */
function renderMemberRecords() {
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Member Records</h1>
      <p>Look up a member's results and their family access code.</p>
    </div>
    <div class="records-box">
      <div class="checkin-search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" id="lookup-search" placeholder="Type a member's name…" autocomplete="off">
        <div class="checkin-dropdown hidden" id="lookup-dropdown"></div>
      </div>
    </div>
    <div id="lookup-result"></div>`;

  const search = $('#lookup-search');
  const dd = $('#lookup-dropdown');
  search.addEventListener('input', renderLookupDropdown);
  search.addEventListener('focus', renderLookupDropdown);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#lookup-search, #lookup-dropdown')) dd.classList.add('hidden');
  });

  loadRecordMembers();
}

function renderLookupDropdown() {
  const dd = $('#lookup-dropdown');
  const t = ($('#lookup-search').value || '').toLowerCase().trim();
  const matches = t ? recordMembers.filter((m) => m.name.toLowerCase().includes(t)).slice(0, 8) : [];
  if (!matches.length) { dd.classList.add('hidden'); dd.innerHTML = ''; return; }
  dd.innerHTML = matches.map((m) => `
    <button type="button" class="checkin-option" data-id="${esc(m.id)}">
      <span class="checkin-option__name">${esc(m.name)}</span>
      ${m.ageGroup ? `<span class="checkin-option__meta">${esc(m.ageGroup)}</span>` : ''}
    </button>`).join('');
  dd.classList.remove('hidden');
  $$('#lookup-dropdown .checkin-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const member = recordMembers.find((m) => m.id === btn.dataset.id);
      $('#lookup-search').value = '';
      dd.classList.add('hidden');
      if (member) showMemberRecords(member);
    });
  });
}

function showMemberRecords(member) {
  const rows = (recordAll || []).filter((r) => r.memberId === member.id);
  const fmt = (r) => (r.isTime ? `${r.result}s` : `${r.result}m`);
  $('#lookup-result').innerHTML = `
    <div class="record-form">
      <h2>${esc(member.name)}</h2>
      <p class="lookup-code">Access code&nbsp; <strong>${esc(member.accessCode || 'Not assigned')}</strong></p>
      <p class="lookup-code">Nights attended&nbsp; <strong>${esc(member.nights ?? 0)}</strong></p>
      ${rows.length ? `
        <table class="lookup-table">
          <thead><tr><th>Event</th><th>Grade</th><th>Result</th><th>Date</th><th>Season</th><th></th></tr></thead>
          <tbody>${rows.map((r) => `
            <tr>
              <td>${esc(r.event)}</td>
              <td>${esc(r.grade)}${esc(r.gender)}</td>
              <td>${esc(fmt(r))}</td>
              <td>${esc(r.date)}</td>
              <td>${esc(r.season)}</td>
              <td class="lookup-delete">
                <button type="button" class="btn btn-ghost record-delete" data-id="${esc(r.id)}" data-event="${esc(r.event)}" data-result="${esc(fmt(r))}" title="Delete this result">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>`).join('')}</tbody>
        </table>` : '<p>No results recorded yet.</p>'}
    </div>`;

  $$('#lookup-result .record-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteRecord(member, btn));
  });
}

/* ---------- typo check before saving results ----------
   Club-night marks go straight onto the public Club Records page when they
   beat a record, so a mistyped mark (6.5 for 9.5 in the 60m) would publish a
   false record. Before saving, flag marks that can't be read, are outside
   what a 7–14 year old could do, or beat the club record by a wide margin,
   and ask the volunteer to check them. */
const PLAUSIBLE = {
  '60m': [6.5, 25], '100m': [11, 35], '200m': [22, 80], '400m': [50, 210], '800m': [120, 420], '1500m': [250, 900],
  'Long Jump': [0.3, 6.5], 'High Jump': [0.4, 1.95], 'Shot Put': [0.5, 16], 'Discus': [1, 50],
};
let recordBoardCache = null;

async function recordBoard() {
  if (recordBoardCache) return recordBoardCache;
  try {
    const r = await fetch('/api/clubrecords');
    recordBoardCache = r.ok ? await r.json() : { events: [] };
  } catch { recordBoardCache = { events: [] }; }
  return recordBoardCache;
}

/** Problems with one mark, as short sentences ([] when it looks fine). */
function resultWarnings(event, grade, gender, raw, board) {
  const r = String(raw || '').trim();
  if (/^(NJ|NT|DNS|DNF|NM)$/i.test(r)) return [];
  const wellFormed = /^\d+(?:[.,]\d+)?\s*[ms]?$/i.test(r) || /^\d+:\d{2}(?:[.:]\d+)?$/.test(r);
  const v = wellFormed ? certValue(event, r) : null;
  if (v == null) return [`“${r}” isn't a mark the site can read (use e.g. 9.85, 1:23.4, 3.42, or NJ / NT)`];
  const out = [];
  const [lo, hi] = PLAUSIBLE[event] || [0, Infinity];
  if (v < lo || v > hi) out.push(`${certMark(event, r)} is outside the usual range for ${event}`);
  const ev = (board.events || []).find((e) => e.event === event);
  const row = ev && ev.rows.find((x) => String(x.grade) === String(grade) && x.gender === gender);
  const rec = row && row.holders[0] ? certValue(event, row.holders[0].mark) : null;
  if (rec != null) {
    const time = !CERT_FIELD.test(event);
    const margin = time ? (rec - v) / rec : (v - rec) / rec;
    if (margin > (time ? 0.05 : 0.12)) out.push(`${certMark(event, r)} would beat the club record (${recordMarkLabel(row.holders[0].mark, event)}) by a lot`);
  }
  return out;
}

/** Ask before saving marks that look wrong. Resolves true to go ahead. */
async function confirmResults(event, grade, rows) {
  const board = await recordBoard();
  const problems = rows.flatMap((row) => resultWarnings(event, grade, row.gender, row.result, board).map((w) => `• ${row.memberName}: ${w}`));
  if (!problems.length) return true;
  return confirm(`Please check these before saving:\n\n${problems.slice(0, 12).join('\n')}${problems.length > 12 ? `\n…and ${problems.length - 12} more` : ''}\n\nSave anyway?`);
}

/* ---------- new club records ----------
   The server compares every saved result with the club records (the
   historical list plus earlier club-night records) and returns any it beats
   or equals. They go onto the public Club Records page automatically, so a
   mistyped result should be fixed or deleted straight away. */
const FIELD_EVENT = /jump|put|shot|discus/i;

function recordMarkLabel(mark, event) {
  const m = String(mark || '').trim();
  const sheet = m.match(/^(\d{2})[:.](\d{2})(?:[:.](\d+))?$/);
  if (sheet && !FIELD_EVENT.test(event)) {
    // Historical sheet format "00:09:14" / "01:28:41" -> "9.14s" / "1:28.41".
    const [, mi, se, fr] = sheet;
    const tail = fr ? `.${fr}` : '';
    return Number(mi) ? `${Number(mi)}:${se}${tail}` : `${Number(se)}${tail}s`;
  }
  if (/[a-z]/i.test(m) || m.includes(':')) return m;
  return FIELD_EVENT.test(event) ? `${m}m` : `${m}s`;
}

function showNewRecords(list, after) {
  if (list && list.length) recordBoardCache = null; // the board has changed
  $$('.new-record').forEach((el) => el.parentNode.removeChild(el));
  if (!list || !list.length || !after) return;
  const g = (x) => (x === 'F' ? 'girls' : 'boys');
  const items = list.map((r) => {
    const was = r.previous
      ? `${r.tie ? 'Equals' : 'Beats'} ${esc(recordMarkLabel(r.previous.mark, r.event))} by ${esc(r.previous.names.join(' & '))}${r.previous.date ? ` (${esc(r.previous.date.slice(0, 4))})` : ''}`
      : 'First record for this grade';
    return `<li><strong>${esc(r.name)}</strong> — ${esc(r.event)}, Grade ${esc(r.grade)} ${g(r.gender)}: <strong>${esc(recordMarkLabel(r.mark, r.event))}</strong>. ${was}.</li>`;
  }).join('');
  const title = list.length === 1 ? (list[0].tie ? 'Club record equalled!' : 'New club record!') : `${list.length} new club records!`;
  after.insertAdjacentHTML('afterend', `
    <div class="new-record" role="alert">
      <span class="material-symbols-outlined filled" aria-hidden="true">emoji_events</span>
      <div>
        <p class="new-record__title">${title}</p>
        <ul>${items}</ul>
        <p class="new-record__note">It's now on the public Club Records page. If a result was typed wrong, fix or delete it and the record board updates too.</p>
      </div>
    </div>`);
}

/** Archive a result from the Club Records board (soft delete). */
async function deleteRecord(member, btn) {
  const label = `${btn.dataset.event} (${btn.dataset.result})`;
  if (!confirm(`Delete ${label} for ${member.name}?`)) return;
  try {
    const res = await authedFetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: btn.dataset.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Delete failed');
    await loadRecordMembers();
    showMemberRecords(member);
  } catch (e) {
    alert(e.message);
  }
}

function bindRecordSearch() {
  const search = $('#record-search');
  search.addEventListener('input', renderRecordDropdown);
  search.addEventListener('focus', renderRecordDropdown);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.records-box .checkin-search')) $('#record-dropdown').classList.add('hidden');
  });
}

function renderRecordDropdown() {
  const dd = $('#record-dropdown');
  const t = ($('#record-search').value || '').toLowerCase().trim();
  const matches = t ? recordMembers.filter((m) => m.name.toLowerCase().includes(t)).slice(0, 8) : [];
  if (!matches.length) { dd.classList.add('hidden'); dd.innerHTML = ''; return; }
  dd.innerHTML = matches.map((m) => `
    <button type="button" class="checkin-option" data-id="${esc(m.id)}">
      <span class="checkin-option__name">${esc(m.name)}</span>
      ${m.ageGroup ? `<span class="checkin-option__meta">${esc(m.ageGroup)}</span>` : ''}
    </button>`).join('');
  dd.classList.remove('hidden');
  $$('#record-dropdown .checkin-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const member = recordMembers.find((m) => m.id === btn.dataset.id);
      $('#record-search').value = '';
      dd.classList.add('hidden');
      if (member) openRecordForm(member);
    });
  });
}

function openRecordForm(member) {
  const today = new Date().toISOString().slice(0, 10);
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-card record-form">
      <h2>${esc(member.name)}</h2>
      <div class="field">
        <label for="rec-event">Event</label>
        <select id="rec-event">${RECORD_EVENTS.map((e) => `<option value="${e}">${e}</option>`).join('')}</select>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="rec-grade">Grade</label>
          <select id="rec-grade">${RECORD_GRADES.map((g) => `<option value="${g}" ${g === member.grade ? 'selected' : ''}>${g}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="rec-gender">Gender</label>
          <select id="rec-gender">
            <option value="F" ${member.gender === 'F' ? 'selected' : ''}>F</option>
            <option value="M" ${member.gender === 'M' ? 'selected' : ''}>M</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="rec-date">Date</label>
        <input type="date" id="rec-date" value="${today}">
      </div>
      <div class="field">
        <label for="rec-result">Result <span class="rec-hint">(seconds for track, metres for jumps/throws)</span></label>
        <input type="text" id="rec-result" placeholder="e.g. 10.73 or 3.40">
      </div>
      <div class="field">
        <label for="rec-season">Season</label>
        <select id="rec-season"><option value="2026-27">2026-27</option><option value="2025-26">2025-26</option><option value="2024-25">2024-25</option></select>
      </div>
      <div class="record-form__actions">
        <button class="btn btn-ghost" id="rec-cancel">Cancel</button>
        <button class="btn btn-primary" id="rec-save">Save record</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  $('#rec-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  $('#rec-save').addEventListener('click', () => saveRecord(member, overlay));
  $('#rec-result').focus();
}

async function saveRecord(member, overlay) {
  const event = $('#rec-event').value;
  const grade = $('#rec-grade').value;
  const gender = $('#rec-gender').value;
  const date = $('#rec-date').value;
  const result = $('#rec-result').value.trim();
  const season = $('#rec-season').value;
  if (!result) { $('#rec-result').focus(); return; }
  if (!(await confirmResults(event, grade, [{ memberName: member.name, gender, result }]))) return;
  const btn = $('#rec-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const res = await authedFetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, memberName: member.name, event, grade, gender, date, result, season }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Save failed');
    overlay.remove();
    const saved = $('#record-saved');
    saved.textContent = `\u2713 Saved ${event} (${result}) for ${member.name}`;
    saved.classList.remove('hidden');
    showNewRecords(data.newRecords, saved);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Save record';
    alert(e.message);
  }
}

/* ============================================================
   Routing
   ============================================================ */
/* ============================================================
   Init
   ============================================================ */
function init() {
  renderLogin();

  // The whole portal is the gated admin area — the login is the landing screen.
  // renderAdmin() shows the passcode screen until someone signs in, then the
  // dashboard (run sheets, RJT timetable, check-in, records). The gated data is
  // loaded by the login handler once a session exists.
  renderAdmin();

  // Deep link: /attendance (or ?view=attendance) opens the check-in section.
  const path = location.pathname.replace(/\/+$/, '');
  const param = new URLSearchParams(location.search).get('view');
  if (path.endsWith('/attendance') || param === 'attendance') {
    adminSection = 'checkin';
    renderAdmin();
  }
}

document.addEventListener('DOMContentLoaded', init);


/* ============================================================
   Email Members — announcements and newsletters (api/membermail.mjs)
   ============================================================ */

/* Recipients are built from built-in audiences, groups (tags on the Members
   database) and hand-picked members. The server works out the addresses —
   siblings sharing an email get one copy — so this page only ever sees
   masked addresses. The draft is kept in this browser until it's sent. */
const mail = {
  data: null,
  audience: { types: [], groups: [], members: [] },
  query: '',
  groupFilter: '',
  format: 'text',
  category: 'newsletter',
  subject: '',
  body: '',
  count: null,
};
const MAIL_DRAFT_KEY = 'ta-mail-draft';

function loadMailDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(MAIL_DRAFT_KEY) || 'null');
    if (d) Object.assign(mail, { subject: d.subject || '', body: d.body || '', format: d.format === 'html' ? 'html' : 'text', category: d.category === 'notice' ? 'notice' : 'newsletter' });
  } catch { /* storage unavailable: start blank */ }
}
function saveMailDraft() {
  try { localStorage.setItem(MAIL_DRAFT_KEY, JSON.stringify({ subject: mail.subject, body: mail.body, format: mail.format, category: mail.category })); } catch { /* ignore */ }
}

async function postMail(body) {
  const res = await authedFetch('/api/membermail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Something went wrong.');
  return d;
}

function renderEmailMembers() {
  loadMailDraft();
  mail.resumeOffered = false;
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Email Members</h1>
      <p>Send announcements and newsletters to everyone, to a group, or to chosen members. Families who share an email address get one copy, and nobody sees anyone else's address.</p>
    </div>
    <section class="records-box cancel-night" aria-labelledby="cancel-title">
      <h2 id="cancel-title" class="mail-h2"><span class="material-symbols-outlined">thunderstorm</span> Cancel a club night</h2>
      <p class="mail-hint">Puts a banner across the top of every page of the website for that night, and can email every member a club notice.</p>
      <div class="cancel-night__row">
        <label>Club night <input type="date" id="cancel-date"></label>
        <label class="cancel-night__msg">Message <input type="text" id="cancel-msg" maxlength="300"></label>
      </div>
      <label class="mail-check"><input type="checkbox" id="cancel-email" checked> <span>Also email all members (club notice)</span></label>
      <div class="cancel-night__row">
        <button type="button" class="btn btn-primary" id="cancel-go"><span class="material-symbols-outlined">thunderstorm</span> Cancel club night</button>
        <button type="button" class="btn btn-ghost" id="cancel-clear" hidden>Remove the notice</button>
        <span id="cancel-status" class="mail-hint" role="status"></span>
      </div>
    </section>
    <section class="records-box results-mail" aria-labelledby="results-mail-title">
      <h2 id="results-mail-title" class="mail-h2"><span class="material-symbols-outlined">emoji_events</span> Email results after a measure night</h2>
      <p class="mail-hint">Each family gets one email with their children's marks from that night, with new club records and personal bests highlighted, and a link to all their results.</p>
      <div id="results-mail-body"><p class="codes-empty">Loading measure nights…</p></div>
    </section>
    <div class="mail-layout">
      <section class="records-box mail-compose" aria-label="Compose">
        <div class="mail-to"><span class="mail-to__label">To</span><div id="mail-to-chips" class="mail-chips"></div><span id="mail-count" class="mail-to__count"></span></div>
        <div class="mail-format mail-kind" role="radiogroup" aria-label="Kind of email">
          <button type="button" role="radio" data-category="newsletter" aria-checked="${mail.category === 'newsletter'}"><span class="material-symbols-outlined">newspaper</span> Newsletter</button>
          <button type="button" role="radio" data-category="notice" aria-checked="${mail.category === 'notice'}"><span class="material-symbols-outlined">campaign</span> Club notice</button>
        </div>
        <p id="mail-kind-hint" class="mail-hint"></p>
        <input type="text" id="mail-subject" class="mail-subject" placeholder="Subject" maxlength="200" value="${esc(mail.subject)}" aria-label="Subject">
        <div class="mail-format" role="tablist" aria-label="Message format">
          <button type="button" role="tab" data-format="text" aria-selected="${mail.format === 'text'}">Write</button>
          <button type="button" role="tab" data-format="html" aria-selected="${mail.format === 'html'}">Paste HTML</button>
          <button type="button" id="mail-preview-btn" class="mail-format__preview" aria-expanded="false"><span class="material-symbols-outlined">visibility</span> Preview</button>
        </div>
        <textarea id="mail-body" class="mail-body" rows="14" aria-label="Message"></textarea>
        <p id="mail-format-hint" class="mail-hint"></p>
        <iframe id="mail-preview" class="mail-preview" title="Email preview" sandbox="" hidden></iframe>
        <div id="mail-setup"></div>
        <div class="mail-actions">
          <label class="mail-test">Send a test to <input type="email" id="mail-test-to" placeholder="you@example.com" autocomplete="email"></label>
          <button type="button" class="btn btn-ghost" id="mail-test"><span class="material-symbols-outlined">send</span> Send test</button>
          <button type="button" class="btn btn-primary" id="mail-send"><span class="material-symbols-outlined">forward_to_inbox</span> Send</button>
        </div>
        <p id="mail-status" class="mail-hint" role="status"></p>
      </section>

      <section class="records-box mail-people" aria-label="Recipients">
        <h2 class="mail-h2">Audiences</h2>
        <div id="mail-audiences" class="mail-checks"><p class="codes-empty">Loading members…</p></div>
        <h2 class="mail-h2">Groups</h2>
        <div id="mail-groups" class="mail-checks"></div>
        <h2 class="mail-h2">Members</h2>
        <div class="checkin-search">
          <span class="material-symbols-outlined">search</span>
          <input type="text" id="mail-search" placeholder="Search a name or group…" autocomplete="off">
        </div>
        <div class="mail-member-tools">
          <span id="mail-selected-count"></span>
          <button type="button" class="gsg-link mail-linkbtn" id="mail-select-shown">Select shown</button>
          <button type="button" class="gsg-link mail-linkbtn" id="mail-clear">Clear</button>
        </div>
        <ul id="mail-members" class="mail-members"></ul>
        <div class="mail-tagbar">
          <label>Group <input type="text" id="mail-group-name" list="mail-group-list" placeholder="e.g. Development Squad" maxlength="60"></label>
          <datalist id="mail-group-list"></datalist>
          <button type="button" class="btn btn-ghost" id="mail-tag-add"><span class="material-symbols-outlined">label</span> Add selected</button>
          <button type="button" class="btn btn-ghost" id="mail-tag-remove">Remove selected</button>
        </div>
      </section>
    </div>`;

  $('#mail-body').value = mail.body;
  $('#mail-subject').addEventListener('input', (e) => { mail.subject = e.target.value; saveMailDraft(); });
  $$('.mail-kind [data-category]').forEach((b) => b.addEventListener('click', () => {
    mail.category = b.dataset.category;
    $$('.mail-kind [data-category]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    saveMailDraft();
    renderMailKindHint();
    mailAudienceChanged(false);
  }));
  renderMailKindHint();
  $('#mail-body').addEventListener('input', (e) => { mail.body = e.target.value; saveMailDraft(); if (!$('#mail-preview').hidden) renderMailPreview(); });
  $$('.mail-format [data-format]').forEach((b) => b.addEventListener('click', () => {
    mail.format = b.dataset.format;
    $$('.mail-format [data-format]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    saveMailDraft();
    renderMailFormatHint();
    if (!$('#mail-preview').hidden) renderMailPreview();
  }));
  $('#mail-preview-btn').addEventListener('click', () => {
    const f = $('#mail-preview');
    f.hidden = !f.hidden;
    $('#mail-preview-btn').setAttribute('aria-expanded', String(!f.hidden));
    if (!f.hidden) renderMailPreview();
  });
  $('#mail-search').addEventListener('input', (e) => { mail.query = e.target.value; renderMailMembers(); });
  $('#mail-select-shown').addEventListener('click', () => {
    const ids = new Set(mail.audience.members);
    for (const m of shownMailMembers()) if (m.hasEmail) ids.add(m.id);
    mail.audience.members = [...ids];
    mailAudienceChanged();
  });
  $('#mail-clear').addEventListener('click', () => { mail.audience = { types: [], groups: [], members: [] }; mailAudienceChanged(); });
  $('#mail-tag-add').addEventListener('click', () => tagSelected('add'));
  $('#mail-tag-remove').addEventListener('click', () => tagSelected('remove'));
  $('#mail-test').addEventListener('click', sendMailTest);
  $('#mail-send').addEventListener('click', sendMailToMembers);
  renderMailFormatHint();
  setupCancelNight();
  loadResultsMail();
  loadMailMembers();
}

/* ---------- results emails (api/resultsemail.mjs) ---------- */
async function loadResultsMail(date) {
  const box = $('#results-mail-body');
  try {
    const res = await authedFetch(`/api/resultsemail${date ? `?date=${encodeURIComponent(date)}` : ''}`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Could not load measure nights.');
    renderResultsMail(d);
  } catch (e) {
    box.innerHTML = `<p class="codes-empty">⚠ ${esc(e.message)}</p>`;
  }
}

function renderResultsMail(d) {
  const box = $('#results-mail-body');
  if (!d.nights.length) { box.innerHTML = '<p class="mail-hint">No results recorded yet.</p>'; return; }
  const label = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  box.innerHTML = `
    <div class="cancel-night__row">
      <label>Measure night <select id="results-night">${d.nights.map((n) => `<option value="${esc(n.date)}"${n.date === d.date ? ' selected' : ''}>${esc(label(n.date))} · ${n.results} results</option>`).join('')}</select></label>
    </div>
    <ul class="codes-email__stats">
      <li><strong>${d.families}</strong> families · ${d.athletes} athletes</li>
      <li><strong>${d.sent}</strong> already emailed</li>
      <li><strong>${d.waiting}</strong> still to email</li>
      ${d.records ? `<li><strong>${d.records}</strong> new club record${d.records === 1 ? '' : 's'}</li>` : ''}
    </ul>
    ${!d.ready ? '<p class="codes-email__setup"><strong>Email is not set up yet.</strong> Add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in Vercel, then redeploy.</p>' : ''}
    ${d.sample ? `<details class="codes-email__sample"><summary>Preview the email (sample family: ${esc(d.sample.to)})</summary><p><strong>${esc(d.sample.subject)}</strong></p><pre>${esc(d.sample.text)}</pre></details>` : ''}
    <div class="codes-email__row">
      <label>Send a test to <input type="email" id="results-test-to" placeholder="you@example.com" autocomplete="email"></label>
      <button type="button" class="btn btn-ghost" id="results-test" ${d.ready ? '' : 'disabled'}><span class="material-symbols-outlined">send</span> Send test</button>
      <button type="button" class="btn btn-primary" id="results-send" ${d.ready && d.waiting ? '' : 'disabled'}><span class="material-symbols-outlined">forward_to_inbox</span> Email ${d.waiting} famil${d.waiting === 1 ? 'y' : 'ies'}</button>
    </div>
    <p id="results-status" class="mail-hint" role="status"></p>`;
  $('#results-night').addEventListener('change', (e) => loadResultsMail(e.target.value));
  $('#results-test').addEventListener('click', async () => {
    const to = $('#results-test-to').value.trim();
    const st = $('#results-status');
    if (!to) { st.textContent = 'Enter an address for the test.'; return; }
    st.textContent = 'Sending test…';
    try {
      await postResults({ action: 'test', date: d.date, to });
      st.textContent = `Test sent to ${to} (a real family's results — it's your own address, so that's fine).`;
    } catch (e) { st.textContent = `⚠ ${e.message}`; }
  });
  $('#results-send').addEventListener('click', async () => {
    if (!confirm(`Email ${d.waiting} families their results from ${label(d.date)}? This can't be undone.`)) return;
    const st = $('#results-status');
    const btn = $('#results-send');
    btn.disabled = true;
    let sent = 0;
    try {
      for (;;) {
        st.textContent = `Sending… ${sent} of ${d.waiting}`;
        const r = await postResults({ action: 'send', date: d.date, max: 50 });
        sent += r.sent;
        if (!r.sent || !r.waiting) break;
      }
      st.textContent = `Sent ${sent} email${sent === 1 ? '' : 's'}.`;
    } catch (e) {
      st.textContent = `⚠ Stopped after ${sent}: ${e.message} Press the button again later — families already emailed are skipped.`;
    }
    setTimeout(() => loadResultsMail(d.date), 1500);
  });
}

async function postResults(body) {
  const res = await authedFetch('/api/resultsemail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Sending failed.');
  return d;
}

/* ---------- weather cancellation (api/notice.mjs) ---------- */
const nzToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });

function cancelMessage(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const label = d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const when = iso === nzToday() ? `tonight (${label})` : `on ${label}`;
  return `Club night is cancelled ${when} because of the weather. Stay safe — see you next week!`;
}

function setupCancelNight() {
  const date = $('#cancel-date');
  date.value = nzToday();
  $('#cancel-msg').value = cancelMessage(date.value);
  date.addEventListener('change', () => { $('#cancel-msg').value = cancelMessage(date.value); loadCancelState(); });
  $('#cancel-go').addEventListener('click', cancelClubNight);
  $('#cancel-clear').addEventListener('click', clearCancellation);
  loadCancelState();
}

async function loadCancelState() {
  const iso = $('#cancel-date').value;
  try {
    const res = await authedFetch(`/api/notice?date=${encodeURIComponent(iso)}`);
    const d = await res.json().catch(() => ({}));
    const on = !!(d && d.notice);
    $('#cancel-clear').hidden = !on;
    $('#cancel-status').textContent = on ? `Showing on the website: “${d.notice.message}”` : '';
  } catch { /* leave as is */ }
}

async function cancelClubNight() {
  const iso = $('#cancel-date').value;
  const message = $('#cancel-msg').value.trim();
  const email = $('#cancel-email').checked;
  const status = $('#cancel-status');
  if (!iso || !message) { status.textContent = 'Choose the night and write the message.'; return; }
  const ask = email
    ? `Cancel club night on ${iso}? This puts the banner on the website and emails every member now.`
    : `Put the cancellation banner on the website for ${iso}?`;
  if (!confirm(ask)) return;
  status.textContent = 'Posting the notice…';
  try {
    const res = await authedFetch('/api/notice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', date: iso, message }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Could not post the notice.');
    status.textContent = 'The banner is on the website (it can take a minute to appear).';
    $('#cancel-clear').hidden = false;
    if (email) {
      if (!mail.data || !mail.data.ready) { status.textContent += ' Email is not set up yet, so nobody was emailed.'; return; }
      const label = new Date(`${iso}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
      const total = (await postMail({ action: 'count', audience: { types: ['everyone'] }, category: 'notice' })).recipients;
      await runMailJob({
        campaignId: `cancel-${iso}-${Date.now().toString(36)}`,
        offset: 0,
        total,
        audience: { types: ['everyone'] },
        msg: { subject: `Club night cancelled — ${label}`, format: 'text', category: 'notice', body: `Kia ora,\n\n${message}\n\nWe'll post any updates on our Facebook page.\n\nNgā mihi,\nTaupō Athletics` },
      });
    }
  } catch (e) {
    status.textContent = `⚠ ${e.message}`;
  }
}

async function clearCancellation() {
  const iso = $('#cancel-date').value;
  if (!confirm(`Take the cancellation notice for ${iso} off the website?`)) return;
  try {
    const res = await authedFetch('/api/notice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear', date: iso }) });
    if (!res.ok) throw new Error('Could not remove it.');
    $('#cancel-status').textContent = 'Removed from the website.';
    $('#cancel-clear').hidden = true;
  } catch (e) { $('#cancel-status').textContent = `⚠ ${e.message}`; }
}

function renderMailKindHint() {
  $('#mail-kind-hint').textContent = mail.category === 'newsletter'
    ? 'Newsletters and announcements: each email has an unsubscribe link, and anyone who has unsubscribed is skipped.'
    : 'Club notices (cancellations, safety, things every family must know) go to everyone, with no unsubscribe link.';
}

function renderMailFormatHint() {
  $('#mail-body').placeholder = mail.format === 'html'
    ? 'Paste the full HTML here (e.g. an email an agent or newsletter tool wrote for you).'
    : 'Write your message. Leave a blank line between paragraphs; links become clickable.';
  $('#mail-format-hint').textContent = mail.format === 'html'
    ? 'Sent exactly as pasted, with the club footer added. Use Preview and Send test to check it before sending.'
    : 'Sent in the club layout with the club footer. Replies come back to the club inbox.';
}

/* The preview is a sandboxed frame: pasted HTML can't run scripts or reach the portal. */
function renderMailPreview() {
  const body = mail.format === 'html'
    ? mail.body
    : `<div style="font-family:Arial,Helvetica,sans-serif;color:#0e2a47;max-width:600px;margin:16px auto;padding:0 16px">${mail.body.trim().split(/\n{2,}/).map((p) => `<p style="line-height:1.5">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
  $('#mail-preview').srcdoc = body || '<p style="font-family:sans-serif;color:#888">Nothing to preview yet.</p>';
}

async function loadMailMembers() {
  try {
    const res = await authedFetch('/api/membermail');
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Could not load members.');
    mail.data = d;
    renderMailSetup();
    renderMailAudiences();
    if (d.ready && !mail.resumeOffered) { mail.resumeOffered = true; offerMailResume(); }
  } catch (e) {
    $('#mail-audiences').innerHTML = `<p class="codes-empty">⚠ ${esc(e.message)}</p>`;
  }
}

function renderMailSetup() {
  const d = mail.data;
  $('#mail-setup').innerHTML = d.ready
    ? `<p class="mail-hint">From <strong>${esc(d.from)}</strong> · replies to <strong>${esc(d.replyTo)}</strong></p>`
    : `<p class="codes-email__setup"><strong>Not set up yet.</strong> Verify the club's domain in Resend, then add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in Vercel and redeploy. You can still write and preview emails and manage groups.</p>`;
  $('#mail-test').disabled = !d.ready;
}

function renderMailAudiences() {
  const d = mail.data;
  const check = (kind, value, label, count) => {
    const on = mail.audience[kind].includes(value);
    return `<label class="mail-check"><input type="checkbox" data-kind="${kind}" value="${esc(value)}"${on ? ' checked' : ''}> <span>${esc(label)}</span> <small>${count}</small></label>`;
  };
  $('#mail-audiences').innerHTML = d.audiences.map((a) => check('types', a.key, a.label, `${a.count} address${a.count === 1 ? '' : 'es'}`)).join('');
  $('#mail-groups').innerHTML = d.groups.length
    ? d.groups.map((g) => `<div class="mail-group">${check('groups', g.name, g.name, `${g.count} member${g.count === 1 ? '' : 's'}`)}
        <button type="button" class="gsg-link mail-linkbtn" data-group-show="${esc(g.name)}">Show</button>
        <button type="button" class="gsg-link mail-linkbtn" data-group-rename="${esc(g.name)}">Rename</button>
        <button type="button" class="gsg-link mail-linkbtn" data-group-delete="${esc(g.name)}">Delete</button></div>`).join('')
    : '<p class="mail-hint">No groups yet. Select members below, type a group name (e.g. Development Squad) and press “Add selected”.</p>';
  $('#mail-group-list').innerHTML = d.groups.map((g) => `<option value="${esc(g.name)}">`).join('');
  $$('#mail-audiences input, #mail-groups input').forEach((i) => i.addEventListener('change', () => {
    const list = new Set(mail.audience[i.dataset.kind]);
    if (i.checked) list.add(i.value); else list.delete(i.value);
    mail.audience[i.dataset.kind] = [...list];
    mailAudienceChanged();
  }));
  $$('[data-group-show]').forEach((b) => b.addEventListener('click', () => { mail.query = b.dataset.groupShow; $('#mail-search').value = mail.query; renderMailMembers(); }));
  $$('[data-group-rename]').forEach((b) => b.addEventListener('click', () => groupAction('rename', b.dataset.groupRename)));
  $$('[data-group-delete]').forEach((b) => b.addEventListener('click', () => groupAction('delete', b.dataset.groupDelete)));
  mailAudienceChanged();
}

function shownMailMembers() {
  const q = mail.query.toLowerCase().trim();
  const list = mail.data ? mail.data.members : [];
  if (!q) return list;
  return list.filter((m) => m.name.toLowerCase().includes(q) || m.groups.some((g) => g.toLowerCase().includes(q)) || m.type.toLowerCase().includes(q));
}

function renderMailMembers() {
  const sel = new Set(mail.audience.members);
  const shown = shownMailMembers();
  $('#mail-members').innerHTML = shown.slice(0, 400).map((m) => `
    <li><label class="mail-member${m.hasEmail ? '' : ' mail-member--off'}">
      <input type="checkbox" value="${esc(m.id)}"${sel.has(m.id) ? ' checked' : ''}${m.hasEmail ? '' : ' disabled'}>
      <span class="mail-member__name">${esc(m.name)}</span>
      <span class="mail-member__meta">${esc(m.type || '—')}${m.hasEmail ? ` · ${esc(m.email)}` : ' · no email'}</span>
      ${m.groups.length ? `<span class="mail-member__groups">${m.groups.map((g) => `<span class="mail-tag">${esc(g)}</span>`).join('')}</span>` : ''}
    </label></li>`).join('') || '<li class="mail-hint">No members match.</li>';
  $$('#mail-members input').forEach((i) => i.addEventListener('change', () => {
    const ids = new Set(mail.audience.members);
    if (i.checked) ids.add(i.value); else ids.delete(i.value);
    mail.audience.members = [...ids];
    mailAudienceChanged(false);
  }));
  $('#mail-selected-count').textContent = `${sel.size} selected${shown.length > 400 ? ` · showing 400 of ${shown.length}, search to narrow` : ''}`;
}

let mailCountTimer = null;
function mailAudienceChanged(redrawList = true) {
  const d = mail.data;
  if (!d) return;
  const byKey = Object.fromEntries(d.audiences.map((a) => [a.key, a.label]));
  const names = new Map(d.members.map((m) => [m.id, m.name]));
  const chips = [
    ...mail.audience.types.map((t) => byKey[t]),
    ...mail.audience.groups.map((g) => `Group: ${g}`),
    ...mail.audience.members.slice(0, 6).map((id) => names.get(id)),
  ].filter(Boolean);
  if (mail.audience.members.length > 6) chips.push(`+${mail.audience.members.length - 6} more`);
  $('#mail-to-chips').innerHTML = chips.length ? chips.map((c) => `<span class="mail-tag">${esc(c)}</span>`).join('') : '<span class="mail-hint">Choose an audience, a group or members on the right.</span>';
  $$('#mail-audiences input, #mail-groups input').forEach((i) => { i.checked = mail.audience[i.dataset.kind].includes(i.value); });
  if (redrawList) renderMailMembers(); else $('#mail-selected-count').textContent = `${mail.audience.members.length} selected`;
  $('#mail-count').textContent = '…';
  clearTimeout(mailCountTimer);
  mailCountTimer = setTimeout(async () => {
    try {
      const c = await postMail({ action: 'count', audience: mail.audience, category: mail.category });
      mail.count = c.recipients;
      $('#mail-count').textContent = `${mail.count} email address${mail.count === 1 ? '' : 'es'}${c.unsubscribed ? ` · ${c.unsubscribed} unsubscribed, skipped` : ''}`;
    } catch (e) { $('#mail-count').textContent = ''; }
    $('#mail-send').disabled = !(mail.data.ready && mail.count > 0);
  }, 250);
}

async function tagSelected(mode) {
  const group = $('#mail-group-name').value.trim();
  const ids = mail.audience.members;
  const status = $('#mail-status');
  if (!group) { status.textContent = 'Type a group name first.'; return; }
  if (!ids.length) { status.textContent = 'Select members in the list first.'; return; }
  status.textContent = `${mode === 'add' ? 'Adding' : 'Removing'} ${ids.length} member${ids.length === 1 ? '' : 's'}…`;
  try {
    const r = await postMail({ action: 'tag', group, [mode]: ids });
    status.textContent = `${r.changed} member${r.changed === 1 ? '' : 's'} ${mode === 'add' ? 'added to' : 'removed from'} “${group}”.`;
    await loadMailMembers();
  } catch (e) { status.textContent = `⚠ ${e.message}`; }
}

async function groupAction(kind, name) {
  const status = $('#mail-status');
  try {
    if (kind === 'rename') {
      const to = prompt(`Rename the group “${name}” to:`, name);
      if (!to || to.trim() === name) return;
      await postMail({ action: 'rename-group', from: name, to: to.trim() });
      mail.audience.groups = mail.audience.groups.map((g) => (g === name ? to.trim() : g));
      status.textContent = `Renamed “${name}” to “${to.trim()}”.`;
    } else {
      if (!confirm(`Delete the group “${name}”? Members stay; only the tag is removed.`)) return;
      await postMail({ action: 'delete-group', group: name });
      mail.audience.groups = mail.audience.groups.filter((g) => g !== name);
      status.textContent = `Deleted the group “${name}”.`;
    }
    await loadMailMembers();
  } catch (e) { status.textContent = `⚠ ${e.message}`; }
}

function mailMessage() {
  return { subject: mail.subject.trim(), format: mail.format, category: mail.category, body: mail.body };
}

async function sendMailTest() {
  const to = $('#mail-test-to').value.trim();
  const status = $('#mail-status');
  if (!to) { status.textContent = 'Enter an address for the test.'; return; }
  status.textContent = 'Sending test…';
  try {
    await postMail({ action: 'test', to, ...mailMessage() });
    status.textContent = `Test sent to ${to}. Check it on your phone and computer before sending.`;
  } catch (e) { status.textContent = `⚠ ${e.message}`; }
}

const MAIL_PENDING_KEY = 'ta-mail-pending';

async function sendMailToMembers() {
  const status = $('#mail-status');
  const msg = mailMessage();
  if (!msg.subject || !msg.body.trim()) { status.textContent = 'Add a subject and a message first.'; return; }
  if (!mail.count) { status.textContent = 'Choose who to send it to.'; return; }
  if (!confirm(`Send “${msg.subject}” to ${mail.count} email address${mail.count === 1 ? '' : 'es'} now? This can't be undone.`)) return;
  const job = { campaignId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, offset: 0, total: mail.count, audience: mail.audience, msg };
  await runMailJob(job);
}

/* Sends 100 addresses per request until done. If it stops (e.g. the daily
   sending limit), the job is kept in this browser so it can resume from the
   same place later — the order of addresses is fixed and each 100 can only
   ever be sent once. */
async function runMailJob(job) {
  const status = $('#mail-status');
  const btn = $('#mail-send');
  btn.disabled = true;
  try {
    for (;;) {
      status.textContent = `Sending… ${job.offset} of ${job.total}`;
      const r = await postMail({ action: 'send', campaignId: job.campaignId, offset: job.offset, audience: job.audience, ...job.msg });
      job.total = r.total;
      if (!r.sent) break;
      job.offset = r.next;
      try { localStorage.setItem(MAIL_PENDING_KEY, JSON.stringify(job)); } catch { /* ignore */ }
      if (job.offset >= job.total) break;
    }
    status.textContent = `Sent “${job.msg.subject}” to ${job.offset} email address${job.offset === 1 ? '' : 'es'}.`;
    try { localStorage.removeItem(MAIL_PENDING_KEY); localStorage.removeItem(MAIL_DRAFT_KEY); } catch { /* ignore */ }
    if (job.msg.subject === mail.subject) {
      mail.subject = ''; mail.body = '';
      $('#mail-subject').value = ''; $('#mail-body').value = '';
    }
  } catch (e) {
    try { localStorage.setItem(MAIL_PENDING_KEY, JSON.stringify(job)); } catch { /* ignore */ }
    status.innerHTML = `⚠ Stopped after ${job.offset} of ${job.total}: ${esc(e.message)} <button type="button" class="gsg-link mail-linkbtn" id="mail-resume">Resume sending</button>`;
    $('#mail-resume').addEventListener('click', () => runMailJob(job));
  }
  btn.disabled = false;
}

function offerMailResume() {
  let job = null;
  try { job = JSON.parse(localStorage.getItem(MAIL_PENDING_KEY) || 'null'); } catch { /* ignore */ }
  if (!job || job.offset >= job.total) return;
  const status = $('#mail-status');
  status.innerHTML = `“${esc(job.msg.subject)}” stopped after ${job.offset} of ${job.total}. <button type="button" class="gsg-link mail-linkbtn" id="mail-resume">Resume sending</button> <button type="button" class="gsg-link mail-linkbtn" id="mail-forget">Forget it</button>`;
  $('#mail-resume').addEventListener('click', () => runMailJob(job));
  $('#mail-forget').addEventListener('click', () => { try { localStorage.removeItem(MAIL_PENDING_KEY); } catch { /* ignore */ } status.textContent = ''; });
}


/* ============================================================
   Prizegiving certificates — one A4 (landscape) per athlete
   ============================================================ */

/* Each certificate lists the athlete's best mark this season in every event
   they were measured in, and marks any club record they hold. The design is a
   placeholder in the club's colours until the club's own certificate is
   supplied — only certificateHTML() and CERT_CSS need to change for that. */
const CERT_EVENTS = ['60m', '100m', '200m', '400m', '800m', '1500m', 'Long Jump', 'High Jump', 'Shot Put', 'Discus'];
const CERT_FIELD = /jump|put|shot|discus/i;
const cert = { records: [], members: [], board: null, season: '', grade: '', gender: '' };

function certValue(event, raw) {
  const r = String(raw || '').trim().replace(',', '.').replace(/[a-z\s]/gi, '');
  if (!r) return null;
  if (CERT_FIELD.test(event)) { const v = parseFloat(r); return Number.isFinite(v) && v > 0 ? v : null; }
  const p = r.split(/[:.]/).filter((x) => x !== '');
  if (p.some((x) => !/^\d+$/.test(x))) return null;
  if (r.includes(':') || p.length === 3) { const [m, sec, fr = ''] = p; return Number(m) * 60 + Number(sec) + (fr ? Number(fr) / 10 ** fr.length : 0); }
  const v = parseFloat(r);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function certMark(event, raw) {
  const r = String(raw || '').trim().replace(',', '.');
  const m = r.match(/^(\d+):(\d{2}):(\d+)$/);
  if (m) return `${Number(m[1])}:${m[2]}.${m[3]}`;
  if (/[a-z]/i.test(r) || r.includes(':')) return r;
  return CERT_FIELD.test(event) ? `${r}m` : `${r}s`;
}

async function renderCertificates() {
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Certificates</h1>
      <p>Prizegiving certificates, one per athlete: their best mark this season in every event they were measured in, and any club record they hold. Print on A4 (landscape).</p>
    </div>
    <section class="records-box certs-box">
      <div class="cancel-night__row">
        <label>Season <select id="cert-season"></select></label>
        <label>Grade <select id="cert-grade"><option value="">All grades</option></select></label>
        <label>Girls / boys <select id="cert-gender"><option value="">Both</option><option value="F">Girls</option><option value="M">Boys</option></select></label>
        <label>Presented on <input type="date" id="cert-date"></label>
      </div>
      <p id="cert-summary" class="mail-hint">Loading results…</p>
      <div class="cancel-night__row">
        <button type="button" class="btn btn-primary" id="cert-print" disabled><span class="material-symbols-outlined">print</span> Print certificates</button>
      </div>
      <p class="mail-hint">This is a placeholder design in the club's colours. Send us last year's certificate and we'll match it.</p>
    </section>`;
  $('#cert-date').value = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
  try {
    const [r1, r2] = await Promise.all([authedFetch('/api/records'), fetch('/api/clubrecords')]);
    const d = await r1.json().catch(() => ({}));
    if (!r1.ok) throw new Error(d.error || 'Could not load results.');
    cert.records = d.records || [];
    cert.members = d.members || [];
    cert.board = r2.ok ? await r2.json().catch(() => null) : null;
  } catch (e) {
    $('#cert-summary').textContent = `⚠ ${e.message}`;
    return;
  }
  const seasons = [...new Set(cert.records.map((r) => r.season).filter(Boolean))].sort().reverse();
  $('#cert-season').innerHTML = seasons.map((x) => `<option>${esc(x)}</option>`).join('') || '<option value="">—</option>';
  const grades = [...new Set(cert.records.map((r) => r.grade).filter(Boolean))].sort((a, b) => a - b);
  $('#cert-grade').innerHTML += grades.map((g) => `<option value="${esc(g)}">Grade ${esc(g)}</option>`).join('');
  ['#cert-season', '#cert-grade', '#cert-gender'].forEach((id) => $(id).addEventListener('change', renderCertSummary));
  $('#cert-print').addEventListener('click', printCertificates);
  renderCertSummary();
}

/** Athletes for the chosen season/grade/gender, each with their season bests. */
function certAthletes() {
  const season = $('#cert-season').value;
  const grade = $('#cert-grade').value;
  const gender = $('#cert-gender').value;
  const holders = new Set();
  for (const ev of (cert.board && cert.board.events) || []) {
    for (const row of ev.rows) for (const h of row.holders) if (h.source === 'club-night') holders.add(`${ev.event}|${h.name}`);
  }
  const byMember = new Map();
  for (const r of cert.records) {
    if (r.season !== season || (grade && r.grade !== grade) || (gender && r.gender !== gender)) continue;
    const v = certValue(r.event, r.result);
    if (v == null || !r.memberName) continue;
    if (!byMember.has(r.memberId)) byMember.set(r.memberId, { name: r.memberName, grade: r.grade, best: {} });
    const a = byMember.get(r.memberId);
    const cur = a.best[r.event];
    const better = !cur || (CERT_FIELD.test(r.event) ? v > cur.v : v < cur.v);
    if (better) a.best[r.event] = { v, mark: certMark(r.event, r.result), record: holders.has(`${r.event}|${r.memberName}`) };
  }
  return [...byMember.values()].sort((a, b) => Number(a.grade) - Number(b.grade) || a.name.localeCompare(b.name));
}

function renderCertSummary() {
  const list = certAthletes();
  const recs = list.reduce((n, a) => n + Object.values(a.best).filter((b) => b.record).length, 0);
  $('#cert-summary').textContent = list.length
    ? `${list.length} certificate${list.length === 1 ? '' : 's'}${recs ? ` · ${recs} club record${recs === 1 ? '' : 's'} to celebrate` : ''}.`
    : 'No measured results for that choice yet.';
  $('#cert-print').disabled = !list.length;
}

const CERT_CSS = `
  @page { size: A4 landscape; margin: 0; }
  body { margin: 0; }
  .cert { width: 297mm; height: 210mm; padding: 14mm; page-break-after: always; break-after: page; }
  .cert__frame { position: relative; height: 100%; border: 3mm solid #0e2a47; outline: 1mm solid #b04f49; outline-offset: -6mm; padding: 14mm 18mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .cert__logo { height: 26mm; }
  .cert__club { margin: 2mm 0 0; letter-spacing: .3em; text-transform: uppercase; font-size: 11pt; color: #b04f49; font-weight: 700; }
  .cert h1 { margin: 5mm 0 2mm; font-size: 30pt; color: #0e2a47; font-family: Georgia, 'Times New Roman', serif; }
  .cert__to { margin: 0; font-size: 12pt; color: #55606e; }
  .cert__name { margin: 3mm 0 1mm; font-size: 34pt; font-weight: 700; color: #0e2a47; font-family: Georgia, 'Times New Roman', serif; border-bottom: .6mm solid #b04f49; padding: 0 10mm 2mm; }
  .cert__grade { margin: 2mm 0 5mm; font-size: 12pt; color: #55606e; }
  .cert__bests { display: flex; flex-wrap: wrap; justify-content: center; gap: 3mm; max-width: 230mm; }
  .cert__best { border: .4mm solid #c9d3df; border-radius: 3mm; padding: 2.5mm 5mm; min-width: 34mm; }
  .cert__best b { display: block; font-size: 15pt; color: #0e2a47; }
  .cert__best span { font-size: 9.5pt; color: #55606e; }
  .cert__best--rec { border-color: #b04f49; background: #fbefee; }
  .cert__best--rec em { display: block; font-style: normal; font-size: 8pt; font-weight: 700; color: #b04f49; text-transform: uppercase; letter-spacing: .08em; }
  .cert__foot { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10pt; color: #55606e; }
  .cert__sign { border-top: .4mm solid #55606e; padding-top: 1.5mm; min-width: 60mm; }
  @media screen { body { background: #ddd; } .cert { background: #fff; margin: 0 auto 8mm; box-shadow: 0 2px 8px rgba(0,0,0,.2); } button.print { margin: 10px; } }
`;

function certificateHTML(a, seasonLabel, presented) {
  const bests = CERT_EVENTS.filter((e) => a.best[e]).map((e) => {
    const b = a.best[e];
    return `<div class="cert__best${b.record ? ' cert__best--rec' : ''}"><span>${esc(e)}</span><b>${esc(b.mark)}</b>${b.record ? '<em>Club record</em>' : ''}</div>`;
  }).join('');
  return `<section class="cert"><div class="cert__frame">
    <img class="cert__logo" src="${location.origin}/logo.svg" alt="">
    <p class="cert__club">Taupō Athletics Club</p>
    <h1>Certificate of Achievement</h1>
    <p class="cert__to">Presented to</p>
    <p class="cert__name">${esc(a.name)}</p>
    <p class="cert__grade">Grade ${esc(a.grade)} · ${esc(seasonLabel)} season · season bests</p>
    <div class="cert__bests">${bests}</div>
    <div class="cert__foot"><span class="cert__sign">Club President</span><span>${esc(presented)}</span><span class="cert__sign">Coach Co-ordinator</span></div>
  </div></section>`;
}

function printCertificates() {
  const list = certAthletes();
  if (!list.length) return;
  const season = $('#cert-season').value.replace('-', '/');
  const presented = new Date(`${$('#cert-date').value}T12:00:00`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
  openPrintWindow('Prizegiving certificates', CERT_CSS, `<button class="print" onclick="window.print()">Print</button>${list.map((a) => certificateHTML(a, season, presented)).join('')}`);
}
