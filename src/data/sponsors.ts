/**
 * Sponsors and supporters.
 *
 * `logo` is a path under /public. Leave it undefined and the name renders as a
 * styled plate instead — never a broken image. The logo files below were
 * supplied by the club and live in /public/sponsors.
 *
 * `logoBackground: 'dark'` is for artwork that is white-on-black and would
 * disappear on a white card — Cheal's logo is exactly that.
 *
 * Every URL below was supplied by the club alongside its logo.
 */
export interface Sponsor {
  name: string
  url?: string
  note?: string
  logo?: string
  logoBackground?: 'light' | 'dark'
  tier?: 'principal' | 'supporting' | 'inkind'
}

export const sponsors: Sponsor[] = [
  {
    name: 'Grassroots Trust',
    url: 'https://www.grassrootstrust.co.nz/',
    tier: 'principal',
    logo: '/sponsors/grassroots-trust.png',
    note: 'Funding to upgrade equipment, plus a marquee that keeps our team out of the elements at Ribbon Days and competitions.',
  },
  {
    name: 'Cheal Consultants',
    url: 'https://www.cheal.co.nz/',
    tier: 'supporting',
    logo: '/sponsors/cheal.jpg',
    logoBackground: 'dark',
    note: 'Engineers, surveyors and planners. Sponsor of our 2025 Ribbon Day.',
  },
  {
    name: 'Contact Energy',
    url: 'https://contact.co.nz/',
    tier: 'supporting',
    logo: '/sponsors/contact-energy.jpg',
    note: 'Sponsor of our 2025 Ribbon Day.',
  },
  {
    name: 'DPA Chartered Accountants',
    url: 'https://www.dpa.co.nz/',
    tier: 'inkind',
    logo: '/sponsors/dpa.png',
    note: 'The use of their meeting facilities throughout the year.',
  },
]
