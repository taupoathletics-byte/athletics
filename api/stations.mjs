// Vercel serverless function — committee edits to the Get Set Go station cards.
//
// ADMIN ONLY. The base cards are built from the Notion Rotations board into
// api/_data/sessions.mjs (served by /api/sessions). Edits made in the portal are
// stored as OVERRIDES in a separate Notion database, "Get Set Go — Station
// Cards", one row per night + station (key s<series>-<A|B>-<station>):
//
//   * a row only holds the fields someone changed — blank fields fall back to
//     the board text, so later board updates still flow through;
//   * re-pulling the Rotations board never touches these rows, and a row
//     remembers which board version it was edited against ("Board version") so
//     the portal can flag "the board changed since this card was edited";
//   * changing one Thursday never changes another — each night has its own row.
//
// The database is found by its title, or created under the 19 Weekly Lessons
// page the first time someone saves. Committee members can also edit the rows
// directly in Notion.
//
//   GET  /api/stations              -> { storage, overrides: [...] }
//   GET  /api/stations?image=<id>   -> the image uploaded to that row (proxied)
//   POST /api/stations { action: 'save', key, edits, baseHash, image? }
//   POST /api/stations { action: 'reset', key }
import { requireAdmin } from './_guard.mjs';
import { isNotionId, sameNotionId } from './_safety.mjs';
import sessions from './_data/sessions.mjs';

export const config = { maxDuration: 60 };

const NOTION_VERSION = '2022-06-28';
const DB_TITLE = 'Get Set Go — Station Cards';
const PARENT_PAGE = process.env.GSG_LESSONS_PAGE_ID || '3f30d85f-784c-810a-9a86-d6fb222ecb7f';
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;

/** Card field -> Notion property. Lists are stored one item per line. */
const TEXT_FIELDS = {
  name: 'Activity',
  skill: 'Skill',
  setup: 'Set up',
  younger: 'Ages 3–4',
  older: 'Ages 5–6',
  watch: 'Watch for',
  safety: 'Safety',
  discovery: 'Discovery',
  developing: 'Developing',
  consolidating: 'Consolidating',
  observation: 'Observation',
  alternative: 'Alternative',
  imageAlt: 'Image alt',
  imageNote: 'Image note',
  volunteers: 'Volunteers',
};
const LIST_FIELDS = { equipment: 'Equipment', steps: 'Steps', cues: 'Cues' };
const LIMITS = { text: 1500, item: 400, items: 12 };

/** Every base card by key, so a save can only target a real night + station. */
const BASE = new Map(
  sessions.series.flatMap((s) => [...(s.cards?.A || []), ...(s.cards?.B || [])]).map((c) => [c.key, c]),
);
const BUILT_IN_IMAGES = new Set([...BASE.values()].map((c) => c.image?.src).filter(Boolean));

let dbId = process.env.GSG_STATION_CARDS_DB_ID || null;

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

