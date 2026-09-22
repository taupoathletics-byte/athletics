/**
 * Headline club stats.
 *
 * TODO confirm the unverified figures with the committee before publishing —
 * `source` must name where the number came from. A stat with no source is not
 * shipped, so the Home page can never show an invented number.
 */
export interface ClubStat {
  value: number
  suffix?: string
  label: string
  /** Where this figure comes from. undefined = unverified, do not publish. */
  source?: string
}

export const clubStats: ClubStat[] = [
  {
    value: 19,
    label: 'Club nights this season',
    source: 'Derived from clubNights.ts — 10 in Term 4 + 9 in Term 1.',
  },
  // TODO confirm: registered member count for 2026/27.
  { value: 0, label: 'Registered members' },
  // TODO confirm: number of volunteer coaches and helpers.
  { value: 0, suffix: '+', label: 'Volunteer coaches & helpers' },
]

/** Only stats with a stated source are shown on the site. */
export const verifiedStats = clubStats.filter((s) => Boolean(s.source))
