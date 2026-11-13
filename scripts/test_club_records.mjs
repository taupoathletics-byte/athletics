// Offline checks for live Club Records (api/_clubrecords.mjs, /api/clubrecords,
// and the "new club record" answer from /api/records). Notion is faked.
//
//   node scripts/test_club_records.mjs
//
// Covers: reading both mark formats; a club-night result that beats a record
// replaces it, an equal one shares it, a worse one is ignored; the public
// board names record holders only; saving a record-breaking result tells the
// admin what it beat; deleting/correcting it takes it off the board.
process.env.NOTION_TOKEN = 'fake-token';
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';

const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const RECORDS_DB = '3e30d85f-784c-81e4-a908-f87400031506';
const norm = (id) => String(id).replace(/-/g, '').toLowerCase();
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const txt = (s) => [{ plain_text: s, text: { content: s } }];

const members = ['Fast Girl', 'Equal Girl', 'Slow Boy', 'Hidden Kid'].map((name, i) => ({ id: uuid(100 + i), properties: { Name: { title: txt(name) } } }));
const rec = (n, memberIdx, event, grade, gender, result, date = '2026-10-22') => ({
  id: uuid(1000 + n),
  parent: { database_id: RECORDS_DB },
  properties: {
    Member: { relation: [{ id: members[memberIdx].id }] },
    Event: { select: { name: event } },
    Grade: { select: { name: grade } },
    Gender: { select: { name: gender } },
    Date: { date: { start: date } },
    Result: { rich_text: txt(result) },
    Season: { select: { name: '2026-27' } },
  },
});
let records = [
  rec(1, 1, '60m', '7', 'F', '10.73'), // equals Mackenzie Meihana 00:10.73
  rec(2, 2, 'Long Jump', '9', 'M', '3.10'), // worse than Knox Short 3.75
  rec(3, 3, 'Discus', '10', 'M', '9.0'), // worse than Benji Farrar 14.9
];
let created = 0;

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : {};
  const json = (status, obj) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });
  const q = u.pathname.match(/^\/v1\/databases\/([^/]+)\/query$/);
  if (q) return json(200, { results: norm(q[1]) === norm(MEMBERS_DB) ? members : records, has_more: false });
  if (u.pathname === '/v1/pages' && method === 'POST') {
    const page = { id: uuid(5000 + ++created), parent: { database_id: RECORDS_DB }, properties: { ...body.properties, Result: { rich_text: txt(body.properties.Result.rich_text[0].text.content) } } };
    // Like Notion, a new page isn't in query results straight away.
    setTimeout(() => records.push(page), 50);
    return json(200, { id: page.id });
  }
  const p = u.pathname.match(/^\/v1\/pages\/(.+)$/);
  if (p && method === 'PATCH') {
    const row = records.find((r) => norm(r.id) === norm(p[1]));
    if (body.archived) records = records.filter((r) => r !== row);
    else if (row && body.properties?.Result) row.properties.Result = { rich_text: txt(body.properties.Result.rich_text[0].text.content) };
    return json(200, {});
  }
  if (p && method === 'GET') {
    const row = records.find((r) => norm(r.id) === norm(p[1]));
    return row ? json(200, row) : json(404, { message: 'nf' });
  }
  return json(404, { message: `unexpected ${method} ${u.pathname}` });
};

const { markValue, buildBoard } = await import('../api/_clubrecords.mjs');
const { default: records_ } = await import('../api/records.mjs');
const { default: clubrecords } = await import('../api/clubrecords.mjs');
const { default: auth } = await import('../api/auth.mjs');

