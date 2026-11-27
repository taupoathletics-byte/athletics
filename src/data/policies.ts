/**
 * Club policies shown under /policies. Health & Safety is transcribed from the
 * club's "Taupo Athletics H&S Policy — December 2023". The other three are
 * summaries built from the club's existing published wording (see the FAQ) —
 * replace the copy with the committee's approved policy documents when supplied.
 */
import { clubName, contactEmail, secretaryEmail } from './about'

export interface PolicySection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface Policy {
  slug: string
  /** Short name for the footer menu and the page's tab strip. */
  label: string
  title: string
  summary: string
  /** Shown as "Last reviewed" when the club has confirmed a date. */
  reviewed?: string
  sections: PolicySection[]
}

export const policies: Policy[] = [
  {
    slug: 'safeguarding',
    label: 'Safeguarding',
    title: 'Safeguarding',
    summary: 'Keeping children and young people safe at club nights, events and training.',
    sections: [
      {
        heading: 'Our commitment',
        paragraphs: [
          `${clubName} is committed to providing a safe, welcoming environment for every child and young person who takes part in athletics with us. Safeguarding is everyone's responsibility — committee members, coaches, volunteers, parents and athletes.`,
        ],
      },
      {
        heading: 'How we do this',
        bullets: [
          'Sessions are planned and supervised by our coaches, with parents asked to stay and support at junior sessions.',
          'Coaches hold accredited coaching qualifications for the events they lead.',
          'We follow safe practices for equipment use, warm-ups and group sizes.',
          'Concerns about a child’s safety or wellbeing are taken seriously and handled confidentially.',
        ],
      },
      {
        heading: 'If you have a concern',
        paragraphs: [
          'Talk to any committee member or coach on club night, or email us. If your concern is about a child’s immediate safety, contact the police or Oranga Tamariki first.',
          `Club contact: ${contactEmail}`,
        ],
      },
      {
        heading: 'The full policy',
        paragraphs: [
          'The club’s approved safeguarding policy is available from the committee on request. Ask at the check-in desk or email the secretary.',
        ],
      },
    ],
  },
  {
    slug: 'complaints',
    label: 'Complaints',
    title: 'Complaints',
    summary: 'How to raise a concern with the club, and what happens next.',
    sections: [
      {
        heading: 'We want to hear from you',
        paragraphs: [
          'If something is not right — on a club night, at an event, or in how the club is run — please tell us. Most issues are solved quickly when they are raised early, and feedback helps us make club nights better for everyone.',
        ],
      },
      {
        heading: 'How to raise it',
        bullets: [
          'Talk to a coach or committee member on club night — this is the quickest route for anything happening on the field.',
          'If it is not resolved, or you would rather not raise it in person, email the secretary with what happened, when, and who was involved.',
          'Anything involving the safety or wellbeing of a child is handled under our Safeguarding policy.',
        ],
      },
      {
        heading: 'What happens next',
        paragraphs: [
          'Your concern is passed to the appropriate committee member. We treat complaints confidentially, talk to the people involved, and agree what needs to change. We will come back to you with the outcome.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Email the secretary: ${secretaryEmail}`, `Or the club: ${contactEmail}`],
      },
    ],
  },
  {
    slug: 'refunds',
    label: 'Refunds',
    title: 'Refunds',
    summary: 'How season fees work, and when refunds are not available.',
    sections: [
      {
        heading: 'Season fees',
        paragraphs: [
          'The season fee covers both Term 4 and Term 1, and once you have registered you have the right to attend all season.',
        ],
      },
      {
        heading: 'Changing your mind',
        paragraphs: [
          'We do not give refunds if you or your child changes their mind after registering. If your child decides they no longer want to take part, we suggest giving them a break for a couple of weeks and then coming back for another go — many children settle in after a short break.',
        ],
      },
      {
        heading: 'Grades and caps',
        paragraphs: [
          'Junior grades are capped, and there is no waitlist once a grade is full. Please check the grade is right before registering; our FAQs explain how age groups are worked out.',
        ],
      },
      {
        heading: 'Exceptional circumstances',
        paragraphs: [
          `If there are exceptional circumstances, contact the committee at ${contactEmail} so it can be considered.`,
        ],
      },
    ],
  },
  {
    slug: 'health-and-safety',
    label: 'Health & Safety',
    title: 'Health & Safety',
    summary: 'Our health and safety policy, emergency procedures, and how to report incidents and hazards.',
    reviewed: '6 December 2023 — reviewed annually',
    sections: [
      {
        heading: 'Policy statement',
        paragraphs: [
          'Athletics Taupo has the health and safety of its members as a top priority and it is our intention to make the environment and activities as safe as possible for everyone who engages with our club.',
          'This policy applies to all club members, committee members, coaches, players, visitors and volunteers of the Athletics Taupo Club.',
        ],
      },
      {
        heading: 'To achieve this we will',
        bullets: [
          'Proactively identify hazards and unsafe behaviour and take steps to manage these to as low a level as reasonably practicable.',
          'Communicate and actively promote participation with employees, contractors, members and volunteers to ensure they have the knowledge to maintain a safe club environment.',
          'Have systems in place to record all incidents, near misses or injury as well as systems to ensure these incidents are investigated and changes made to minimise or eliminate any ongoing associated risk.',
          'Ensure our club committee has up-to-date knowledge of workplace health and safety, including understanding the operations of our club and the hazards and risks associated with those operations.',
          'Ensure all activities at the club have appropriate levels of supervision.',
          'Review and continually improve our health and safety systems.',
          'Require our contractors to demonstrate the same commitment to achieving excellence in health and safety performance.',
          'Comply with relevant legislation and regulations.',
        ],
      },
      {
        heading: 'Health and safety — everyone’s responsibility',
        paragraphs: [
          'Health and safety is everyone’s responsibility, and everyone is expected to share in our commitment to work together to keep workers, volunteers, participants and anyone else engaged with our club safe against harm to their health, safety and welfare by eliminating or minimising risk.',
          'All members, workers, volunteers and officers have a duty of care to take all practicable steps to identify and control risks to ensure the safety of everyone involved. Working together we can ensure that any significant hazards to workers are minimised and ensure everyone goes home safely.',
        ],
      },
      {
        heading: 'Emergency procedures',
        paragraphs: [
          'In the case of an emergency event such as fire, earthquake or other event requiring evacuation, all occupants of any of the club’s buildings or related facilities shall cease activities immediately and move to the evacuation area in the middle of the field, via the safest route, assembling at the designated area which is clearly sign-posted.',
        ],
      },
      {
        heading: 'Reporting incidents',
        paragraphs: [
          'All accidents and incidents affecting visitors, members, volunteers or workers on site are to be reported within 24 hours to the Health and Safety Officer and recorded in the Incident Book (located at the sign-in table) using the associated form.',
          'Committee members can record a report directly in the admin portal, under Incident reports.',
        ],
      },
      {
        heading: 'Reporting hazards',
        paragraphs: [
          'This duty of care of all individuals engaged with the club includes the responsibility to stop any task they believe is unsafe or cannot continue in a safe manner, and to report any hazards or risks that they see that may endanger others.',
          'Activity Leaders are required to identify hazards and note them down in the Hazard Book (located at the sign-in table, along with the Incident Book) and date them. The Hazard Book is then reviewed weekly by the H&S officer of the club.',
        ],
      },
      {
        heading: 'Who to talk to',
        paragraphs: [
          'Our Health & Safety Co-ordinator is Jade Putt. Talk to Jade on club night, or email the club.',
        ],
      },
    ],
  },
]

export const policyLinks = policies.map(({ slug, label }) => ({ label, to: `/policies/${slug}` }))

export function policyBySlug(slug?: string) {
  return policies.find((p) => p.slug === slug)
}

export const policyContact = contactEmail
