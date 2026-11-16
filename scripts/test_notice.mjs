// Offline checks for the club-night notice (api/notice.mjs). Notion is faked.
//
//   node scripts/test_notice.mjs
process.env.NOTION_TOKEN = 'fake-token';
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';

let rows = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : {};
  const json = (status, obj) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });
  if (u.pathname === '/v1/search') return json(200, { results: [] });
  if (u.pathname === '/v1/databases' && method === 'POST') return json(200, { id: 'notice-db' });
  if (u.pathname === '/v1/databases/notice-db/query') return json(200, { results: rows.filter((r) => !r.archived), has_more: false });
  if (u.pathname === '/v1/pages' && method === 'POST') {
    rows.push({ id: `n${rows.length}`, properties: { Message: { title: [{ plain_text: body.properties.Message.title[0].text.content }] }, Date: body.properties.Date, Type: { rich_text: [{ plain_text: 'cancelled' }] } } });
    return json(200, {});
  }
  const p = u.pathname.match(/^\/v1\/pages\/(.+)$/);
  if (p && method === 'PATCH') { const r = rows.find((x) => x.id === p[1]); if (r && body.archived) r.archived = true; return json(200, {}); }
  return json(404, { message: `unexpected ${method} ${u.pathname}` });
};

const { default: notice } = await import('../api/_notice.mjs');
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
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });

check('no notice: public sees none', (await call(notice, mockReq('GET', '/api/notice'))).json.notice === null);
check('public cannot post a notice', (await call(notice, mockReq('POST', '/api/notice', JSON.stringify({ action: 'set', message: 'x' })))).code === 401 && rows.length === 0);
check('public cannot read another date', (await call(notice, mockReq('GET', '/api/notice?date=2027-02-04'))).code === 401);
const set = await call(notice, mockReq('POST', '/api/notice', JSON.stringify({ action: 'set', message: '  Club night is cancelled tonight. ' }), admin));
check('admin posts today\'s cancellation', set.code === 200 && set.json.date === today);
const pub = await call(notice, mockReq('GET', '/api/notice'));
check('public sees it, cached briefly', pub.json.notice?.message === 'Club night is cancelled tonight.' && /s-maxage=60/.test(pub.headers['cache-control']));
await call(notice, mockReq('POST', '/api/notice', JSON.stringify({ action: 'set', message: 'Updated message' }), admin));
check('posting again replaces it (one notice per night)', rows.filter((r) => !r.archived).length === 1 && (await call(notice, mockReq('GET', '/api/notice'))).json.notice.message === 'Updated message');
await call(notice, mockReq('POST', '/api/notice', JSON.stringify({ action: 'set', date: '2027-02-04', message: 'Future night off' }), admin));
check('a future night\'s notice is not shown today', (await call(notice, mockReq('GET', '/api/notice'))).json.notice.message === 'Updated message');
check('admin can read a future night', (await call(notice, mockReq('GET', '/api/notice?date=2027-02-04', null, admin))).json.notice.message === 'Future night off');
await call(notice, mockReq('POST', '/api/notice', JSON.stringify({ action: 'clear' }), admin));
check('clear takes it down', (await call(notice, mockReq('GET', '/api/notice'))).json.notice === null);
check('bad date refused', (await call(notice, mockReq('POST', '/api/notice', JSON.stringify({ action: 'set', date: '4/2/27', message: 'x' }), admin))).code === 400);

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(failed.length ? `\n${failed.length} notice check(s) failed` : `\nAll ${results.length} notice checks passed.`);
process.exit(failed.length ? 1 : 0);
