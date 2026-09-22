// Create the Notion "Club Records" database linked to Members.
const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const PAGE_ID = '3e20d85f784c819ca575f22bfb38c49b';
const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let j; try { j = text ? JSON.parse(text) : {}; } catch { j = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(j.message || text).slice(0, 400)}`);
  return j;
}
const opt = (names) => names.map((name) => ({ name }));

const db = await api('POST', '/databases', {
  parent: { page_id: PAGE_ID },
  title: [{ text: { content: 'Club Records' } }],
  properties: {
    Name: { title: {} },
    Member: {
      relation: {
        database_id: MEMBERS_DB,
        type: 'dual_property',
        dual_property: { synced_property_name: 'Records' },
      },
    },
    Event: { select: { options: opt(['60m', '100m', '200m', '400m', '800m', '1500m', 'Long Jump', 'High Jump', 'Shot Put', 'Discus']) } },
    Grade: { select: { options: opt(['7', '8', '9', '10', '11', '12', '13', '14']) } },
    Gender: { select: { options: opt(['F', 'M']) } },
    Date: { date: {} },
    Result: { rich_text: {} },
    Season: { select: { options: opt(['2024-25', '2025-26', '2026-27']) } },
  },
});
console.log('Club Records DB created:', db.id);
console.log(`CLUB_RECORDS_DB_ID=${db.id}`);
