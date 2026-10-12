import { Link } from 'react-router-dom'
import { Mail, MapPin, Clock, Facebook } from 'lucide-react'
import { Marquee, Sticker } from '@/components/athletics/motion'
import { ShotPut } from '@/components/athletics/icons'
import { clubName, contactEmail, secretaryEmail, legal, venue, links, navItems } from '@/data/site'
import { registration } from '@/data/fees'
import { sponsors } from '@/data/sponsors'

const footerLinks = navItems.flatMap((n) => (n.children ? n.children : [n])).filter((n) => n.to)

const heading = 'mb-3 font-display text-xl font-black uppercase tracking-wide text-cream'
const item = 'inline-block py-1 text-cream/70 transition-colors hover:text-signal-light'

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-cream">
      <div className="container-page relative grid gap-10 pb-10 pt-16 md:grid-cols-[1.2fr_1fr_1.2fr_1fr]">
        <div>
          <img src="/logo.svg" alt={`${clubName} logo`} className="h-16 w-16 rounded-full bg-cream p-1" />
          <p className="mt-4 max-w-xs text-sm text-cream/70">
            {clubName} — athletics for ages 3 to 14 at {venue.name}. Term 4 &amp; Term 1.
          </p>
          <div className="mt-6">
            {registration.isOpen && (
              <Sticker text={`REGISTER NOW · ${registration.seasonLabel} · `} href={registration.url} center="Go!" />
            )}
          </div>
        </div>
        <div>
          <h2 className={heading}>Club</h2>
          <ul className="space-y-1 text-sm">
            {footerLinks.map((l) => (
              <li key={l.label}>
                <Link className={item} to={l.to!}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link className={item} to="/my-results">
                My results (family code)
              </Link>
            </li>
            <li>
              <Link className={item} to="/check-in">
                Self check-in
              </Link>
            </li>
            <li>
              <a className={item} href={links.getSetGoPortal}>
                Get Set Go lesson plans
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className={heading}>Contact</h2>
          <ul className="space-y-1 text-sm text-cream/70">
            <li className="flex items-center gap-2 py-1">
              <Mail className="h-4 w-4 shrink-0 text-signal-light" aria-hidden />
              <a className={item} href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </li>
            <li className="flex items-center gap-2 py-1">
              <Mail className="h-4 w-4 shrink-0 text-signal-light" aria-hidden />
              <a className={item} href={`mailto:${secretaryEmail}`}>
                {secretaryEmail}
              </a>
            </li>
            <li className="flex items-center gap-2 py-1">
              <MapPin className="h-4 w-4 shrink-0 text-signal-light" aria-hidden /> {venue.name}, {venue.address}
            </li>
            <li className="flex items-center gap-2 py-1">
              <Clock className="h-4 w-4 shrink-0 text-signal-light" aria-hidden /> Thursdays from 5:30pm
            </li>
            <li className="flex items-center gap-2 py-1">
              <Facebook className="h-4 w-4 shrink-0 text-signal-light" aria-hidden />
              <a className={item} href={links.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className={heading}>Supporters</h2>
          <ul className="space-y-1 text-sm">
            {sponsors.map((s) => (
              <li key={s.name}>
                {s.url ? (
                  <a className={item} href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.name}
                  </a>
                ) : (
                  <span className="inline-block py-1 text-cream/70">{s.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-page py-4 text-center text-sm text-cream/55">
          <p>
            © {new Date().getFullYear()} {legal.name} · {legal.societyNumber} · {legal.taxExempt}
          </p>
        </div>
      </div>

      {/* Giant sign-off, like Sixes' "PARTY CRICKET" — decorative */}
      <div aria-hidden>
      <Marquee
        className="pb-2 text-white"
        items={[0, 1, 2].map(() => (
          <span className="display-xl whitespace-nowrap text-[clamp(5rem,16vw,15rem)] leading-[0.8]">Taupō Athletics</span>
        ))}
        separator={<ShotPut className="h-[clamp(3rem,9vw,8rem)] w-[clamp(3rem,9vw,8rem)] shrink-0" />}
        itemClassName="gap-10 pr-10"
      />
      </div>
    </footer>
  )
}
