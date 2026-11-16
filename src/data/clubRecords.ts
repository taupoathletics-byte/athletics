/**
 * Taupō Athletics Club Records — the best mark ever set at club nights, per
 * event, grade and gender. Transcribed from "Club Records as at end of 2024/25
 * season" (public/club-records-2025.pdf, March 2025). Name typos on the sheet
 * were corrected with the club (Knox Short, Ben Matthews, Kaiah Bosshart,
 * Lukas Haver, Mackenzie Meihana).
 *
 * These are the club's published records (they were on the old website). They
 * are NOT the club-night measurements logged this season, which are private:
 * families see their own children's results with their access code.
 *
 * `mark` is copied from the sheet; `displayMark` normalises it (the sheet
 * mixes "00:09:14" and "00:09.14" for 9.14 seconds). Ties list every athlete.
 * A club-night result that beats or equals a record joins the board
 * automatically (api/_clubrecords.mjs); to correct the sheet itself, edit
 * api/_data/clubRecordsBase.mjs.
 */
export interface ClubRecord {
  grade: number
  gender: 'F' | 'M'
  names: string[]
  /** As written on the sheet, e.g. "16-Mar-23"; one per name when they differ. */
  dates: string[]
  mark: string
}

export interface RecordEvent {
  event: string
  unit: 'time' | 'distance' | 'height'
  rows: ClubRecord[]
}

/**
 * The sheet itself lives in api/_data/clubRecordsBase.mjs so the server can
 * compare new club-night results against it (api/_clubrecords.mjs). The page
 * shows the live board from /api/clubrecords and falls back to this.
 */
import base from '../../api/_data/clubRecordsBase.mjs'

export const clubRecordsAsAt: string = base.asAt
export const clubRecords = base.events as RecordEvent[]

/** One record on the live board: everyone who holds it. */
export interface BoardHolder {
  name: string
  /** ISO date, e.g. "2023-03-16". */
  date: string
  mark: string
  /** 'sheet' = the historical list; 'club-night' = set since, at a club night. */
  source: 'sheet' | 'club-night'
}
export interface BoardRow {
  grade: number
  gender: 'F' | 'M'
  holders: BoardHolder[]
}
export interface BoardEvent {
  event: string
  unit: RecordEvent['unit']
  rows: BoardRow[]
}

const MON: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }

/** The historical sheet in the live board's shape (used until the API answers). */
export const baseBoard: BoardEvent[] = clubRecords.map((e) => ({
  event: e.event,
  unit: e.unit,
  rows: e.rows.map((r) => ({
    grade: r.grade,
    gender: r.gender,
    holders: r.names.map((name, i) => {
      const [d, m, y] = (r.dates[i] || r.dates[0]).split('-')
      return { name, date: `20${y}-${MON[m]}-${d.padStart(2, '0')}`, mark: r.mark, source: 'sheet' as const }
    }),
  })),
}))

/** A board mark as people read it, whichever way it was written. */
export function holderMark(h: BoardHolder, unit: RecordEvent['unit']): string {
  if (h.source === 'sheet') return displayMark(h.mark, unit)
  const m = h.mark.trim()
  if (/[a-z]/i.test(m) || m.includes(':')) return m
  return unit === 'time' ? `${m}s` : `${m}m`
}

/** "2023-03-16" → "16 Mar 2023". */
export function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  const mon = Object.keys(MON).find((k) => MON[k] === m)
  return y && mon ? `${Number(d)} ${mon} ${y}` : iso
}

/**
 * A mark as people read it: "9.14s", "1:28.41", "4.56m".
 * Sheet times are "mm:ss.hh" but often use ":" before the hundredths too
 * ("00:09:14"), and one uses "." throughout ("01.14.10").
 */
export function displayMark(mark: string, unit: RecordEvent['unit']): string {
  if (unit !== 'time') return `${mark}m`
  const parts = mark.split(/[:.]/)
  const [min, sec, frac] = parts.length === 2 ? [parts[0], parts[1], ''] : parts
  const m = Number(min)
  const tail = frac ? `.${frac}` : ''
  return m === 0 ? `${Number(sec)}${tail}s` : `${m}:${sec.padStart(2, '0')}${tail}`
}

/** "16-Mar-23" → "16 Mar 2023". */
export function displayDate(d: string): string {
  const [day, mon, yy] = d.split('-')
  return `${Number(day)} ${mon} 20${yy}`
}
