// Fix the three summary tables in place (patch cells, delete extra rows)
// and restore the "four rotations" summary as paragraph text.
const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}
const rt = (content) => [{ type: 'text', text: { content } }];
const cells = (arr) => arr.map((c) => rt(c));
const patchRow = (id, row) => api('PATCH', `/blocks/${id}`, { table_row: { cells: cells(row) } });
const patchText = (id, type, text) => api('PATCH', `/blocks/${id}`, { [type]: { rich_text: rt(text) } });
const del = (id) => api('DELETE', `/blocks/${id}`).catch(e => console.log('  skip delete', id, e.message));

// 1. four rotations summary (table was deleted earlier) -> paragraph
await patchText('4dcb24b2-9256-4acf-8a8f-79f4ddc1490c', 'paragraph',
  'The four rotations, in order, every series — Game: a movement game that doubles as the warm-up (parent-helper led) · Manipulative: throwing, catching, kicking or striking — one skill per series, spread evenly (coach led) · Fitness Circuit: an obstacle course with balance stations, different every series (parent-helper led) · Athletics: high jump, long jump, relays or hurdles (coach led).');
console.log('four-rotations paragraph updated');

// 2. nine-series table (11 rows -> 10 rows)
const nine = [
  ['1', '1–2 · 15 & 22 Oct', 'Finding our feet', 'Long jump'],
  ['2', '3–4 · 29 Oct & 5 Nov', 'Catch and jump', 'High jump'],
  ['3', '5–6 · 12 & 19 Nov', 'Throw it far', 'Hurdles'],
  ['4', '7–8 · 26 Nov & 3 Dec', 'Kick it up', 'Relays'],
  ['5', '9–10 · 10 & 17 Dec', 'Swing and hit', 'Long jump'],
  ['6', '11–12 · 4 & 11 Feb', 'Catch it again', 'High jump'],
  ['7', '13–14 · 18 & 25 Feb', 'Kick and chase', 'Hurdles'],
  ['8', '15–16 · 4 & 11 Mar', 'Strike again', 'Relays'],
  ['9', '17–18 · 18 & 25 Mar', 'Beat your best', 'Long jump'],
];
const nineIds = [
  '79de8300-a29a-45a2-9682-3af672ff0b33', '1ac9c022-16cc-4661-ba14-4cbae3280d2a',
  'b58b908a-3b7a-474a-b5c4-9357f55f3653', '833ace51-bba3-424e-85f2-6a6f664bc8f7',
  '8782b0b5-92c9-4ceb-9b82-cc79c2e2819b', '4474abac-ea6e-491a-b96d-894bc748b15b',
  '3e4d6831-fcee-4ed9-8e76-89ea19e8dd70', '65505d81-3eba-48a4-b3b8-45c563d13db9',
  '9121c67a-bcf6-40cf-bf8f-5d1b2cf876ed',
];
for (let i = 0; i < nine.length; i++) await patchRow(nineIds[i], nine[i]);
await del('ac27a902-6c8c-4487-9c9c-2d20afbb8998'); // old "Mini meet" row
console.log('nine-series table updated (10 rows)');

// 3. terms table (5 rows -> 3 rows)
await patchRow('2331c20e-53d2-4e71-a12f-872afe3f9bdc', ['Term', 'Dates', 'Series', 'What happens']);
await patchRow('e4c6557a-cf0d-4050-8abd-08fc3b70caab', ['Term 4 (2026)', 'Thu 15 Oct – 17 Dec', '1–5', 'Long jump, high jump, hurdles, relays']);
await patchRow('6286b0e2-0c77-48c7-8a86-42a3e56ad4c9', ['Term 1 (2027)', 'Thu 4 Feb – 1 Apr', '6–9 + mini meet', 'Builds to the mini meet + prizegiving on 1 Apr']);
await del('8a1644aa-93d2-46ad-9a37-dc8da590731a');
await del('b3900ec4-0be9-48a4-bb27-c350b1fa4114');
console.log('terms table updated (3 rows)');

// 4. event coverage table (10 rows -> 10 rows, same shape)
const cov = [
  ['Coverage', 'Series', 'Weeks'],
  ['Long jump', '1, 5, 9', '1–2, 9–10, 17–18'],
  ['High jump', '2, 6', '3–4, 11–12'],
  ['Hurdles', '3, 7', '5–6, 13–14'],
  ['Relays', '4, 8', '7–8, 15–16'],
  ['Throwing', '1, 3, 9', '1–2, 5–6, 17–18'],
  ['Catching', '2, 6', '3–4, 11–12'],
  ['Kicking', '4, 7', '7–8, 13–14'],
  ['Striking', '5, 8', '9–10, 15–16'],
  ['Fitness circuits', '1–9', 'all different'],
];
const covIds = [
  '9fac1b74-9fd1-47dd-a9e6-ad0d76afe3ef', '79a588be-4204-4b8f-ab85-15929180754b',
  '93a9a20b-387d-402f-bd96-33e6cecf7fe0', 'bc93ae1f-5505-4cc7-92bc-7a1e5ddf03bf',
  'da718bcb-8748-4a23-b3f9-8b6e0b9487cb', '4e87aacd-9997-4894-8a7d-c3a9498d945e',
  '482b06c2-4ce8-48bc-9014-067c0051937c', '43ad10a1-2255-4612-8c13-8f536c795890',
  '5713b9a6-165b-4f06-aec5-c3f9830671c3', '06462f1e-da11-4937-9cf5-a5ef2d0157f0',
];
for (let i = 0; i < cov.length; i++) await patchRow(covIds[i], cov[i]);
console.log('event coverage table updated');

console.log('\nDone.');
