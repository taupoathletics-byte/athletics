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
let finalNight = null;
let activeTerm = 'all';
let adminLoggedIn = false;

/* ============================================================
   Run Sheets
   ============================================================ */
function loadSessions() {
  fetch('sessions.json').then(r => {
    if (!r.ok) throw new Error('no sessions.json');
    return r.json();
  }).then(data => {
    season = data.season || null;
    series = data.series || [];
    finalNight = data.finalNight || null;
    renderRunSheets();
  }).catch(() => {
    console.warn('Could not load sessions.json.');
    season = null; series = []; finalNight = null;
    renderRunSheets();
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

function gameHTML(g) {
  if (!g) return '';
  return `
    <div class="game">
      <span class="game__name">${esc(g.name)}</span>
      ${g.setup ? `<div><em>Set up.</em> ${esc(g.setup)}</div>` : ''}
      ${g.how ? `<div><em>How to play.</em> ${esc(g.how)}</div>` : ''}
    </div>`;
}

function rotationHTML(r) {
  const cues = (r.cues || []).map(c => `<li>${esc(c)}</li>`).join('');
  const gameHtml = gameHTML(r.game);
  const backupHtml = r.backup ? `
    <div class="backup"><strong>If they get restless:</strong> ${esc(r.backup)} <em>(same gear)</em></div>` : '';
  const stationsHtml = (r.stations && r.stations.length) ? `
    <div class="course">
      <p class="course__title">Obstacle course — ${esc(r.course || '')} <span class="course__note">(same both weeks)</span></p>
      <ol class="course__list">
        ${r.stations.map(s => `<li><strong>${esc(s.move)}</strong> — ${esc(s.how)}</li>`).join('')}
      </ol>
    </div>` : '';

  return `
    <div class="rotation ${categoryClass(r.category)}">
      <div class="rotation__head">
        <div>
          <div class="rotation__num">Rotation ${r.order} · ${esc(r.category)}</div>
          <h4 class="rotation__title">${esc(r.skill)}${r.event ? ' — ' + esc(r.event) : ''}</h4>
        </div>
        ${r.ledBy ? `<span class="chip ${ledClass(r.ledBy)}">${esc(r.ledBy)}</span>` : ''}
      </div>
      ${r.equipment ? `<div class="equip-bar"><span class="material-symbols-outlined">shopping_basket</span><div><strong>You need:</strong> ${esc(r.equipment)}</div></div>` : ''}
      ${cues ? `<p class="mini-label">Learning cues</p><ol class="cue-list">${cues}</ol>` : ''}
      ${gameHtml}
      ${backupHtml}
      ${stationsHtml}
      ${r.adaptation ? `<div class="adaptation"><strong>3–4 year olds:</strong> ${esc(r.adaptation)}</div>` : ''}
      ${r.watchFor ? `<div class="watchfor"><strong>Watch for:</strong> ${esc(r.watchFor)}</div>` : ''}
    </div>`;
}

function seriesHTML(s) {
  const rotations = (s.rotations || []).map(r => rotationHTML(r)).join('');
  return `
    <article class="series-card">
      <div class="series-card__head">
        <div>
          <div class="session-card__meta">Series ${s.series} · ${esc(s.term)} · ${esc(s.weeksLabel)}</div>
          <h3 class="series-card__title">${esc(s.name)}</h3>
          ${s.athleticsEvent ? `<div class="series-card__event">Athletics event: <strong>${esc(s.athleticsEvent)}</strong></div>` : ''}
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
      <p class="section-label">Every night</p>
      <p><strong>${esc(w.name)}</strong></p>
      ${w.setup ? `<p><em>Set up.</em> ${esc(w.setup)}</p>` : ''}
      ${w.how ? `<p><em>How to play.</em> ${esc(w.how)}</p>` : ''}
      ${w.equipment && w.equipment !== 'None' ? `<p><em>Equipment.</em> ${esc(w.equipment)}</p>` : ''}
      ${w.adaptation ? `<div class="adaptation"><strong>3–4 year olds:</strong> ${esc(w.adaptation)}</div>` : ''}
      ${w.watchFor ? `<div class="watchfor"><strong>Watch for:</strong> ${esc(w.watchFor)}</div>` : ''}
      <details class="rules"><summary>Standing rules for every night</summary><ul>${rules}</ul></details>
    </div>`;
}

function finalNightHTML() {
  if (!finalNight) return '';
  const stations = (finalNight.stations || []).map(s => `<li>${esc(s)}</li>`).join('');
  return `
    <article class="final-night-card">
      <div class="final-night-card__head">
        <div>
          <div class="session-card__meta">Final night</div>
          <h3 class="series-card__title">${esc(finalNight.name)} — ${esc(finalNight.date)}</h3>
        </div>
        <span class="material-symbols-outlined celebration">celebration</span>
      </div>
      <p>${esc(finalNight.description)}</p>
      <ul class="final-night__stations">${stations}</ul>
      <div class="equip-bar"><span class="material-symbols-outlined">shopping_basket</span><div><strong>You need:</strong> ${esc(finalNight.equipment)}</div></div>
    </article>`;
}

function renderLessons() {
  const grid = $('#lesson-grid');
  const list = series.filter(s => activeTerm === 'all' || s.term === activeTerm);
  grid.innerHTML = list.length
    ? list.map(seriesHTML).join('') + (activeTerm === 'all' ? finalNightHTML() : '')
    : '<p>No nights found for this term.</p>';
  bindCards();
}

function bindCards() {
  $$('.series-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('open'));
  });
}

function renderRunSheets() {
  $('#season-info').innerHTML = seasonInfoHTML();
  renderTermTabs();
  renderLessons();
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
    showConfirm(`\u2713 ${data.created} recorded — ${names}`, data.skipped);
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
  box.innerHTML = `<p>${esc(msg)}</p>${skipped ? `<p class="checkin-confirm__note">${skipped} already checked in — not duplicated.</p>` : ''}`;
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
  const dateInput = $('#attendance-date-input');
  dateInput.value = attendanceDate;
  dateInput.addEventListener('change', () => {
    attendanceDate = dateInput.value || localDateString();
    loadAttendance();
  });
}

/* ============================================================
   Admin
   ============================================================ */
function renderLogin() {
  $('#admin-login').innerHTML = `
    <div class="login-card">
      <div class="logo-badge material-symbols-outlined filled">sports_score</div>
      <h1>Get Set Go</h1>
      <p class="sub">Admin Portal Login</p>
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

/** Which admin section is showing. Reset to check-in on login and logout. */
let adminSection = 'checkin';

function renderAdmin() {
  $('#admin-login').classList.toggle('hidden', adminLoggedIn);
  $('#admin-dashboard').classList.toggle('hidden', !adminLoggedIn);
  if (!adminLoggedIn) return;

  const section = (id, icon, label) =>
    `<button class="sidenav__item${adminSection === id ? ' active' : ''}" data-section="${id}">` +
    `<span class="material-symbols-outlined filled">${icon}</span> ${label}</button>`;

  $('#sidenav').innerHTML = `
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
    adminSection = 'checkin';
    renderAdmin();
  });

  if (adminSection === 'records') renderRecordsEntry();
  else if (adminSection === 'lookup') renderMemberRecords();
  else renderCheckin();
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
      <p>Search a member, then enter their event result.</p>
    </div>
    <div class="records-box">
      <div class="checkin-search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" id="record-search" placeholder="Type a member's name…" autocomplete="off">
        <div class="checkin-dropdown hidden" id="record-dropdown"></div>
      </div>
      <p class="record-saved hidden" id="record-saved"></p>
    </div>`;
  bindRecordSearch();
  loadRecordMembers();
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
          <thead><tr><th>Event</th><th>Grade</th><th>Result</th><th>Date</th><th>Season</th></tr></thead>
          <tbody>${rows.map((r) => `
            <tr>
              <td>${esc(r.event)}</td>
              <td>${esc(r.grade)}${esc(r.gender)}</td>
              <td>${esc(fmt(r))}</td>
              <td>${esc(r.date)}</td>
              <td>${esc(r.season)}</td>
            </tr>`).join('')}</tbody>
        </table>` : '<p>No results recorded yet.</p>'}
    </div>`;
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
function showView(name) {
  ['runsheets', 'admin'].forEach(v => {
    $('#view-' + v).classList.toggle('hidden', v !== name);
  });
  $$('.nav-link, .bottomnav__item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name === 'admin') renderAdmin();
}

function bindNav() {
  $$('.nav-link, .bottomnav__item').forEach(b => {
    b.addEventListener('click', () => showView(b.dataset.view));
  });
}

/* ============================================================
   Init
   ============================================================ */
function init() {
  bindNav();
  renderLogin();
  loadSessions();

  $('#block-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.block-tab');
    if (!tab) return;
    activeTerm = tab.dataset.term;
    renderTermTabs();
    renderLessons();
  });

  // Deep links. /attendance and /admin (and their ?view= equivalents) both open
  // the gated admin area; check-in is the default section for /attendance.
  const path = location.pathname.replace(/\/+$/, '');
  const param = new URLSearchParams(location.search).get('view');
  if (path.endsWith('/attendance') || param === 'attendance') adminSection = 'checkin';
  const wantsAdmin =
    path.endsWith('/attendance') ||
    path.endsWith('/admin') ||
    param === 'attendance' ||
    param === 'admin';
  // showView('admin') calls renderAdmin(), which shows the passcode screen when
  // nobody is signed in — a deep link cannot skip the gate.
  showView(wantsAdmin ? 'admin' : 'runsheets');
}

document.addEventListener('DOMContentLoaded', init);
