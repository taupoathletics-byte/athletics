// Smoke test the check-in (bulk) action of api/attendance.mjs.
const { default: handler } = await import('../api/attendance.mjs');

function makeRes() {
  const state = { code: 200, body: '' };
  return { res: { set statusCode(c) { state.code = c; }, get statusCode() { return state.code; }, setHeader() {}, end(d) { state.body = d; } }, state };
}
function mockReq(method, url, body) {
  return { method, url, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}

const DATE = '2026-10-15';

const g1 = makeRes();
await handler(mockReq('GET', `/api/attendance?date=${DATE}`), g1.res);
const list = JSON.parse(g1.state.body).members.filter((m) => !m.present);
if (list.length < 2) { console.log('Not enough members to test; abort.'); process.exit(0); }
const pick = list.slice(0, 2);
console.log('Testing check-in for:', pick.map((m) => m.name).join(', '));

const p1 = makeRes();
await handler(mockReq('POST', '/api/attendance', JSON.stringify({ action: 'checkin', date: DATE, members: pick })), p1.res);
console.log('checkin ->', p1.state.code, p1.state.body);

const g2 = makeRes();
await handler(mockReq('GET', `/api/attendance?date=${DATE}`), g2.res);
const now = JSON.parse(g2.state.body).members.filter((m) => pick.some((p) => p.id === m.id));
console.log('present after checkin:', now.map((m) => `${m.name}=${m.present}`).join(', '));

// duplicate check-in should skip
const p2 = makeRes();
await handler(mockReq('POST', '/api/attendance', JSON.stringify({ action: 'checkin', date: DATE, members: pick })), p2.res);
console.log('checkin again (should skip) ->', p2.state.code, p2.state.body);

// cleanup
for (const m of pick) {
  const c = makeRes();
  await handler(mockReq('POST', '/api/attendance', JSON.stringify({ action: 'markAbsent', memberId: m.id, name: m.name, date: DATE })), c.res);
}
console.log('cleaned up');
