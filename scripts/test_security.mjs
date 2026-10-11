// Offline security checks for the public + admin API. Notion is faked, so this
// runs anywhere and never touches the real workspace:
//
//   node scripts/test_security.mjs
//
// Covers: the public records board only ships the top 10 per event, birthdates
// never appear in a public response, the public
// check-in search can't be used to scrape children's names, record delete can
// only archive a Club Records row, logout really expires the cookie, and bad
// input can't crash a function.
process.env.NOTION_TOKEN = 'fake-token';
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';

const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const RECORDS_DB = '3e30d85f-784c-81e4-a908-f87400031506';
const ATTENDANCE_DB = '3e30d85f-784c-8176-9c98-f98cad30a39f';
const norm = (id) => String(id).replace(/-/g, '').toLowerCase();
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/* ---------- fake Notion ---------- */

const txt = (s) => [{ plain_text: s, text: { content: s } }];
const members = ['Ari Anderson', 'Arlo Archer', 'Bella Brown', 'Cody Clark', 'Arnie Adams'].map((name, i) => ({
  id: uuid(100 + i),
  parent: { database_id: MEMBERS_DB },
  properties: {
    Name: { title: txt(name) },
    'First Name': { rich_text: txt(name.split(' ')[0]) },
    'Last Name': { rich_text: txt(name.split(' ')[1]) },
    'Member Type': { rich_text: txt('Active Member 7 to 14 Years') },
    'Access code': { rich_text: txt(`CODE000${i}`) },
    'Birth Date': { date: { start: '2016-05-01' } },
    Gender: { select: { name: i % 2 ? 'M' : 'F' } },
  },
}));
const records = [];
for (let i = 0; i < 30; i++) {
  records.push({
    id: uuid(1000 + i),
    parent: { database_id: RECORDS_DB },
    properties: {
      Member: { relation: [{ id: members[i % members.length].id }] },
      Event: { select: { name: i % 2 ? '100m' : 'Long Jump' } },
      Result: { rich_text: txt(String(10 + i / 10)) },
      Grade: { select: { name: '10' } },
      Gender: { select: { name: 'F' } },
      Date: { date: { start: '2026-10-15' } },
      Season: { select: { name: '2026-27' } },
    },
  });
}
const archived = [];
const created = [];
let notionDown = false;

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : {};
  const json = (status, obj) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj), json: async () => obj });
  if (notionDown) return json(502, { message: 'internal notion detail /databases/secret-id' });
  const m = u.pathname.match(/^\/v1\/databases\/([^/]+)\/query$/);
  if (m && method === 'POST') {
    const db = norm(m[1]);
    let rows = db === norm(MEMBERS_DB) ? members : db === norm(RECORDS_DB) ? records : [];
    const code = body.filter?.rich_text?.equals;
    if (code) rows = rows.filter((r) => r.properties['Access code'].rich_text[0].plain_text === code);
    return json(200, { results: rows, has_more: false });
  }
  const p = u.pathname.match(/^\/v1\/pages\/(.+)$/);
  if (p && method === 'GET') {
    const page = [...members, ...records].find((x) => norm(x.id) === norm(p[1]));
    return page ? json(200, page) : json(404, { message: 'not found' });
  }
  if (p && method === 'PATCH') {
    archived.push(p[1]);
    return json(200, { id: p[1] });
  }
  if (u.pathname === '/v1/pages' && method === 'POST') {
    created.push(body);
    return json(200, { id: uuid(9000 + created.length) });
  }
  return json(404, { message: `unexpected ${method} ${u.pathname}` });
};

/* ---------- harness ---------- */

const { default: records_ } = await import('../api/records.mjs');
const { default: checkin } = await import('../api/checkin.mjs');
const { default: auth } = await import('../api/auth.mjs');
const { default: attendance } = await import('../api/attendance.mjs');
const { default: myrecords } = await import('../api/myrecords.mjs');
const { nzToday } = await import('../api/_safety.mjs');

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
const cookie = (login.headers['set-cookie'] || '').split(';')[0];
const admin = { cookie };

/* ---------- 1. public records board ---------- */

const pub = await call(records_, mockReq('GET', '/api/records'));
const perEvent = {};
for (const r of pub.json.records) perEvent[r.event] = (perEvent[r.event] || 0) + 1;
check('public /api/records: at most 10 results per event', Object.values(perEvent).every((n) => n <= 10), JSON.stringify(perEvent));
check('public /api/records: no member ids', pub.json.records.every((r) => !('memberId' in r)));
check('public /api/records: no member roster', !('members' in pub.json));
const adm = await call(records_, mockReq('GET', '/api/records', null, admin));
check('admin /api/records: full history + roster', adm.json.records.length === 30 && adm.json.members.length === members.length);

