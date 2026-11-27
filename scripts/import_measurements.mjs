#!/usr/bin/env node
// Import backdated club-night measurements from the club's spreadsheet export
// into src/data/history.ts.
//
//   node scripts/import_measurements.mjs "data/measurements/2025-26.csv"
//   node scripts/import_measurements.mjs data/measurements/2025-26.csv --only "Arlo Anderson,Connor White"
//
// The sheet layout (exported from "Athletics Measurements YYYY-YYYY.xlsx"):
//   row 2  event dates, one per measurement column
//   row 3  event names, one per measurement column
//   row 4+ Grade, Gender, Name, then the marks
// A blank event name continues the one to its left (merged cells), which is how
// the March 60m column is written. Blank cells, "NJ" and "NT" are not marks.
//
// Names are matched to current members on the website by exact full name
// (case/diacritics/whitespace-insensitive), so keep the sheet's spelling in
// step with Notion.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const TIME_EVENTS = ['60m', '100m', '200m', '400m', '800m', '1500m']
const FIELD_EVENTS = ['Long Jump', 'High Jump', 'Shot Put', 'Discus']

/** Minimal CSV reader: handles quoted fields, embedded commas and BOM. */
function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 1 } else quoted = false
      } else cell += ch
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell); cell = ''
    } else if (ch === '\n') {
      row.push(cell); rows.push(row); row = []; cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }

/** "27-Nov-25" → "2025-11-27". */
function isoDate(value) {
  const m = String(value || '').trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/)
  if (!m) return ''
  const month = MONTHS[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()]
  if (!month) return ''
  return `20${m[3]}-${month}-${m[1].padStart(2, '0')}`
}

