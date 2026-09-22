// Smoke test api/records.mjs (GET + POST create), then archive the test row.
const TOKEN = process.env.NOTION_TOKEN;
const { default: handler } = await import('../api/records.mjs');

function makeRes() {
  const state = { code: 200, body: '' };
  return { res: { set statusCode(c) { state.code = c; }, get statusCode() { return state.code; }, setHeader() {}, end(d) { state.body = d; } }, state };
}
function mockReq(method, url, body) {
  return { method, url, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}

const g1 = makeRes();
await handler(mockReq('GET', '/api/records'), g1.res);
const d1 = JSON.parse(g1.state.body);
console.log(`GET -> ${g1.state.code}, members=${d1.members.length}, records=${d1.records.length}`);

const member = d1.members.find((m) => m.ageGroup === '7 to 14 Years Old') || d1.members[0];
console.log('Testing create for:', member.name);

const p1 = makeRes();
await handler(mockReq('POST', '/api/records', JSON.stringify({
  memberId: member.id, memberName: member.name, event: '60m', grade: '7', gender: 'F', date: '2026-10-15', result: '10.73', season: '2026-27',
})), p1.res);
const created = JSON.parse(p1.state.body);
console.log(`POST create -> ${p1.state.code}`, p1.state.body);

const g2 = makeRes();
await handler(mockReq('GET', '/api/records'), g2.res);
const d2 = JSON.parse(g2.state.body);
const found = d2.records.filter((r) => r.memberId === member.id);
console.log(`GET after create -> records=${d2.records.length}, member's records=${found.length}`);

// cleanup: archive the test row
if (created.id) {
  await fetch(`https://api.notion.com/v1/pages/${created.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived: true }),
  });
  console.log('archived test row', created.id);
}
