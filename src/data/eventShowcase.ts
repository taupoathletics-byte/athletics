/**
 * Copy for the "Explore our events" page (/explore-events), in the order shown.
 *
 * The grade lines come from the Ribbon Day programme (RIBBON in grades.ts) —
 * keep them in step if that table changes. "Club night" means the event is in
 * the ASB Run Jump Throw club nights for 7 years and up; hurdles aren't, so
 * they point to Ribbon Days instead. Links go to existing pages only.
 */
import type { EventId } from '@/components/athletics/events/Stage'

export interface EventShowcase {
  id: EventId
  name: string
  /** A few punchy words for the big headline beneath the name. */
  tagline: string
  description: string
  /** Who competes in it, by grade. */
  who: string
  /** Where you'll try it. */
  where: string
  cta: { label: string; to: string }
}

const clubNight = { label: 'How club night works', to: '/club-nights' }

export const eventShowcase: EventShowcase[] = [
  {
    id: 'sprints',
    name: 'Sprints',
    tagline: 'Set. Go. Drive.',
    description:
      'Short and flat out: a quick reaction off the line, a low drive for the first few strides, then tall and relaxed to the finish — and dip for the line.',
    who: 'Ribbon Days: 60m (Grades 7–9), 100m and 200m (Grades 7–14), 400m (Grades 10–14)',
    where: 'At club night and every Ribbon Day',
    cta: clubNight,
  },
  {
    id: 'long-jump',
    name: 'Long jump',
    tagline: 'Run fast. Fly far.',
    description:
      'Speed down the runway, hit the take-off board and fly into the sandpit. The jump is measured from the board to the nearest mark in the sand.',
    who: 'Ribbon Days: Grades 7–14',
    where: 'In the club-night rotation for 7 years and up',
    cta: clubNight,
  },
  {
    id: 'high-jump',
    name: 'High jump',
    tagline: 'Up and over.',
    description:
      'A curved run-up, a one-foot take-off and an arch over the bar onto a deep landing mat. Clear it and the bar goes up a notch.',
    who: 'Ribbon Days: Grades 10–14',
    where: 'In the club-night rotation for 7 years and up',
    cta: clubNight,
  },
  {
    id: 'shot-put',
    name: 'Shot put',
    tagline: 'Push. Don’t throw.',
    description:
      'The shot starts tucked against the neck. Athletes drive across the circle and punch it away with one arm — then stay inside the circle until it lands.',
    who: 'Ribbon Days: Grades 7–14',
    where: 'In the club-night rotation for 7 years and up',
    cta: clubNight,
  },
  {
    id: 'discus',
    name: 'Discus',
    tagline: 'Spin. Release. Glide.',
    description:
      'Wind up, turn across the circle and let the discus go flat off the fingertips so it glides. Timing beats strength every time.',
    who: 'Ribbon Days: Grades 7–14',
    where: 'In the club-night rotation for 7 years and up',
    cta: clubNight,
  },
  {
    id: 'relays',
    name: 'Relays',
    tagline: 'Four runners. One baton.',
    description:
      'It’s all in the changeover: the next runner sets off early and the baton passes hand to hand at full speed inside the exchange zone.',
    who: 'Most Ribbon Days finish with a relay — often 4×100m, but some host clubs run a different format',
    where: 'Club night finishes with a relay for 7 years and up when there’s time',
    cta: clubNight,
  },
  {
    id: 'distance',
    name: 'Distance',
    tagline: 'Find your rhythm.',
    description:
      'Distance running is about pacing — settle into a rhythm, run the bends well and save something for a strong finish.',
    who: 'Ribbon Days: 800m from Grade 9 · 1500m from Grade 10',
    where: 'In the club-night rotation for 7 years and up',
    cta: clubNight,
  },
  {
    id: 'hurdles',
    name: 'Hurdles',
    tagline: 'Attack. Clear. Sprint.',
    description:
      'A sprint with barriers in the way. Hurdlers attack each one with a straight lead leg, fold the trail leg over and keep their rhythm between hurdles.',
    who: 'Grades 12–13: 80m · Grade 14: 80m (girls), 100m (boys)',
    where: 'An optional event at Ribbon Days',
    cta: { label: 'Ribbon Day events', to: '/events' },
  },
]
