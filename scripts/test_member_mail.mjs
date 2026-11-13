// Offline checks for "Email Members" (api/membermail.mjs). Notion and Resend
// are faked, so this never sends a real email:
//
//   node scripts/test_member_mail.mjs
//
// Covers: admin only; audiences, groups and picked members resolve to unique
// addresses (siblings get one copy); one address per email; batches of 100
// with a resumable, idempotent offset; tagging only touches the Groups field;
// pasted HTML keeps its layout and gets the footer; the GET never returns a
// full address.
process.env.NOTION_TOKEN = 'fake-token';
process.env.ADMIN_PASSCODE = 'test-pass-123';
process.env.SESSION_SECRET = 'test-secret-abc';
process.env.ATHLETICS_PAGE_ID = 'athletics-page';

const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const norm = (id) => String(id).replace(/-/g, '').toLowerCase();
const txt = (s) => [{ plain_text: s, text: { content: s } }];
let n = 0;
const member = (first, last, email, type, groups = []) => ({
  id: `m-${++n}`,
  properties: {
    Name: { title: txt(`${first} ${last}`) },
    'First Name': { rich_text: txt(first) },
    'Last Name': { rich_text: txt(last) },
    'Member Type': { rich_text: txt(type) },
    Email: { rich_text: email ? txt(email) : [] },
    Groups: { multi_select: groups.map((name) => ({ name })) },
  },
});
const GSG = 'Active Member 6 Years and Under';
const JR = 'Active Member 7 to 14 Years';
const members = [
  member('Mia', 'Apple', 'Apple@Example.com', GSG),
  member('Leo', 'Apple', 'apple@example.com', JR, ['Development Squad']),
  member('Ana', 'Berry', 'berry@example.com', JR),
  member('Vic', 'Vol', 'vol@example.com', 'Club Volunteer'),
  member('Nia', 'Noemail', '', JR),
];
// 150 more families so a send needs two batches.
for (let i = 0; i < 150; i++) members.push(member(`Kid${i}`, `Fam${i}`, `fam${String(i).padStart(3, '0')}@example.com`, JR));

let hasGroupsProp = false;
const patches = [];
const logRows = [];
const optOuts = [];
const resendCalls = [];

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : {};
  const json = (status, obj) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });
  if (u.host === 'api.resend.com') {
    resendCalls.push({ path: u.pathname, body, headers: opts.headers || {} });
    return json(200, Array.isArray(body) ? { data: body.map((_, i) => ({ id: `re_${i}` })) } : { id: 're_one' });
  }
  if (u.pathname === `/v1/databases/${MEMBERS_DB}` && method === 'GET') return json(200, { properties: hasGroupsProp ? { Groups: {} } : {} });
  if (u.pathname === `/v1/databases/${MEMBERS_DB}` && method === 'PATCH') { hasGroupsProp = true; return json(200, {}); }
  if (u.pathname === '/v1/search') return json(200, { results: [] });
  if (u.pathname === '/v1/databases' && method === 'POST') return json(200, { id: body.title[0].text.content === 'Email opt-outs' ? 'optout-db' : 'log-db' });
  const q = u.pathname.match(/^\/v1\/databases\/([^/]+)\/query$/);
  if (q) return json(200, { results: norm(q[1]) === norm(MEMBERS_DB) ? members : q[1] === 'optout-db' ? optOuts : [], has_more: false });
  const pg = u.pathname.match(/^\/v1\/pages\/(.+)$/);
  if (pg && method === 'PATCH') {
    patches.push({ id: pg[1], props: Object.keys(body.properties) });
    const m = members.find((x) => x.id === pg[1]);
    m.properties.Groups = body.properties.Groups;
    return json(200, {});
  }
  if (u.pathname === '/v1/pages' && method === 'POST') {
    if (body.parent.database_id === 'optout-db') { optOuts.push({ id: `o-${optOuts.length}`, properties: { Address: { title: [{ plain_text: body.properties.Address.title[0].text.content }] } } }); return json(200, {}); }
    logRows.push(body); return json(200, { id: 'log-row' });
  }
  return json(404, { message: `unexpected ${method} ${u.pathname}` });
};

const { default: handler, recipients, toMember, compose } = await import('../api/membermail.mjs');
const { default: auth } = await import('../api/auth.mjs');

