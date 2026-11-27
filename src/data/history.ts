/**
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

export const history: AthleteHistory[] = [
  {
    "name": "Arlo Anderson",
    "marks": [
      {
        "event": "100m",
        "date": "2025-11-06",
        "result": "16:64",
        "season": "2025-26"
      },
      {
        "event": "400m",
        "date": "2025-11-06",
        "result": "1:28:15",
        "season": "2025-26"
      },
      {
        "event": "Long Jump",
        "date": "2025-11-06",
        "result": "2.99",
        "season": "2025-26"
      },
      {
        "event": "Shot Put",
        "date": "2025-11-06",
        "result": "4.75",
        "season": "2025-26"
      },
      {
        "event": "60m",
        "date": "2025-11-27",
        "result": "9.98",
        "season": "2025-26"
      },
      {
        "event": "Discus",
        "date": "2025-11-27",
        "result": "10.02",
        "season": "2025-26"
      },
      {
        "event": "High Jump",
        "date": "2025-11-27",
        "result": "0.95",
        "season": "2025-26"
      },
      {
        "event": "200m",
        "date": "2026-02-12",
        "result": "36.55",
        "season": "2025-26"
      },
      {
        "event": "800m",
        "date": "2026-02-26",
        "result": "3:23:1",
        "season": "2025-26"
      },
      {
        "event": "Long Jump",
        "date": "2026-02-26",
        "result": "2.73",
        "season": "2025-26"
      },
      {
        "event": "60m",
        "date": "2026-03-12",
        "result": "9:87",
        "season": "2025-26"
      }
    ]
  },
  {
    "name": "Connor White",
    "marks": [
      {
        "event": "100m",
        "date": "2024-11-07",
        "result": "15.83",
        "season": "2024-25"
      },
      {
        "event": "800m",
        "date": "2024-12-05",
        "result": "3:05:00",
        "season": "2024-25"
      },
      {
        "event": "Shot Put",
        "date": "2024-12-05",
        "result": "5.42",
        "season": "2024-25"
      },
      {
        "event": "200m",
        "date": "2025-02-20",
        "result": "35.24",
        "season": "2024-25"
      },
      {
        "event": "High Jump",
        "date": "2025-02-20",
        "result": "1.05",
        "season": "2024-25"
      },
      {
        "event": "Long Jump",
        "date": "2025-02-27",
        "result": "3.17",
        "season": "2024-25"
      },
      {
        "event": "Discus",
        "date": "2025-03-06",
        "result": "13.35",
        "season": "2024-25"
      },
      {
        "event": "400m",
        "date": "2025-03-27",
        "result": "1:23:12",
        "season": "2024-25"
      },
      {
        "event": "100m",
        "date": "2025-11-06",
        "result": "15:34",
        "season": "2025-26"
      },
      {
        "event": "400m",
        "date": "2025-11-06",
        "result": "1:22:18",
        "season": "2025-26"
      },
      {
        "event": "Long Jump",
        "date": "2025-11-06",
        "result": "3.83",
        "season": "2025-26"
      },
      {
        "event": "Shot Put",
        "date": "2025-11-06",
        "result": "5.55",
        "season": "2025-26"
      },
      {
        "event": "1500m",
        "date": "2025-11-27",
        "result": "6:16:49",
        "season": "2025-26"
      },
      {
        "event": "Discus",
        "date": "2025-11-27",
        "result": "16.25",
        "season": "2025-26"
      },
      {
        "event": "High Jump",
        "date": "2025-11-27",
        "result": "1.2",
        "season": "2025-26"
      },
      {
        "event": "100m",
        "date": "2026-02-05",
        "result": "16.04",
        "season": "2025-26"
      },
      {
        "event": "200m",
        "date": "2026-02-12",
        "result": "32.81",
        "season": "2025-26"
      },
      {
        "event": "800m",
        "date": "2026-02-26",
        "result": "2:59:1",
        "season": "2025-26"
      },
      {
        "event": "Discus",
        "date": "2026-02-26",
        "result": "16.87",
        "season": "2025-26"
      },
      {
        "event": "Long Jump",
        "date": "2026-02-26",
        "result": "3.63",
        "season": "2025-26"
      },
      {
        "event": "60m",
        "date": "2026-03-12",
        "result": "9:75",
        "season": "2025-26"
      }
    ]
  }
]

/** Lowercase, strip macrons/diacritics and collapse spaces — the same key the API uses. */
export function historyKey(name: string) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
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