class BadRequest extends Error {}

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Notion ${method} ${path.split('?')[0]}: ${res.status} ${String(json.message || text).slice(0, 200)}`);
  return json;
}

/* ---------- the overrides database ---------- */

const plain = (rt) => (rt || []).map((t) => t.plain_text ?? t.text?.content ?? '').join('');
const titleOf = (db) => plain(db.title);

async function findDb() {
  if (dbId) return dbId;
  const r = await notion('POST', '/search', { query: DB_TITLE, filter: { property: 'object', value: 'database' }, page_size: 20 });
  const hit = (r.results || []).find((d) => !d.archived && titleOf(d) === DB_TITLE);
  if (hit) dbId = hit.id;
  return dbId;
}

/** Every property the portal writes. Kept in one place so an older database can be brought up to date. */
function expectedProperties() {
  const text = { rich_text: {} };
  const properties = {
    Name: { title: {} },
    Key: text,
    Series: { number: {} },
    Week: { select: { options: [{ name: 'A' }, { name: 'B' }] } },
    Station: { number: {} },
    Layout: { select: { options: [{ name: 'steps' }, { name: 'circuit' }] } },
    Image: { files: {} },
    'Image ref': text,
    Reviewed: { checkbox: {} },
    'Board version': text,
  };
  for (const prop of [...Object.values(TEXT_FIELDS), ...Object.values(LIST_FIELDS)]) properties[prop] = text;
  return properties;
}

async function createDb() {
  const properties = expectedProperties();
  const db = await notion('POST', '/databases', {
    parent: { type: 'page_id', page_id: PARENT_PAGE },
    title: [{ type: 'text', text: { content: DB_TITLE } }],
    description: [{ type: 'text', text: { content: 'Committee edits to the Get Set Go volunteer station cards. One row per night + station. Leave a field blank to use the Rotations board text.' } }],
    properties,
  });
  dbId = db.id;
  schemaChecked = true;
  return dbId;
}

/**
 * A database created by an earlier version of the portal may be missing a
 * newer column (e.g. "Volunteers"); Notion rejects writes to unknown
 * properties, so add any that are missing — once per server instance. Columns
 * the committee added themselves are left alone.
 */
let schemaChecked = false;
async function ensureSchema(db) {
  if (schemaChecked) return;
  const current = await notion('GET', `/databases/${db}`);
  const have = current.properties || {};
  const missing = Object.fromEntries(Object.entries(expectedProperties()).filter(([name]) => !have[name] && name !== 'Name'));
  if (Object.keys(missing).length) await notion('PATCH', `/databases/${db}`, { properties: missing });
  schemaChecked = true;
}

async function rowsFor(db, key) {
  const out = [];
  let cursor;
  do {
    const body = { page_size: 100, ...(key ? { filter: { property: 'Key', rich_text: { equals: key } } } : {}) };
    if (cursor) body.start_cursor = cursor;
    const r = await notion('POST', `/databases/${db}/query`, body);
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

/** Notion caps each text run at 2000 characters. */
function richText(value) {
  const s = String(value || '');
  const runs = [];
  for (let i = 0; i < s.length && runs.length < 100; i += 2000) runs.push({ type: 'text', text: { content: s.slice(i, i + 2000) } });
  return { rich_text: runs };
}

function toOverride(page) {
  const p = page.properties || {};
  const text = (name) => plain(p[name]?.rich_text);
  const fields = {};
  for (const [field, prop] of Object.entries(TEXT_FIELDS)) {
    const v = text(prop).trim();
    if (v) fields[field] = v;
  }
  for (const [field, prop] of Object.entries(LIST_FIELDS)) {
    const v = text(prop).split('\n').map((x) => x.trim()).filter(Boolean);
    if (v.length) fields[field] = v;
  }
  const layout = p.Layout?.select?.name;
  if (layout === 'steps' || layout === 'circuit') fields.layout = layout;
  return {
    key: text('Key').trim(),
    pageId: page.id,
    fields,
    imageRef: text('Image ref').trim(),
    hasImage: (p.Image?.files || []).some((f) => f.type === 'file'),
    reviewed: Boolean(p.Reviewed?.checkbox),
    baseHash: text('Board version').trim(),
    updatedAt: page.last_edited_time || '',
  };
}

/* ---------- validation ---------- */

function cleanText(v, field) {
  if (v == null) return '';
  if (typeof v !== 'string') throw new BadRequest(`${field} must be text.`);
  const s = v.replace(/\r\n?/g, '\n').trim();
  if (s.length > LIMITS.text) throw new BadRequest(`${field} is too long (max ${LIMITS.text} characters).`);
  return s;
}

function cleanList(v, field) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new BadRequest(`${field} must be a list.`);
  if (v.length > LIMITS.items) throw new BadRequest(`${field} has too many items (max ${LIMITS.items}).`);
  return v.map((x) => {
    if (typeof x !== 'string') throw new BadRequest(`${field} items must be text.`);
    const s = x.replace(/\s+/g, ' ').trim();
    if (s.length > LIMITS.item) throw new BadRequest(`A ${field} item is too long (max ${LIMITS.item} characters).`);
    return s;
  }).filter(Boolean);
}

/** '' = use the board image, 'none' = no image, a built-in station image, or another row's upload. */
function cleanImageRef(v) {
  if (v == null || v === '') return '';
  if (typeof v !== 'string') throw new BadRequest('Image must be text.');
  if (v === 'none' || BUILT_IN_IMAGES.has(v)) return v;
  const m = v.match(/^notion:([0-9a-f-]{32,36})$/i);
  if (m && isNotionId(m[1])) return `notion:${m[1]}`;
  throw new BadRequest('Unknown image.');
}

const IMAGE_TYPES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

function decodeImage(image) {
  if (!image || typeof image.dataUrl !== 'string') throw new BadRequest('Image upload is missing.');
  const m = image.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new BadRequest('Images must be JPEG, PNG or WebP.');
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_IMAGE_BYTES) throw new BadRequest('Image is too large (max 2.5 MB).');
  if (!IMAGE_TYPES[m[1]](buf)) throw new BadRequest('That file is not a valid image.');
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  const stem = String(image.filename || 'station').replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'station';
  return { buf, type: m[1], filename: `${stem}.${ext}` };
}

/* ---------- image upload / proxy ---------- */

async function uploadImage(pageId, img) {
  const up = await notion('POST', '/file_uploads', { mode: 'single_part', filename: img.filename, content_type: img.type });
  const form = new FormData();
  form.append('file', new Blob([img.buf], { type: img.type }), img.filename);
  const sent = await fetch(`https://api.notion.com/v1/file_uploads/${up.id}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION },
    body: form,
  });
  if (!sent.ok) throw new Error(`Notion image upload: ${sent.status} ${(await sent.text()).slice(0, 200)}`);
  await notion('PATCH', `/pages/${pageId}`, {
    properties: { Image: { files: [{ type: 'file_upload', file_upload: { id: up.id }, name: img.filename }] } },
  });
}

