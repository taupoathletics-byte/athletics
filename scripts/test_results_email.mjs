// Offline checks for "Email results after a measure night"
// (api/resultsemail.mjs). Notion and Resend are faked.
//
//   node scripts/test_results_email.mjs
process.env.NOTION_TOKEN = 'fake-token';
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';
process.env.SITE_URL = 'https://club.example';

const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const RECORDS_DB = '3e30d85f-784c-81e4-a908-f87400031506';
const norm = (id) => String(id).replace(/-/g, '').toLowerCase();
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const txt = (s) => [{ plain_text: s, text: { content: s } }];
const member = (i, first, last, email, code, type = 'Active Member 7 to 14 Years') => ({
  id: uuid(100 + i),
  properties: { Name: { title: txt(`${first} ${last}`) }, 'First Name': { rich_text: txt(first) }, 'Member Type': { rich_text: txt(type) }, Email: { rich_text: txt(email) }, 'Access code': { rich_text: txt(code) } },
});
const members = [
  member(1, 'Mia', 'Apple', 'apple@example.com', 'AAAA2222'),
  member(2, 'Leo', 'Apple', 'apple@example.com', 'AAAA2222'),
  member(3, 'Ana', 'Berry', 'berry@example.com', 'BBBB3333'),
  member(4, 'Kit', 'Cherry', 'cherry@example.com', 'CCCC4444'), // no results on the night
];
let n = 0;
const rec = (m, event, grade, gender, result, date) => ({
  id: uuid(1000 + ++n),
  properties: { Member: { relation: [{ id: members[m].id }] }, Event: { select: { name: event } }, Grade: { select: { name: grade } }, Gender: { select: { name: gender } }, Date: { date: { start: date } }, Result: { rich_text: txt(result) } },
});
const records = [
  rec(0, '100m', '9', 'F', '16.0', '2025-11-13'), // last season
  rec(0, '100m', '9', 'F', '15.2', '2026-11-12'), // PB
  rec(0, 'Long Jump', '9', 'F', 'NJ', '2026-11-12'),
  rec(1, 'Shot Put', '12', 'M', '7.65', '2026-11-12'), // beats Lukas Haver 6.94
  rec(2, '400m', '8', 'F', '1:35:1', '2026-11-12'),
  rec(3, '60m', '10', 'M', '10.0', '2026-10-22'),
];
const log = [];
const sent = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : {};
  const json = (status, obj) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });
  if (u.host === 'api.resend.com') { sent.push({ path: u.pathname, body, headers: opts.headers || {} }); return json(200, Array.isArray(body) ? { data: body.map(() => ({ id: 're' })) } : { id: 're' }); }
  if (u.pathname === '/v1/search') return json(200, { results: [] });
  if (u.pathname === '/v1/databases' && method === 'POST') return json(200, { id: 'results-log' });
  const q = u.pathname.match(/^\/v1\/databases\/([^/]+)\/query$/);
  if (q) return json(200, { results: norm(q[1]) === norm(MEMBERS_DB) ? members : norm(q[1]) === norm(RECORDS_DB) ? records : log, has_more: false });
  if (u.pathname === '/v1/pages' && method === 'POST') { log.push({ properties: { Family: { title: [{ plain_text: body.properties.Family.title[0].text.content }] } } }); return json(200, {}); }
  return json(404, { message: `unexpected ${method} ${u.pathname}` });
};

const { default: handler } = await import('../api/resultsemail.mjs');
const { default: auth } = await import('../api/auth.mjs');
function mockReq(method, url, body, headers = {}) {
  return { method, url, headers, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}
async function call(h, req) {
  const st = { code: 200, body: '', headers: {} };
  await h(req, { set statusCode(c) { st.code = c; }, get statusCode() { return st.code; }, setHeader(k, v) { st.headers[k.toLowerCase()] = v; }, end(d) { st.body = d; } });
  try { st.json = JSON.parse(st.body); } catch { st.json = null; }
  return st;
}
const results = [];
const check = (label, cond, detail = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && detail ? `  — ${detail}` : ''}`);
const login = await call(auth, mockReq('POST', '/api/auth', JSON.stringify({ passcode: 'test-pass-123' })));
const admin = { cookie: (login.headers['set-cookie'] || '').split(';')[0] };
const post = (b) => call(handler, mockReq('POST', '/api/resultsemail', JSON.stringify(b), admin));

check('public: refused', (await call(handler, mockReq('GET', '/api/resultsemail'))).code === 401);
const pre = await call(handler, mockReq('GET', '/api/resultsemail', null, admin));
check('preview: latest night by default, families with results only', pre.json.date === '2026-11-12' && pre.json.families === 2 && pre.json.athletes === 3 && pre.json.nights.length === 3, pre.body);
check('preview: counts the new club record', pre.json.records === 1);
check('preview: no address or code leaves the server', !/apple@|berry@|AAAA|BBBB/.test(pre.body));
check('send refuses until Resend is configured', (await post({ action: 'send', date: '2026-11-12' })).code === 400 && !sent.length);

process.env.RESEND_API_KEY = 're_fake';
process.env.EMAIL_FROM = 'Taupō Athletics <results@mail.example.org>';
const s1 = await post({ action: 'send', date: '2026-11-12', max: 50 });
const batch = sent.at(-1);
const apple = batch.body.find((e) => e.to[0] === 'apple@example.com');
check('send: one email per family with results', s1.json.sent === 2 && batch.body.length === 2 && batch.body.every((e) => e.to.length === 1));
check('send: siblings in one email, each with their own marks', /Mia and Leo/.test(apple.subject) && /Mia\n  100m: 15.2s — personal best!/.test(apple.text) && /Leo\n  Shot Put: 7.65m — NEW CLUB RECORD!/.test(apple.text), apple.text);
check('send: NJ shown kindly', /Long Jump: no measured jump this time/.test(apple.text));
check('send: "1:35:1" shown as 1:35.1', /400m: 1:35.1/.test(batch.body.find((e) => e.to[0] === 'berry@example.com').text));
check('send: link straight to My Results with the code', /https:\/\/club\.example\/my-results#code=AAAA2222/.test(apple.html));
check('send: idempotency key', /^results-2026-11-12-/.test(batch.headers['Idempotency-Key'] || ''));
const s2 = await post({ action: 'send', date: '2026-11-12', max: 50 });
check('send again: nobody emailed twice', s2.json.sent === 0 && sent.length === 1);
const other = await call(handler, mockReq('GET', '/api/resultsemail?date=2026-10-22', null, admin));
check('another night is tracked separately', other.json.families === 1 && other.json.waiting === 1);

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(failed.length ? `\n${failed.length} results-email check(s) failed` : `\nAll ${results.length} results-email checks passed.`);
process.exit(failed.length ? 1 : 0);
