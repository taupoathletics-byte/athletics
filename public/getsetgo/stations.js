'use strict';

/* ============================================================
   Get Set Go Sessions — the volunteer dashboard
   Tonight's four stations at a glance, a phone-first card per station, a
   structured editor (saved to Notion as per-night overrides) and
   "Generate Tonight's Cards" (PNG / ZIP / A4 PDF). Uses the helpers and
   gated data from script.js (esc, $, $$, authedFetch, season, series) and
   the card renderer in cards.js (window.GSGCards).
   ============================================================ */

const GSG_TEXT = ['name', 'skill', 'volunteers', 'setup', 'younger', 'older', 'watch', 'safety', 'discovery', 'developing', 'consolidating', 'observation', 'alternative'];
const GSG_LISTS = ['equipment', 'steps', 'cues'];
const GSG_CATS = ['Game', 'Manipulative', 'Fitness Circuit', 'Athletics'];
const GSG_PHASES = [['discovery', 'Discovery', '2–3 min'], ['developing', 'Developing', '3–4 min'], ['consolidating', 'Consolidating', '4–5 min']];

const gsg = {
  nightKey: null,       // 's1-A' — null means "follow tonight"
  overrides: new Map(), // card key -> override from /api/stations
  storage: 'loading',   // loading | notion | unavailable | error
  storageError: '',
  term: 'all',
  requested: false,
};

/* ---------- dates ---------- */

function gsgToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function gsgNights() {
  const nights = [];
  for (const s of series) {
    if (s.isFinal) {
      // Week 19: one night of four 8-minute activity zones (cards.A), no Week B.
      nights.push({ key: `s${s.series}`, s, final: true, week: 'A', date: (s.isoDates || [])[0] || '', dateLabel: (s.dates || [])[0] || '', cards: (s.cards && s.cards.A) || [] });
      continue;
    }
    ['A', 'B'].forEach((week, i) => {
      if (!s.cards || !s.cards[week] || !s.cards[week].length) return;
      nights.push({ key: `s${s.series}-${week}`, s, week, date: (s.isoDates || [])[i] || '', dateLabel: (s.dates || [])[i] || '', cards: s.cards[week] });
    });
  }
  return nights.sort((a, b) => a.date.localeCompare(b.date));
}

/** The club night to show: the chosen one, else tonight / the next one (NZ time). */
function gsgCurrentNight(nights) {
  if (gsg.nightKey) {
    const chosen = nights.find((n) => n.key === gsg.nightKey);
    if (chosen) return chosen;
  }
  const today = gsgToday();
  return nights.find((n) => n.date >= today) || nights[nights.length - 1];
}

/** 'Thu 15 Oct 2026' -> 'Thu 15 Oct' */
function gsgShortLabel(night) {
  return String(night.dateLabel || '').replace(/\s+\d{4}$/, '');
}

function gsgWhen(night) {
  const today = gsgToday();
  if (night.date === today) return 'Tonight';
  const upcoming = gsgNights().find((n) => n.date >= today);
  if (upcoming && upcoming.key === night.key) return 'Next club night';
  return night.date < today ? 'Past night' : 'Coming up';
}

/* ---------- effective cards (board + Notion edits) ---------- */

function gsgImageLibrary() {
  const lib = new Map();
  for (const s of series) for (const w of ['A', 'B']) for (const c of (s.cards && s.cards[w]) || []) {
    if (c.image && !lib.has(c.image.src)) lib.set(c.image.src, { ref: c.image.src, src: c.image.src, label: c.name, alt: c.image.alt, note: c.image.note || '' });
  }
  for (const ov of gsg.overrides.values()) {
    if (!ov.hasImage) continue;
    const ref = `notion:${ov.pageId}`;
    lib.set(ref, { ref, src: `/api/stations?image=${encodeURIComponent(ov.pageId)}`, label: `${ov.fields.name || gsgBase(ov.key)?.name || ov.key} (uploaded)`, alt: ov.fields.imageAlt || '', note: '' });
  }
  return lib;
}

function gsgBase(key) {
  for (const s of series) for (const w of ['A', 'B']) {
    const c = ((s.cards && s.cards[w]) || []).find((x) => x.key === key);
    if (c) return c;
  }
  return null;
}

function gsgCard(base) {
  const ov = gsg.overrides.get(base.key);
  if (!ov) return { ...base, edited: false, boardChanged: false, needsReview: Boolean(base.review) };
  const card = { ...base, ...ov.fields };
  const ref = ov.imageRef || '';
  if (ref === 'none') card.image = null;
  else if (ref) {
    const lib = gsgImageLibrary().get(ref);
    const src = ref.startsWith('notion:') ? `/api/stations?image=${encodeURIComponent(ref.slice(7))}` : ref;
    card.image = { src, alt: ov.fields.imageAlt || (lib && lib.alt) || `${card.name} illustration`, note: ov.fields.imageNote || (lib && lib.ref === base.image?.src ? lib.note : '') };
  } else if (base.image) {
    card.image = { ...base.image, alt: ov.fields.imageAlt || base.image.alt, note: ov.fields.imageNote || base.image.note || '' };
  }
  card.edited = true;
  card.reviewed = ov.reviewed;
  card.needsReview = Boolean(base.review) && !ov.reviewed;
  card.boardChanged = Boolean(ov.baseHash) && ov.baseHash !== base.hash;
  card.editedFields = Object.keys(ov.fields);
  card.updatedAt = ov.updatedAt;
  return card;
}

/** Station colour: by category (Game pink, Manipulative orange, Fitness blue, Athletics green); Mini Meet zones by zone number. */
function gsgCatClass(category, station) {
  if (category === 'Zone') return `gsg-cat-${station || 1}`;
  return `gsg-cat-${GSG_CATS.indexOf(category) + 1 || 1}`;
}

const gsgIsZone = (card) => card && card.kind === 'zone';
const gsgUnit = (card) => (gsgIsZone(card) ? 'Zone' : 'Station');
const gsgLead = (card) => (card.volunteers ? `Volunteers: ${card.volunteers}` : card.ledBy || 'Station leader');

function gsgImageHTML(card, cls = '') {
  if (card.image && card.image.src) {
    return `<img class="gsg-img ${cls}" src="${esc(card.image.src)}" alt="${esc(card.image.alt || card.name)}" loading="lazy">`;
  }
  return `<div class="gsg-ph ${cls}" role="img" aria-label="No illustration yet for ${esc(card.name)}"><span class="material-symbols-outlined" aria-hidden="true">${['sprint', 'sports_handball', 'directions_run', 'stadium'][GSG_CATS.indexOf(card.category)] || 'sprint'}</span><span>Image coming soon</span></div>`;
}

/* A station image that fails to load (e.g. not uploaded yet) becomes a tidy placeholder. */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('gsg-img')) return;
  const ph = document.createElement('div');
  ph.className = img.className.replace('gsg-img', 'gsg-ph');
  ph.setAttribute('role', 'img');
  ph.setAttribute('aria-label', img.alt || 'Image unavailable');
  ph.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">image_not_supported</span><span>Image unavailable</span>';
  img.replaceWith(ph);
}, true);

/* ---------- data ---------- */

function gsgLoadOverrides(force) {
  if (gsg.requested && !force) return;
  gsg.requested = true;
  authedFetch('/api/stations').then((r) => r.json().then((j) => ({ ok: r.ok, j }))).then(({ ok, j }) => {
    if (!ok) throw new Error(j.error || 'Could not load edits');
    gsg.overrides = new Map((j.overrides || []).map((o) => [o.key, o]));
    gsg.storage = j.storage || 'notion';
    gsg.storageError = '';
  }).catch((e) => {
    gsg.storage = 'error';
    gsg.storageError = e.message || String(e);
  }).finally(() => {
    if (adminLoggedIn && adminSection === 'runsheets') renderSessionsDashboard();
  });
}

/* ---------- small UI helpers ---------- */

