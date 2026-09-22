/**
 * Volunteer roles. The old site published this as a single flat PNG, so it was
 * invisible to screen readers, unsearchable and blurry — it is real markup here.
 */
export interface VolunteerRole {
  role: string
  /** What the role entails. */
  entails: string[]
  /** Expected time commitment. */
  commitment: string[]
  footnote?: string
}

export const volunteerRoles: VolunteerRole[] = [
  {
    role: 'Committee Member',
    entails: [
      'Attend regular monthly meetings (Term 4 & Term 1)',
      'Contribute to the overall governance of the club',
      'Assist in decision-making and event planning',
    ],
    commitment: [
      '1 meeting per month in Term 4 and Term 1 (approx. 1.5 hours)',
      'Up to 1 hr per week depending on tasks',
    ],
  },
  {
    role: 'Friend of the Committee',
    entails: [
      'Attend meetings when able (Term 4 & Term 1)',
      'Support Committee Members as needed',
      'Provide feedback and relay ideas from the wider athletics community',
    ],
    commitment: ['Flexible attendance', 'Casual support when needed'],
  },
  {
    role: 'Coach',
    entails: [
      'Plan and deliver weekly training sessions',
      'Encourage and guide children across all age groups',
      'Coordinate with the committee for equipment and setup',
    ],
    commitment: ['Thursdays, 5:00–7:00pm (Term 4 & Term 1)'],
  },
  {
    role: 'Parent Helper',
    entails: [
      'Support coaches with event setup, timing and group management',
      'Help during club events and external meets (e.g. Ribbon Days)',
      'Ensure safety and fun',
    ],
    commitment: [
      'Thursdays, 5:30–7:00pm (Term 4 & Term 1)',
      'Additional support for local events as available — sausage sizzle, timing events, handing out flyers',
    ],
  },
  {
    role: 'Student Helper — Get Set Go',
    entails: [
      'Support coaches with event setup, timing and group management',
      'Assist to deliver Get Set Go to 3–6 year olds',
      'Ensure safety and fun',
    ],
    commitment: ['Thursdays, 5:30–6:30pm (Term 4 & Term 1)'],
    footnote:
      'Volunteer hours can be signed off against Duke of Ed or Student Volunteer awards needed for High School.',
  },
]
