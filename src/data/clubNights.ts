/**
 * Club night schedule — every Thursday in Term 4 2026 and Term 1 2027.
 * Powers the "next club night" countdown and the Club Nights timeline.
 */
export interface ClubNight {
  iso: string
  term: string
  /** Special night, e.g. the final prizegiving / mini meet. */
  note?: string
}

export const clubNights: ClubNight[] = [
  { iso: '2026-10-15', term: 'Term 4' },
  { iso: '2026-10-22', term: 'Term 4' },
  { iso: '2026-10-29', term: 'Term 4' },
  { iso: '2026-11-05', term: 'Term 4' },
  { iso: '2026-11-12', term: 'Term 4' },
  { iso: '2026-11-19', term: 'Term 4' },
  { iso: '2026-11-26', term: 'Term 4' },
  { iso: '2026-12-03', term: 'Term 4' },
  { iso: '2026-12-10', term: 'Term 4' },
  { iso: '2027-02-04', term: 'Term 1' },
  { iso: '2027-02-11', term: 'Term 1' },
  { iso: '2027-02-18', term: 'Term 1' },
  { iso: '2027-02-25', term: 'Term 1' },
  { iso: '2027-03-04', term: 'Term 1' },
  { iso: '2027-03-11', term: 'Term 1' },
  { iso: '2027-03-18', term: 'Term 1' },
  { iso: '2027-03-25', term: 'Term 1' },
  { iso: '2027-04-01', term: 'Term 1', note: 'Final night — mini meet & prizegiving' },
]

export interface NextClubNight {
  iso: string
  when: Date
  isTonight: boolean
  isFinal: boolean
}

/** The next club night relative to `now` (undefined once the season is over). */
export function nextClubNight(now = new Date()): NextClubNight | undefined {
  const start = new Date(now.getTime() - 4 * 60 * 60 * 1000) // today started 5:30pm "club night day" boundary
  for (const n of clubNights) {
    const when = new Date(`${n.iso}T17:30:00`)
    if (when.getTime() > now.getTime()) {
      const isTonight = start.toDateString() === when.toDateString() && now.getTime() < when.getTime()
      return { iso: n.iso, when, isTonight, isFinal: Boolean(n.note) }
    }
  }
  return undefined
}

export function formatClubNightLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** The club's two programmes, by their full names (the club's naming, Nov 2026). */
export const GSG = 'ASB Get Set Go'
export const RJT = 'ASB Run Jump Throw'

/**
 * Club night times, by grade. Thursdays at Owen Delany Park.
 * "Grades 3–6" matches the club's own announcement wording.
 */
export interface ClubNightGroup {
  id: 'juniors' | 'seniors'
  label: string
  programme?: string
  start: string
  finish: string
  matches: (grade: number) => boolean
}

export const clubNightGroups: ClubNightGroup[] = [
  {
    id: 'juniors',
    label: 'Grades 3–6',
    programme: GSG,
    start: '5:30pm',
    finish: '6:30pm',
    matches: (g) => g >= 3 && g <= 6,
  },
  {
    id: 'seniors',
    label: 'Grades 7–14',
    programme: RJT,
    start: '5:30pm',
    finish: '7:00pm',
    matches: (g) => g >= 7,
  },
]

export function clubNightGroupForGrade(grade: number): ClubNightGroup | undefined {
  return clubNightGroups.find((g) => g.matches(grade))
}

/** "5:30–6:30pm" — one time format site-wide. */
export function groupTimeLabel(g: ClubNightGroup): string {
  return `${g.start.replace('pm', '')}–${g.finish}`
}

/** The evening, as it actually runs — powers the Club Nights timeline. */
export interface TimelineStep {
  time: string
  title: string
  detail: string
}

export const eveningTimeline: TimelineStep[] = [
  {
    time: '5:30pm',
    title: 'Warm-up jog and stretches',
    detail: 'Everyone starts together with a jog around the field and some stretches.',
  },
  {
    time: '5:40pm',
    title: 'Split into age groups',
    detail:
      `Grades 3–6 head off to ${GSG}. Grades 7–14 start ${RJT}: four stations of games and event practice.`,
  },
  {
    time: '6:30pm',
    title: `${GSG} finishes`,
    detail: 'Our 3–6 year olds are done for the night. Grades 7–14 keep going.',
  },
  {
    time: 'By 7:00pm',
    title: 'Relay (if time) and finish',
    detail:
      'If there is time we finish with a relay combining all of the 7+ children — and some parents if numbers are needed!',
  },
]

/**
 * Development Squad — Mondays. Open to athletes aged 10+ wanting extra
 * training; masters athletes welcome too.
 */
export const developmentSquad = {
  day: 'Mondays',
  start: '5:30pm',
  finish: '6:30pm',
  startsLabel: 'Term 4: Monday 19 Oct – Monday 7 Dec · Term 1: from Monday 8 Feb',
  who: 'For Grades 10+ competitive athletes, college athletes and masters athletes.',
  detail:
    'An extension of club nights for those who want to work on the more technical components of their events and build strength, agility and power.',
  facebookGroup: 'Taupō Athletics Development Squad',
  noExtraFee: true,
}

/** "5:30–6:30pm" — same format as groupTimeLabel. */
export const developmentSquadTimeLabel = `${developmentSquad.start.replace('pm', '')}–${developmentSquad.finish}`
