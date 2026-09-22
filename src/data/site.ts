/**
 * Site-wide configuration. Content is split across focused data files and
 * re-exported here so every existing `@/data/site` import keeps working:
 *   about.ts      — identity, venue, contact, legal, links
 *   events.ts     — competition calendar (club events, .ics, entry status)
 *   quickFacts.ts — headline club stats
 *   faqs.ts       — FAQ content
 *   committee.ts  — committee & coaches (single source of truth)
 *   fees.ts       — fees & registration
 *   grades.ts     — grade/age helpers
 *   clubNights.ts — the 19-night schedule
 *   sponsors.ts   — sponsors & supporters
 *   volunteers.ts — volunteer roles
 *   photos.ts     — photo album manifest
 */
export * from './about'
export * from './events'
export * from './quickFacts'
export * from './faqs'

export interface NavItem {
  label: string
  to?: string
  href?: string
  children?: NavItem[]
}

/** Primary navigation, grouped to reduce clutter (CTA is the Register button). */
export const navItems: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Club Nights', to: '/club-nights' },
  { label: 'Registration', to: '/registration' },
  {
    label: 'Events',
    children: [
      { label: 'Ribbon Days', to: '/events' },
      { label: 'AWBoP Calendar', to: '/calendar' },
      { label: 'Club Records', to: '/club-records' },
    ],
  },
  {
    label: 'Our Team',
    children: [
      { label: 'Committee & Coaches', to: '/team' },
      { label: 'Volunteer / Vacancies', to: '/volunteer' },
    ],
  },
  { label: 'FAQs', to: '/faqs' },
]

export interface RibbonGrade {
  grade: string
  events: string
}

export const ribbonEvents: RibbonGrade[] = [
  { grade: 'Tiny Tots (Grades 3 & 4)', events: '2 races, any distance' },
  { grade: 'Grades 5 & 6', events: '40m, 60m, Shuttle Relay' },
  { grade: 'Grades 7 & 8', events: '60m, 100m, 200m, Long Jump, Shot, Discus, 4x100m Relay' },
  { grade: 'Grade 9', events: '60m, 100m, 200m, 800m, Long Jump, Shot, Discus, 4x100m Relay' },
  {
    grade: 'Grades 10 & 11',
    events:
      '100m, 200m, 400m, 800m, 1500m, 1200m Race Walk, Long Jump, High Jump, Shot, Discus, 4x100m Relay, 70m Hurdles (Grade 11 only)',
  },
  {
    grade: 'Grade 12 (girls & boys)',
    events:
      '100m, 200m, 400m, 800m, 1500m, 80m Hurdles, 1200m Walk, Long Jump, High Jump, Shot, Discus, 4x100m Relay',
  },
  {
    grade: 'Grade 13 (girls & boys)',
    events:
      '100m, 200m, 400m, 800m, 1500m, 80m Hurdles, 1600m Walk, Long Jump, High Jump, Triple Jump, Shot, Discus, 4x100m Relay',
  },
  {
    grade: 'Grade 14 girls',
    events:
      '100m, 200m, 400m, 800m, 1500m, 80m Hurdles, 2000m Walk, Long Jump, High Jump, Triple Jump, Shot, Discus, 4x100m Relay',
  },
  {
    grade: 'Grade 14 boys',
    events:
      '100m, 200m, 400m, 800m, 1500m, 100m Hurdles, 2000m Walk, Long Jump, High Jump, Triple Jump, Shot, Discus, 4x100m Relay',
  },
  { grade: 'Grade U16', events: 'Same as Grade 14' },
]

// Club night times: Thursdays 5:30–7:00pm; the 3–6 yr olds (Get Set Go) finish at 6:30pm.
export const seasonDates = {
  clubNights: [
    'Term 4 (2026): Thursday 15 Oct – Thursday 17 Dec',
    'Term 1 (2027): Thursday 4 Feb – Thursday 1 Apr (final night is prizegiving)',
  ],
  developmentSquad: [
    'Term 4 (2026): Monday 19 Oct – Monday 7 Dec',
    'Term 1 (2027): Monday 8 Feb – Monday 22 Mar',
  ],
}

export const recordsPdf = '/club-records-2025.pdf'
export const awbopCalendarUrl = 'https://athleticswaikatobayofplenty.org.nz/competition/events/'
