/**
 * Club identity, venue, contact details, legal registration and external links.
 * Single source of truth for the "about the club" facts used across the site.
 */

export const clubName = 'Taupō Athletics Club'
export const tagline = 'Fun, whānau-friendly athletics at Owen Delany Park'
export const mission =
  'To promote, develop, foster and administer the sport of athletics in all its various disciplines for the benefit of our members.'

/**
 * The club has confirmed the park is spelled "Delany" (one 'e') — not the
 * "Delaney" used on the old Sporty site. The street is still to be confirmed:
 * `address` is the only line that needs changing.
 */
export const venue = {
  name: 'Owen Delany Park',
  address: 'Centennial Drive, Taupō',
  mapsQuery: 'Owen Delany Park, Taupō',
}

export const contactEmail = 'taupoathletics@gmail.com'
export const secretaryEmail = 'secretary@taupoathletics.org.nz'

export const legal = {
  name: 'Taupō Athletics Club Inc.',
  societyNumber: 'Incorporated Society No. 50018420',
  taxExempt: 'Tax Exempt Organisation (Amateur Games) 147-001-657',
}

export const links = {
  /** Direct GameDay registration form. Also in `registration.url` (fees.ts). */
  register: 'https://regoform.mygameday.app/#/AIYMtqSliPYrpZAIT5/Ah1tUjkzXge5s7Htn7',
  facebook: 'https://www.facebook.com/taupoathletics',
  awbop: 'https://athleticswaikatobayofplenty.org.nz/competition/events/',
  /** Club singlets are ordered direct from Code Sport. */
  codesport: 'https://codesport.co.nz/catalog/TaupoAthleticsClub%20-1107583.htmx',
  grassroots: 'https://www.grassrootstrust.co.nz/trust/',
  cheal: 'https://www.cheal.co.nz/',
  getSetGoPortal: '/getsetgo/',
}
