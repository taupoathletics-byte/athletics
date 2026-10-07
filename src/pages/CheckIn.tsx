import { useState } from 'react'
import { CheckCircle2, QrCode } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'
import { clubNights } from '@/data/clubNights'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The club night relevant to "now": tonight if it's a club night, else the most recent one. */
function clubNightForToday() {
  const today = todayIso()
  if (clubNights.some((n) => n.iso === today)) return today
  const past = clubNights.filter((n) => n.iso <= today)
  if (past.length) return past[past.length - 1].iso
  return clubNights[0]?.iso || today
}

/**
 * Public self check-in — the target of the QR poster. A member types their full
 * name and is marked present; no roster is shown and no login is needed.
 */
export default function CheckIn() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [already, setAlready] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2) {
      setStatus('error')
      setMessage('Enter your full name.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, date: clubNightForToday() }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 404) {
        setStatus('error')
        setMessage(json.error || "We couldn't find that name.")
        return
      }
      if (!res.ok) {
        setStatus('error')
        setMessage(json.error || 'Something went wrong. Try again.')
        return
      }
      setStatus('ok')
      setAlready(Boolean(json.already))
      setMessage(json.firstName || '')
    } catch {
      setStatus('error')
      setMessage('Could not reach the server. Try again shortly.')
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Club night"
        title="Check in"
        subtitle="Welcome! Type your full name to mark yourself here tonight."
        photo={38}
      />

      <section className="container-page section-pad">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-gutter-md text-center shadow-soft">
          {status === 'ok' ? (
            <div>
              <CheckCircle2 className="mx-auto h-12 w-12 text-tertiary" aria-hidden />
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">
                {already ? 'Already checked in' : "You're checked in"}
                {message ? `, ${message}!` : '!'}
              </h2>
              <p className="mt-2 text-on-surface-variant">See you on the field — have a great night!</p>
              <button
                type="button"
                className={`${buttonVariants({ variant: 'outline' })} mt-4`}
                onClick={() => {
                  setStatus('idle')
                  setName('')
                }}
              >
                Check in someone else
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <QrCode className="mx-auto h-10 w-10 text-primary" aria-hidden />
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">Self check-in</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Scan and go — no sign-in needed.</p>
              <label htmlFor="checkin-name" className="sr-only">
                Your full name
              </label>
              <input
                id="checkin-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Leo Carlson"
                autoComplete="name"
                autoFocus
                className="mt-5 w-full rounded-xl border-2 border-outline-variant bg-white px-4 py-3 text-lg text-on-surface outline-none transition-colors focus:border-primary"
              />
              <button
                type="submit"
                className={`${buttonVariants({ size: 'lg' })} mt-4 w-full`}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Checking in…' : 'Check in'}
              </button>
              {status === 'error' && <p className="mt-3 text-sm font-semibold text-error">{message}</p>}
            </form>
          )}
        </div>
      </section>
    </>
  )
}
