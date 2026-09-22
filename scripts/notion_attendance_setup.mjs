// Create the Notion Members + Attendance databases for club-night sign-in.
const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const PAGE_ID = '3e20d85f784c819ca575f22bfb38c49b';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(json.message || text).slice(0, 400)}`);
  return json;
}

// 1. Members database
const members = await api('POST', '/databases', {
  parent: { page_id: PAGE_ID },
  title: [{ text: { content: 'Get Set Go — Members' } }],
  properties: {
    Name: { title: {} },
    'First Name': { rich_text: {} },
    'Last Name': { rich_text: {} },
    'Age Group': { select: {} },
    'Birth Date': { date: {} },
    Mobile: { rich_text: {} },
    Email: { rich_text: {} },
    'Member Type': { rich_text: {} },
    Status: { select: {} },
  },
});
console.log('Members DB created:', members.id);

// 2. Attendance database (relation -> Members, dual)
const attendance = await api('POST', '/databases', {
  parent: { page_id: PAGE_ID },
  title: [{ text: { content: 'Get Set Go — Attendance' } }],
  properties: {
    Name: { title: {} },
    Member: {
      relation: {
        database_id: members.id,
        type: 'dual_property',
        dual_property: { synced_property_name: 'Attendance' },
      },
    },
    Date: { date: {} },
  },
});
console.log('Attendance DB created:', attendance.id);

// 3. Rollup on Members: nights attended = count of Attendance
await api('PATCH', `/databases/${members.id}`, {
  properties: {
    'Nights attended': {
      rollup: {
        relation_property_name: 'Attendance',
        rollup_property_name: 'Name',
        function: 'count',
      },
    },
  },
});
console.log('Rollup "Nights attended" added to Members');

console.log(`\nMEMBERS_DB_ID=${members.id}\nATTENDANCE_DB_ID=${attendance.id}`);
