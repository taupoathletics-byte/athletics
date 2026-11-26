// Fix the blended McHale / Webb / Lempriere family in the Notion Members DB.
//
// These four children share the email erinlempriere@gmail.com but carry three
// different surnames, and the previous CSV import tagged them all as
// "Committee Member" (the parent's committee product) instead of their athlete
// type — so they were invisible to check-in and the attendance desk.
//
// This script:
//   1. adds an "Aliases" (rich_text) property to the Members DB (once),
//   2. corrects each child's Member Type to their athlete type,
//   3. writes the family's other surnames into "Aliases" so a search for any of
//      McHale / Mc-Hale / Webb / Lempriere / Lempriere-McMcHale finds them all.
//
// Usage:
//   NOTION_TOKEN=... node scripts/notion_fix_family.mjs
const TOKEN = process.env.NOTION_TOKEN
if (!TOKEN) {
  console.error('NOTION_TOKEN is not set.')
  process.exit(1)
}
const BASE = 'https://api.notion.com/v1'
const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function api(method, path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429) { await sleep(900 * (attempt + 1)); continue }
    const text = await res.text()
    let json; try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(json.message || text).slice(0, 300)}`)
    return json
  }
  throw new Error('429 retries exhausted')
}
async function queryAll(dbId) {
  const out = []
  let cursor
  do {
    const body = { page_size: 100 }
    if (cursor) body.start_cursor = cursor
    const r = await api('POST', `/databases/${dbId}/query`, body)
    out.push(...r.results)
    cursor = r.has_more ? r.next_cursor : undefined
  } while (cursor)
  return out
}
const titleOf = (p) => (p.title || []).map((t) => t.plain_text).join('')

// The family's searchable surnames (their own plus each other's).
const ALIASES = 'McHale Mc-Hale Webb Lempriere Lempriere-McMcHale'

// name -> correct athlete Member Type (from the GameDay CSV).
const FIXES = {
  'Gareth McHale': 'Active Member 7 to 14 Years',
  'Georgia Lempriere-Webb': 'Active Member 7 to 14 Years',
  'Leon Lempriere-Webb': 'Active Member 7 to 14 Years',
  'Breea Lempriere-McMcHale': 'Active Member 6 Years and Under',
}

// 1. ensure the "Aliases" property exists
const db = await api('GET', `/databases/${MEMBERS_DB}`)
if (!db.properties.Aliases) {
  await api('PATCH', `/databases/${MEMBERS_DB}`, { properties: { Aliases: { rich_text: {} } } })
  console.log('Added "Aliases" (rich_text) property to Members DB.')
} else {
  console.log('"Aliases" property already present.')
}

// 2. find the family members by exact name and patch them
const rows = await queryAll(MEMBERS_DB)
const byName = new Map(rows.map((r) => [titleOf(r.properties.Name), r.id]))
const want = new Set(Object.keys(FIXES))

let fixed = 0
for (const name of Object.keys(FIXES)) {
  if (!byName.has(name)) {
    console.log(`  MISSING in Notion: ${name} (skipped — add it first with notion_add_new_members.mjs)`)
    continue
  }
  await api('PATCH', `/pages/${byName.get(name)}`, {
    properties: {
      'Member Type': { rich_text: [{ type: 'text', text: { content: FIXES[name] } }] },
      Aliases: { rich_text: [{ type: 'text', text: { content: ALIASES } }] },
    },
  })
  fixed++
  console.log(`  fixed ${name} -> ${FIXES[name]}`)
  await sleep(230)
}

// 3. report any family members not in the fix map (sanity check)
const leftover = rows.filter((r) => /lempriere|mc.?hale|webb/i.test(titleOf(r.properties.Name)) && !want.has(titleOf(r.properties.Name)))
if (leftover.length) console.log('Other family-like members left unchanged:', leftover.map((r) => titleOf(r.properties.Name)).join(', '))

console.log(`\nDone. Fixed ${fixed}/${Object.keys(FIXES).length} family members.`)
