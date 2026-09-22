// Assign per-family access codes to members in the Notion Members DB.
//
// Families are grouped by the shared registration email: every member with the
// same (case-folded) email gets one code, so a parent sees all their children.
// Members with a blank email each get their own code.
//
// Idempotent: a group that already has a code keeps it; codes are unique.
//
// Usage:
//   NOTION_TOKEN=... node scripts/notion_access_codes.mjs
import { randomInt } from 'node:crypto'

const TOKEN = process.env.NOTION_TOKEN
if (!TOKEN) {
  console.error('NOTION_TOKEN is not set.')
  process.exit(1)
}
const BASE = 'https://api.notion.com/v1'
const MEMBERS_DB = '3e30d85f-784c-81e6-a79b-ca720cb76a5b'

// No ambiguous characters (I/O/0/1).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const codeOf = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

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
async function queryAll(dbId, filter) {
  const out = []
  let cursor
  do {
    const body = { page_size: 100 }
    if (filter) body.filter = filter
    if (cursor) body.start_cursor = cursor
    const r = await api('POST', `/databases/${dbId}/query`, body)
    out.push(...r.results)
    cursor = r.has_more ? r.next_cursor : undefined
  } while (cursor)
  return out
}
const titleOf = (p) => (p.title || []).map((t) => t.plain_text).join('')
const richOf = (p) => (p.rich_text || []).map((t) => t.plain_text).join('')

// 1. ensure the property exists
await api('PATCH', `/databases/${MEMBERS_DB}`, {
  properties: { 'Access code': { rich_text: {} } },
})

// 2. read members + existing codes
const rows = await queryAll(MEMBERS_DB)
const members = rows.map((r) => ({
  id: r.id,
  name: titleOf(r.properties.Name),
  email: richOf(r.properties.Email).trim().toLowerCase(),
  code: richOf(r.properties['Access code']).trim().toUpperCase(),
}))

// 3. group by email (blank email -> one-member group)
const groups = new Map()
for (const m of members) {
  const key = m.email || `__${m.id}__`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(m)
}

// 4. assign codes
const used = new Set(members.map((m) => m.code).filter(Boolean))
let assigned = 0
for (const group of groups.values()) {
  let code = group.map((m) => m.code).find(Boolean) || codeOf()
  while (used.has(code)) code = codeOf()
  used.add(code)
  for (const m of group) {
    if (m.code !== code) {
      await api('PATCH', `/pages/${m.id}`, {
        properties: { 'Access code': { rich_text: [{ type: 'text', text: { content: code } }] } },
      })
      assigned++
    }
    await sleep(140)
  }
}

console.log(`Access codes: ${members.length} members across ${groups.size} families; ${assigned} member(s) updated.`)