function mockReq(method, url, body, headers = {}) {
  return { method, url, headers, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}
async function call(h, req) {
  const state = { code: 200, body: '', headers: {} };
  await h(req, {
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

// Mark formats
check('marks: sheet "00:09:14" = 9.14s', markValue('60m', '00:09:14') === 9.14);
check('marks: sheet "01.14.10" = 74.1s', Math.abs(markValue('400m', '01.14.10') - 74.1) < 1e-9);
check('marks: sheet "06:42" = 402s', markValue('1500m', '06:42') === 402);
check('marks: club night "1:23.4" = 83.4s, "9.9s" = 9.9', markValue('400m', '1:23.4') === 83.4 && markValue('60m', '9.9s') === 9.9);
check('marks: field "4.56m" = 4.56, junk = null', markValue('Long Jump', '4.56m') === 4.56 && markValue('Long Jump', 'DNS') === null);

const login = await call(auth, mockReq('POST', '/api/auth', JSON.stringify({ passcode: 'test-pass-123' })));
const admin = { cookie: (login.headers['set-cookie'] || '').split(';')[0] };

// Public board before any record
let pub = await call(clubrecords, mockReq('GET', '/api/clubrecords'));
const slot = (j, event, grade, gender) => j.events.find((e) => e.event === event).rows.find((r) => r.grade === grade && r.gender === gender);
check('public board: cached at the edge', /s-maxage/.test(pub.headers['cache-control'] || ''));
check('public board: an equal mark shares the record', slot(pub.json, '60m', 7, 'F').holders.map((h) => h.name).join() === 'Mackenzie Meihana,Equal Girl');
check('public board: worse marks are not shown', !/Slow Boy|Hidden Kid/.test(pub.body));
check('public board: no member ids or other results', !/memberId|00000000-0000/.test(pub.body));

// Admin saves a record-breaking result (single entry)
const save = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ memberId: members[0].id, memberName: 'Fast Girl', event: '60m', grade: '9', gender: 'F', date: '2026-11-12', result: '9.5', season: '2026-27' }), admin));
const nr = save.json.newRecords || [];
check('save: tells the admin it is a new record, even before Notion indexes it', nr.length === 1 && nr[0].name === 'Fast Girl' && !nr[0].tie && nr[0].previous?.names.join() === 'Jessica Rakei', save.body);
const plain = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ memberId: members[2].id, memberName: 'Slow Boy', event: 'Shot Put', grade: '9', gender: 'M', date: '2026-11-12', result: '4.0', season: '2026-27' }), admin));
check('save: an ordinary result is not a record', plain.code === 200 && (plain.json.newRecords || []).length === 0);

// Bulk entry with a tie and a beat
const bulk = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ action: 'bulk', event: 'Long Jump', grade: '9', date: '2026-11-12', season: '2026-27', results: [
  { memberId: members[2].id, memberName: 'Slow Boy', gender: 'M', result: '3.80' }, // overwrites 3.10, beats 3.75
  { memberId: members[3].id, memberName: 'Hidden Kid', gender: 'M', result: '2.00' },
] }), admin));
const bn = bulk.json.newRecords || [];
check('bulk: the record-breaker is reported with what it beat', bn.length === 1 && bn[0].name === 'Slow Boy' && bn[0].previous?.names.join() === 'Knox Short', bulk.body);

await new Promise((r) => setTimeout(r, 80));
pub = await call(clubrecords, mockReq('GET', '/api/clubrecords'));
check('public board: the new record replaces the old one', slot(pub.json, '60m', 9, 'F').holders.map((h) => `${h.name}:${h.source}`).join() === 'Fast Girl:club-night');
check('public board: bulk record shows too', slot(pub.json, 'Long Jump', 9, 'M').holders[0].name === 'Slow Boy');

// A mistyped result is corrected → it drops off the board
const fix = await call(records_, mockReq('POST', '/api/records', JSON.stringify({ memberId: members[0].id, memberName: 'Fast Girl', event: '60m', grade: '9', gender: 'F', date: '2026-11-12', result: '10.5', season: '2026-27' }), admin));
check('correction: no record any more', (fix.json.newRecords || []).length === 0);
pub = await call(clubrecords, mockReq('GET', '/api/clubrecords'));
check('public board: the old record is back after the correction', slot(pub.json, '60m', 9, 'F').holders[0].name === 'Jessica Rakei');

// First-ever record for a slot the sheet doesn't have
const first = buildBoard([{ id: 'x', name: 'New Kid', event: '1500m', grade: '7', gender: 'M', date: '2026-11-12', result: '7:10' }]).find((s) => s.event === '1500m' && s.grade === '7');
check('a slot with no historical record gets its first record', first && first.holders[0].name === 'New Kid');

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(failed.length ? `\n${failed.length} club-record check(s) failed` : `\nAll ${results.length} club-record checks passed.`);
process.exit(failed.length ? 1 : 0);
