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

const RIBBON: Record<number, string> = {
  3: '2 races, any distance',
  4: '2 races, any distance',
  5: '40m, 60m, Shuttle Relay',
  6: '40m, 60m, Shuttle Relay',
  7: '60m, 100m, 200m, Long Jump, Shot, Discus, 4x100m Relay',
  8: '60m, 100m, 200m, Long Jump, Shot, Discus, 4x100m Relay',
  9: '60m, 100m, 200m, 800m, Long Jump, Shot, Discus, 4x100m Relay',
  10: '100m, 200m, 400m, 800m, 1500m, 1200m Race Walk, Long Jump, High Jump, Shot, Discus, 4x100m Relay',
  11: '100m, 200m, 400m, 800m, 1500m, 1200m Race Walk, Long Jump, High Jump, Shot, Discus, 4x100m Relay; 70m Hurdles',
  12: '100m, 200m, 400m, 800m, 1500m, 80m Hurdles, 1200m Walk, Long Jump, High Jump, Shot, Discus, 4x100m Relay',
  13: '100m, 200m, 400m, 800m, 1500m, 80m Hurdles, 1600m Walk, Long Jump, High Jump, Triple Jump, Shot, Discus, 4x100m Relay',
  14: '100m, 200m, 400m, 800m, 1500m, 100m Hurdles, 2000m Walk, Long Jump, High Jump, Triple Jump, Shot, Discus, 4x100m Relay',
}

export function gradeForBirthYear(birthYear: number): GradeInfo | undefined {
  const age = competitionYear - birthYear
  if (age < 3 || age > 14) return undefined
  return {
    age,
    gradeLabel: age <= 4 ? `Tiny Tots (Grade ${age})` : `Grade ${age}`,
    // Ribbon Days call grades 3 & 4 "Tiny Tots"; club nights call 3–6 "Get Set Go".
    programme: age <= 6 ? 'Get Set Go (3–6 yrs)' : 'Club night group: 7 yrs +',
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
