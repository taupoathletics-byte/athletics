// Offline checks for /api/stations (Get Set Go station-card edits). Notion is
// faked, so this runs anywhere and never touches the real workspace:
//
//   node scripts/test_stations.mjs
process.env.NOTION_TOKEN = 'fake-token';
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';

const norm = (id) => String(id).replace(/-/g, '').toLowerCase();
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const OTHER_DB = uuid();

/* ---------- fake Notion ---------- */

const dbs = [];
const pages = [];
const uploads = new Map();
const calls = [];
const schemaPatches = [];
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const strangerPage = { id: uuid(), parent: { database_id: OTHER_DB }, properties: { Image: { files: [{ type: 'file', file: { url: 'https://files.example/secret.png' } }] } } };
pages.push(strangerPage);

const textOf = (prop) => (prop?.rich_text || []).map((t) => t.text.content).join('');
function stored(props) {
  // Notion echoes rich_text back with plain_text set.
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (v.rich_text) out[k] = { rich_text: v.rich_text.map((t) => ({ ...t, plain_text: t.text.content })) };
    else if (v.title) out[k] = { title: v.title.map((t) => ({ ...t, plain_text: t.text.content })) };
    else if (v.files) out[k] = { files: v.files.map((f) => (f.type === 'file_upload' ? { type: 'file', name: f.name, file: { url: `https://files.example/${f.file_upload.id}` } } : f)) };
    else out[k] = v;
  }
  return out;
}

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  calls.push(`${method} ${u.pathname}`);
  const json = (status, obj) => ({ ok: status < 400, status, headers: new Headers({ 'content-type': 'application/json' }), text: async () => JSON.stringify(obj), json: async () => obj });
  if (u.hostname === 'files.example') {
    const id = u.pathname.slice(1);
    if (!uploads.has(id)) return json(404, {});
    return { ok: true, status: 200, headers: new Headers({ 'content-type': 'image/png' }), arrayBuffer: async () => uploads.get(id) };
  }
  const p = u.pathname.replace(/^\/v1/, '');
  if (p === '/file_uploads/x' || /^\/file_uploads\/[^/]+\/send$/.test(p)) {
    const id = p.split('/')[2];
    const file = opts.body.get('file');
    uploads.set(id, Buffer.from(await file.arrayBuffer()));
    return json(200, { id, status: 'uploaded' });
  }
  const body = typeof opts.body === 'string' ? JSON.parse(opts.body) : {};
  if (p === '/search') return json(200, { results: dbs.filter((d) => !d.archived) });
  if (p === '/databases' && method === 'POST') {
    const db = { object: 'database', id: uuid(), title: body.title.map((t) => ({ plain_text: t.text.content })), parent: body.parent, properties: body.properties };
    dbs.push(db);
    return json(200, db);
  }
  const dbm = p.match(/^\/databases\/([^/]+)$/);
  if (dbm) {
    const db = dbs.find((d) => norm(d.id) === norm(dbm[1]));
    if (!db) return json(404, { message: 'not found' });
    if (method === 'PATCH') { Object.assign(db.properties, body.properties); schemaPatches.push(Object.keys(body.properties)); }
    return json(200, db);
  }
  const q = p.match(/^\/databases\/([^/]+)\/query$/);
  if (q) {
    let rows = pages.filter((pg) => !pg.archived && norm(pg.parent.database_id) === norm(q[1]));
    const key = body.filter?.rich_text?.equals;
    if (key) rows = rows.filter((r) => textOf(r.properties.Key) === key);
    return json(200, { results: rows, has_more: false });
  }
  if (p === '/pages' && method === 'POST') {
    const page = { object: 'page', id: uuid(), parent: body.parent, properties: stored(body.properties), last_edited_time: '2026-10-12T00:00:00Z' };
    pages.push(page);
    return json(200, page);
  }
  if (p === '/file_uploads' && method === 'POST') return json(200, { id: uuid(), status: 'pending' });
  const pg = p.match(/^\/pages\/([^/]+)$/);
  if (pg) {
    const page = pages.find((x) => norm(x.id) === norm(pg[1]));
    if (!page) return json(404, { message: 'not found' });
    if (method === 'PATCH') {
      if (body.archived) page.archived = true;
      if (body.properties) Object.assign(page.properties, stored(body.properties));
    }
    return json(200, page);
  }
  return json(404, { message: `unexpected ${method} ${p}` });
};