/* ---------- 2. public check-in search ---------- */

const one = await call(checkin, mockReq('GET', '/api/checkin?q=a', null, { 'x-real-ip': '10.0.0.1' }));
check('check-in search: one letter returns nothing', one.json.names.length === 0);
const two = await call(checkin, mockReq('GET', '/api/checkin?q=ar', null, { 'x-real-ip': '10.0.0.1' }));
check('check-in search: two letters match', two.json.names.length === 3, JSON.stringify(two.json));
check('check-in search: surnames masked to an initial', !/Anderson|Archer|Adams/.test(two.body) && two.json.names.some((n) => n.label === 'Arlo A.'), two.body);
let last;
for (let i = 0; i < 61; i++) last = await call(checkin, mockReq('GET', '/api/checkin?q=br', null, { 'x-real-ip': '10.0.0.2' }));
check('check-in search: rate-limited per IP', last.code === 429, `got ${last.code}`);

/* ---------- 3. public check-in submit ---------- */

const ari = two.json.names.find((n) => n.label === 'Ari A.');
const ok = await call(checkin, mockReq('POST', '/api/checkin', JSON.stringify({ ids: [ari.id], date: nzToday() }), { 'x-real-ip': '10.0.0.3' }));
check('check-in submit: by id works', ok.code === 200 && ok.json.created === 1, ok.body);
check('check-in submit: response does not echo full names', !/Anderson/.test(ok.body), ok.body);
const old = await call(checkin, mockReq('POST', '/api/checkin', JSON.stringify({ ids: [ari.id], date: '2026-01-01' }), { 'x-real-ip': '10.0.0.3' }));
check('check-in submit: rejects dates outside this week', old.code === 400, `got ${old.code}`);

/* ---------- 4. record delete is scoped to Club Records ---------- */

archived.length = 0;
const traversal = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ action: 'delete', id: '../blocks/abc' }), admin));
check('records delete: rejects a non-id (path traversal)', traversal.code === 400 && archived.length === 0, `got ${traversal.code}`);
const memberPage = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ action: 'delete', id: members[0].id }), admin));
check('records delete: refuses to archive a member page', memberPage.code === 400 && archived.length === 0, `got ${memberPage.code}`);
const real = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ action: 'delete', id: records[0].id }), admin));
check('records delete: archives a real record', real.code === 200 && archived.length === 1, `got ${real.code}`);
const badMember = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ memberId: 'x', event: '60m', result: '9.9' }), admin));
check('records create: rejects a bad member id', badMember.code === 400);

/* ---------- 5. session handling ---------- */

const out = await call(auth, mockReq('DELETE', '/api/auth'));
check('logout: expires the cookie on the server', /Max-Age=0/.test(out.headers['set-cookie'] || ''), out.headers['set-cookie']);
const junk = await call(attendance, mockReq('GET', '/api/attendance', null, { cookie: 'ta_admin=%E0%A4%A; other=%' }));
check('guard: malformed cookie gives 401, not a crash', junk.code === 401, `got ${junk.code}`);
const badDate = await call(attendance, mockReq('GET', '/api/attendance?date=not-a-date', null, admin));
check('attendance: rejects a bad date', badDate.code === 400, `got ${badDate.code}`);

/* ---------- 6. birthdates never leave the server publicly ---------- */

const fam = await call(myrecords, mockReq('GET', '/api/myrecords?code=CODE0001', null, { 'x-real-ip': '10.0.0.8' }));
check('my-records: a family code returns that family only', fam.code === 200 && fam.json.members.length === 1, fam.body);
const publicBodies = [pub.body, one.body, two.body, ok.body, fam.body].join('\n');
check('no public response contains a birth date', !publicBodies.includes('2016-05-01') && !/birth/i.test(publicBodies));

/* ---------- 7. public errors don't leak internals ---------- */

notionDown = true;
const leak = await call(myrecords, mockReq('GET', '/api/myrecords?code=CODE0001', null, { 'x-real-ip': '10.0.0.9' }));
check('my-records: Notion errors are not shown to the public', leak.code === 500 && !/notion|databases|secret/i.test(leak.body), leak.body);
notionDown = false;

console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) {
  console.error('\nSOME SECURITY CHECKS FAILED');
  process.exit(1);
}
console.log(`\nAll ${results.length} security checks passed.`);
