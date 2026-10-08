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
let activeTerm = 'all';
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

function renderTermTabs() {
  const tabsEl = $('#block-tabs');
  const terms = [...new Set(series.map(s => s.term))];
  const tabs = [
    { id: 'all', label: 'All nights' },
    ...terms.map(t => ({ id: t, label: t }))
  ];
  tabsEl.innerHTML = tabs.map(t =>
    `<button class="block-tab ${t.id === activeTerm ? 'active' : ''}" data-term="${esc(t.id)}">${esc(t.label)}</button>`
  ).join('');
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
      ${r.weekBProgression ? `<details class="weekb"><summary>Week B progression</summary><p>${esc(r.weekBProgression)}</p></details>` : ''}
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

function renderLessons() {
  const grid = $('#lesson-grid');
  const list = series.filter(s => activeTerm === 'all' || s.term === activeTerm);
  grid.innerHTML = list.length
    ? list.map(seriesHTML).join('')
    : '<p>No nights found for this term.</p>';
  bindCards();
}

function bindCards() {
  $$('.series-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('open'));
  });
}

function renderRunSheets() {
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Get Set Go Sessions</h1>
      <p>Two weeks per series. Open a series for the four rotations — each one gives a Discovery invitation, Developing practice and a Consolidating game.</p>
    </div>
    <div id="season-info"></div>
    <div class="block-tabs" id="block-tabs"></div>
    <div class="lesson-grid" id="lesson-grid"></div>`;
  $('#season-info').innerHTML = seasonInfoHTML();
  renderTermTabs();
  renderLessons();
  $('#block-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.block-tab');
    if (!tab) return;
    activeTerm = tab.dataset.term;
    renderTermTabs();
    renderLessons();
  });
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
      <div class="page-head"><h1>Run Jump Throw Sessions</h1></div>
      <p>${rjtFailed ? 'Could not load the Run Jump Throw timetable.' : 'Loading the timetable\u2026'}</p>`;
    return;
  }
  $('#admin-content').innerHTML = `
    <div class="page-head">
      <h1>Run Jump Throw Sessions</h1>
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
    const meta = [m.age != null ? `${m.age} yrs` : '', m.ageGroup].filter(Boolean).join(' · ');
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
    const age = m.age;
    let group;
    if (age == null) group = 'Age not set';
    else if (age < 3) group = 'Under 3';
    else if (age <= 14) group = 'Grade ' + age;
    else group = '15 & over';
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
  const order = ['Under 3'];
  for (let g = 3; g <= 14; g += 1) order.push('Grade ' + g);
  order.push('15 & over', 'Age not set');

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
      return `<section class="grade">
        <h2>${esc(g)}</h2>
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
<header><h1>Taupō Athletics — Attendance</h1><div class="date">${esc(formatDateLabel(attendanceDate))}</div></header>
<button class="print" onclick="window.print()">🖨 Print / Save as PDF</button>
${sections}
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Please allow pop-ups to print the attendance sheet.'); return; }
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
    ${section('runsheets', 'description', 'Get Set Go Sessions')}
    ${section('rjt', 'sports_score', 'Run Jump Throw Sessions')}
    ${section('checkin', 'how_to_reg', 'Check In')}
    ${section('records', 'emoji_events', 'Record Results')}
    ${section('lookup', 'manage_search', 'Member Records')}
    <button class="sidenav__item" id="logout-btn"><span class="material-symbols-outlined">logout</span> Logout</button>`;

  $$('#sidenav [data-section]').forEach((b) => {
    b.addEventListener('click', () => {
      adminSection = b.dataset.section;
      renderAdmin();
    });
  });

  $('#logout-btn').addEventListener('click', () => {
    adminLoggedIn = false;
    adminSection = 'runsheets';
    renderAdmin();
  });

  if (adminSection === 'records') renderRecordsEntry();
  else if (adminSection === 'lookup') renderMemberRecords();
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
      <button class="btn btn-primary" id="bulk-save" disabled>Save results</button>
      <p class="record-saved hidden" id="bulk-saved"></p>
    </div>`;
  bindRecordSearch();
  bindBulk();
  loadRecordMembers().then(renderBulkTables);
}

/** The measure-night grid: girls and boys tables for the selected grade. */
function renderBulkTables() {
  const grade = $('#bulk-grade').value;
  const girls = recordMembers.filter((m) => m.grade === grade && m.gender === 'F').sort((a, b) => a.name.localeCompare(b.name));
  const boys = recordMembers.filter((m) => m.grade === grade && m.gender === 'M').sort((a, b) => a.name.localeCompare(b.name));

  const tableHTML = (title, list, gender) => `
    <div class="bulk-table">
      <h3>${esc(title)} <span class="bulk-table__count">${list.length}</span></h3>
      ${list.length ? `
      <div class="table-wrap">
        <table class="data-table bulk-rows">
          <thead><tr><th>Name</th><th class="bulk-result-col">Result</th></tr></thead>
          <tbody>
            ${list.map((m) => `
              <tr>
                <td>${esc(m.name)}</td>
                <td><input type="text" class="bulk-result" data-id="${esc(m.id)}" data-name="${esc(m.name)}" data-gender="${gender}" placeholder="e.g. 10.73"></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<p class="bulk-empty">No ${gender === 'F' ? 'girls' : 'boys'} in grade ${esc(grade)}.</p>`}
    </div>`;

  $('#bulk-tables').innerHTML = tableHTML('Girls', girls, 'F') + tableHTML('Boys', boys, 'M');
  $('#bulk-save').disabled = !(girls.length || boys.length);
}

function bindBulk() {
  $('#bulk-grade').addEventListener('change', renderBulkTables);
  $('#bulk-save').addEventListener('click', saveBulk);
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
    saved.textContent = `\u2713 Saved ${data.created} \u00d7 ${event} for grade ${grade}` + (data.skipped && data.skipped.length ? ` — ${data.skipped.length} failed, see console.` : '');
    saved.classList.remove('hidden');
    if (data.skipped && data.skipped.length) console.warn('bulk save skipped:', data.skipped);
    $$('#bulk-tables .bulk-result').forEach((i) => { i.value = ''; });
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = !$$('#bulk-tables .bulk-result').length;
    btn.textContent = 'Save results';
  }
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
