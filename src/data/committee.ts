/**
 * Committee & coaches, 2026–27 season — the single source of truth for the
 * committee, used by both the Home page and the Meet Our Team page.
 *
 * `photo` is a path under /public (e.g. '/team/tia.png'). Leave undefined to
 * show a friendly initials placeholder until a real headshot is supplied.
 */

export type Person = {
  name: string;
  role: string;
  /** Optional second line (e.g. an additional role). */
  extra?: string;
  photo?: string;
  /** Short profile, shown in the dialog when a card is opened. */
  bio?: string;
  /** The club's designed profile card image, shown inside the dialog. */
  card?: string;
  /** Q&A transcribed from that card, so the words are real text for search
   *  and screen readers rather than pixels. */
  qa?: { q: string; a: string }[];
};

export type PeopleGroup = {
  id: 'committee' | 'getsetgo' | 'friends';
  title: string;
  /** Avatar tint for this group, so the page is not a wall of identical blue. */
  tone: 'blue' | 'teal' | 'neutral';
  people: Person[];
};

export const committee: PeopleGroup[] = [
  {
    id: 'committee',
    title: 'The Committee',
    tone: 'blue',
    people: [
      {
        name: 'Tia Rakei',
        role: 'Chairperson',
        extra: 'Throws coach',
        card: '/team/tia.png',
        qa: [
          {
            q: 'Proudest moment at athletics?',
            a: 'Winning \u201cClub Contributor\u201d of the year award at the sports awards last year. That was pretty cool.',
          },
          { q: 'Favourite event at athletics?', a: 'Discus' },
          { q: 'Favourite ice cream flavour?', a: 'Chocolate \u2014 like to keep it simple' },
        ],
      },
      {
        name: 'Shiree Rakei',
        role: 'Treasurer',
        card: '/team/shiree.png',
        qa: [
          {
            q: 'Proudest moment at athletics?',
            a: 'Seeing the growth in the club over the last few years and the excited tamariki who keep coming back',
          },
          { q: 'Favourite event at athletics?', a: 'Long jump!' },
          { q: 'Favourite ice cream flavour?', a: 'Gotta be mint or orange choc chip' },
        ],
      },
      {
        name: 'Leah White',
        role: 'Coach Coordinator',
        extra: 'Committee member & coach',
        card: '/team/leah.png',
        qa: [
          {
            q: 'Proudest moment at athletics?',
            a: 'Reaching our goal for attendance at the Children\u2019s Champs in March 2025 and the athletes doing exceptionally well',
          },
          { q: 'Favourite event at athletics?', a: 'I can\u2019t go past the 100m \u2014 fast & furious' },
          { q: 'Favourite ice cream flavour?', a: 'That\u2019s easy \u2014 cookies & cream!' },
        ],
      },
      {
        name: 'Jade Putt',
        role: 'Health & Safety Co-ordinator',
        card: '/team/jade.png',
        qa: [
          {
            q: 'Proudest moment at athletics?',
            a: 'Seeing registrations full each year. Sad for the people who miss out, but a full club means we must be doing something right!',
          },
          { q: 'Favourite event at athletics?', a: 'High jump \u2014 love seeing how high the kids can go.' },
          { q: 'Favourite ice cream flavour?', a: 'Orange choc chip all day!' },
        ],
      },
      {
        name: 'Ashleigh Carlson',
        role: 'Records & Registration Co-ordinator',
        extra: 'Get Set Go coach & co-ordinator',
        card: '/team/ash.png',
        qa: [
          {
            q: 'Proudest moment at athletics?',
            a: 'Watching how confident the kids become from the start of a season to the end',
          },
          { q: 'Favourite event at athletics?', a: 'Sprints! The kids go wild for it.' },
          { q: 'Favourite ice cream flavour?', a: 'Salted caramel!' },
        ],
      },
      {
        // TODO confirm: Noel's own profile card reads "Friend of the
        // Committee", but the current committee list has him as a Committee
        // Member. The card may date from 2025/26.
        name: 'Noel Bennett',
        role: 'Committee Member',
        card: '/team/noel.png',
        qa: [
          {
            q: 'Proudest moment at athletics?',
            a: 'Too many to name since 1971, but receiving the Lake Taup\u014d Sports Advisory \u201cContribution to Sport\u201d 2010 award \u2014 more recently the performance of all our team members at the Waikato Children\u2019s Champs at Tauranga in 2025.',
          },
          { q: 'Most moving moment at athletics?', a: 'Having 100+ kids sing Happy Birthday for my 80th' },
          { q: 'Favourite event at athletics?', a: 'Any middle distance event!' },
          { q: 'Favourite ice cream flavour?', a: 'Boysenberry, boosted by my home grown blackberries' },
        ],
      },
      { name: 'Ben McHale', role: 'Committee Member' },
      { name: 'Erin Lempriere-Webb', role: 'Committee Member' },
      { name: 'Nicola', role: 'Secretary' },
    ],
  },
  {
    id: 'getsetgo',
    title: 'Get Set Go Coaches',
    tone: 'teal',
    people: [
      {
        name: 'Erin James',
        role: 'Get Set Go Coach',
        extra: 'Friend of the Committee',
        card: '/team/erin.png',
        qa: [
          { q: 'Proudest moment at athletics?', a: 'Seeing all the kids try things and learn new skills.' },
          { q: 'Favourite event at athletics?', a: 'The marathon' },
          { q: 'Favourite ice cream flavour?', a: 'Chocolate!' },
        ],
      },
      { name: 'Esme', role: 'Get Set Go Assistant Coach' },
      { name: 'Jordyn', role: 'Get Set Go Assistant Coach' },
      { name: 'Libby', role: 'Get Set Go Assistant Coach' },
    ],
  },
  {
    id: 'friends',
    title: 'Friends of the Committee',
    tone: 'neutral',
    people: [
      {
        name: 'Murray Reid',
        role: 'Friend of the Committee',
        extra: 'Track coach',
        card: '/team/murray.png',
        qa: [
          { q: 'Proudest moment at athletics?', a: 'How do you pick one after all these years?' },
          { q: 'Favourite event at athletics?', a: 'Track! Anywhere they use the start gun :)' },
          { q: 'Favourite ice cream flavour?', a: 'Hokey pokey \u2014 I\u2019m a traditionalist!' },
        ],
      },
    ],
  },
];
