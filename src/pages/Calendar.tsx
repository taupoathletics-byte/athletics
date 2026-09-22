import { ExternalLink } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { awbopCalendarUrl } from '@/data/site'

/**
 * The AWBoP competition calendar, embedded.
 *
 * athleticswaikatobayofplenty.org.nz sends no X-Frame-Options and no CSP
 * frame-ancestors, so framing it is allowed. It must also be listed in the
 * `frame-src` policy in vercel.json — our own CSP silently blocks any frame
 * origin that is not named there, which is what broke this page once already.
 */
export default function Calendar() {
  return (
    <>
      <PageHero
        eyebrow="Regional fixtures"
        title="AWBoP Calendar"
        subtitle="Updates of dates are available via the Athletics Waikato Bay of Plenty events calendar."
        photo={37}
      />

      <section className="container-page section-pad">
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-white p-2 shadow-soft">
          <iframe
            src={awbopCalendarUrl}
            title="Athletics Waikato Bay of Plenty competition calendar"
            loading="lazy"
            className="h-[929px] w-full border-0"
            allowFullScreen
          />
        </div>

        {/* Framed third-party pages can be blocked client-side — always offer the way out. */}
        <p className="mt-4 text-sm text-on-surface-variant">
          Calendar not showing? Ad-blockers and strict privacy settings sometimes block embedded pages.{' '}
          <a
            href={awbopCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline"
          >
            Open the AWBoP calendar
            <ExternalLink className="ml-1 inline h-3.5 w-3.5" aria-hidden />
          </a>
        </p>
      </section>
    </>
  )
}