function mockReq(method, url, body, headers = {}) {
  return { method, url, headers, on(ev, cb) { if (ev === 'data' && body) cb(body); else if (ev === 'end') setTimeout(cb, 0); } };
}
async function call(req) {
  const state = { code: 200, body: '', headers: {} };
  await (req.url.startsWith('/api/auth') ? auth : handler)(req, {
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
const admin = { cookie: (login.headers['set-cookie'] || '').split(';')[0] };
const post = (obj) => call(mockReq('POST', '/api/membermail', JSON.stringify(obj), admin));
const msg = { subject: 'Club night cancelled', format: 'text', category: 'notice', body: 'Kia ora,\n\nNo club night tonight — see https://example.org/news.' };

check('public: GET refused', (await call(mockReq('GET', '/api/membermail'))).code === 401);
check('public: send refused', (await call(mockReq('POST', '/api/membermail', JSON.stringify({ action: 'send' })))).code === 401 && resendCalls.length === 0);

// Audiences
const ms = members.map(toMember);
check('everyone: siblings share one address; no-email members skipped', recipients(ms, { types: ['everyone'] }).length === 153);
check('Get Set Go families only', recipients(ms, { types: ['getsetgo'] }).join() === 'apple@example.com');
check('volunteers & committee', recipients(ms, { types: ['helpers'] }).join() === 'vol@example.com');
check('a group', recipients(ms, { groups: ['Development Squad'] }).join() === 'apple@example.com');
check('picked members + group de-duplicate', recipients(ms, { groups: ['Development Squad'], members: [members[0].id, members[2].id] }).join() === 'apple@example.com,berry@example.com');

// GET
const got = await call(mockReq('GET', '/api/membermail', null, admin));
check('GET: members, groups and audience counts', got.code === 200 && got.json.members.length === 155 && got.json.groups[0]?.name === 'Development Squad' && got.json.audiences.find((a) => a.key === 'getsetgo').count === 1, got.body.slice(0, 200));
check('GET: no full email address leaves the server', !/apple@example|berry@example|fam\d{3}@example/.test(got.body));

// Not configured
const early = await post({ action: 'send', campaignId: 'abcdefgh1', offset: 0, audience: { types: ['everyone'] }, ...msg });
check('send refuses until Resend is configured', early.code === 400 && resendCalls.length === 0);
process.env.RESEND_API_KEY = 're_fake';
process.env.EMAIL_FROM = 'Taupō Athletics <news@mail.example.org>';

// Validation
check('send needs a subject', (await post({ action: 'send', campaignId: 'abcdefgh1', audience: { types: ['everyone'] }, ...msg, subject: ' ' })).code === 400);
check('test rejects two addresses', (await post({ action: 'test', to: 'a@b.co, c@d.co', ...msg })).code === 400);

// Test send
const t = await post({ action: 'test', to: 'me@example.org', ...msg });
check('test: one email, marked [TEST]', t.code === 200 && resendCalls.at(-1).body.to[0] === 'me@example.org' && /^\[TEST\]/.test(resendCalls.at(-1).body.subject));

// Full send, two batches
const audience = { types: ['everyone'] };
const first = await post({ action: 'send', campaignId: 'camp-12345', offset: 0, audience, ...msg });
const b1 = resendCalls.at(-1);
check('send: first batch is 100 single-address emails', first.json.sent === 100 && first.json.total === 153 && b1.body.length === 100 && b1.body.every((e) => e.to.length === 1));
check('send: idempotency key per campaign + offset', b1.headers['Idempotency-Key'] === 'member-mail-camp-12345-0');
check('send: campaign logged once, without addresses', logRows.length === 1 && !/@/.test(JSON.stringify(logRows[0])) && logRows[0].properties.Recipients.number === 153);
const second = await post({ action: 'send', campaignId: 'camp-12345', offset: first.json.next, audience, ...msg });
const b2 = resendCalls.at(-1);
const all = [...b1.body, ...b2.body].map((e) => e.to[0]);
check('send: second batch finishes, nobody twice', second.json.sent === 53 && second.json.next === 153 && new Set(all).size === 153 && logRows.length === 1);
const done = await post({ action: 'send', campaignId: 'camp-12345', offset: 153, audience, ...msg });
check('send: past the end sends nothing', done.json.sent === 0 && resendCalls.at(-1) === b2);
check('plain text: club layout, clickable link, footer', /<a href="https:\/\/example\.org\/news"/.test(b1.body[0].html) && /member of Taupō Athletics/.test(b1.body[0].text) && b1.body[0].reply_to === 'taupoathletics@gmail.com');

// Pasted HTML
const pasted = compose({ subject: 'Newsletter', format: 'html', body: '<html><body><h1>Term 4 news</h1><p>Hello <a href="https://x.org">x</a></p></body></html>' });
check('HTML: kept as pasted, footer inside <body>', /^<html><body><h1>Term 4 news/.test(pasted.html) && /member of Taupō Athletics[^]*<\/body>/.test(pasted.html));
check('HTML: plain-text part made from it', /Term 4 news/.test(pasted.text) && /x \(https:\/\/x\.org\)/.test(pasted.text) && !/<p>/.test(pasted.text));

// Newsletters: unsubscribe link per reader, and opted-out readers are skipped
process.env.SITE_URL = 'https://club.example';
const { default: unsubscribe } = await import('../api/unsubscribe.mjs');
const news = { ...msg, category: 'newsletter', subject: 'Term 4 newsletter' };
const n1 = await post({ action: 'send', campaignId: 'news-0001', offset: 0, audience: { types: ['juniors'] }, ...news });
const nb = resendCalls.at(-1);
const berryMail = nb.body.find((e) => e.to[0] === 'berry@example.com');
const link = (berryMail.html.match(/href="(https:\/\/club\.example\/unsubscribe\?[^"]+)"/) || [])[1];
check('newsletter: each email has its own unsubscribe link and one-click header', !!link && /One-Click/.test(berryMail.headers['List-Unsubscribe-Post']) && berryMail.headers['List-Unsubscribe'].includes('/api/unsubscribe?'));
check('club notice: no unsubscribe link', !/unsubscribe\?/.test(b1.body[0].html) && /club notice/.test(b1.body[0].text));
const params = new URL(link.replace(/&amp;/g, '&')).searchParams;
const unsubCall = (body) => new Promise((resolve) => { const st = { code: 200, body: '', headers: {} }; unsubscribe(mockReq('POST', '/api/unsubscribe', JSON.stringify(body)), { set statusCode(c) { st.code = c; }, get statusCode() { return st.code; }, setHeader() {}, end(d) { st.body = d; resolve(st); } }); });
const bad = await unsubCall({ e: params.get('e'), t: '0'.repeat(32) });
check('unsubscribe: a forged token is refused', bad.code === 400 && optOuts.length === 0);
const good = await unsubCall({ e: params.get('e'), t: params.get('t') });
check('unsubscribe: the signed link works, storing a hash not the address', good.code === 200 && optOuts.length === 1 && !/@/.test(JSON.stringify(optOuts)));
const cnt = await post({ action: 'count', audience: { types: ['juniors'] }, category: 'newsletter' });
check('newsletter count skips the unsubscribed address', cnt.json.unsubscribed === 1 && cnt.json.recipients === n1.json.total - 1);
const notice = await post({ action: 'count', audience: { types: ['juniors'] }, category: 'notice' });
check('club notices still reach them', notice.json.recipients === n1.json.total);

// Groups
const tag = await post({ action: 'tag', group: 'Relay Team', add: [members[2].id, members[5].id, 'not-a-member'] });
check('tag: adds the Groups field once, then tags only real members', tag.json.changed === 2 && hasGroupsProp && patches.every((p) => p.props.join() === 'Groups'));
const again = await post({ action: 'tag', group: 'Relay Team', add: [members[2].id] });
check('tag: adding twice changes nothing', again.json.changed === 0);
const ren = await post({ action: 'rename-group', from: 'Relay Team', to: 'Relay Squad' });
check('rename group', ren.json.changed === 2 && toMember(members[2]).groups.includes('Relay Squad') && !toMember(members[2]).groups.includes('Relay Team'));
const del = await post({ action: 'delete-group', group: 'Relay Squad' });
check('delete group keeps members, drops the tag', del.json.changed === 2 && !toMember(members[5]).groups.length && members.length === 155);
check('Development Squad tag untouched by the other group changes', toMember(members[1]).groups.join() === 'Development Squad');

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(failed.length ? `\n${failed.length} member-mail check(s) failed` : `\nAll ${results.length} member-mail checks passed.`);
process.exit(failed.length ? 1 : 0);
