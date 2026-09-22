import { sponsors } from '@/data/sponsors'

/**
 * Cell background. Logos that are white artwork on black (Cheal) need a dark
 * cell or they vanish; everything else sits on white. No grayscale filter —
 * this is a thank-you, so every sponsor shows in full colour.
 */
function cell(s: { logoBackground?: 'light' | 'dark' }) {
  return s.logoBackground === 'dark' ? 'bg-sponsor-dark' : 'bg-white'
}

/**
 * Sponsor logos as a static grid. The old marquee cut the descriptive pills
 * mid-word at the container edges ("ibbon Day.", "and co"), so the names now
 * stand alone and the descriptions live in the list underneath.
 */
export function SponsorStrip() {
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sponsors.map((s) => {
          const inner = (
            <>
              {s.logo ? (
                <img
                  src={s.logo}
                  alt={s.name}
                  loading="lazy"
                  className="h-12 w-full object-contain"
                />
              ) : (
                <span
                  className={`text-center font-display text-base font-bold leading-tight ${
                    s.logoBackground === 'dark' ? 'text-white' : 'text-primary'
                  }`}
                >
                  {s.name}
                </span>
              )}
            </>
          )
          return (
            <li key={s.name}>
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.name} (opens in a new tab)`}
                  className={`flex h-24 items-center justify-center rounded-xl border border-outline-variant px-4 py-3 shadow-soft-sm transition-shadow hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${cell(s)}`}
                >
                  {inner}
                </a>
              ) : (
                <div className={`flex h-24 items-center justify-center rounded-xl border border-outline-variant px-4 py-3 shadow-soft-sm ${cell(s)}`}>
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {sponsors
          .filter((s) => s.note)
          .map((s) => (
            <div key={s.name} className="text-sm">
              <dt className="inline font-semibold text-on-surface">{s.name} — </dt>
              <dd className="inline text-on-surface-variant">{s.note}</dd>
            </div>
          ))}
      </dl>
    </div>
  )
}
