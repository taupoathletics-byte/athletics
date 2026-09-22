import * as React from 'react'
import { ArrowRight, X } from 'lucide-react'
import { registration } from '@/data/fees'

const KEY = 'ta-announce-dismissed-2026-27'

/**
 * Slim dismissible bar above the header. The dismissal is remembered per
 * browser; storage can throw (private mode, blocked cookies) so every access
 * is guarded and the bar simply shows again if it fails.
 */
export function AnnouncementBar() {
  const [hidden, setHidden] = React.useState(true)

  React.useEffect(() => {
    let dismissed = false
    try {
      dismissed = window.localStorage.getItem(KEY) === '1'
    } catch {
      dismissed = false
    }
    setHidden(dismissed)
  }, [])

  if (!registration.isOpen || hidden) return null

  const dismiss = () => {
    setHidden(true)
    try {
      window.localStorage.setItem(KEY, '1')
    } catch {
      /* storage unavailable — the bar will reappear next visit, which is fine */
    }
  }

  return (
    <div className="bg-primary text-white">
      <div className="container-page flex items-center justify-center gap-3 py-2 text-sm">
        <p className="text-center font-semibold">
          {registration.seasonLabel} registrations are open
          <span className="mx-2 hidden opacity-60 sm:inline">·</span>
          <a
            href={registration.url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 underline decoration-2 underline-offset-2 hover:no-underline"
          >
            Register now
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="ml-auto shrink-0 rounded p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
