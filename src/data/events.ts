/**
 * Competition calendar.
 *
 * Events are tagged with the season they belong to so last season's dates can
 * never be displayed as though they were current. The site renders
 * `currentSeasonEvents` only.
 *
 * TODO confirm the 2026/27 dates with the committee. The AWBoP calendar
 * (see `awbopCalendarUrl` in site.ts) is the upstream source and is published
 * around August each year; until those dates are in, the Events page shows a
 * "dates to be confirmed" state rather than last season's fixtures.
 */
export const CURRENT_SEASON = '2026/27'

export interface ClubEvent {
  season: string
  /** ISO start date. */
  start: string
  /** ISO end date for multi-day events. */
  end?: string
  name: string
  venue: string
  /** Shown on the card, e.g. "Grades 7–14 only". */
  note?: string
  registerUrl?: string
  /** Entry window, where one applies. */
  opensAt?: string
  closesAt?: string
}

/**
 * 2025/26 — kept as the shape to follow and as a record of what a season
 * looks like. NOT displayed: these fixtures have been and gone.
 */
export const pastEvents: ClubEvent[] = [
  { season: '2025/26', start: '2025-11-22', name: 'Te Awamutu Ribbon Day', venue: 'Te Awamutu Stadium' },
  { season: '2025/26', start: '2025-11-29', name: 'Fairfield Ribbon Day', venue: 'Porritt Stadium, Hamilton' },
  { season: '2025/26', start: '2025-12-06', name: 'Taupō Ribbon Day', venue: 'Owen Delany Park' },
  {
    season: '2025/26',
    start: '2026-01-09',
    end: '2026-01-11',
    name: 'North Island Colgate Games',
    venue: 'Tauranga Domain',
    note: 'Grades 7–14',
  },
  {
    season: '2025/26',
    start: '2026-01-16',
    end: '2026-01-18',
    name: 'South Island Colgate Games',
    venue: 'Saxon Athletics Area, Nelson',
    note: 'Grades 7–14',
  },
  {
    season: '2025/26',
    start: '2026-02-21',
    name: 'Cambridge Pentathlon',
    venue: 'Vogel Street, Cambridge',
    note: 'Pre-registration only, Grades 7–14',
    registerUrl: 'https://forms.gle/grhWGky5FXeQhryZ9',
  },
  { season: '2025/26', start: '2026-03-07', name: 'Paeroa Ribbon Day', venue: 'Paeroa Domain' },
  {
    season: '2025/26',
    start: '2026-03-14',
    end: '2026-03-15',
    name: "AWBoP Children's Champs & Relay Champs",
    venue: 'Porritt Stadium, Hamilton',
    note: 'Grades 7–14 only · from 9:30am',
    registerUrl: 'https://www.athletic.net/TrackAndField/meet/633901/register',
    closesAt: '2026-03-06T23:59:00',
  },
]

/** TODO confirm — add the 2026/27 fixtures here as AWBoP publishes them. */
export const events: ClubEvent[] = []

export const currentSeasonEvents = events
  .filter((e) => e.season === CURRENT_SEASON)
  .sort((a, b) => a.start.localeCompare(b.start))

/** Events still to come, relative to `now`. */
export function upcomingEvents(now = new Date()): ClubEvent[] {
  const today = now.toISOString().slice(0, 10)
  return currentSeasonEvents.filter((e) => (e.end ?? e.start) >= today)
}

export type EntryStatus = 'not-open' | 'open' | 'closed' | 'none'

/** Entry status for an event, so the page never claims entries are "now live". */
export function entryStatus(e: ClubEvent, now = new Date()): EntryStatus {
  if (!e.registerUrl && !e.opensAt && !e.closesAt) return 'none'
  const t = now.getTime()
  if (e.opensAt && t < new Date(e.opensAt).getTime()) return 'not-open'
  if (e.closesAt && t > new Date(e.closesAt).getTime()) return 'closed'
  return 'open'
}

/** What athletes need to bring to a Ribbon Day. */
export const ribbonDayKit = [
  'Club competition singlet',
  'Black shorts',
  'Age flash, sewn on the top left of the singlet',
  'Water bottle',
  'Snacks',
  'Sunscreen',
  'Hat',
]

/**
 * Club singlets are ordered direct from Code Sport — the catalogue URL lives in
 * `links.codesport` (about.ts), which the Events page and the singlet FAQ both
 * read so the link cannot drift. Age flashes are free from the check-in desk on
 * club night.
 */

/** Event families, used to colour-code the Ribbon Day table. */
export type EventFamily = 'sprints' | 'distance' | 'hurdles' | 'walks' | 'jumps' | 'throws' | 'relay'

const FAMILY_PATTERNS: [EventFamily, RegExp][] = [
  ['hurdles', /hurdle/i],
  ['walks', /walk/i],
  ['relay', /relay/i],
  ['jumps', /jump/i],
  ['throws', /shot|discus/i],
  ['distance', /800m|1500m/i],
  ['sprints', /^\d+m$|40m|60m|100m|200m|400m/i],
]

export function familyOf(event: string): EventFamily | undefined {
  for (const [family, re] of FAMILY_PATTERNS) if (re.test(event)) return family
  return undefined
}

export const FAMILY_LABELS: Record<EventFamily, string> = {
  sprints: 'Sprints',
  distance: 'Distance',
  hurdles: 'Hurdles',
  walks: 'Walks',
  jumps: 'Jumps',
  throws: 'Throws',
  relay: 'Relay',
}

/** Tailwind classes per family — one meaning per colour. */
export const FAMILY_CLASSES: Record<EventFamily, string> = {
  sprints: 'bg-coral-active/15 text-on-coral border-coral-active/30',
  distance: 'bg-sky-info/15 text-on-sky border-sky-info/30',
  hurdles: 'bg-secondary-container/40 text-on-secondary-container border-secondary/30',
  walks: 'bg-tertiary/15 text-on-tertiary-container border-tertiary/30',
  jumps: 'bg-mint-go/20 text-on-mint border-mint-go/40',
  throws: 'bg-primary/15 text-on-primary-container border-primary/30',
  relay: 'bg-surface-container-high text-on-surface border-outline-variant',
}

/** Split a comma-separated event list into individual event names. */
export function splitEvents(list: string): string[] {
  return list
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** A downloadable single-event .ics calendar file. */
export function toIcs(e: ClubEvent): string {
  const d = (iso: string) => iso.replace(/-/g, '')
  const endExclusive = (iso: string) => {
    const dt = new Date(`${iso}T00:00:00Z`)
    dt.setUTCDate(dt.getUTCDate() + 1)
    return dt.toISOString().slice(0, 10).replace(/-/g, '')
  }
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Taupo Athletics Club//Events//EN',
    'BEGIN:VEVENT',
    `UID:${d(e.start)}-${e.name.replace(/\W+/g, '-').toLowerCase()}@taupoathletics`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d(e.start)}`,
    `DTEND;VALUE=DATE:${endExclusive(e.end ?? e.start)}`,
    `SUMMARY:${esc(e.name)}`,
    `LOCATION:${esc(e.venue)}`,
    ...(e.note ? [`DESCRIPTION:${esc(e.note)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
