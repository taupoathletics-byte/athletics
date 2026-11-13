import * as React from 'react'
import { CloudRain } from 'lucide-react'

interface Notice {
  date: string
  message: string
  type: string
}

/**
 * Today's club-night notice (e.g. a weather cancellation), posted from the
 * admin portal. Shown above everything on every page until the end of the
 * night; nothing renders when there is no notice or the check fails.
 */
export function ClubNotice() {
  const [notice, setNotice] = React.useState<Notice | null>(null)

  React.useEffect(() => {
    fetch('/api/notice')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotice(d && d.notice ? d.notice : null))
      .catch(() => setNotice(null))
  }, [])

  if (!notice) return null
  return (
    <div role="alert" className="bg-signal text-signal-ink">
      <div className="container-page flex items-start justify-center gap-3 py-3 text-sm sm:text-base">
        <CloudRain className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p className="text-center font-semibold">{notice.message}</p>
      </div>
    </div>
  )
}
