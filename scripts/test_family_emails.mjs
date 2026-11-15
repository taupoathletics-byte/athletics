// Offline checks for "Email codes to families" (api/familyemails.mjs).
// Notion and Resend are both faked, so this never sends a real email:
//
//   node scripts/test_family_emails.mjs
//
// Covers: one email per family (siblings share it), only athletes are emailed,
// a second Send skips families already emailed, the batch is idempotent, the
// preview keeps addresses and codes on the server, admins only, and a test
// send never carries a real family's code.
process.env.NOTION_TOKEN = 'fake-token';
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';
process.env.ATHLETICS_PAGE_ID = 'athletics-page';
process.env.SITE_URL = 'https://club.example';

const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const norm = (id) => String(id).replace(/-/g, '').toLowerCase();
const txt = (s) => [{ plain_text: s, text: { content: s } }];
let n = 0;
const member = (first, last, email, code, type = 'Active Member 7 to 14 Years') => ({
  id: `m-${++n}`,
  properties: {
    Name: { title: txt(`${first} ${last}`) },
    'First Name': { rich_text: txt(first) },
    'Member Type': { rich_text: txt(type) },
    Email: { rich_text: email ? txt(email) : [] },
    'Access code': { rich_text: code ? txt(code) : [] },
  },
});
const members = [
  member('Mia', 'Apple', 'Parent.Apple@Example.com', 'AAAA2222'),
  member('Leo', 'Apple', 'parent.apple@example.com ', 'AAAA2222', 'Active Member 6 Years and Under'),
  member('Ana', 'Berry', 'berry@example.com', 'BBBB3333'),
  member('Pat', 'Apple', 'parent.apple@example.com', 'AAAA2222', 'Club Volunteer'),
  member('Vic', 'Vol', 'volunteer@example.com', 'VVVV4444', 'Committee Member'),
  member('Nia', 'Noemail', '', 'NNNN5555'),
  member('Kit', 'Cherry', 'cherry@example.com', 'CCCC6666'),
];

let logDb = null;
const logRows = [];
const resendCalls = [];

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : {};
  const json = (status, obj) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });
  if (u.host === 'api.resend.com') {
    resendCalls.push({ path: u.pathname, body, headers: opts.headers || {} });
    if (u.pathname === '/emails/batch') return json(200, { data: body.map((_, i) => ({ id: `re_${resendCalls.length}_${i}` })) });
    return json(200, { id: 're_single' });
  }
  if (u.pathname === '/v1/search') return json(200, { results: logDb ? [{ id: logDb, title: txt('Access code emails') }] : [] });
  if (u.pathname === '/v1/databases' && method === 'POST') {
    logDb = 'log-db';
    return json(200, { id: logDb, parent: body.parent });
  }
  const q = u.pathname.match(/^\/v1\/databases\/([^/]+)\/query$/);
  if (q) return json(200, { results: norm(q[1]) === norm(MEMBERS_DB) ? members : logRows, has_more: false });
  if (u.pathname === '/v1/pages' && method === 'POST') {
    if (body.parent?.database_id !== logDb) return json(400, { message: 'wrote somewhere other than the log' });
    logRows.push({ properties: { Family: { title: body.properties.Family.title.map((t) => ({ plain_text: t.text.content })) } } });
    return json(200, { id: `log-${logRows.length}` });
  }
  return json(404, { message: `unexpected ${method} ${u.pathname}` });
};

const { default: handler, families } = await import('../api/familyemails.mjs');
const { default: auth } = await import('../api/auth.mjs');