async function proxyImage(req, res, id) {
  if (!isNotionId(id)) return send(res, 400, { error: 'Bad image id.' });
  const db = await findDb();
  if (!db) return send(res, 404, { error: 'No image.' });
  const page = await notion('GET', `/pages/${id}`);
  // Only rows of the Station Cards database — never an arbitrary page's files.
  if (!sameNotionId(page.parent?.database_id, db)) return send(res, 404, { error: 'No image.' });
  const file = (page.properties?.Image?.files || []).find((f) => f.type === 'file' && f.file?.url);
  if (!file) return send(res, 404, { error: 'No image.' });
  const r = await fetch(file.file.url);
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(type.split(';')[0])) return send(res, 502, { error: 'Image unavailable.' });
  const buf = Buffer.from(await r.arrayBuffer());
  res.statusCode = 200;
  res.setHeader('Content-Type', type.split(';')[0]);
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(buf);
}

/* ---------- handlers ---------- */

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let data = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size <= 4.5 * 1024 * 1024) data += c;
    });
    req.on('end', () => { try { resolve(size > 4.5 * 1024 * 1024 ? {} : JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

async function save(body) {
  const base = BASE.get(body.key);
  if (!base) throw new BadRequest('Unknown station.');
  const edits = body.edits && typeof body.edits === 'object' ? body.edits : {};
  const baseHash = typeof body.baseHash === 'string' && /^[0-9a-f]{12}$/.test(body.baseHash) ? body.baseHash : base.hash;
  const props = {
    Name: { title: [{ type: 'text', text: { content: `S${base.series} · Week ${base.week} · ${base.station} ${base.category} — ${cleanText(edits.name, 'Activity') || base.name}`.slice(0, 200) } }] },
    Key: richText(base.key),
    Series: { number: base.series },
    Week: { select: { name: base.week } },
    Station: { number: base.station },
    Layout: edits.layout === 'steps' || edits.layout === 'circuit' ? { select: { name: edits.layout } } : { select: null },
    'Image ref': richText(cleanImageRef(edits.imageRef)),
    Reviewed: { checkbox: Boolean(edits.reviewed) },
    'Board version': richText(baseHash),
  };
  for (const [field, prop] of Object.entries(TEXT_FIELDS)) props[prop] = richText(cleanText(edits[field], prop));
  for (const [field, prop] of Object.entries(LIST_FIELDS)) props[prop] = richText(cleanList(edits[field], prop).join('\n'));
  const img = body.image ? decodeImage(body.image) : null;

  const db = (await findDb()) || (await createDb());
  await ensureSchema(db);
  const existing = await rowsFor(db, base.key);
  let page;
  if (existing.length) {
    page = await notion('PATCH', `/pages/${existing[0].id}`, { properties: props });
    // Two rows for one station would make the result depend on query order.
    for (const dup of existing.slice(1)) await notion('PATCH', `/pages/${dup.id}`, { archived: true });
  } else {
    page = await notion('POST', '/pages', { parent: { database_id: db }, properties: props });
  }
  if (img) {
    await uploadImage(page.id, img);
    page = await notion('PATCH', `/pages/${page.id}`, { properties: { 'Image ref': richText(`notion:${page.id}`) } });
  }
  return toOverride(page);
}

async function reset(body) {
  if (!BASE.has(body.key)) throw new BadRequest('Unknown station.');
  const db = await findDb();
  if (!db) return 0;
  const rows = await rowsFor(db, body.key);
  for (const r of rows) await notion('PATCH', `/pages/${r.id}`, { archived: true });
  return rows.length;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const url = new URL(req.url || '/', 'http://x');
  try {
    if (req.method === 'GET') {
      if (url.searchParams.has('image')) return await proxyImage(req, res, url.searchParams.get('image'));
      if (!process.env.NOTION_TOKEN) return send(res, 200, { storage: 'unavailable', overrides: [] });
      const db = await findDb();
      const overrides = db ? (await rowsFor(db)).map(toOverride).filter((o) => BASE.has(o.key)) : [];
      return send(res, 200, { storage: 'notion', overrides });
    }
    if (req.method === 'POST') {
      if (!process.env.NOTION_TOKEN) return send(res, 503, { error: 'Notion is not connected on the server (NOTION_TOKEN).' });
      const body = await readBody(req);
      if (body.action === 'save') return send(res, 200, { ok: true, override: await save(body) });
      if (body.action === 'reset') return send(res, 200, { ok: true, removed: await reset(body) });
      return send(res, 400, { error: 'Unknown action.' });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    if (e instanceof BadRequest) return send(res, 400, { error: e.message });
    console.error(e);
    // Admin-only endpoint: the committee needs the real reason to fix it.
    return send(res, 502, { error: String(e.message || e).slice(0, 300) });
  }
}
