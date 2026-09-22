// Upsert members from the GameDay registration CSV into the Notion Members DB.
//
// Idempotent: matches existing members by full name and PATCHes their details,
// and POSTs only members that are new. Members already in Notion but absent from
// the CSV are left untouched (so attendance history survives) and reported.
//
// Usage:
//   NOTION_TOKEN=... node scripts/notion_sync_members.mjs [path-to.csv]
import { readFileSync } from 'node:fs'

const TOKEN = process.env.NOTION_TOKEN
if (!TOKEN) {
  console.error('NOTION_TOKEN is not set.')
  process.exit(1)
}
const BASE = 'https://api.notion.com/v1'
const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b'
const CSV_PATH = process.argv[2] || 'C:\\Users\\grant\\Downloads\\membersBySeason.csv'

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

function parseCSV(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function toIsoDate(d) {
  const s = (d || '').trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const rt = (c) => (c ? [{ type: 'text', text: { content: c } }] : [])
const titleOf = (p) => (p.title || []).map((t) => t.plain_text).join('')

// ---- 1. parse + dedupe CSV (one row per member: NZ/Taupo/WBOP products) ----
const rows = parseCSV(readFileSync(CSV_PATH, 'utf8'))
const header = rows[0]
const idx = (n) => header.indexOf(n)
const get = (row, n) => (idx(n) >= 0 ? (row[idx(n)] || '').trim() : '')

const csv = new Map()
for (const r of rows.slice(1)) {
  const name = get(r, 'Name')
  if (!name || csv.has(name)) continue
  csv.set(name, {
    first: get(r, 'First Name'),
    last: get(r, 'Last Name'),
    ageGroup: get(r, 'Age Group'),
    birthDate: toIsoDate(get(r, 'Birth Date')),
    mobile: get(r, 'Mobile'),
    email: get(r, 'Email'),
    memberType: get(r, 'Member Type'),
    status: get(r, 'Status'),
    gender: get(r, 'Gender At Birth'),
  })
}

// ---- 2. existing members + select options ----
const [dbSchema] = await Promise.all([
  api('GET', `/databases/${MEMBERS_DB}`),
])
const ageOptions = (dbSchema.properties['Age Group']?.select?.options || []).map((o) => o.name)
const genderOptions = (dbSchema.properties['Gender']?.select?.options || []).map((o) => o.name)

const existing = new Map() // name -> page id
{
  let cursor
  do {
    const q = await api('POST', `/databases/${MEMBERS_DB}/query`, { page_size: 100, start_cursor: cursor })
    for (const row of q.results) {
      const name = titleOf(row.properties.Name)
      if (name) existing.set(name, row.id)
    }
    cursor = q.has_more ? q.next_cursor : undefined
  } while (cursor)
}

const norm = (s) => (s || '').toLowerCase().replace(/years? (old|and over)/g, '').replace(/\s+/g, ' ').trim()
function canonicalAgeGroup(raw) {
  if (!raw) return null
  const n = norm(raw)
  const match = ageOptions.find((o) => norm(o) === n)
  return match || raw
}
function canonicalGender(raw) {
  const g = (raw || '').trim().toLowerCase()
  if (g.startsWith('f')) return genderOptions.includes('F') ? 'F' : (genderOptions.includes('Female') ? 'Female' : 'F')
  if (g.startsWith('m')) return genderOptions.includes('M') ? 'M' : (genderOptions.includes('Male') ? 'Male' : 'M')
  return ''
}

// ---- 3. upsert ----
let created = 0, updated = 0, failed = 0
for (const [name, m] of csv) {
  const props = {
    'First Name': { rich_text: rt(m.first) },
    'Last Name': { rich_text: rt(m.last) },
    'Mobile': { rich_text: rt(m.mobile) },
    'Email': { rich_text: rt(m.email) },
    'Member Type': { rich_text: rt(m.memberType) },
  }
  const ag = canonicalAgeGroup(m.ageGroup)
  if (ag) props['Age Group'] = { select: { name: ag } }
  if (m.birthDate) props['Birth Date'] = { date: { start: m.birthDate } }
  if (m.status) props['Status'] = { select: { name: m.status } }
  const g = canonicalGender(m.gender)
  if (g) props['Gender'] = { select: { name: g } }

  try {
    if (existing.has(name)) {
      await api('PATCH', `/pages/${existing.get(name)}`, { properties: props })
      updated++
    } else {
      await api('POST', '/pages', {
        parent: { database_id: MEMBERS_DB },
        properties: { Name: { title: rt(name) }, ...props },
      })
      created++
    }
  } catch (e) {
    console.log(`  FAIL ${name}: ${e.message}`)
    failed++
  }
  await sleep(230)
}

const notInCsv = [...existing.keys()].filter((n) => !csv.has(n))
console.log(`\nCSV members: ${csv.size}`)
console.log(`Created (new): ${created}`)
console.log(`Updated (existing): ${updated}`)
console.log(`Failed: ${failed}`)
console.log(`In Notion but not in CSV (left untouched): ${notInCsv.length}`)
if (notInCsv.length) console.log('  ' + notInCsv.join(', '))
