import { useState } from 'react'
import { Facebook } from 'lucide-react'
import { clubName, links } from '@/data/site'

/**
 * Facebook Page Plugin, embedded as a plain iframe.
 *
 * Deliberately the iframe form and NOT the JS SDK: the SDK injects third-party
 * tracking across the whole site, whereas the iframe is scoped to this one box.
 *
 * Sizing notes:
 * - 500 is the plugin's documented maximum for the `width` parameter, so it is
 *   passed as the fallback; `adapt_container_width` then lets the frame fill the
 *   full width of whatever container it is given.
 * - `small_header` and `show_facepile=false` drop the cover image and the
 *   follower avatar row, which together consumed ~150px above the first post.
 * - 800px tall shows roughly three posts before the plugin's own scrollbar.
 *
 * The frame is full width: it previously shared a row with a text column, which
 * squeezed it narrow enough to clip the posts mid-word.
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

      {/* Below lg the tall frame collapses behind a disclosure; at lg it is open. */}
      <button
        type="button"
        className="mt-4 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low lg:hidden"
        aria-expanded={open}
        aria-controls="facebook-feed-frame"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide the Facebook feed' : 'Show the Facebook feed'}
      </button>

      <div id="facebook-feed-frame" className={open ? 'mt-5' : 'mt-5 hidden lg:block'}>
        <iframe
          src={PLUGIN_SRC}
          title={`${clubName} on Facebook`}
          loading="lazy"
          width={PLUGIN_WIDTH}
          height={PLUGIN_HEIGHT}
          style={{ height: PLUGIN_HEIGHT }}
          className="w-full rounded-xl border border-outline-variant bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        />
      </div>
    </section>
  )
}