/* ---------- harness ---------- */

const { default: stations } = await import('../api/stations.mjs');
const { default: auth } = await import('../api/auth.mjs');
const { default: sessions } = await import('../api/_data/sessions.mjs');

function mockReq(method, url, body, headers = {}) {
  return { method, url, headers, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}
async function call(handler, req) {
  const state = { code: 200, body: '', headers: {} };
  await handler(req, {
    set statusCode(c) { state.code = c; },
    get statusCode() { return state.code; },
    setHeader(k, v) { state.headers[k.toLowerCase()] = v; },
    end(d) { state.body = d; },
  });
  try { state.json = JSON.parse(state.body); } catch { state.json = null; }
  return state;
}
const results = [];
const check = (label, cond, detail = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && detail ? `  — ${detail}` : ''}`);

const login = await call(auth, mockReq('POST', '/api/auth', JSON.stringify({ passcode: 'test-pass-123' })));
const admin = { cookie: (login.headers['set-cookie'] || '').split(';')[0] };
const post = (body) => call(stations, mockReq('POST', '/api/stations', JSON.stringify(body), admin));
const base = sessions.series[0].cards.A[0];

/* ---------- 1. admin only ---------- */

const anon = await call(stations, mockReq('GET', '/api/stations'));
check('GET refused without an admin session', anon.code === 401, `got ${anon.code}`);
const anonPost = await call(stations, mockReq('POST', '/api/stations', JSON.stringify({ action: 'save', key: base.key, edits: {} })));
check('POST refused without an admin session', anonPost.code === 401 && dbs.length === 0, `got ${anonPost.code}`);

/* ---------- 2. no database yet ---------- */

const empty = await call(stations, mockReq('GET', '/api/stations', null, admin));
check('GET before any edit: no overrides, no database created', empty.code === 200 && empty.json.overrides.length === 0 && dbs.length === 0, empty.body);

/* ---------- 3. save creates the database and one row ---------- */

const saved = await post({ action: 'save', key: base.key, baseHash: base.hash, edits: { steps: ['One', 'Two', 'Three'], cues: ['Eyes up'], reviewed: true } });
check('save: creates the Station Cards database on first use', saved.code === 200 && dbs.length === 1 && dbs[0].title[0].plain_text === 'Get Set Go — Station Cards', saved.body);
check('save: the database lives under the 19 Weekly Lessons page', norm(dbs[0].parent.page_id) === '3f30d85f784c810a9a86d6fb222ecb7f');
check('save: stores only the edited fields', JSON.stringify(saved.json.override.fields) === JSON.stringify({ steps: ['One', 'Two', 'Three'], cues: ['Eyes up'] }), JSON.stringify(saved.json.override.fields));
check('save: remembers the board version it was edited against', saved.json.override.baseHash === base.hash && saved.json.override.reviewed === true);
const again = await post({ action: 'save', key: base.key, baseHash: base.hash, edits: { name: 'Traffic Lights (wet night)' } });
const live = pages.filter((p) => !p.archived && p.parent.database_id === dbs[0].id);
check('save again: updates the same row, no duplicates', again.code === 200 && live.length === 1, `${live.length} rows`);
check('save again: replaces the old edits', JSON.stringify(again.json.override.fields) === JSON.stringify({ name: 'Traffic Lights (wet night)' }), JSON.stringify(again.json.override.fields));
const other = await post({ action: 'save', key: 's1-B-1', edits: { name: 'Octopus (indoors)' } });
const list = await call(stations, mockReq('GET', '/api/stations', null, admin));
check('one Thursday never changes another', list.json.overrides.length === 2 && list.json.overrides.find((o) => o.key === base.key).fields.name === 'Traffic Lights (wet night)' && other.json.override.fields.name === 'Octopus (indoors)', list.body);

/* ---------- 4. validation ---------- */

const badKey = await post({ action: 'save', key: 's99-A-1', edits: {} });
check('save: rejects an unknown station key', badKey.code === 400, `got ${badKey.code}`);
const longText = await post({ action: 'save', key: base.key, edits: { setup: 'x'.repeat(1600) } });
check('save: rejects over-long text', longText.code === 400, `got ${longText.code}`);
const manySteps = await post({ action: 'save', key: base.key, edits: { steps: Array(13).fill('step') } });
check('save: rejects more than 12 steps', manySteps.code === 400, `got ${manySteps.code}`);
const badRef = await post({ action: 'save', key: base.key, edits: { imageRef: 'https://evil.example/x.png' } });
check('save: image must be built-in or a Notion upload', badRef.code === 400, `got ${badRef.code}`);
const builtIn = await post({ action: 'save', key: 's1-B-1', edits: { imageRef: '/getsetgo/stations/traffic-lights.jpg' } });
check('save: a built-in station image can be reused', builtIn.code === 200 && builtIn.json.override.imageRef === '/getsetgo/stations/traffic-lights.jpg', builtIn.body);
const fakeImg = await post({ action: 'save', key: base.key, edits: {}, image: { dataUrl: 'data:image/png;base64,' + Buffer.from('<svg onload=alert(1)>').toString('base64'), filename: 'x.png' } });
check('save: rejects a file that is not really an image', fakeImg.code === 400, `got ${fakeImg.code}`);

/* ---------- 5. image upload + proxy ---------- */

const up = await post({ action: 'save', key: 's3-A-3', edits: {}, image: { dataUrl: 'data:image/png;base64,' + PNG.toString('base64'), filename: 'Superhero Training!.png' } });
check('upload: attaches the image to the row', up.code === 200 && up.json.override.hasImage && up.json.override.imageRef === `notion:${up.json.override.pageId}`, up.body);
check('upload: file name is sanitised', [...uploads.keys()].length === 1 && calls.includes('POST /v1/file_uploads'), calls.join(','));
const img = await call(stations, mockReq('GET', `/api/stations?image=${up.json.override.pageId}`, null, admin));
check('proxy: serves the uploaded image', img.code === 200 && img.headers['content-type'] === 'image/png' && Buffer.compare(Buffer.from(img.body), PNG) === 0, `got ${img.code}`);
const anonImg = await call(stations, mockReq('GET', `/api/stations?image=${up.json.override.pageId}`));
check('proxy: refused without an admin session', anonImg.code === 401, `got ${anonImg.code}`);
const stranger = await call(stations, mockReq('GET', `/api/stations?image=${strangerPage.id}`, null, admin));
check('proxy: never serves files from pages outside the Station Cards database', stranger.code === 404, `got ${stranger.code}`);
const junkId = await call(stations, mockReq('GET', '/api/stations?image=../../users', null, admin));
check('proxy: rejects a non-id', junkId.code === 400, `got ${junkId.code}`);

/* ---------- 6. older databases get new columns added ---------- */

delete dbs[0].properties.Volunteers;
delete dbs[0].properties['Image note'];
const { default: freshStations } = await import('../api/stations.mjs?fresh=1');
const vol = await call(freshStations, mockReq('POST', '/api/stations', JSON.stringify({ action: 'save', key: 's10-A-1', edits: { volunteers: 'Sam & Alex' } }), admin));
check('schema: missing columns are added before saving', vol.code === 200 && schemaPatches.some((k) => k.includes('Volunteers') && k.includes('Image note')) && 'Volunteers' in dbs[0].properties, `${vol.code} ${JSON.stringify(schemaPatches)}`);
check('volunteers: saved on a Mini Meet zone', vol.json?.override?.fields?.volunteers === 'Sam & Alex', vol.body);

/* ---------- 7. reset ---------- */

const reset = await post({ action: 'reset', key: base.key });
const after = await call(stations, mockReq('GET', '/api/stations', null, admin));
check('reset: archives the row so the board text shows again', reset.code === 200 && reset.json.removed === 1 && !after.json.overrides.some((o) => o.key === base.key), after.body);

console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) {
  console.error('\nSOME STATION-CARD CHECKS FAILED');
  process.exit(1);
}
console.log(`\nAll ${results.length} station-card checks passed.`);
