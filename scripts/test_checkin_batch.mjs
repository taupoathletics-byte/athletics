// Smoke test the public check-in batch endpoint WITHOUT writing to Notion:
// every name used is non-existent, so the handler only reads the member list.
const { default: handler } = await import('../api/checkin.mjs');

function makeRes() {
  const s = { code: 200, body: '' };
  return {
    res: {
      set statusCode(c) { s.code = c; },
      get statusCode() { return s.code; },
      setHeader() {},
      end(d) { s.body = d; },
    },
    s,
  };
}
function mockReq(method, url, body) {
  return { method, url, headers: { 'x-forwarded-for': '127.0.0.1' }, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}

async function post(payload) {
  const r = makeRes();
  await handler(mockReq('POST', '/api/checkin', JSON.stringify(payload)), r.res);
  return { code: r.s.code, body: JSON.parse(r.s.body || '{}') };
}

const DATE = '2026-10-15';

// 1. invalid date -> 400, no Notion call
let r = await post({ names: ['x'], date: 'nope' });
console.log('invalid date ->', r.code, r.body);

// 2. empty names -> 400
r = await post({ names: [], date: DATE });
console.log('empty names ->', r.code, r.body);

// 3. batch of non-existent names -> 200, created 0, notfound each
r = await post({ names: ['N0 Such Person One', 'N0 Such Person Two'], date: DATE });
console.log('batch ->', r.code, 'created', r.body.created, 'already', r.body.already);
console.log('  results:', JSON.stringify(r.body.results));

// 4. dedup -> one result for the same name repeated
r = await post({ names: ['N0 Such Person One', 'N0 Such Person One'], date: DATE });
console.log('dedup ->', r.code, 'results length', (r.body.results || []).length);

// 5. backward-compatible single name
r = await post({ name: 'N0 Such Person One', date: DATE });
console.log('single (name) ->', r.code, 'results length', (r.body.results || []).length);

console.log('\nSmoke test complete.');
