// Add NEW members from a GameDay "Members by Season" CSV into the Notion
// Members database. Existing members are left untouched (so attendance,
// results and access codes survive); only members whose full name is not yet
// in Notion are created.
//
// Fields written on each new member so they show up everywhere they should:
//   - Name / First Name / Last Name     (check-in search + sorting)
//   - Member Type                       (drives check-in + attendance filters)
//   - Birth Date + Gender               (drives the measure-night grade + boys/girls split)
//   - Age Group, Email, Mobile, Status  (contact + roster display)
//
// The 2026-27 export has NO "First Name"/"Last Name"/"Status" columns, so
// those are derived: the name is split on the first space, and Status comes
// from "Registration Status" (falling back to "Member Status").
//
// Usage:
//   NOTION_TOKEN=... node scripts/notion_add_new_members.mjs "path-to.csv"
//   NOTION_TOKEN=... node scripts/notion_add_new_members.mjs "path-to.csv" --dry-run
import { readFileSync } from 'node:fs'

const TOKEN = process.env.NOTION_TOKEN
const BASE = 'https://api.notion.com/v1'
const MEMBERS_DB = process.env.MEMBERS_DB_ID || '3e30d85f-784c-81e6-a79b-ca720cb76a5b'
const CSV_PATH = process.argv[2] || 'C:\\Users\\grant\\Downloads\\Members by Season-20261125-234955.csv'
const DRY_RUN = process.argv.includes('--dry-run')

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
const normName = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

// ---- 1. parse + dedupe CSV (each member appears once per NZ/WBOP/Taupo product) ----
const rows = parseCSV(readFileSync(CSV_PATH, 'utf8'))
const header = rows[0]
const idx = (n) => header.indexOf(n)
const get = (row, n) => (idx(n) >= 0 ? (row[idx(n)] || '').trim() : '')

// Each member appears once per product (NZ / WBOP / Taupo) and, for committee
// families, also under a "Committee Member" product row. Prefer the athlete
// ("Active …") row so a child isn't imported as a committee member.
const typePriority = (t) => (/^Active/.test(t || '') ? 2 : 1)
const statusPriority = (s) => (s === 'Active' ? 2 : s === 'Pending' ? 1 : 0)

const csv = new Map()
for (const r of rows.slice(1)) {
  const name = get(r, 'Name')
  if (!name) continue
  const { first, last } = splitName(name)
  const memberType = get(r, 'Member Type')
  const status = get(r, 'Registration Status') || get(r, 'Member Status')
  const cand = {
    name,
    first,
    last,
    ageGroup: get(r, 'Age Group'),
    memberType,
    status,
    gender: (() => {
      const g = get(r, 'Gender At Birth').toLowerCase()
      if (g.startsWith('f')) return 'F'
      if (g.startsWith('m')) return 'M'
      return ''
    })(),
    birthDate: toIsoDate(get(r, 'Birth Date')),
    mobile: get(r, 'Mobile'),
    email: get(r, 'Email'),
  }
  const prev = csv.get(name)
  if (!prev) { csv.set(name, cand); continue }
  const pp = typePriority(prev.memberType)
  const np = typePriority(memberType)
  if (np > pp || (np === pp && statusPriority(status) > statusPriority(prev.status))) {
    csv.set(name, cand)
  }
}
console.log(`CSV unique members: ${csv.size}`)

// ---- 2. existing members by normalized full name ----
if (!TOKEN) {
  console.error('NOTION_TOKEN is not set. Re-run with NOTION_TOKEN=... to write to Notion.')
  process.exit(1)
}

const existing = new Map()
for (const row of await queryAll(MEMBERS_DB)) {
  const name = titleOf(row.properties.Name)
  if (name) existing.set(normName(name), name)
}
console.log(`Notion existing members: ${existing.size}`)

const toAdd = [...csv.values()].filter((m) => !existing.has(normName(m.name)))
const already = csv.size - toAdd.length
console.log(`Already in Notion (skipped): ${already}`)
console.log(`New members to add: ${toAdd.length}`)
if (DRY_RUN) {
  for (const m of toAdd) {
    const age = m.birthDate ? 2026 - Number(m.birthDate.slice(0, 4)) : null
    const grade = age != null && age >= 7 && age <= 14 ? String(age) : ''
    console.log(`  [dry-run] ${m.name} | ${m.memberType} | ${m.gender} | ${m.birthDate} | measure-night grade: ${grade || '—'}`)
  }
  console.log('Dry run — nothing written to Notion.')
  process.exit(0)
}

// ---- 3. create new members ----
let created = 0
let failed = 0
for (const m of toAdd) {
  const props = {
    'First Name': { rich_text: rt(m.first) },
    'Last Name': { rich_text: rt(m.last) },
    'Member Type': { rich_text: rt(m.memberType) },
    'Mobile': { rich_text: rt(m.mobile) },
    'Email': { rich_text: rt(m.email) },
  }
  if (m.ageGroup) props['Age Group'] = { select: { name: m.ageGroup } }
  if (m.birthDate) props['Birth Date'] = { date: { start: m.birthDate } }
  if (m.gender) props['Gender'] = { select: { name: m.gender } }
  if (m.status) props['Status'] = { select: { name: m.status } }

  try {
    await api('POST', '/pages', {
      parent: { database_id: MEMBERS_DB },
      properties: { Name: { title: rt(m.name) }, ...props },
    })
    created++
    console.log(`  + ${m.name}`)
  } catch (e) {
    console.log(`  FAIL ${m.name}: ${e.message}`)
    failed++
  }
  await sleep(230)
}

console.log(`\nDone. Created ${created} new member(s), ${failed} failed, ${already} already present.`)
