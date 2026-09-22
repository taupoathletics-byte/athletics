// Local smoke test of api/attendance.mjs handler logic (GET + POST round-trip).
process.env.NOTION_TOKEN = process.env.NOTION_TOKEN;

const { default: handler } = await import('../api/attendance.mjs');

function makeRes() {
  const state = { code: 200, body: '' };
  return {
    res: {
      set statusCode(c) { state.code = c; },
      get statusCode() { return state.code; },
      setHeader() {},
      end(d) { state.body = d; },
    },
    state,
  };
}
function mockReq(method, url, body) {
  return {
    method, url,
    on(ev, cb) {
      if (ev === 'data' && body) cb(body);
      else if (ev === 'end') setTimeout(cb, 0);
    },
  };
}

const DATE = '2026-10-15';

// GET
const g1 = makeRes();
await handler(mockReq('GET', `/api/attendance?date=${DATE}`), g1.res);
const data = JSON.parse(g1.state.body);
console.log(`GET -> ${g1.state.code}, total members: ${data.total}`);
console.log('sample:', JSON.stringify(data.members[0]));

if (!data.members.length) { console.log('No members; aborting.'); process.exit(0); }

const m = data.members[0];

// POST markPresent
const p1 = makeRes();
await handler(mockReq('POST', '/api/attendance', JSON.stringify({ action: 'markPresent', memberId: m.id, name: m.name, date: DATE })), p1.res);
console.log(`markPresent -> ${p1.state.code} ${p1.state.body}`);

// GET again — should be present now
const g2 = makeRes();
await handler(mockReq('GET', `/api/attendance?date=${DATE}`), g2.res);
const d2 = JSON.parse(g2.state.body);
const m2 = d2.members.find((x) => x.id === m.id);
console.log(`after markPresent, ${m.name} present = ${m2.present}`);

// POST markAbsent
const p2 = makeRes();
await handler(mockReq('POST', '/api/attendance', JSON.stringify({ action: 'markAbsent', memberId: m.id, name: m.name, date: DATE })), p2.res);
console.log(`markAbsent -> ${p2.state.code} ${p2.state.body}`);

// GET — should be absent again
const g3 = makeRes();
await handler(mockReq('GET', `/api/attendance?date=${DATE}`), g3.res);
const d3 = JSON.parse(g3.state.body);
const m3 = d3.members.find((x) => x.id === m.id);
console.log(`after markAbsent, ${m.name} present = ${m3.present}`);
