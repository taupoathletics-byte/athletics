// Create the club's safety registers in Notion and print their IDs.
//
//   NOTION_TOKEN=secret_… node scripts/notion_safety_setup.mjs
//   NOTION_TOKEN=secret_… node scripts/notion_safety_setup.mjs --parent <page-id>
//
// The databases are created under the same page as the Members/Records boards
// by default. Share that page with the Notion integration first. Re-running is
// safe: an existing database with the same title is reused, not duplicated.
//
// Copy the three printed lines into Vercel (Settings → Environment Variables)
// and into your local .env.
const TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const DEFAULT_PARENT = '3e20d85f784c819ca575f22bfb38c49b';

const argParent = process.argv.indexOf('--parent');
const PARENT = argParent > -1 ? process.argv[argParent + 1] : process.env.NOTION_PARENT_PAGE_ID || DEFAULT_PARENT;

if (!TOKEN) {
  console.error('Set NOTION_TOKEN first (https://www.notion.so/my-integrations).');
  process.exit(1)
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json; try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(json.message || text).slice(0, 400)}`)
  return json
}

const opt = (names) => names.map((name) => ({ name }))

/** Reuse a database that already has this title under the parent page. */
async function findOrCreate(title, properties) {
  const found = await api('POST', '/search', { query: title, filter: { property: 'object', value: 'database' }, page_size: 50 })
  const match = found.results.find((db) => {
    const t = (db.title || []).map((x) => x.plain_text).join('')
    return t === title && (!db.parent || db.parent.page_id?.replace(/-/g, '') === PARENT.replace(/-/g, '') || db.parent.type === 'workspace')
  })
  if (match) {
    console.log(`Reusing  ${title}: ${match.id}`)
    return match
  }
  const created = await api('POST', '/databases', {
    parent: { page_id: PARENT },
    title: [{ text: { content: title } }],
    properties,
  })
  console.log(`Created  ${title}: ${created.id}`)
  return created
}

const incident = await findOrCreate('Incident Register (First Aid)', {
  Name: { title: {} },
  Date: { date: {} },
  Type: { select: { options: opt(['Injury', 'Illness', 'Environmental', 'Notifiable event', 'Other']) } },
  Status: { select: { options: opt(['Open', 'Closed']) } },
  Location: { rich_text: {} },
  'Injured person': { rich_text: {} },
  'Reported by': { rich_text: {} },
  Summary: { rich_text: {} },
})

const hazard = await findOrCreate('Hazard Register', {
  Name: { title: {} },
  Date: { date: {} },
  Location: { rich_text: {} },
  Hazard: { rich_text: {} },
  'Potential harm': { rich_text: {} },
  'Risk rating': { select: { options: opt(['Low', 'Medium', 'High']) } },
  Significant: { select: { options: opt(['Yes', 'No']) } },
  Controls: { rich_text: {} },
  'Person responsible': { rich_text: {} },
  'Action date': { date: {} },
  'Completed by': { rich_text: {} },
  Status: { select: { options: opt(['Open', 'Closed']) } },
})

const investigation = await findOrCreate('Accident Investigation', {
  Name: { title: {} },
  Date: { date: {} },
  Location: { rich_text: {} },
  'Injured person': { rich_text: {} },
  'Reported by': { rich_text: {} },
  Severity: { select: { options: opt(['Minor', 'Serious', 'Very serious']) } },
  Likelihood: { select: { options: opt(['Rare', 'Occasional', 'Frequent']) } },
  Status: { select: { options: opt(['Open', 'Closed']) } },
})

console.log(`
Add these to Vercel and .env:

INCIDENTS_DB_ID=${incident.id}
HAZARDS_DB_ID=${hazard.id}
INVESTIGATIONS_DB_ID=${investigation.id}
`)
