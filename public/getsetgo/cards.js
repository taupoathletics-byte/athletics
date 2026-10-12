'use strict';

/* ============================================================
   Get Set Go — volunteer card renderer + exporters
   data -> canvas card -> PNG / ZIP / A4 PDF. No libraries: every word on
   the card is drawn as real text from the card data (never baked into an
   image), measured and wrapped so nothing is clipped. Exposed as
   window.GSGCards for stations.js.
   ============================================================ */
(function () {
  const W = 1080;          // card width in px — portrait, reads well on a phone / WhatsApp
  const P = 44;            // outer padding
  const GAP = 22;
  const FONT = "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif";
  const INK = '#13263a';
  const MUTED = '#4b5b6b';

  /* Station colours: 1 Game pink/red, 2 Manipulative orange, 3 Fitness blue, 4 Athletics green.
     Bands use the darker shade so white text keeps its contrast. */
  const PALETTE = {
    Game:              { main: '#d42a4c', light: '#ffe8ee', soft: '#fff4f7' },
    Manipulative:      { main: '#d45d08', light: '#ffeedd', soft: '#fff7ee' },
    'Fitness Circuit': { main: '#1570c0', light: '#e3f1fd', soft: '#f2f8fe' },
    Athletics:         { main: '#0f8744', light: '#e2f6ea', soft: '#f1fbf5' },
  };
  const ZONE_ORDER = ['Game', 'Manipulative', 'Fitness Circuit', 'Athletics'];
  const isZone = (card) => card && card.kind === 'zone';
  const palette = (category) => PALETTE[category] || PALETTE.Game;
  /** Stations take their category colour; Mini Meet zones take the colour of their number. */
  const paletteFor = (card) => (isZone(card) ? PALETTE[ZONE_ORDER[(card.station - 1) % 4]] : palette(card.category));

  /* ---------- assets ---------- */

  let fontsReady = null;
  function loadFonts() {
    if (!fontsReady) {
      fontsReady = document.fonts
        ? Promise.all(['400', '600', '700', '800'].map((w) => document.fonts.load(`${w} 32px Inter`).catch(() => null))).then(() => document.fonts.ready)
        : Promise.resolve();
    }
    return fontsReady;
  }

  const imageCache = new Map();
  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (!imageCache.has(src)) {
      imageCache.set(src, new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => { imageCache.delete(src); resolve(null); };
        img.src = src;
      }));
    }
    return imageCache.get(src);
  }

  /** The club logo is an SVG without width/height — give it a size so every browser can draw it. */
  let logoPromise = null;
  function loadLogo() {
    if (!logoPromise) {
      logoPromise = fetch('/logo.svg')
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error('logo'))))
        .then((svg) => {
          const sized = svg.replace(/<svg\b([^>]*)>/, (m, attrs) => (/\swidth=/.test(attrs) ? m : `<svg${attrs} width="512" height="512">`));
          return loadImage(URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' })));
        })
        .catch(() => null);
    }
    return logoPromise;
  }

  /* ---------- text helpers ---------- */

  function font(ctx, weight, size) { ctx.font = `${weight} ${size}px ${FONT}`; }

  /** Greedy word wrap; breaks words that are wider than the line on their own. */
  function wrap(ctx, text, maxWidth) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      for (let word of words) {
        while (ctx.measureText(word).width > maxWidth && word.length > 1) {
          let cut = word.length - 1;
          while (cut > 1 && ctx.measureText(word.slice(0, cut) + '-').width > maxWidth) cut--;
          if (line) { out.push(line); line = ''; }
          out.push(word.slice(0, cut) + '-');
          word = word.slice(cut);
        }
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth) line = test;
        else { if (line) out.push(line); line = word; }
      }
      out.push(line);
    }
    while (out.length > 1 && out[out.length - 1] === '') out.pop();
    return out;
  }

  /** Draw wrapped text; returns the height used. */
  function para(ctx, paint, text, x, y, maxWidth, { weight = 400, size = 28, lh = 1.36, color = INK, align = 'left' } = {}) {
    font(ctx, weight, size);
    const lines = wrap(ctx, text, maxWidth);
    const step = Math.round(size * lh);
    if (paint) {
      ctx.fillStyle = color;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = align;
      lines.forEach((l, i) => ctx.fillText(l, align === 'right' ? x + maxWidth : x, y + size + i * step - Math.round(size * 0.1)));
      ctx.textAlign = 'left';
    }
    return lines.length * step;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function box(ctx, paint, x, y, w, h, { fill = '#fff', stroke = null, r = 22 } = {}) {
    if (!paint) return;
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function label(ctx, paint, text, x, y, color, size = 24) {
    if (paint) {
      font(ctx, 800, size);
      ctx.fillStyle = color;
      ctx.fillText(String(text).toUpperCase(), x, y + size);
    }
    return Math.round(size * 1.5);
  }

  /** Draws an image to fill (cover) the rect, clipped to rounded corners. */
  function cover(ctx, img, x, y, w, h, r) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
    ctx.restore();
  }

  /** Simple category glyph used when an activity has no illustration yet. */
  function placeholder(ctx, card, x, y, w, h) {
    const c = paletteFor(card);
    ctx.save();
    roundRect(ctx, x, y, w, h, 18);
    ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, c.light);
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c.main;
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 5; i++) ctx.fillRect(x, y + h * 0.62 + i * 18, w, 6);
    ctx.globalAlpha = 1;
    const cx = x + w / 2;
    const cy = y + h * 0.42;
    ctx.strokeStyle = c.main;
    ctx.fillStyle = c.main;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    const cat = isZone(card) ? ZONE_ORDER[(card.station - 1) % 4] : card.category;
    if (cat === 'Manipulative') {
      ctx.beginPath(); ctx.arc(cx, cy, 46, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 110, cy + 40, 70, 22, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (cat === 'Fitness Circuit') {
      [-1, 0, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(cx + k * 90 - 30, cy + 40); ctx.lineTo(cx + k * 90 - 30, cy - 10); ctx.lineTo(cx + k * 90 + 30, cy - 10); ctx.lineTo(cx + k * 90 + 30, cy + 40); ctx.stroke(); });
    } else if (cat === 'Athletics') {
      ctx.beginPath(); ctx.moveTo(cx - 120, cy + 30); ctx.lineTo(cx + 120, cy + 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 90, cy - 30); ctx.lineTo(cx - 90, cy + 50); ctx.moveTo(cx + 90, cy - 30); ctx.lineTo(cx + 90, cy + 50); ctx.stroke();
    } else {
      [[-90, 20], [0, -20], [90, 20]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(cx + dx - 28, cy + dy + 40); ctx.lineTo(cx + dx, cy + dy - 30); ctx.lineTo(cx + dx + 28, cy + dy + 40); ctx.closePath(); ctx.fill(); });
    }
    ctx.restore();
  }

  /* ---------- layout ---------- */

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map((m) => m.slice(0, 3).toUpperCase());
  function longDate(iso) {
    const [y, m, d] = String(iso || '').split('-').map(Number);
    if (!y) return '';
    const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-NZ', { weekday: 'long', timeZone: 'UTC' });
    return `${day} ${d} ${MONTHS[m - 1]} ${y}`;
  }
  function shortDate(iso) {
    const [y, m, d] = String(iso || '').split('-').map(Number);
    return y ? `${d} ${MON[m - 1]}` : '';
  }

  /** 'Bear crawl — hands and feet…' -> ['Bear crawl', 'hands and feet…'] */
  function splitStep(step) {
    const m = String(step).match(/^(.{2,48}?)\s+[—–-]\s+(.+)$/);
    return m ? [m[1], m[2]] : [step, ''];
  }

  /**
   * Lays the card out top to bottom. Called twice: once to measure (paint =
   * false) and once to draw on a canvas of exactly the measured height.
   */
  function layout(ctx, paint, card, meta, assets) {
    const c = paletteFor(card);
    const zone = isZone(card);
    const lead = card.volunteers ? `Volunteers: ${card.volunteers}` : card.ledBy ? `Led by: ${card.ledBy}` : 'All children take part.';
    const inner = W - P * 2;
    let y = 0;

    /* 1 — club header */
    const headH = 176;
    if (paint) {
      const g = ctx.createLinearGradient(0, 0, W, headH);
      g.addColorStop(0, '#e6f4fd');
      g.addColorStop(1, '#f6fbff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, headH);
      ctx.fillStyle = '#d3ecfa';
      ctx.beginPath(); ctx.arc(W - 120, -40, 200, 0, Math.PI * 2); ctx.fill();
      if (assets.logo) {
        ctx.save(); ctx.beginPath(); ctx.arc(P + 54, 88, 54, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(assets.logo, P, 34, 108, 108); ctx.restore();
      }
      font(ctx, 800, 42); ctx.fillStyle = '#123a5e';
      ctx.fillText('TAUPŌ ATHLETICS CLUB', P + 128, 82);
    }
    const pill = zone ? `${shortDate(card.date)} · MINI MEET` : `${shortDate(card.date)} · WEEK ${card.week}`;
    font(ctx, 800, 24);
    const pillW = ctx.measureText(pill).width + 40;
    box(ctx, paint, W - P - pillW, 108, pillW, 46, { fill: '#ffffff', r: 23 });
    if (paint) { ctx.fillStyle = '#123a5e'; ctx.fillText(pill, W - P - pillW + 20, 140); }
    para(ctx, paint, zone ? 'GET SET GO · WEEK 19 · MINI MEET & PRIZEGIVING' : `GET SET GO · SERIES ${card.series}: ${String(meta.theme || '').toUpperCase()}`, P + 128, 96, W - P * 2 - 128 - pillW - 20, { weight: 700, size: 22, color: '#1f5f96', lh: 1.25 });
    y = headH;

    /* 2 — station band */
    const titleW = inner - 128;
    font(ctx, 800, 64);
    const titleLines = wrap(ctx, card.name, titleW).length;
    const bandH = 40 + titleLines * 72 + 44;
    if (paint) {
      ctx.fillStyle = c.main;
      ctx.fillRect(0, y, W, bandH);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(P + 50, y + bandH / 2, 50, 0, Math.PI * 2); ctx.fill();
      font(ctx, 800, 56); ctx.fillStyle = c.main; ctx.textAlign = 'center';
      ctx.fillText(String(card.station), P + 50, y + bandH / 2 + 20);
      ctx.textAlign = 'left';
    }
    para(ctx, paint, card.name, P + 128, y + 26, titleW, { weight: 800, size: 64, lh: 1.12, color: '#ffffff' });
    if (paint) {
      font(ctx, 700, 24); ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(zone ? `ZONE ${card.station} · ${card.minutes || 8} MINUTES · STICKERS, NOT RANKINGS` : `STATION ${card.station} · ${String(card.category).toUpperCase()} · WEEK ${card.week}`, P + 130, y + bandH - 22);
    }
    y += bandH + GAP;

    /* 3 — illustration + today's skill */
    const imgW = 600;
    const imgH = Math.round(imgW * 9 / 16);
    const colX = P + 20 + imgW + 24;
    const colW = W - P - 20 - colX;
    let colH = 0;
    colH += label(ctx, false, "Today's skill", 0, 0, c.main, 22);
    colH += para(ctx, false, card.skill || card.category, 0, 0, colW, { weight: 700, size: 32, lh: 1.2 }) + 22;
    colH += 40 + 34 + para(ctx, false, lead, 0, 0, colW, { size: 22 });
    const mediaH = Math.max(imgH, colH) + 40;
    box(ctx, paint, P, y, inner, mediaH, { fill: '#ffffff', stroke: '#dbe5ee', r: 26 });
    if (paint) {
      if (assets.image) cover(ctx, assets.image, P + 20, y + 20, imgW, imgH, 18);
      else placeholder(ctx, card, P + 20, y + 20, imgW, imgH);
      if (card.image && card.image.note) {
        font(ctx, 700, 20);
        const noteLines = wrap(ctx, card.image.note, imgW - 32);
        const nh = noteLines.length * 26 + 16;
        ctx.save(); roundRect(ctx, P + 20, y + 20, imgW, imgH, 18); ctx.clip();
        ctx.fillStyle = 'rgba(12,32,51,0.82)';
        ctx.fillRect(P + 20, y + 20 + imgH - nh, imgW, nh);
        ctx.fillStyle = '#ffffff';
        noteLines.forEach((l, i) => ctx.fillText(l, P + 36, y + 20 + imgH - nh + 30 + i * 26));
        ctx.restore();
      }
    }
    let cy = y + 30;
    cy += label(ctx, paint, "Today's skill", colX, cy, c.main, 22);
    cy += para(ctx, paint, card.skill || card.category, colX, cy, colW, { weight: 700, size: 32, lh: 1.2 }) + 14;
    if (paint) { ctx.fillStyle = '#dbe5ee'; ctx.fillRect(colX, cy, colW, 2); }
    cy += 22;
    if (paint) { font(ctx, 800, 26); ctx.fillStyle = INK; ctx.fillText(`${card.minutes || 11} MINUTES`, colX, cy + 26); }
    cy += 40;
    para(ctx, paint, lead, colX, cy, colW, { size: 22, color: MUTED });
    y += mediaH + GAP;

    /* 4 — you need | set up */
    const half = (inner - GAP) / 2;
    const equip = (card.equipment || []).length ? card.equipment : ['—'];
    const measureList = () => equip.reduce((h, item) => h + para(ctx, false, item, 0, 0, half - 74, { size: 27, lh: 1.3 }) + 6, 0);
    const needH = 30 + 40 + measureList() + 24;
    const setupH = 30 + 40 + para(ctx, false, card.setup || '—', 0, 0, half - 56, { size: 27, lh: 1.36 }) + 24;
    const rowH = Math.max(needH, setupH);
    box(ctx, paint, P, y, half, rowH, { fill: '#fff8e8', stroke: '#f3e2b8' });
    box(ctx, paint, P + half + GAP, y, half, rowH, { fill: '#eef5fb', stroke: '#d4e4f2' });
    label(ctx, paint, 'You need', P + 28, y + 24, '#5b4300');
    label(ctx, paint, 'Set up', P + half + GAP + 28, y + 24, '#164a73');
    let ly = y + 70;
    for (const item of equip) {
      if (paint) { ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(P + 38, ly + 19, 6, 0, Math.PI * 2); ctx.fill(); }
      ly += para(ctx, paint, item, P + 56, ly, half - 74, { size: 27, lh: 1.3 }) + 6;
    }
    para(ctx, paint, card.setup || '—', P + half + GAP + 28, y + 70, half - 56, { size: 27, lh: 1.36 });
    y += rowH + GAP;

    /* 5 — how to play */
    const steps = (card.steps || []).length ? card.steps : ['Steps to be added — see the full coaching notes.'];
    const circuit = card.layout === 'circuit' && steps.length > 1;
    const howTop = y;
    let hy = y + 28;
    hy += label(ctx, false, card.layout === 'circuit' ? 'The circuit' : 'How to play', 0, 0, c.main, 30) + 6;
    const numR = 22;
    if (circuit) {
      const colWc = (inner - 56 - GAP) / 2;
      const rows = [];
      for (let i = 0; i < steps.length; i += 2) {
        const h = [0, 1].map((k) => {
          if (!steps[i + k]) return 0;
          const [name, how] = splitStep(steps[i + k]);
          return para(ctx, false, name, 0, 0, colWc - 70, { weight: 800, size: 28, lh: 1.2 }) + (how ? para(ctx, false, how, 0, 0, colWc - 70, { size: 25, lh: 1.3 }) : 0);
        });
        rows.push(Math.max(...h) + 24);
      }
      const total = rows.reduce((a, b) => a + b, 0);
      box(ctx, paint, P, howTop, inner, hy - howTop + total + 16, { fill: '#ffffff', stroke: '#dbe5ee' });
      label(ctx, paint, 'The circuit', P + 28, howTop + 28, c.main, 30);
      rows.forEach((rh, r) => {
        [0, 1].forEach((k) => {
          const i = r * 2 + k;
          if (!steps[i]) return;
          const x = P + 28 + k * (colWc + GAP);
          if (paint) {
            box(ctx, true, x - 8, hy - 6, colWc + 8, rh - 12, { fill: c.soft, r: 16 });
            ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(x + numR + 4, hy + numR + 6, numR, 0, Math.PI * 2); ctx.fill();
            font(ctx, 800, 24); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x + numR + 4, hy + numR + 14); ctx.textAlign = 'left';
          }
          const [name, how] = splitStep(steps[i]);
          let ty = hy;
          ty += para(ctx, paint, name, x + 62, ty, colWc - 70, { weight: 800, size: 28, lh: 1.2 });
          if (how) para(ctx, paint, how, x + 62, ty, colWc - 70, { size: 25, lh: 1.3, color: MUTED });
        });
        hy += rh;
      });
      y = hy + 16;
    } else {
      const heights = steps.map((s) => Math.max(para(ctx, false, s, 0, 0, inner - 56 - 70, { size: 29, lh: 1.34 }), numR * 2) + 18);
      const total = heights.reduce((a, b) => a + b, 0);
      box(ctx, paint, P, howTop, inner, hy - howTop + total + 10, { fill: '#ffffff', stroke: '#dbe5ee' });
      label(ctx, paint, 'How to play', P + 28, howTop + 28, c.main, 30);
      steps.forEach((s, i) => {
        if (paint) {
          ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(P + 28 + numR, hy + numR + 2, numR, 0, Math.PI * 2); ctx.fill();
          font(ctx, 800, 24); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), P + 28 + numR, hy + numR + 10); ctx.textAlign = 'left';
        }
        para(ctx, paint, s, P + 28 + 70, hy, inner - 56 - 70, { size: 29, lh: 1.34 });
        hy += heights[i];
      });
      y = hy + 10;
    }
    y += GAP;

    /* 6 — say it */
    const cues = (card.cues || []).filter(Boolean);
    if (cues.length) {
      font(ctx, 700, 30);
      let cx = 0;
      let lines = 1;
      for (const cue of cues) {
        const w = ctx.measureText(`• ${cue}`).width + 36;
        if (cx + w > inner - 56 && cx > 0) { lines++; cx = 0; }
        cx += w;
      }
      const sayH = 26 + 40 + lines * 46 + 18;
      box(ctx, paint, P, y, inner, sayH, { fill: c.light });
      label(ctx, paint, 'Say it', P + 28, y + 22, c.main, 26);
      if (paint) {
        font(ctx, 700, 30); ctx.fillStyle = INK;
        let x = P + 28;
        let ly2 = y + 66;
        for (const cue of cues) {
          const text = `• ${cue}`;
          const w = ctx.measureText(text).width + 36;
          if (x + w > P + inner - 28 && x > P + 28) { x = P + 28; ly2 += 46; }
          ctx.fillText(text, x, ly2 + 32);
          x += w;
        }
      }
      y += sayH + GAP;
    }

    /* 7 — ages */
    const youngH = 26 + 40 + para(ctx, false, card.younger || '—', 0, 0, half - 56, { size: 27 }) + 22;
    const oldH = 26 + 40 + para(ctx, false, card.older || '—', 0, 0, half - 56, { size: 27 }) + 22;
    const agesH = Math.max(youngH, oldH);
    box(ctx, paint, P, y, half, agesH, { fill: '#fff1c7' });
    box(ctx, paint, P + half + GAP, y, half, agesH, { fill: '#dcf0fb' });
    label(ctx, paint, 'Ages 3–4 · make it easier', P + 28, y + 22, '#7a4f00', 23);
    label(ctx, paint, 'Ages 5–6 · challenge', P + half + GAP + 28, y + 22, '#145784', 23);
    para(ctx, paint, card.younger || '—', P + 28, y + 64, half - 56, { size: 27 });
    para(ctx, paint, card.older || '—', P + half + GAP + 28, y + 64, half - 56, { size: 27 });
    y += agesH + GAP;

    /* 8 — watch & safety (always shown, high contrast) */
    const watch = card.watch ? `Watch for: ${card.watch}` : '';
    const safety = card.safety || '';
    let sh = 26 + 40;
    if (watch) sh += para(ctx, false, watch, 0, 0, inner - 56, { size: 26, lh: 1.34 }) + 6;
    if (safety) sh += para(ctx, false, safety, 0, 0, inner - 56, { weight: 700, size: 26, lh: 1.34 });
    if (!watch && !safety) sh += para(ctx, false, 'Keep everyone in the space, no elimination.', 0, 0, inner - 56, { size: 26 });
    sh += 20;
    box(ctx, paint, P, y, inner, sh, { fill: '#fde9e7', stroke: '#f2b8b1' });
    label(ctx, paint, 'Watch & safety', P + 28, y + 22, '#a1180e', 26);
    let sy = y + 66;
    if (watch) sy += para(ctx, paint, watch, P + 28, sy, inner - 56, { size: 26, lh: 1.34, color: '#4a0f0a' }) + 6;
    if (safety) para(ctx, paint, safety, P + 28, sy, inner - 56, { weight: 700, size: 26, lh: 1.34, color: '#4a0f0a' });
    if (!watch && !safety) para(ctx, paint, 'Keep everyone in the space, no elimination.', P + 28, sy, inner - 56, { size: 26, color: '#4a0f0a' });
    y += sh + GAP + 6;

    /* 9 — footer */
    const footH = 64;
    if (paint) {
      ctx.fillStyle = c.main;
      ctx.fillRect(0, y, W, footH);
      font(ctx, 700, 22); ctx.fillStyle = '#ffffff';
      ctx.fillText(`GET SET GO · ${longDate(card.date).toUpperCase()} · 5:30–6:30 PM`, P, y + 40);
      ctx.textAlign = 'right';
      ctx.fillText(`${zone ? 'ZONE' : 'STATION'} ${card.station} / 4`, W - P, y + 40);
      ctx.textAlign = 'left';
    }
    return y + footH;
  }

  /**
   * Render one card. meta = { theme }. Returns a canvas whose height fits the
   * content exactly (scale > 1 for print-quality PDF pages).
   */
  async function renderCard(card, meta = {}, scale = 1) {
    await loadFonts();
    const [logo, image] = await Promise.all([loadLogo(), loadImage(card.image && card.image.src)]);
    const assets = { logo, image };
    const measure = document.createElement('canvas').getContext('2d');
    const height = Math.ceil(layout(measure, false, card, meta, assets));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(0, 0, W, height);
    layout(ctx, true, card, meta, assets);
    canvas.dataset.imageMissing = card.image && card.image.src && !image ? '1' : '';
    return canvas;
  }

  const toBlob = (canvas, type = 'image/png', quality) =>
    new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not export the card.'))), type, quality));

  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  }

  /** get-set-go_2026-10-15_station-01_traffic-lights.png */
  function fileName(card, ext = 'png') {
    const unit = isZone(card) ? 'mini-meet_zone' : 'station';
    return `get-set-go_${card.date}_${unit}-${String(card.station).padStart(2, '0')}_${slug(card.name)}.${ext}`;
  }

  /* ---------- ZIP (stored, no compression — PNGs are already compressed) ---------- */

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /** files: [{ name, blob }] -> Blob (application/zip) */
  async function makeZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const name = enc.encode(f.name);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true);      // UTF-8 names
      local.setUint16(8, 0, true);           // stored
      local.setUint16(10, dosTime, true);
      local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      parts.push(local, name, data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true);
      cd.setUint16(10, 0, true);
      cd.setUint16(12, dosTime, true);
      cd.setUint16(14, dosDate, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint32(42, offset, true);
      central.push(cd, name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((n, p) => n + p.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }

  /* ---------- A4 PDF: one card per page, JPEG images ---------- */

  /** pages: [canvas] -> Blob (application/pdf) */
  async function makePdf(pages, title = 'Get Set Go station cards') {
    const enc = new TextEncoder();
    const A4W = 595.28;
    const A4H = 841.89;
    const M = 24;
    const chunks = [];
    const offsets = [];
    let length = 0;
    const push = (part) => {
      const bytes = typeof part === 'string' ? enc.encode(part) : part;
      chunks.push(bytes);
      length += bytes.length;
    };
    const obj = (n, body) => { offsets[n] = length; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
    const esc = (s) => String(s).replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '');

    push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    const n = pages.length;
    const pageIds = pages.map((_, i) => 4 + i * 3);
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${n} >>`));
    obj(3, () => push(`<< /Title (${esc(title)}) /Producer (Taupo Athletics Club admin portal) >>`));
    for (let i = 0; i < n; i++) {
      const canvas = pages[i];
      const jpeg = new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer());
      const s = Math.min((A4W - M * 2) / canvas.width, (A4H - M * 2) / canvas.height);
      const w = canvas.width * s;
      const h = canvas.height * s;
      const x = (A4W - w) / 2;
      const y = (A4H - h) / 2;
      const [pageId, imgId, contentId] = [pageIds[i], pageIds[i] + 1, pageIds[i] + 2];
      obj(pageId, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4W} ${A4H}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`));
      obj(imgId, () => {
        push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
        push(jpeg);
        push('\nendstream');
      });
      const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
      obj(contentId, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    }
    const total = 4 + n * 3;
    const xref = length;
    push(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  /* ---------- delivery ---------- */

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /** Share PNG files through the phone's share sheet (WhatsApp etc.). Returns false if unsupported. */
  async function share(files, text) {
    if (!navigator.canShare || !navigator.share) return false;
    if (!navigator.canShare({ files })) return false;
    try {
      await navigator.share({ files, title: 'Get Set Go station cards', text });
    } catch (e) {
      if (e && e.name === 'AbortError') return true; // the volunteer closed the sheet
      return false;
    }
    return true;
  }

  window.GSGCards = { renderCard, toBlob, fileName, makeZip, makePdf, download, share, palette, longDate, shortDate, splitStep, crc32 };
})();
