// Verify Phase 0: guarded routes return 401 without a session cookie,
// GET /api/records stays public, and a correct passcode issues a cookie.
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';
if (!process.env.NOTION_TOKEN) process.env.NOTION_TOKEN = 'dummy';

const { default: attendance } = await import('../api/attendance.mjs');
const { default: records } = await import('../api/records.mjs');
const { default: auth } = await import('../api/auth.mjs');

function makeRes() {
  const state = { code: 200, body: '', headers: {} };
  return {
    res: {
      set statusCode(c) { state.code = c; },
      get statusCode() { return state.code; },
      setHeader(k, v) { state.headers[k.toLowerCase()] = v; },
      end(d) { state.body = d; },
    },
    state,
  };
}
function mockReq(method, url, body, headers = {}) {
  return { method, url, headers, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}
const call = async (handler, req) => { const m = makeRes(); await handler(req, m.res); return m.state; };

const results = [];
function check(label, actual, expected) {
  results.push(`${actual === expected ? 'PASS' : 'FAIL'}  ${label} (got ${actual}, want ${expected})`);
}

// 1-3: guarded routes reject without a cookie
check('GET  /api/attendance (no cookie)', (await call(attendance, mockReq('GET', '/api/attendance?date=2026-10-15'))).code, 401);
check('POST /api/attendance (no cookie)', (await call(attendance, mockReq('POST', '/api/attendance', JSON.stringify({ action: 'checkin', date: '2026-10-15', members: [{ id: 'x', name: 'x' }] })))).code, 401);
check('POST /api/records    (no cookie)', (await call(records, mockReq('POST', '/api/records', JSON.stringify({ memberId: 'x', event: '60m', result: '10.0' })))).code, 401);

// 4: records GET stays public
const recGet = await call(records, mockReq('GET', '/api/records'));
check('GET  /api/records    (public)', recGet.code, 200);

// 5: wrong passcode
check('POST /api/auth (wrong passcode)', (await call(auth, mockReq('POST', '/api/auth', JSON.stringify({ passcode: 'nope' })))).code, 401);

// 6: correct passcode issues a cookie
const ok = await call(auth, mockReq('POST', '/api/auth', JSON.stringify({ passcode: 'test-pass-123' })));
check('POST /api/auth (correct passcode)', ok.code, 200);
const cookie = (ok.headers['set-cookie'] || '').split(';')[0];

// 7: the cookie is accepted by a guarded route
const authed = await call(attendance, mockReq('GET', '/api/attendance?date=2026-10-15', null, { cookie }));
results.push(`${authed.code !== 401 ? 'PASS' : 'FAIL'}  GET  /api/attendance (with cookie) (got ${authed.code}, want not-401)`);

console.log(results.join('\n'));
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nAll checks passed');
