/**
 * Registration status and club fees for the 2026/27 season.
 *
 * Single source of truth — Home, Registration, the grade finder, the FAQs and
 * the header/footer Register buttons all read from here.
 */

export interface FeeRow {
  /** Grade range as families think of it. */
  group: string
  fee: string
  note?: string
  /** Matches an athlete's grade (age at 31 Dec) to this row. */
  matches: (grade: number) => boolean
}

export const registration = {
  /** Registrations for 2026/27 are OPEN. */
  isOpen: true,
  /** Direct GameDay form (tracking parameters stripped). */
  url: 'https://regoform.mygameday.app/#/AIYMtqSliPYrpZAIT5/Ah1tUjkzXge5s7Htn7',
  seasonLabel: '2026/27',
  /** The season fee covers Term 4 and Term 1 together. */
  coversLabel: 'Covers Term 4 and Term 1',
}

export const fees: FeeRow[] = [
  {
    group: 'Grades 3–6',
    fee: '$50',
    note: 'Get Set Go',
    matches: (g) => g >= 3 && g <= 6,
  },
  {
    group: 'Grades 7–14',
    fee: '$100',
    matches: (g) => g >= 7 && g <= 14,
  },
  {
    group: 'Grades 15+',
    fee: 'from $100',
    note: 'Depending on membership type',
    matches: (g) => g >= 15,
  },
]

/** The fee row that applies to a given grade, if any. */
export function feeForGrade(grade: number): FeeRow | undefined {
  return fees.find((f) => f.matches(grade))
}

/**
 * Junior grade caps for this season. Junior grades fill quickly and there is
 * no waitlist once a grade is full.
 */
export interface GradeCap {
  label: string
  perAgeGroup: number
  matches: (grade: number) => boolean
}

export const juniorCaps: GradeCap[] = [
  { label: 'Grades 3 & 4', perAgeGroup: 10, matches: (g) => g === 3 || g === 4 },
  { label: 'Grades 5 & 6', perAgeGroup: 20, matches: (g) => g === 5 || g === 6 },
]

export function capForGrade(grade: number): GradeCap | undefined {
  return juniorCaps.find((c) => c.matches(grade))
}

export const capsNote =
  'These caps can increase if more adults volunteer to help on club nights. No athletics experience is needed: our Get Set Go sessions are planned for you, with equipment ready and plenty of support.'

export const noWaitlistNote =
  'Junior grades fill quickly and there’s no waitlist once a grade is full, so get in early.'