function mockReq(method, url, body, headers = {}) {
  return { method, url, headers, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}
async function call(req) {
  const state = { code: 200, body: '', headers: {} };
  const h = req.url.startsWith('/api/auth') ? auth : handler;
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

const login = await call(mockReq('POST', '/api/auth', JSON.stringify({ passcode: 'test-pass-123' })));
const admin = { cookie: (login.headers['set-cookie'] || '').split(';')[0], host: 'club.example' };
const post = (obj) => call(mockReq('POST', '/api/familyemails', JSON.stringify(obj), admin));

// Grouping
const { list, skipped } = families(members);
check('families: siblings share one email (case and spaces ignored)', list.length === 3 && list.find((f) => f.code === 'AAAA2222')?.children.join() === 'Leo,Mia', JSON.stringify(list.map((f) => [f.code, f.children])));
check('families: volunteers and committee are not emailed', !list.some((f) => f.code === 'VVVV4444') && !list.find((f) => f.code === 'AAAA2222').children.includes('Pat'));
check('families: an athlete with no email is counted, not sent', skipped.noEmail === 1);

// Admin only
const anon = await call(mockReq('GET', '/api/familyemails'));
check('public: refused without an admin session', anon.code === 401);
const anonPost = await call(mockReq('POST', '/api/familyemails', JSON.stringify({ action: 'send' })));
check('public: cannot send', anonPost.code === 401 && resendCalls.length === 0);

// Not configured yet
const early = await post({ action: 'send' });
check('send refuses until Resend is configured', early.code === 400 && /RESEND_API_KEY/.test(early.json.error) && resendCalls.length === 0);

process.env.RESEND_API_KEY = 're_fake';
process.env.EMAIL_FROM = 'Taupō Athletics <results@mail.example.org>';

// Preview
const pre = await call(mockReq('GET', '/api/familyemails', null, admin));
check('preview: counts families and athletes', pre.code === 200 && pre.json.families === 3 && pre.json.children === 4 && pre.json.waiting === 3, pre.body);
check('preview: no full address or real code leaves the server', !/parent\.apple@|berry@|cherry@|AAAA|BBBB|CCCC/i.test(pre.body), pre.body);

// Test send
const t = await post({ action: 'test', to: 'admin@example.org' });
const testMail = resendCalls.at(-1);
check('test: sends one email to the given address', t.code === 200 && testMail.path === '/emails' && testMail.body.to[0] === 'admin@example.org');
check('test: carries a made-up code, never a family\'s', /ABCD 2345/.test(testMail.body.text) && !/AAAA|BBBB|CCCC/.test(testMail.body.text));
const badTest = await post({ action: 'test', to: 'a@b.com, c@d.com' });
check('test: rejects more than one address', badTest.code === 400);

// Send in two goes
const first = await post({ action: 'send', max: 2 });
const batch1 = resendCalls.at(-1);
check('send: first batch sends 2, leaves 1 waiting', first.code === 200 && first.json.sent === 2 && first.json.waiting === 1, first.body);
check('send: uses the batch endpoint with an idempotency key', batch1.path === '/emails/batch' && /^family-codes-[0-9a-f]+$/.test(batch1.headers['Idempotency-Key'] || ''));
const second = await post({ action: 'send', max: 50 });
const batch2 = resendCalls.at(-1);
const appleMail = [...batch1.body, ...batch2.body].find((m) => m.to[0] === 'parent.apple@example.com');
check('send: the family email lists every child and their one code', appleMail && /Leo and Mia/.test(appleMail.text) && /AAAA 2222/.test(appleMail.text));
check('send: link opens My Results with the code after "#"', /https:\/\/club\.example\/my-results#code=AAAA2222/.test(appleMail.html));
check('send: replies go to the club address', appleMail.reply_to === 'secretary@taupoathletics.org.nz');
check('send: log created under the Athletics page, no addresses stored', logDb && logRows.length === 3 && !logRows.some((r) => /@/.test(r.properties.Family.title[0].plain_text)));

check('send again: only the family still waiting is emailed', second.json.sent === 1 && batch2.body.length === 1 && !batch1.body.some((m) => m.to[0] === batch2.body[0].to[0]), second.body);
const third = await post({ action: 'send', max: 50 });
check('send a third time: nobody is emailed twice', third.json.sent === 0 && resendCalls.at(-1) === batch2);
const after = await call(mockReq('GET', '/api/familyemails', null, admin));
check('preview after: all sent, none waiting', after.json.sent === 3 && after.json.waiting === 0);

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(failed.length ? `\n${failed.length} family-email check(s) failed` : `\nAll ${results.length} family-email checks passed.`);
process.exit(failed.length ? 1 : 0);
