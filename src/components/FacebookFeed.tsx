import { useState } from 'react'
import { ExternalLink, Facebook } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { clubName, links } from '@/data/site'

/**
 * Facebook Page Plugin, embedded as a plain iframe.
 *
 * Deliberately the iframe form and NOT the JS SDK: the SDK injects third-party
 * tracking across the whole site, whereas the iframe is scoped to this one box.
 *
 * Sizing notes — the plugin's own chrome is what starves the feed:
 *   - 500px is the widest the Page Plugin allows (range 180–500). At 340 the
 *     post text wraps to ~30 characters and truncates mid-sentence.
 *   - `small_header` and `show_facepile=false` hand vertical room back to the
 *     posts; the follower count and avatar row are not what anyone comes for.
 *   - `adapt_container_width` lets it shrink on narrow screens.
 *   - 800px tall shows roughly three posts before the plugin's own scrollbar.
 *
 * Club night cancellations are announced here by 4pm on Thursday, so this is
 * load-bearing rather than decoration — a text fallback is always rendered,
 * even when the frame is collapsed, blocked or offline.
 */
const PLUGIN_WIDTH = 500
const PLUGIN_HEIGHT = 800

const PLUGIN_SRC =
  'https://www.facebook.com/plugins/page.php?' +
  new URLSearchParams({
    href: links.facebook,
    tabs: 'timeline',
    width: String(PLUGIN_WIDTH),
    height: String(PLUGIN_HEIGHT),
    small_header: 'true',
    adapt_container_width: 'true',
    hide_cover: 'true',
    show_facepile: 'false',
  }).toString()

export function FacebookFeed({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <section className={className} aria-labelledby="facebook-feed-heading">
      <div className="flex items-center gap-2">
        <Facebook className="h-5 w-5 text-primary" aria-hidden />
        <h2 id="facebook-feed-heading" className="font-display text-2xl font-bold text-on-surface">
          Latest from Facebook
        </h2>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,500px)_1fr] lg:items-start">
        <div>
          {/* Below lg the tall frame collapses behind a disclosure; at lg it is open. */}
          <button
            type="button"
            className="rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low lg:hidden"
            aria-expanded={open}
            aria-controls="facebook-feed-frame"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide the Facebook feed' : 'Show the Facebook feed'}
          </button>

          <div id="facebook-feed-frame" className={open ? 'mt-4' : 'mt-4 hidden lg:mt-0 lg:block'}>
            <iframe
              src={PLUGIN_SRC}
              title={`${clubName} on Facebook`}
              loading="lazy"
              width={PLUGIN_WIDTH}
              height={PLUGIN_HEIGHT}
              className="h-[800px] w-full rounded-xl border border-outline-variant bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>

        <div>
          <p className="text-on-surface-variant">
            Our Facebook page is the club noticeboard. Weather calls, cancellations, event entries and
            results all land there first, usually before anywhere else.
          </p>

          <p className="mt-4 font-semibold text-on-surface">
            Club night cancellations are announced by 4pm on Thursday.
          </p>

          <a
            href={links.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonVariants({ variant: 'outline' })} mt-5`}
          >
            Open our Facebook page
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>

          <p className="mt-5 text-sm text-on-surface-variant">
            Feed not loading? Ad-blockers and tracking protection sometimes hide it, and the plugin only
            shows the most recent posts — the full page is always on Facebook.
          </p>
        </div>
      </div>
    </section>
  )
}