function gsgToast(msg, kind = '') {
  let host = $('#gsg-toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'gsg-toasts';
    host.className = 'gsg-toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = `gsg-toast ${kind}`;
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

let gsgModalReturn = null;
function gsgOpenModal(inner, { label = 'Dialog', wide = false, cls = '' } = {}) {
  gsgCloseModal();
  gsgModalReturn = document.activeElement;
  const el = document.createElement('div');
  el.className = 'gsg-modal';
  el.innerHTML = `<div class="gsg-modal__panel ${wide ? 'gsg-modal__panel--wide' : ''} ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">${inner}</div>`;
  document.body.appendChild(el);
  document.body.classList.add('gsg-noscroll');
  el.addEventListener('mousedown', (e) => { if (e.target === el) gsgCloseModal(); });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); gsgCloseModal(); }
    if (e.key === 'Tab') {
      const f = $$('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])', el).filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  const panel = $('.gsg-modal__panel', el);
  ($('[autofocus]', el) || panel).focus();
  return panel;
}

function gsgCloseModal() {
  const el = $('.gsg-modal');
  if (!el) return;
  el.remove();
  document.body.classList.remove('gsg-noscroll');
  if (gsgModalReturn && document.contains(gsgModalReturn)) gsgModalReturn.focus();
  gsgModalReturn = null;
}

/* ============================================================
   Dashboard
   ============================================================ */

function renderSessionsDashboard() {
  const root = $('#admin-content');
  if (!root) return;
  if (!series.length) {
    root.innerHTML = `<div class="page-head"><h1>Get Set Go Sessions</h1><p>Loading the run sheets…</p></div>`;
    return;
  }
  gsgLoadOverrides();
  const nights = gsgNights();
  const night = gsgCurrentNight(nights);
  const idx = nights.indexOf(night);
  const s = night.s;
  const accentCards = (night.cards || []).map(gsgCard);
  const review = gsgReviewItems(night, accentCards);

  const options = ['Term 4', 'Term 1'].map((term) => {
    const list = nights.filter((n) => n.s.term === term);
    if (!list.length) return '';
    return `<optgroup label="${esc(term)}">${list.map((n) => `<option value="${esc(n.key)}"${n.key === night.key ? ' selected' : ''}>${esc(n.dateLabel)} — ${n.final ? esc(n.s.name) : `Series ${n.s.series} · Week ${n.week}`}</option>`).join('')}</optgroup>`;
  }).join('');

  const storagePill = {
    loading: '<span class="gsg-pill">Checking Notion…</span>',
    notion: '<span class="gsg-pill gsg-pill--ok"><span class="material-symbols-outlined" aria-hidden="true">cloud_done</span> Edits save to Notion</span>',
    unavailable: '<span class="gsg-pill gsg-pill--warn" title="NOTION_TOKEN is not set on the server">Notion not connected — edits can’t be saved</span>',
    error: `<span class="gsg-pill gsg-pill--warn" title="${esc(gsg.storageError)}">Couldn’t load saved edits</span>`,
  }[gsg.storage];

  root.innerHTML = `
    <div class="gsg">
      <div class="page-head gsg-pagehead">
        <div>
          <h1>Get Set Go Sessions</h1>
          <p>Tonight’s four stations at a glance. Open a station for the volunteer card — the full coaching notes are tucked inside.</p>
        </div>
        ${storagePill}
      </div>

      <nav class="gsg-nightbar" aria-label="Choose a club night">
        <button class="gsg-iconbtn" data-nav="-1" ${idx <= 0 ? 'disabled' : ''} aria-label="Previous club night"><span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
        <label class="gsg-nightselect"><span class="visually-hidden">Club night</span>
          <select id="gsg-night">${options}</select>
        </label>
        <button class="gsg-iconbtn" data-nav="1" ${idx >= nights.length - 1 ? 'disabled' : ''} aria-label="Next club night"><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
        <button class="btn btn-ghost gsg-tonight" id="gsg-tonight" ${gsg.nightKey ? '' : 'aria-pressed="true"'}><span class="material-symbols-outlined" aria-hidden="true">today</span> Tonight</button>
      </nav>

      ${night.final ? gsgMeetHTML(night, accentCards, review) : gsgSessionHTML(night, accentCards, review)}

      <details class="gsg-panel gsg-season" ${gsg.seasonOpen ? 'open' : ''}>
        <summary><span class="material-symbols-outlined" aria-hidden="true">calendar_month</span> Whole season — every series</summary>
        <div class="gsg-season__body">${gsgSeasonHTML(nights, night)}</div>
      </details>

      <details class="gsg-panel">
        <summary><span class="material-symbols-outlined" aria-hidden="true">info</span> How the night runs, warm-down &amp; standing rules</summary>
        <div class="gsg-panel__body">${seasonInfoHTML()}</div>
      </details>
    </div>`;

  gsgBindDashboard(root, nights, night);
}

function gsgReviewItems(night, cards) {
  const items = (night.s.conflicts || []).map((text) => ({ text, kind: 'conflict' }));
  for (const c of cards) {
    if (c.boardChanged) items.push({ kind: 'board', key: c.key, text: `${gsgUnit(c)} ${c.station} · ${c.name}: the source text has changed since this card was edited. Open the editor to compare.` });
    if (c.needsReview || (c.alternate && !c.edited)) items.push({ kind: 'review', key: c.key, text: `${gsgUnit(c)} ${c.station} · ${c.name}: ${c.review || 'another version is waiting for approval.'}`, alt: c.alternate && !c.edited ? `${c.alternate.label || 'Other version'} — ${c.alternate.name}` : '' });
  }
  return items;
}

function gsgSessionHTML(night, cards, review) {
  const s = night.s;
  const when = gsgWhen(night);
  const other = s.isoDates && s.cards ? (night.week === 'A' ? 'B' : 'A') : null;
  const weekBtn = (w, i) => `<button class="gsg-week${night.week === w ? ' active' : ''}" data-night="s${s.series}-${w}" aria-pressed="${night.week === w}">Week ${w}<small>${esc((s.dates || [])[i] || '')}</small></button>`;
  const game = cards.find((c) => c.category === 'Game');
  const needs = cards.filter((c) => c.needsReview).length;
  return `
    <section class="gsg-session" aria-labelledby="gsg-session-title">
      <div class="gsg-session__main">
        <p class="gsg-eyebrow ${when === 'Tonight' ? 'gsg-eyebrow--live' : ''}">${esc(when)}</p>
        <h2 id="gsg-session-title">Series ${s.series} — ${esc(s.theme || s.name)}</h2>
        <div class="gsg-meta">
          <span><span class="material-symbols-outlined" aria-hidden="true">event</span> ${esc(night.dateLabel)}</span>
          <span><span class="material-symbols-outlined" aria-hidden="true">schedule</span> 5:30–6:30 pm</span>
          <span><span class="material-symbols-outlined" aria-hidden="true">group</span> Ages 3–6</span>
          ${s.eventLabel || s.athleticsEvent ? `<span><span class="material-symbols-outlined" aria-hidden="true">stadium</span> ${esc(s.eventLabel || s.athleticsEvent)}</span>` : ''}
        </div>
        ${s.sessionNote || s.coachNote ? `<p class="gsg-coachnote"><strong>Coach note.</strong> ${esc(s.sessionNote || s.coachNote)}</p>` : ''}
      </div>
      <div class="gsg-session__side">
        ${other ? `<div class="gsg-weeks" role="group" aria-label="Week">${weekBtn('A', 0)}${weekBtn('B', 1)}</div>` : ''}
        <button class="btn btn-primary gsg-generate" id="gsg-generate"><span class="material-symbols-outlined" aria-hidden="true">photo_library</span> ${when === 'Tonight' ? 'Generate Tonight’s Cards' : `Generate cards for ${esc(gsgShortLabel(night))}`}</button>
        ${needs ? `<p class="gsg-needs"><span class="material-symbols-outlined" aria-hidden="true">rate_review</span> ${needs} card${needs > 1 ? 's' : ''} to check before sharing</p>` : ''}
      </div>
    </section>

    <ol class="gsg-runshow" aria-label="Run of show">
      <li><strong>5:30–5:40</strong><span>Warm-up · whole group</span><small>${game ? esc(game.name) : 'Movement game'}</small></li>
      <li><strong>5:40–6:24</strong><span>4 × 11-minute stations</span><small>Groups A–D rotate together</small></li>
      <li><strong>6:24–6:30</strong><span>Warm-down sprints</span><small>Every child named &amp; cheered</small></li>
      <li><strong>Everyone plays</strong><span>Ages 3–6</span><small>No elimination, no rankings</small></li>
    </ol>

    <section class="gsg-stations" aria-label="Stations">
      ${cards.map(gsgTileHTML).join('')}
    </section>`;
}

function gsgTileHTML(card) {
  const equip = card.equipment || [];
  const shown = equip.length > 4 ? equip.slice(0, 3) : equip;
  const more = equip.length - shown.length;
  const flags = [
    card.needsReview ? '<span class="gsg-flag gsg-flag--review">Check before sharing</span>' : '',
    card.boardChanged ? '<span class="gsg-flag gsg-flag--board">Board changed</span>' : '',
    card.edited && !card.boardChanged ? '<span class="gsg-flag">Edited</span>' : '',
  ].join('');
  return `
    <article class="gsg-tile ${gsgCatClass(card.category, card.station)}" data-key="${esc(card.key)}">
      <button class="gsg-tile__media" data-view="${esc(card.key)}" aria-label="Open ${gsgUnit(card).toLowerCase()} ${card.station}: ${esc(card.name)}">
        ${gsgImageHTML(card, 'gsg-tile__img')}
        ${card.image && card.image.note ? `<span class="gsg-tile__note">${esc(card.image.note)}</span>` : ''}
        <span class="gsg-tile__num" aria-hidden="true">${card.station}</span>
        <span class="gsg-tile__cat">${esc(gsgIsZone(card) ? `Zone ${card.station}` : card.category)}</span>
      </button>
      <div class="gsg-tile__body">
        ${flags ? `<div class="gsg-flags">${flags}</div>` : ''}
        <h3 class="gsg-tile__title">${esc(card.name)}</h3>
        <p class="gsg-tile__skill">${esc(card.skill || '')}</p>
        <ul class="gsg-tile__equip" aria-label="Equipment">
          ${shown.map((e) => `<li>${esc(e)}</li>`).join('')}${more > 0 ? `<li class="gsg-more">+${more} more</li>` : ''}
        </ul>
        <p class="gsg-tile__led">${esc(gsgLead(card))} · ${card.minutes || 11} min</p>
      </div>
      <div class="gsg-tile__actions">
        <button class="gsg-btn gsg-btn--main" data-view="${esc(card.key)}">View ${gsgUnit(card).toLowerCase()} <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>
        <div class="gsg-tile__minor">
          <button class="gsg-btn" data-edit="${esc(card.key)}" aria-label="Edit ${esc(card.name)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span><span class="gsg-btn__txt">Edit</span></button>
          <button class="gsg-btn" data-card="${esc(card.key)}" aria-label="Preview the ${esc(card.name)} card"><span class="material-symbols-outlined" aria-hidden="true">image</span><span class="gsg-btn__txt">Card</span></button>
          <button class="gsg-btn" data-share="${esc(card.key)}" aria-label="Share the ${esc(card.name)} card"><span class="material-symbols-outlined" aria-hidden="true">share</span><span class="gsg-btn__txt">Share</span></button>
        </div>
      </div>
    </article>`;
}

/* ---------- Week 19 Mini Meet: four 8-minute zones, passports and certificates ---------- */

function gsgMeetHTML(night, cards, review) {
  const s = night.s;
  const meet = s.meet || {};
  const when = gsgWhen(night);
  const needs = cards.filter((c) => c.needsReview).length;
  const plan = (meet.runOfShow || []).map((r) => `<li><strong>${esc(r.time)}</strong><span>${esc(r.label)}</span><small>${esc(r.detail)}</small></li>`).join('');
  return `
    <section class="gsg-session gsg-session--meet" aria-labelledby="gsg-session-title">
      <div class="gsg-session__main">
        <p class="gsg-eyebrow ${when === 'Tonight' ? 'gsg-eyebrow--live' : ''}">${esc(when)}</p>
        <h2 id="gsg-session-title">${esc(meet.title || s.name)}</h2>
        <div class="gsg-meta">
          <span><span class="material-symbols-outlined" aria-hidden="true">event</span> ${esc(night.dateLabel)}</span>
          <span><span class="material-symbols-outlined" aria-hidden="true">schedule</span> 5:30–6:30 pm</span>
          <span><span class="material-symbols-outlined" aria-hidden="true">group</span> Ages 3–6</span>
          <span><span class="material-symbols-outlined" aria-hidden="true">celebration</span> 4 zones × 8 minutes · no rankings</span>
        </div>
        ${s.sessionNote || s.coachNote ? `<p class="gsg-coachnote"><strong>Coach note.</strong> ${esc(s.sessionNote || s.coachNote)}</p>` : ''}
      </div>
      <div class="gsg-session__side">
        ${cards.length ? `<button class="btn btn-primary gsg-generate" id="gsg-generate"><span class="material-symbols-outlined" aria-hidden="true">photo_library</span> Generate zone cards</button>` : ''}
        ${meet.passport ? '<button class="btn btn-ghost gsg-generate" id="gsg-passports"><span class="material-symbols-outlined" aria-hidden="true">badge</span> Print skill passports</button>' : ''}
        ${meet.certificate ? '<button class="btn btn-ghost gsg-generate" id="gsg-certificates"><span class="material-symbols-outlined" aria-hidden="true">workspace_premium</span> Print certificates</button>' : ''}
        ${needs ? `<p class="gsg-needs"><span class="material-symbols-outlined" aria-hidden="true">rate_review</span> ${needs} zone card${needs > 1 ? 's' : ''} to check before sharing</p>` : ''}
      </div>
    </section>

    ${plan ? `<ol class="gsg-runshow gsg-runshow--meet" aria-label="Run of show">${plan}</ol>` : ''}

    ${cards.length ? `<section class="gsg-stations" aria-label="Activity zones">${cards.map(gsgTileHTML).join('')}</section>` : '<p>No zones yet — see the full run sheet under <em>Whole season</em>.</p>'}

    ${(meet.safety || []).length ? `
    <details class="gsg-panel" open>
      <summary><span class="material-symbols-outlined" aria-hidden="true">health_and_safety</span> Safety for the whole night</summary>
      <ul class="gsg-panel__body gsg-meet-safety">${meet.safety.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </details>` : ''}`;
}

/** Get Set Go (6 and under) members from the admin-only access-codes list, A–Z by surname. Names never leave this browser. */
async function gsgMeetNames() {
  const r = await authedFetch('/api/codes');
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Could not load the member list.');
  return (j.members || [])
    .filter((m) => /6 years and under/i.test(m.memberType || '') || /6 and under/i.test(m.ageGroup || ''))
    .map((m) => ({ first: String(m.firstName || '').trim(), last: String(m.lastName || '').trim(), name: String(m.name || '').trim() }))
    .filter((m) => m.name || m.first)
    .sort((a, b) => a.last.localeCompare(b.last, 'en-NZ') || a.first.localeCompare(b.first, 'en-NZ'));
}

function gsgOpenMeetPrint(kind, night) {
  const meet = night.s.meet || {};
  const label = kind === 'passport' ? 'skill passports' : 'participation certificates';
  const panel = gsgOpenModal(`
    <header class="gsg-ex__head">
      <div><p>Week 19 Mini Meet · ${esc(gsgShortLabel(night))}</p><h2>Print ${label}</h2></div>
      <button class="gsg-iconbtn gsg-close" data-close aria-label="Close" autofocus><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </header>
    <form class="gsg-form gsg-printform">
      <fieldset class="gsg-fieldset"><legend>Names</legend>
        <label class="gsg-radio"><input type="radio" name="names" value="blank" checked> Blank — write each child’s name on the night</label>
        <label class="gsg-radio"><input type="radio" name="names" value="members"> Fill in names from the Get Set Go member list (6 and under)</label>
        <label class="gsg-field gsg-printform__copies"><span>Blank copies</span><input type="number" name="copies" min="1" max="200" value="${kind === 'passport' ? 40 : 40}"></label>
      </fieldset>
      <p class="gsg-hint">${kind === 'passport' ? 'Four passports per A4 page — one sticker box per zone.' : 'One certificate per A4 page (landscape).'} No results or rankings are printed — participation only.</p>
      <p class="gsg-error" role="alert" hidden></p>
      <footer class="gsg-ed__foot"><span></span><div><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary"><span class="material-symbols-outlined" aria-hidden="true">print</span> Open print view</button></div></footer>
    </form>`, { label: `Print ${label}` });
  $$('[data-close]', panel).forEach((b) => b.addEventListener('click', gsgCloseModal));
  const form = $('form', panel);
  const err = $('.gsg-error', form);
  form.addEventListener('change', () => { $('.gsg-printform__copies', form).hidden = form.elements.names.value !== 'blank'; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let people;
    try {
      if (form.elements.names.value === 'members') {
        people = (await gsgMeetNames()).map((m) => m.name || `${m.first} ${m.last}`.trim());
        if (!people.length) throw new Error('No Get Set Go (6 and under) members found in the member list.');
      } else {
        const n = Math.max(1, Math.min(200, Number(form.elements.copies.value) || 1));
        people = Array.from({ length: n }, () => '');
      }
    } catch (e2) { err.textContent = e2.message; err.hidden = false; return; }
    gsgCloseModal();
    if (kind === 'passport') gsgPrintPassports(meet, night, people);
    else gsgPrintCertificates(meet, night, people);
  });
}

function gsgPrintPassports(meet, night, people) {
  const p = meet.passport || {};
  const labels = p.zoneLabels && p.zoneLabels.length ? p.zoneLabels : (night.cards || []).map((c) => c.name);
  const one = (name) => `
    <section class="pp">
      <header><img src="/logo.svg" alt=""><div><strong>${esc(p.title || 'Skill passport')}</strong><small>Get Set Go · Mini Meet · ${esc(night.dateLabel)}</small></div></header>
      <p class="pp__name">Name: <span>${esc(name)}</span></p>
      ${p.colourTeam ? '<p class="pp__name pp__team">Colour team: <span></span></p>' : ''}
      ${p.intro ? `<p class="pp__intro">${esc(p.intro)}</p>` : ''}
      <ol class="pp__zones">${labels.map((l, i) => `<li><span class="pp__sticker" aria-hidden="true"></span><b>Zone ${i + 1}</b><span>${esc(String(l).replace(/^Zone\s*\d+\s*[—–:-]\s*/i, ''))}</span></li>`).join('')}</ol>
      ${p.footer ? `<footer>${esc(p.footer)}</footer>` : ''}
    </section>`;
  const css = `
    body { margin: 0; }
    .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
    .pp { box-sizing: border-box; border: 2px dashed #5b84a8; border-radius: 6mm; padding: 4mm; height: 132mm; display: flex; flex-direction: column; gap: 2.5mm; break-inside: avoid; overflow: hidden; }
    .pp header { display: flex; gap: 3mm; align-items: center; }
    .pp header img { width: 14mm; height: 14mm; }
    .pp header strong { display: block; font-size: 15pt; color: #123a5e; }
    .pp header small { color: #57423b; font-size: 9pt; }
    .pp__name { margin: 0; font-size: 12pt; font-weight: 700; }
    .pp__name span { display: inline-block; min-width: 55mm; border-bottom: 1.5px solid #1d1b17; padding: 0 2mm; }
    .pp__team { font-size: 10.5pt; } .pp__team span { min-width: 35mm; }
    .pp__intro { margin: 0; font-size: 9.5pt; color: #333; }
    .pp__zones { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; flex: 1; min-height: 0; }
    .pp__zones li { border: 1.5px solid #cfd8e3; border-radius: 4mm; padding: 1.5mm; display: grid; justify-items: center; align-content: center; gap: 1mm; text-align: center; font-size: 8.5pt; line-height: 1.25; }
    .pp__zones b { font-size: 10pt; color: #123a5e; }
    .pp__sticker { width: 16mm; height: 16mm; border-radius: 50%; border: 1.5px dashed #8b7169; }
    .pp footer { font-size: 8pt; line-height: 1.3; color: #57423b; text-align: center; }
    .pages > .sheet { break-after: page; } .pages > .sheet:last-child { break-after: auto; }`;
  const pages = [];
  for (let i = 0; i < people.length; i += 4) pages.push(`<div class="sheet">${people.slice(i, i + 4).map(one).join('')}</div>`);
  openPrintWindow('Mini Meet skill passports', css, `<button class="print" onclick="window.print()">Print</button><div class="pages">${pages.join('')}</div>`);
}

function gsgPrintCertificates(meet, night, people) {
  const c = meet.certificate || {};
  const one = (name) => `
    <section class="cert">
      <img src="/logo.svg" alt="Taupō Athletics Club">
      <h1>${esc(c.title || 'Certificate of participation')}</h1>
      <p class="cert__to">This certificate is presented to</p>
      <p class="cert__name">${name ? esc(name) : '&nbsp;'}</p>
      ${c.body ? String(c.body).split('\n').filter(Boolean).map((line) => `<p class="cert__body">${esc(line)}</p>`).join('') : ''}
      <p class="cert__meta">Taupō Athletics Club · Get Set Go Mini Meet · ${esc(night.dateLabel)}</p>
      ${c.footer ? `<p class="cert__foot">${esc(c.footer)}</p>` : ''}
    </section>`;
  const css = `
    @media print { @page { size: A4 landscape; margin: 10mm; } }
    body { margin: 0; }
    .cert { box-sizing: border-box; height: 186mm; border: 3mm solid #5b84a8; outline: 1mm solid #fcd400; outline-offset: -6mm; border-radius: 6mm; padding: 14mm 18mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4mm; break-after: page; }
    .cert:last-child { break-after: auto; }
    .cert img { width: 26mm; height: 26mm; }
    .cert h1 { margin: 0; font-size: 30pt; color: #123a5e; letter-spacing: .02em; }
    .cert__to { margin: 0; font-size: 13pt; color: #57423b; }
    .cert__name { margin: 0; min-width: 150mm; font-size: 28pt; font-weight: 800; border-bottom: 2px solid #1d1b17; padding-bottom: 2mm; }
    .cert__body { margin: 0; max-width: 200mm; font-size: 13pt; line-height: 1.45; }
    .cert__meta { margin: 0; font-size: 11pt; color: #1f5f96; font-weight: 700; }
    .cert__foot { margin: 0; font-size: 10pt; color: #57423b; }`;
  openPrintWindow('Mini Meet participation certificates', css, `<button class="print" onclick="window.print()">Print</button>${people.map(one).join('')}`);
}

function gsgSeasonHTML(nights, current) {
  const list = series.filter((s) => gsg.term === 'all' || s.term === gsg.term);
  const tabs = ['all', 'Term 4', 'Term 1'].map((t) => `<button class="block-tab ${gsg.term === t ? 'active' : ''}" data-term="${esc(t)}">${t === 'all' ? 'All' : esc(t)}</button>`).join('');
  return `
    <div class="block-tabs gsg-terms">${tabs}</div>
    <ul class="gsg-series">
      ${list.map((s) => {
        const active = current.s === s;
        const acts = (w) => ((s.cards && s.cards[w]) || []).map((c) => gsgCard(c)).map((c) => `<span class="gsg-chip ${gsgCatClass(c.category, c.station)}">${esc(c.name)}</span>`).join('');
        return `
        <li class="gsg-series__row${active ? ' current' : ''}">
          <div class="gsg-series__head">
            <span class="gsg-series__num">${s.isFinal ? '★' : s.series}</span>
            <div class="gsg-series__info">
              <strong>${esc(s.isFinal ? s.name : s.theme || s.name)}</strong>
              <small>${esc((s.dates || []).join(' · '))}${s.eventLabel || s.athleticsEvent ? ` · ${esc(s.eventLabel || s.athleticsEvent)}` : ''}${s.manipulative && !s.isFinal ? ` · ${esc(s.manipulative)}` : ''}${s.fitnessCircuit && s.fitnessCircuit !== '—' ? ` · ${esc(s.fitnessCircuit)}` : ''}</small>
            </div>
            <div class="gsg-series__go">
              ${s.isFinal ? `<button class="gsg-btn" data-night="s${s.series}">Open</button>` : `<button class="gsg-btn" data-night="s${s.series}-A">Week A</button><button class="gsg-btn" data-night="s${s.series}-B">Week B</button>`}
            </div>
          </div>
          ${s.isFinal ? '' : `<div class="gsg-series__acts"><span class="gsg-wk">A</span>${acts('A')}</div><div class="gsg-series__acts"><span class="gsg-wk">B</span>${acts('B')}</div>`}
          <details class="gsg-fullsheet"><summary>Full run sheet (Rotations board text)</summary>${seriesHTML(s).replace('class="series-card"', 'class="series-card open"')}</details>
        </li>`;
      }).join('')}
    </ul>`;
}

function gsgBindDashboard(root, nights, night) {
  const go = (key) => { gsg.nightKey = key; renderSessionsDashboard(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#gsg-night', root).addEventListener('change', (e) => go(e.target.value));
  $$('[data-nav]', root).forEach((b) => b.addEventListener('click', () => {
    const i = nights.indexOf(night) + Number(b.dataset.nav);
    if (nights[i]) go(nights[i].key);
  }));
  $('#gsg-tonight', root).addEventListener('click', () => go(null));
  $$('[data-night]', root).forEach((b) => b.addEventListener('click', () => go(b.dataset.night)));
  $$('[data-term]', root).forEach((b) => b.addEventListener('click', () => { gsg.term = b.dataset.term; gsg.seasonOpen = true; renderSessionsDashboard(); }));
  $('.gsg-season', root).addEventListener('toggle', (e) => { gsg.seasonOpen = e.target.open; });
  $$('[data-view]', root).forEach((b) => b.addEventListener('click', () => gsgOpenStation(b.dataset.view)));
  $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => gsgOpenEditor(b.dataset.edit)));
  $$('[data-compare-board]', root).forEach((b) => b.addEventListener('click', () => gsgOpenEditor(b.dataset.compareBoard, { template: '__board' })));
  $$('[data-card]', root).forEach((b) => b.addEventListener('click', () => gsgOpenExport([b.dataset.card])));
  $$('[data-share]', root).forEach((b) => b.addEventListener('click', () => gsgOpenExport([b.dataset.share], { share: true })));
  const gen = $('#gsg-generate', root);
  if (gen) gen.addEventListener('click', () => gsgOpenExport(night.cards.map((c) => c.key)));
  const pass = $('#gsg-passports', root);
  if (pass) pass.addEventListener('click', () => gsgOpenMeetPrint('passport', night));
  const cert = $('#gsg-certificates', root);
  if (cert) cert.addEventListener('click', () => gsgOpenMeetPrint('certificate', night));
}

/* ============================================================
   Station view — what a volunteer needs in 15–30 seconds
   ============================================================ */

function gsgStationBodyHTML(card) {
  const circuit = card.layout === 'circuit';
  const steps = card.steps || [];
  const stepsHTML = circuit
    ? `<ol class="gsg-circuit">${steps.map((st) => { const [n, h] = window.GSGCards.splitStep(st); return `<li><strong>${esc(n)}</strong>${h ? `<span>${esc(h)}</span>` : ''}</li>`; }).join('')}</ol>`
    : `<ol class="gsg-steps">${steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ol>`;
  const phases = GSG_PHASES.filter(([k]) => card[k]).map(([k, label, mins]) => `<div class="gsg-phase"><strong>${label}</strong> <small>${mins}</small><p>${esc(card[k])}</p></div>`).join('');
  return `
    <div class="gsg-sv__media">${gsgImageHTML(card, 'gsg-sv__img')}${card.image && card.image.note ? `<p class="gsg-sv__note">${esc(card.image.note)}</p>` : ''}</div>
    <div class="gsg-sv__skill"><span>Today’s skill</span><strong>${esc(card.skill || card.category)}</strong><small>${card.minutes || 11} minutes · ${esc(gsgLead(card))} · every child takes part</small></div>
    <div class="gsg-sv__grid">
      <section class="gsg-box gsg-box--need"><h4>You need</h4><ul>${(card.equipment || []).map((e) => `<li>${esc(e)}</li>`).join('') || '<li>—</li>'}</ul></section>
      <section class="gsg-box gsg-box--setup"><h4>Set up</h4><p>${esc(card.setup || '—')}</p></section>
    </div>
    <section class="gsg-box gsg-box--how"><h4>${circuit ? 'The circuit' : 'How to play'}</h4>${steps.length ? stepsHTML : '<p class="gsg-missing">No steps yet — add them in the editor.</p>'}</section>
    ${(card.cues || []).length ? `<section class="gsg-box gsg-box--say"><h4>Say it</h4><ul class="gsg-cues">${card.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>` : ''}
    <div class="gsg-sv__grid">
      <section class="gsg-box gsg-box--young"><h4>Ages 3–4 · make it easier</h4><p>${esc(card.younger || '—')}</p></section>
      <section class="gsg-box gsg-box--old"><h4>Ages 5–6 · challenge</h4><p>${esc(card.older || '—')}</p></section>
    </div>
    <section class="gsg-box gsg-box--safety"><h4><span class="material-symbols-outlined" aria-hidden="true">health_and_safety</span> Watch &amp; safety</h4>
      ${card.watch ? `<p><strong>Watch for:</strong> ${esc(card.watch)}</p>` : ''}${card.safety ? `<p class="gsg-safety">${esc(card.safety)}</p>` : ''}${!card.watch && !card.safety ? '<p>Keep everyone in the space. No elimination.</p>' : ''}
    </section>
    <div class="gsg-more-info">
      ${phases ? `<details><summary>Coaching progressions — Discovery · Developing · Consolidating</summary><div class="gsg-phases">${phases}</div></details>` : ''}
      ${card.observation ? `<details><summary>Coach observation</summary><p>${esc(card.observation)}</p></details>` : ''}
      ${card.alternative ? `<details><summary>If they get restless — alternative activity</summary><p>${esc(card.alternative)}</p></details>` : ''}
      <details><summary>Sources &amp; review notes</summary>
        <ul class="gsg-sources">
          ${(card.sources || []).map((x) => `<li>${esc(x)}</li>`).join('')}
          ${card.edited ? `<li>Edited in the admin portal${card.updatedAt ? ` (${esc(new Date(card.updatedAt).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }))})` : ''} — fields: ${esc((card.editedFields || []).join(', ') || 'image / review status')}.</li>` : ''}
          ${card.review ? `<li class="${card.needsReview ? 'gsg-review__review' : ''}">${card.needsReview ? 'Needs review: ' : 'Reviewed: '}${esc(card.review)}</li>` : ''}
          ${card.boardChanged ? '<li class="gsg-review__board">The Rotations board has changed since this card was edited.</li>' : ''}
        </ul>
      </details>
    </div>`;
}

function gsgOpenStation(key) {
  const base = gsgBase(key);
  if (!base) return;
  const card = gsgCard(base);
  const panel = gsgOpenModal(`
    <header class="gsg-sv__head ${gsgCatClass(card.category, card.station)}">
      <span class="gsg-sv__num" aria-hidden="true">${card.station}</span>
      <div>
        <h2 id="gsg-sv-title">${esc(card.name)}</h2>
        <p>${gsgIsZone(card) ? `Zone ${card.station} · ${card.minutes} minutes · Mini Meet` : `Station ${card.station} · ${esc(card.category)} · Week ${card.week}`} · ${esc(String(card.dateLabel || '').replace(/\s+\d{4}$/, ''))}</p>
      </div>
      <button class="gsg-iconbtn gsg-close" data-close aria-label="Close" autofocus><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </header>
    ${card.needsReview ? `<p class="gsg-banner gsg-banner--review"><span class="material-symbols-outlined" aria-hidden="true">rate_review</span> Check before sharing: ${esc(card.review)}</p>` : ''}
    ${card.boardChanged ? '<p class="gsg-banner gsg-banner--board"><span class="material-symbols-outlined" aria-hidden="true">sync_problem</span> The Rotations board has changed since this card was edited — open the editor to compare.</p>' : ''}
    <div class="gsg-sv ${gsgCatClass(card.category, card.station)}">${gsgStationBodyHTML(card)}</div>
    <footer class="gsg-sv__foot">
      <button class="btn btn-ghost" data-edit="${esc(key)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span> Edit</button>
      <button class="btn btn-ghost" data-card="${esc(key)}"><span class="material-symbols-outlined" aria-hidden="true">image</span> Preview card</button>
      <button class="btn btn-primary" data-share="${esc(key)}"><span class="material-symbols-outlined" aria-hidden="true">share</span> Share card</button>
    </footer>`, { label: `${gsgUnit(card)} ${card.station}: ${card.name}`, cls: 'gsg-sv-panel' });
  $('[data-close]', panel).addEventListener('click', gsgCloseModal);
  $('[data-edit]', panel).addEventListener('click', () => gsgOpenEditor(key));
  $('[data-card]', panel).addEventListener('click', () => gsgOpenExport([key]));
  $('[data-share]', panel).addEventListener('click', () => gsgOpenExport([key], { share: true }));
}

/* ============================================================
   Editor — structured, per night, saved to Notion
   ============================================================ */

let gsgPendingImage = null;

function gsgListRowHTML(value, circuit) {
  const [name, how] = circuit ? window.GSGCards.splitStep(value) : [value, ''];
  const ctrls = `
    <button type="button" class="gsg-iconbtn gsg-iconbtn--sm" data-move="-1" aria-label="Move up"><span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span></button>
    <button type="button" class="gsg-iconbtn gsg-iconbtn--sm" data-move="1" aria-label="Move down"><span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span></button>
    <button type="button" class="gsg-iconbtn gsg-iconbtn--sm" data-remove aria-label="Remove"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>`;
  return circuit
    ? `<li class="gsg-li gsg-li--circuit"><span class="gsg-li__n" aria-hidden="true"></span><input class="gsg-li__name" value="${esc(name)}" placeholder="Exercise (e.g. Bear crawl)" aria-label="Exercise name" maxlength="80"><input class="gsg-li__how" value="${esc(how)}" placeholder="How to do it" aria-label="How to do it" maxlength="300"><span class="gsg-li__ctrls">${ctrls}</span></li>`
    : `<li class="gsg-li"><span class="gsg-li__n" aria-hidden="true"></span><input class="gsg-li__text" value="${esc(name)}" aria-label="Item" maxlength="400"><span class="gsg-li__ctrls">${ctrls}</span></li>`;
}

function gsgListHTML(field, items, circuit = false, hint = '') {
  return `<div class="gsg-list" data-list="${field}" data-circuit="${circuit ? '1' : ''}">
    <ol>${(items || []).map((v) => gsgListRowHTML(v, circuit)).join('')}</ol>
    <button type="button" class="gsg-btn gsg-add" data-add><span class="material-symbols-outlined" aria-hidden="true">add</span> ${circuit ? 'Add exercise' : 'Add'}</button>
    ${hint ? `<p class="gsg-hint">${hint}</p>` : ''}
  </div>`;
}

function gsgReadList(form, field) {
  const list = $(`[data-list="${field}"]`, form);
  if (!list) return [];
  return $$('li', list).map((li) => {
    if (li.classList.contains('gsg-li--circuit')) {
      const n = $('.gsg-li__name', li).value.trim();
      const h = $('.gsg-li__how', li).value.trim();
      return n && h ? `${n} — ${h}` : n || h;
    }
    return $('.gsg-li__text', li).value.trim();
  }).filter(Boolean);
}

function gsgBindList(list) {
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const ol = $('ol', list);
    if (btn.hasAttribute('data-add')) {
      ol.insertAdjacentHTML('beforeend', gsgListRowHTML('', list.dataset.circuit === '1'));
      $('li:last-child input', ol).focus();
      return;
    }
    const li = btn.closest('li');
    if (!li) return;
    if (btn.hasAttribute('data-remove')) { li.remove(); return; }
    const dir = Number(btn.dataset.move);
    if (dir < 0 && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
    if (dir > 0 && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li);
    btn.focus();
  });
}

function gsgAllCards() {
  const out = [];
  for (const s of series) for (const w of ['A', 'B']) for (const c of (s.cards && s.cards[w]) || []) out.push(c);
  return out;
}

/** Downscale a picked photo to ≤1280 px JPEG before it goes anywhere. */
function gsgResizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { reject(new Error('Choose a JPEG, PNG or WebP image.')); return; }
    if (file.size > 20 * 1024 * 1024) { reject(new Error('That image is over 20 MB.')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.86;
      let data = c.toDataURL('image/jpeg', q);
      while (data.length > 2.4 * 1024 * 1024 * 1.37 && q > 0.4) { q -= 0.12; data = c.toDataURL('image/jpeg', q); }
      resolve({ dataUrl: data, filename: file.name, preview: data });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
    img.src = url;
  });
}

function gsgEditorFieldsHTML(card) {
  const ta = (field, label, rows = 2, hint = '') => `<label class="gsg-field"><span>${label}</span><textarea name="${field}" rows="${rows}" maxlength="1500">${esc(card[field] || '')}</textarea>${hint ? `<small>${hint}</small>` : ''}</label>`;
  return `
    <div class="gsg-form__grid">
      <label class="gsg-field"><span>Activity name</span><input name="name" value="${esc(card.name)}" maxlength="120" required></label>
      <label class="gsg-field"><span>Today’s skill (one line)</span><input name="skill" value="${esc(card.skill || '')}" maxlength="160"></label>
    </div>
    <label class="gsg-field"><span>Volunteers at this ${gsgIsZone(card) ? 'zone' : 'station'} (optional)</span><input name="volunteers" value="${esc(card.volunteers || '')}" maxlength="160" placeholder="e.g. Sam &amp; Alex"><small>Printed on the card instead of “${esc(card.ledBy || 'Station leader')}”. Adults’ first names only.</small></label>
    <fieldset class="gsg-fieldset"><legend>You need</legend>${gsgListHTML('equipment', card.equipment, false, 'One item per line, with quantities (e.g. “20 cones”).')}</fieldset>
    ${ta('setup', 'Set up', 3)}
    <fieldset class="gsg-fieldset">
      <legend>${card.layout === 'circuit' ? 'Circuit exercises' : 'How to play — numbered steps'}</legend>
      <div class="gsg-layout" role="radiogroup" aria-label="Layout">
        <label><input type="radio" name="layout" value="steps" ${card.layout !== 'circuit' ? 'checked' : ''}> Numbered steps</label>
        <label><input type="radio" name="layout" value="circuit" ${card.layout === 'circuit' ? 'checked' : ''}> Circuit (exercise grid)</label>
      </div>
      <div data-steps-host>${gsgListHTML('steps', card.steps, card.layout === 'circuit', card.layout === 'circuit' ? 'Add, reorder or remove exercises. Six works best on the card.' : 'Three to six short steps.')}</div>
    </fieldset>
    <fieldset class="gsg-fieldset"><legend>Say it — coaching cues</legend>${gsgListHTML('cues', card.cues, false, 'Two or three short cues.')}</fieldset>
    <div class="gsg-form__grid">
      ${ta('younger', 'Ages 3–4 · make it easier')}
      ${ta('older', 'Ages 5–6 · challenge')}
    </div>
    <div class="gsg-form__grid">
      ${ta('watch', 'Watch for')}
      ${ta('safety', 'Safety', 2, 'Shown in bold on the card. Don’t trim safety to save space.')}
    </div>
    <details class="gsg-fieldset gsg-more-edit"><summary>Coaching progressions, observation &amp; alternative</summary>
      ${ta('discovery', 'Discovery (2–3 min)')}${ta('developing', 'Developing (3–4 min)')}${ta('consolidating', 'Consolidating (4–5 min)')}
      ${ta('observation', 'Coach observation')}${ta('alternative', 'If they get restless — alternative activity')}
    </details>`;
}

function gsgOpenEditor(key, { template = '' } = {}) {
  const base = gsgBase(key);
  if (!base) return;
  const card = gsgCard(base);
  const ov = gsg.overrides.get(key);
  gsgPendingImage = null;
  const lib = gsgImageLibrary();
  const currentRef = ov ? ov.imageRef || '' : '';
  const libOptions = [...lib.values()].map((i) => `<option value="${esc(i.ref)}"${currentRef === i.ref ? ' selected' : ''}>${esc(i.label)}</option>`).join('');
  const templates = (base.alternate ? `<option value="__board">${esc(base.alternate.label || 'Other version')} — ${esc(base.alternate.name)} (awaiting approval)</option>` : '') +
    gsgAllCards().filter((c) => c.key !== key)
      .map((c) => `<option value="${esc(c.key)}">S${c.series} · Week ${c.week} · ${esc(c.category)} — ${esc(gsgCard(c).name)}</option>`).join('');
  const night = gsgIsZone(base) ? `the Mini Meet · ${window.GSGCards.longDate(base.date)}` : `Series ${base.series} · Week ${base.week} · ${window.GSGCards.longDate(base.date)}`;
  const canSave = gsg.storage === 'notion';
  const panel = gsgOpenModal(`
    <header class="gsg-ed__head ${gsgCatClass(base.category, base.station)}">
      <div><p>Edit ${gsgUnit(base).toLowerCase()} ${base.station}${gsgIsZone(base) ? ' · Mini Meet' : ` · ${esc(base.category)}`}</p><h2>${esc(card.name)}</h2></div>
      <button class="gsg-iconbtn gsg-close" data-close aria-label="Close editor"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </header>
    <form class="gsg-form" novalidate>
      <p class="gsg-scope"><span class="material-symbols-outlined" aria-hidden="true">event</span> Changes apply to <strong>${esc(night)}</strong> only — other nights keep their own cards. Leave a field blank to use the Rotations board text.</p>
      ${card.boardChanged ? `<div class="gsg-banner gsg-banner--board"><span class="material-symbols-outlined" aria-hidden="true">sync_problem</span><div>The Rotations board has changed since this card was edited. Your edited fields: <strong>${esc((card.editedFields || []).join(', ') || 'image / review')}</strong>. <button type="button" class="gsg-link" data-compare>Compare with the board</button> · Saving keeps your edits and marks them as checked against the new board.</div></div><div class="gsg-compare" hidden></div>` : ''}
      ${!canSave ? `<p class="gsg-banner gsg-banner--review">${gsg.storage === 'loading' ? 'Still checking Notion — try again in a moment.' : 'Saving is unavailable: Notion isn’t connected on this server.'}</p>` : ''}
      <label class="gsg-field gsg-template"><span>Start from another activity (optional)</span>
        <select data-template><option value="">— keep this card —</option>${templates}</select>
        <small>Copies its text into this form. Nothing is saved until you press Save.</small>
      </label>
      <fieldset class="gsg-fieldset gsg-imgedit"><legend>Illustration</legend>
        <div class="gsg-imgedit__row">
          <div class="gsg-imgedit__preview">${gsgImageHTML(card, 'gsg-imgedit__img')}</div>
          <div class="gsg-imgedit__ctrls">
            <label class="gsg-field"><span>Image</span>
              <select name="imageRef">
                <option value=""${currentRef === '' ? ' selected' : ''}>Board image${base.image ? ` (${esc(base.name)})` : ' — none yet'}</option>
                ${libOptions}
                <option value="none"${currentRef === 'none' ? ' selected' : ''}>No image</option>
                <option value="__upload" disabled>New upload (pending)</option>
              </select>
            </label>
            <label class="gsg-btn gsg-upload"><span class="material-symbols-outlined" aria-hidden="true">upload</span> Upload a new image…<input type="file" accept="image/jpeg,image/png,image/webp" data-upload hidden></label>
            <label class="gsg-field"><span>Alt text</span><input name="imageAlt" value="${esc((ov && ov.fields.imageAlt) || '')}" placeholder="${esc((card.image && card.image.alt) || 'Describe the picture')}" maxlength="300"></label>
            <label class="gsg-field"><span>Caption on the image (optional)</span><input name="imageNote" value="${esc((ov && ov.fields.imageNote) || '')}" placeholder="${esc((base.image && base.image.note) || 'e.g. Illustration only')}" maxlength="200"></label>
          </div>
        </div>
      </fieldset>
      <div data-fields>${gsgEditorFieldsHTML(card)}</div>
      ${base.review ? `<label class="gsg-check"><input type="checkbox" name="reviewed" ${card.reviewed ? 'checked' : ''}> I’ve checked this card — it’s ready to share. <small>(${esc(base.review)})</small></label>` : ''}
      <p class="gsg-error" role="alert" hidden></p>
      <footer class="gsg-ed__foot">
        ${ov ? '<button type="button" class="btn btn-ghost gsg-danger" data-reset>Reset to board version</button>' : '<span></span>'}
        <div><button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary" ${canSave ? '' : 'disabled'}><span class="material-symbols-outlined" aria-hidden="true">save</span> Save to Notion</button></div>
      </footer>
    </form>`, { label: `Edit ${card.name}`, wide: true, cls: 'gsg-ed-panel' });

  const form = $('form', panel);
  $$('[data-close]', panel).forEach((b) => b.addEventListener('click', gsgCloseModal));
  $$('.gsg-list', form).forEach(gsgBindList);
  const err = $('.gsg-error', form);
  const showErr = (m) => { err.textContent = m; err.hidden = !m; if (m) err.scrollIntoView({ block: 'nearest' }); };

  form.addEventListener('change', (e) => {
    if (e.target.name === 'layout') {
      const steps = gsgReadList(form, 'steps');
      const circuit = e.target.value === 'circuit';
      $('[data-steps-host]', form).innerHTML = gsgListHTML('steps', steps, circuit, circuit ? 'Add, reorder or remove exercises. Six works best on the card.' : 'Three to six short steps.');
      gsgBindList($('[data-list="steps"]', form));
    }
  });

  const applyTemplate = (value) => {
    const from = value === '__board' ? base.alternate : gsgBase(value) && gsgCard(gsgBase(value));
    if (!from) return;
    $('[data-fields]', form).innerHTML = gsgEditorFieldsHTML({ ...from, layout: from.layout });
    $$('.gsg-list', $('[data-fields]', form)).forEach(gsgBindList);
    // The picture follows the activity: use the template's image if we have it, otherwise none.
    const sel = form.elements.imageRef;
    const ref = from.image && from.image.src && from.image.src !== (base.image && base.image.src) ? from.image.src : (from.image ? '' : 'none');
    sel.value = [...sel.options].some((o) => o.value === ref) ? ref : 'none';
    sel.dispatchEvent(new Event('change'));
    gsgToast(value === '__board' ? `Loaded the ${from.label || 'other version'} (${from.name}) — review, tick “checked”, then Save to approve it.` : `Copied from ${from.name} — review, then Save.`);
  };
  $('[data-template]', form).addEventListener('change', (e) => applyTemplate(e.target.value));
  if (template) { $('[data-template]', form).value = template; applyTemplate(template); }

  const upload = $('[data-upload]', form);
  upload.addEventListener('change', async () => {
    const file = upload.files && upload.files[0];
    if (!file) return;
    try {
      gsgPendingImage = await gsgResizeImage(file);
      $('.gsg-imgedit__preview', form).innerHTML = `<img class="gsg-imgedit__img" src="${esc(gsgPendingImage.preview)}" alt="New image preview">`;
      const sel = form.elements.imageRef;
      const opt = $('option[value="__upload"]', sel);
      opt.disabled = false;
      sel.value = '__upload';
      showErr('');
    } catch (e2) { showErr(e2.message); }
  });
  form.elements.imageRef.addEventListener('change', (e) => {
    if (e.target.value !== '__upload') gsgPendingImage = null;
    const ref = e.target.value;
    const item = lib.get(ref);
    const src = ref === '' ? base.image && base.image.src : item && item.src;
    $('.gsg-imgedit__preview', form).innerHTML = src ? `<img class="gsg-imgedit__img" src="${esc(src)}" alt="">` : gsgImageHTML({ ...base, image: null }, 'gsg-imgedit__img');
  });

  const compare = $('[data-compare]', form);
  if (compare) compare.addEventListener('click', () => {
    const box = $('.gsg-compare', form);
    box.hidden = !box.hidden;
    box.innerHTML = (card.editedFields || []).filter((f) => f !== 'imageAlt' && f !== 'imageNote').map((f) => {
      const show = (v) => esc(Array.isArray(v) ? v.join(' · ') : v || '—');
      return `<div class="gsg-compare__row"><strong>${esc(f)}</strong><div><small>Board now</small><p>${show(base[f])}</p></div><div><small>Your edit</small><p>${show(card[f])}</p></div></div>`;
    }).join('') || '<p>Only the image or review status was edited.</p>';
  });

  const resetBtn = $('[data-reset]', form);
  if (resetBtn) resetBtn.addEventListener('click', async () => {
    if (!confirm(`Remove the edits to “${card.name}” for this night and go back to the Rotations board version?`)) return;
    resetBtn.disabled = true;
    try {
      const r = await authedFetch('/api/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset', key }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Reset failed');
      gsg.overrides.delete(key);
      gsgCloseModal();
      renderSessionsDashboard();
      gsgToast('Back to the board version.');
    } catch (e2) { showErr(e2.message); resetBtn.disabled = false; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const read = {};
    for (const k of GSG_TEXT) read[k] = (f[k] ? f[k].value : '').trim();
    for (const k of GSG_LISTS) read[k] = gsgReadList(form, k);
    if (!read.name) { showErr('The activity needs a name.'); return; }
    const layout = (form.querySelector('input[name="layout"]:checked') || {}).value || 'steps';
    const edits = {};
    for (const k of GSG_TEXT) if (read[k] !== String(base[k] || '').trim()) edits[k] = read[k];
    for (const k of GSG_LISTS) if (JSON.stringify(read[k]) !== JSON.stringify(base[k] || [])) edits[k] = read[k];
    if (layout !== (base.layout || 'steps')) edits.layout = layout;
    const ref = f.imageRef.value;
    if (ref && ref !== '__upload') edits.imageRef = ref;
    if (f.imageAlt.value.trim()) edits.imageAlt = f.imageAlt.value.trim();
    if (f.imageNote.value.trim()) edits.imageNote = f.imageNote.value.trim();
    if (f.reviewed && f.reviewed.checked) edits.reviewed = true;
    const body = { action: 'save', key, baseHash: base.hash, edits };
    if (ref === '__upload' && gsgPendingImage) body.image = { dataUrl: gsgPendingImage.dataUrl, filename: gsgPendingImage.filename };
    const nothing = !Object.keys(edits).length && !body.image;
    if (nothing && !ov) { gsgCloseModal(); gsgToast('No changes.'); return; }
    if (nothing) body.action = 'reset';
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">hourglass_top</span> Saving…';
    try {
      const r = await authedFetch('/api/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Save failed');
      if (j.override) gsg.overrides.set(key, j.override); else gsg.overrides.delete(key);
      gsgCloseModal();
      renderSessionsDashboard();
      gsgToast(j.override ? `Saved “${read.name}” to Notion.` : 'No differences from the board — back to the board version.', 'ok');
    } catch (e2) {
      showErr(`Couldn’t save: ${e2.message}`);
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">save</span> Save to Notion';
    }
  });
}

/* ============================================================
   Generate Tonight's Cards — PNG per station, ZIP, A4 PDF, share
   ============================================================ */

async function gsgOpenExport(keys, { share = false } = {}) {
  const cards = keys.map(gsgBase).filter(Boolean).map(gsgCard);
  if (!cards.length) return;
  const s = series.find((x) => x.series === cards[0].series);
  const meta = { theme: s ? s.theme || s.name : '' };
  const single = cards.length === 1;
  const zone = gsgIsZone(cards[0]);
  const title = single ? `${cards[0].name} — ${zone ? 'zone' : 'station'} card` : `${zone ? 'Mini Meet zone cards' : 'Cards'} for ${window.GSGCards.longDate(cards[0].date)}`;
  const bundle = zone ? `get-set-go_${cards[0].date}_mini-meet_zone-cards` : `get-set-go_${cards[0].date}_series-${cards[0].series}-week-${cards[0].week.toLowerCase()}_cards`;
  const unchecked = cards.filter((c) => c.needsReview);
  const panel = gsgOpenModal(`
    <header class="gsg-ex__head">
      <div><p>${zone ? 'Week 19 Mini Meet' : `Series ${cards[0].series} · Week ${cards[0].week}`} · ${esc(String(cards[0].dateLabel || '').replace(/\s+\d{4}$/, ''))}</p><h2>${esc(title)}</h2></div>
      <button class="gsg-iconbtn gsg-close" data-close aria-label="Close" autofocus><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </header>
    ${unchecked.length ? `<p class="gsg-banner gsg-banner--review"><span class="material-symbols-outlined" aria-hidden="true">rate_review</span> ${unchecked.map((c) => esc(c.name)).join(', ')} ${unchecked.length > 1 ? 'are' : 'is'} marked for review — check ${unchecked.length > 1 ? 'them' : 'it'} before sending to volunteers.</p>` : ''}
    <div class="gsg-ex__toolbar" hidden>
      ${single ? '' : '<button class="btn btn-primary" data-zip><span class="material-symbols-outlined" aria-hidden="true">folder_zip</span> Download all (ZIP)</button>'}
      <button class="btn ${single ? 'btn-primary' : 'btn-ghost'}" data-pdf><span class="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span> ${single ? 'A4 PDF' : 'Printable A4 PDF'}</button>
      <button class="btn btn-ghost" data-print><span class="material-symbols-outlined" aria-hidden="true">print</span> Print</button>
      <button class="btn btn-ghost" data-shareall hidden><span class="material-symbols-outlined" aria-hidden="true">share</span> ${single ? 'Share' : 'Share all 4'}</button>
    </div>
    <p class="gsg-ex__status" role="status">Drawing ${single ? 'the card' : `${cards.length} cards`}…</p>
    <div class="gsg-ex__grid ${single ? 'gsg-ex__grid--single' : ''}"></div>`, { label: title, wide: !single, cls: 'gsg-ex-panel' });
  $('[data-close]', panel).addEventListener('click', gsgCloseModal);

  const results = [];
  try {
    for (const card of cards) {
      const canvas = await window.GSGCards.renderCard(card, meta);
      const blob = await window.GSGCards.toBlob(canvas);
      const name = window.GSGCards.fileName(card);
      results.push({ card, canvas, blob, name, file: new File([blob], name, { type: 'image/png' }), url: URL.createObjectURL(blob) });
      if (!document.contains(panel)) return; // closed while drawing
      $('.gsg-ex__status', panel).textContent = `Drawn ${results.length} of ${cards.length}…`;
    }
  } catch (e) {
    $('.gsg-ex__status', panel).textContent = `Couldn’t draw the cards: ${e.message}`;
    return;
  }
  const missing = results.filter((r) => r.canvas.dataset.imageMissing === '1').map((r) => r.card.name);
  $('.gsg-ex__status', panel).textContent = `${results.length} card${results.length > 1 ? 's' : ''} ready${missing.length ? ` — image missing for ${missing.join(', ')} (placeholder used)` : ''}.`;
  $('.gsg-ex__grid', panel).innerHTML = results.map((r, i) => `
    <figure class="gsg-ex__card ${gsgCatClass(r.card.category, r.card.station)}">
      <img src="${r.url}" alt="${gsgUnit(r.card)} ${r.card.station} card: ${esc(r.card.name)}" width="${r.canvas.width}" height="${r.canvas.height}">
      <figcaption>
        <span>${zone ? 'Zone ' : ''}${r.card.station} · ${esc(r.card.name)}</span>
        <span class="gsg-ex__acts">
          <button class="gsg-btn" data-dl="${i}"><span class="material-symbols-outlined" aria-hidden="true">download</span> PNG</button>
          <button class="gsg-btn" data-sh="${i}" hidden><span class="material-symbols-outlined" aria-hidden="true">share</span> Share</button>
        </span>
      </figcaption>
    </figure>`).join('');
  $('.gsg-ex__toolbar', panel).hidden = false;

  const canShareFiles = (files) => Boolean(navigator.canShare && navigator.share && navigator.canShare({ files }));
  const text = `Get Set Go — ${window.GSGCards.longDate(cards[0].date)}`;
  $$('[data-dl]', panel).forEach((b) => b.addEventListener('click', () => { const r = results[Number(b.dataset.dl)]; window.GSGCards.download(r.blob, r.name); }));
  $$('[data-sh]', panel).forEach((b) => {
    const r = results[Number(b.dataset.sh)];
    if (canShareFiles([r.file])) b.hidden = false;
    b.addEventListener('click', () => window.GSGCards.share([r.file], `${text} · ${gsgUnit(r.card)} ${r.card.station}`));
  });
  const shareAll = $('[data-shareall]', panel);
  const allFiles = results.map((r) => r.file);
  if (canShareFiles(allFiles)) shareAll.hidden = false;
  shareAll.addEventListener('click', async () => {
    if (!(await window.GSGCards.share(allFiles, text))) {
      gsgToast('Sharing isn’t available in this browser — downloading instead.');
      results.forEach((r) => window.GSGCards.download(r.blob, r.name));
    }
  });
  const zip = $('[data-zip]', panel);
  if (zip) zip.addEventListener('click', async () => {
    zip.disabled = true;
    const blob = await window.GSGCards.makeZip(results.map((r) => ({ name: r.name, blob: r.blob })));
    window.GSGCards.download(blob, `${bundle}.zip`);
    zip.disabled = false;
  });
  $('[data-pdf]', panel).addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const blob = await window.GSGCards.makePdf(results.map((r) => r.canvas), title);
      window.GSGCards.download(blob, single ? results[0].name.replace(/\.png$/, '.pdf') : `${bundle}.pdf`);
    } finally { b.disabled = false; }
  });
  $('[data-print]', panel).addEventListener('click', () => {
    openPrintWindow(title, '@media print { @page { size: A4; margin: 8mm; } body { margin: 0; } } .card { break-after: page; text-align: center; } .card:last-child { break-after: auto; } .card img { max-width: 100%; max-height: 279mm; }',
      `<button class="print" onclick="window.print()">Print</button>${results.map((r) => `<div class="card"><img src="${r.url}" alt="Station ${r.card.station} card"></div>`).join('')}`);
  });

  // Share straight away when asked from a tile — the click that opened this counts as the gesture on most phones.
  if (share) {
    const r = results[0];
    if (canShareFiles([r.file])) {
      const ok = await window.GSGCards.share([r.file], `${text} · ${gsgUnit(r.card)} ${r.card.station}`);
      if (!ok) gsgToast('Tap Share to send the card.');
    } else {
      gsgToast('Sharing isn’t available here — use PNG to download the card.');
    }
  }
}
