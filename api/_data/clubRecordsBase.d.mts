/**
 * Type declaration for clubRecordsBase.mjs — the historical club-records
 * sheet (as at the end of the 2024/25 season), kept as a data module so the
 * server (api/_clubrecords.mjs) and the site (src/data/clubRecords.ts) share
 * one source of truth.
 */
export interface ClubRecordsSheetRow {
  grade: number
  gender: 'F' | 'M'
  names: string[]
  dates: string[]
  mark: string
}

export interface ClubRecordsSheetEvent {
  event: string
  unit: 'time' | 'distance' | 'height'
  rows: ClubRecordsSheetRow[]
}

declare const sheet: {
  asAt: string
  events: ClubRecordsSheetEvent[]
}

export default sheet
