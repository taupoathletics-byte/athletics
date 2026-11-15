/**
 * Grade = the athlete's age at 31 December of the competition year.
 * A child's grade stays the same all season regardless of a birthday after
 * that date. Powers the "What grade is my child?" finder on Registration.
 */
import { capForGrade, feeForGrade, type GradeCap, type FeeRow } from './fees'
import { clubNightGroupForGrade, type ClubNightGroup } from './clubNights'

export const competitionYear = 2026

export interface GradeInfo {
  age: number
  /** e.g. "Grade 5", or "Tiny Tots (Grade 3)" for the youngest two. */
  gradeLabel: string
  /** The club-night programme this grade belongs to. */
  programme: string
  ribbon: string
  fee?: FeeRow
  group?: ClubNightGroup
  cap?: GradeCap
}

// Ribbon Day events per grade, from the club's Information Booklet, as
// corrected by the club (Nov 2026): no walks, no hurdles for Grades 10–11, and
// Grades 3–6 events vary by host club. Relays are often 4x100m but some clubs
// run a different format, so they're listed simply as "Relay".
const RIBBON: Record<number, string> = {
  3: 'Usually a sprint or two and a relay — events and distances vary by host club',
  4: 'Usually a sprint or two and a relay — events and distances vary by host club',
  5: 'Usually a sprint or two and a relay — events and distances vary by host club',
  6: 'Usually a sprint or two and a relay — events and distances vary by host club',
  7: '60m, 100m, 200m, Long Jump, Shot Put, Discus, Relay',
  8: '60m, 100m, 200m, Long Jump, Shot Put, Discus, Relay',
  9: '60m, 100m, 200m, 800m, Long Jump, Shot Put, Discus, Relay',
  10: '100m, 200m, 400m, 800m, 1500m, Long Jump, High Jump, Shot Put, Discus, Relay',
  11: '100m, 200m, 400m, 800m, 1500m, Long Jump, High Jump, Shot Put, Discus, Relay',
  12: '100m, 200m, 400m, 800m, 1500m, 80m Hurdles, Long Jump, High Jump, Shot Put, Discus, Relay',
  13: '100m, 200m, 400m, 800m, 1500m, 80m Hurdles, Long Jump, High Jump, Shot Put, Discus, Relay',
  14: '100m, 200m, 400m, 800m, 1500m, 80m Hurdles (girls) or 100m Hurdles (boys), Long Jump, High Jump, Shot Put, Discus, Relay',
}

export function gradeForBirthYear(birthYear: number): GradeInfo | undefined {
  const age = competitionYear - birthYear
  if (age < 3 || age > 14) return undefined
  return {
    age,
    gradeLabel: age <= 4 ? `Tiny Tots (Grade ${age})` : `Grade ${age}`,
    // Ribbon Days call grades 3 & 4 "Tiny Tots"; club nights are ASB Get Set Go (3–6) and ASB Run Jump Throw (7–14).
    programme: age <= 6 ? 'ASB Get Set Go (Grades 3–6)' : 'ASB Run Jump Throw (Grades 7–14)',
    ribbon: RIBBON[age],
    fee: feeForGrade(age),
    group: clubNightGroupForGrade(age),
    cap: capForGrade(age),
  }
}

/** Birth years that map to grades 3–14 in the competition year. */
export const birthYearOptions = Array.from(
  { length: 12 },
  (_, i) => competitionYear - 14 + i,
)
