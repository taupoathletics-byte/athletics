import { Link } from 'react-router-dom'
import { Mail, MapPin, Clock, Facebook } from 'lucide-react'
import { clubName, contactEmail, secretaryEmail, legal, venue, links, navItems } from '@/data/site'
import { sponsors } from '@/data/sponsors'

const footerLinks = navItems.flatMap((n) => (n.children ? n.children : [n])).filter((n) => n.to)

export function Footer() {
  return (
    <footer className="mt-16 bg-inverse-surface text-inverse-on-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div>
          <img src="/logo.svg" alt={`${clubName} logo`} className="h-16 w-16 rounded-full bg-white p-1" />
          <p className="mt-4 text-sm text-white/70">
            {clubName} — athletics for ages 3 to 14 at {venue.name}. Term 4 &amp; Term 1.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Club</h4>
          <ul className="space-y-2 text-sm text-white/70">
            {footerLinks.map((l) => (
              <li key={l.label}>
                <Link className="hover:text-white" to={l.to!}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a className="hover:text-white" href={links.getSetGoPortal}>
                Get Set Go Lesson Plans
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Contact</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> {contactEmail}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> {secretaryEmail}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> {venue.name}, {venue.address}
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" /> Thursdays from 5:30pm
            </li>
            <li className="flex items-center gap-2">
              <Facebook className="h-4 w-4 shrink-0" />
              <a className="hover:text-white" href={links.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Supporters</h4>
          <ul className="space-y-2 text-sm text-white/70">
            {sponsors.map((s) => (
              <li key={s.name}>
                {s.url ? (
                  <a className="hover:text-white" href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.name}
                  </a>
                ) : (
                  s.name
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4">
        <div className="container-page text-center text-sm text-white/60">
          <p>
            © {new Date().getFullYear()} {legal.name}
          </p>
          <p className="mt-1">
            {legal.societyNumber} · {legal.taxExempt}
          </p>
        </div>
      </div>
    </footer>
  )
}
