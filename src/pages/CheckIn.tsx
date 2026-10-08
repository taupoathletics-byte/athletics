import { useEffect, useRef, useState } from 'react'
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

type Suggestion = { name: string; firstName: string }

/**
 * Public self check-in — the target of the QR poster. A member starts typing
 * their name, taps it from the suggestions, and is marked present; no login is
 * needed.
 */
export default function CheckIn() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [already, setAlready] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounce = useRef<number | undefined>(undefined)
  const boxRef = useRef<HTMLDivElement>(null)

  function search(q: string) {
    window.clearTimeout(debounce.current)
    if (!q.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounce.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/checkin?q=${encodeURIComponent(q.trim())}`)
        const json = await res.json().catch(() => ({}))
        setSuggestions((json.names as Suggestion[]) || [])
        setOpen(true)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, 200)
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function pick(s: Suggestion) {
    setName(s.name)
    setSuggestions([])
    setOpen(false)
  }

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
        subtitle="Welcome! Type your name to mark yourself here tonight."
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
              <div className="relative mt-5" ref={boxRef}>
                <input
                  id="checkin-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    search(e.target.value)
                  }}
                  placeholder="Start typing your name…"
                  autoComplete="off"
                  autoCapitalize="words"
                  autoFocus
                  className="w-full rounded-xl border-2 border-outline-variant bg-white px-4 py-3 text-lg text-on-surface outline-none transition-colors focus:border-primary"
                />
                {open && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-xl border border-outline-variant bg-white py-1 text-left shadow-soft">
                    {suggestions.map((s) => (
                      <li key={s.name}>
                        <button
                          type="button"
                          onClick={() => pick(s)}
                          className="w-full px-4 py-2 text-left text-lg text-on-surface transition-colors hover:bg-primary/10"
                        >
                          {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