/** The season a dated club night belongs to: Jul–Dec → that year, Jan–Jun → previous year. */
function seasonOf(iso) {
  if (!iso) return ''
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const start = month >= 7 ? year : year - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

const cleanName = (s) => String(s || '').replace(/\uFFFD/g, '').trim()

/** Seconds for a track mark ("1:28:15", "9:87", "9.98"), metres for field. */
function markNumber(event, raw) {
  const s = String(raw || '').replace(/,/g, '.').replace(/[a-z\s]/gi, '')
  if (!s) return null
  const isTime = TIME_EVENTS.includes(event)
  if (!isTime) {
    const v = parseFloat(s)
    return Number.isFinite(v) && v > 0 ? v : null
  }
  const parts = s.split(':')
  if (parts.length === 1) {
    const v = parseFloat(parts[0])
    return Number.isFinite(v) && v > 0 ? v : null
  }
  if (parts.length === 2) {
    // The sheet writes the fraction after a colon: "9:87" = 9.87s.
    const [sec, frac = ''] = parts
    const v = Number(sec) + (frac ? Number(frac) / 10 ** frac.length : 0)
    return Number.isFinite(v) && v > 0 ? v : null
  }
  const [min, sec, frac = ''] = parts
  const v = Number(min) * 60 + Number(sec) + (frac ? Number(frac) / 10 ** frac.length : 0)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * Reject obvious data-entry artefacts (a "1" in a 1500m column, a stray 0).
 * Loose lower bounds only — juniors are slow, but nobody runs 60m in 6s or
 * throws 40m in Grade 7.
 */
const MIN_SECONDS = { '60m': 6, '100m': 9, '200m': 20, '400m': 45, '800m': 90, '1500m': 180 }
function plausible(event, raw) {
  const v = markNumber(event, raw)
  if (v == null) return false
  if (TIME_EVENTS.includes(event)) {
    const min = MIN_SECONDS[event] ?? 0
    return v >= min && v <= 900
  }
  return v <= 30
}

function main() {
  const args = process.argv.slice(2)
  const onlyIndex = args.indexOf('--only')
  const only = onlyIndex >= 0 && args[onlyIndex + 1]
    ? new Set(args[onlyIndex + 1].split(',').map((s) => cleanName(s).toLowerCase()).filter(Boolean))
    : null
  const csvArgs = args.filter((a, i) => !a.startsWith('--') && i !== onlyIndex + 1)
  if (!csvArgs.length) {
    console.error('Usage: node scripts/import_measurements.mjs <measurements.csv> [more.csv…] [--only "Name,Name"]')
    process.exit(1)
  }

  const athletes = new Map()

  for (const csvArg of csvArgs) {
    const rows = parseCsv(readFileSync(resolve(root, csvArg), 'utf8'))
    if (rows.length < 4) {
      console.warn(`Skipping ${csvArg}: expected a date row, an event row and data.`)
      continue
    }

    const dates = rows[1]
    const events = rows[2]
    const firstDataRow = 3

    // Columns 4.. are the measurement columns; the tail is scoring
    // (participation, best, totals, finals). Only known events with a real date
    // count, so the two exports' different widths both work.
    const columns = []
    let lastEvent = ''
    for (let i = 3; i < events.length; i += 1) {
      const event = String(events[i] || '').trim()
      if (event) lastEvent = event
      const date = isoDate(dates[i])
      if (!date || !lastEvent) continue
      if (![...TIME_EVENTS, ...FIELD_EVENTS].includes(lastEvent)) continue
      columns.push({ index: i, event: lastEvent, date })
    }
    if (!columns.length) {
      console.warn(`Skipping ${csvArg}: no measurement columns found in rows 2–3.`)
      continue
    }

    for (const row of rows.slice(firstDataRow)) {
      const name = cleanName(row[2])
      if (!name) continue
      // Skip notes/headers that might sneak in ("Scoring", "attendance"…).
      if (!/[A-Za-z]/.test(name) || name.length < 3) continue
      for (const col of columns) {
        const raw = String(row[col.index] || '').trim()
        if (!raw || /^(nj|nt)$/i.test(raw)) continue
        if (!plausible(col.event, raw)) continue
        const key = name.toLowerCase()
        if (!athletes.has(key)) athletes.set(key, { name, marks: [] })
        const marks = athletes.get(key).marks
        // The same night can appear in two exports — keep one row per event/date.
        if (marks.some((m) => m.event === col.event && m.date === col.date && m.result === raw)) continue
        marks.push({ event: col.event, date: col.date, result: raw, season: seasonOf(col.date) })
      }
    }
  }

  let list = [...athletes.values()].filter((a) => a.marks.length)
  if (only) list = list.filter((a) => only.has(a.name.toLowerCase()))
  list.sort((a, b) => a.name.localeCompare(b.name))
  for (const a of list) a.marks.sort((x, y) => x.date.localeCompare(y.date) || x.event.localeCompare(y.event))

  const body = `/**
 * Historical club-night measurements, imported from the club's spreadsheets.
 * GENERATED FILE — edit the CSV and re-run:
 *   node scripts/import_measurements.mjs data/measurements/2025-26.csv
 *
 * These are marks recorded before a season was entered in Notion, so athlete
 * names are matched to current members by exact full name. Athletes who are no
 * longer registered still appear here but cannot sign in (access codes come
 * from Notion membership).
 */

export interface HistoryMark {
  event: string
  date: string
  result: string
  /** e.g. "2025-26" */
  season: string
}

export interface AthleteHistory {
  name: string
  marks: HistoryMark[]
}

export const history: AthleteHistory[] = ${JSON.stringify(list, null, 2)}

/** Lowercase, strip macrons/diacritics and collapse spaces — the same key the API uses. */
export function historyKey(name: string) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/\\s+/g, ' ')
    .trim()
}

const byName = new Map(history.map((a) => [historyKey(a.name), a]))

/** The backdated marks for a member, if any. */
export function historyFor(name: string): AthleteHistory | undefined {
  return byName.get(historyKey(name))
}

/** Every season present in the imported data, oldest first. */
export const historySeasons: string[] = [...new Set(history.flatMap((a) => a.marks.map((m) => m.season)))]
  .filter(Boolean)
  .sort()
`

  const out = resolve(root, 'src/data/history.ts')
  writeFileSync(out, body)
  const marks = list.reduce((n, a) => n + a.marks.length, 0)
  console.log(`Wrote ${list.length} athletes / ${marks} marks to src/data/history.ts`)
}

main()
