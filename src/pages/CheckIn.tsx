import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, QrCode } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'
import { clubNights, formatClubNightLabel } from '@/data/clubNights'

const NZ_DATE_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' })
const NZ_TIME_FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', hour: 'numeric', minute: 'numeric' })

/** The current instant read as New Zealand wall-clock time (NZST/NZDT). */
function nzNow(now = new Date()) {
  const d = NZ_DATE_FMT.formatToParts(now)
  const t = NZ_TIME_FMT.formatToParts(now)
  const part = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    iso: `${part(d, 'year')}-${part(d, 'month')}-${part(d, 'day')}`,
    minutes: Number(part(t, 'hour')) * 60 + Number(part(t, 'minute')),
  }
}

/** The club night relevant to "now": tonight (from 12:30pm NZ) if it's a club night, else the most recent one. */
const OPEN_MINUTES = 12 * 60 + 30 // 12:30pm NZ, when the check-in QR goes live

type CheckinState = { open: true; date: string } | { open: false; label: string }

/** Whether check-in is open now, and the club night to record attendance against. */
function checkinState(now = new Date()): CheckinState {
  const nz = nzNow(now)
  const today = nz.iso
  const nowMin = nz.minutes

  // Tonight is a club night: check-in opens at 12:30pm NZ.
  if (clubNights.some((n) => n.iso === today)) {
    if (nowMin >= OPEN_MINUTES) return { open: true, date: today }
    return { open: false, label: 'Check-in opens at 12:30pm today.' }
  }

  // Not a club night: a late check-in for the most recent night (up to a week).
  const past = clubNights.filter((n) => n.iso < today)
  const mostRecent = past[past.length - 1]
  if (mostRecent) {
    const age = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${mostRecent.iso}T00:00:00Z`)) / 86400000)
    if (age <= 7) return { open: true, date: mostRecent.iso }
  }

  const next = clubNights.find((n) => n.iso > today) || clubNights[0]
  return { open: false, label: next ? `Check-in opens ${formatClubNightLabel(next.iso)} at 12:30pm.` : 'Check-in is closed for the season.' }
}

/** The API returns first + last name (so parents can tell children apart) — never ages or the roster. */
type Suggestion = { id: string; label: string; firstName: string }
type CheckResult = { name: string; firstName: string | null; status: 'ok' | 'already' | 'notfound' }

/**
 * Public self check-in — the target of the QR poster. A family types each
 * member's name, taps it from the suggestions, and checks the whole group in
 * together; no login is needed.
 */
export default function CheckIn() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Suggestion[]>([])
  const [result, setResult] = useState<{ created: number; already: number; results: CheckResult[] } | null>(null)
  const debounce = useRef<number | undefined>(undefined)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function search(q: string) {
    window.clearTimeout(debounce.current)
    if (q.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounce.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/checkin?q=${encodeURIComponent(q.trim())}`)
        const json = await res.json().catch(() => ({}))
        setSuggestions(((json.names as Suggestion[]) || []).filter((n) => n.id))
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
    if (!selected.some((x) => x.id === s.id)) setSelected((prev) => [...prev, s])
    setName('')
    setSuggestions([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function remove(i: number) {
    setSelected((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected.length) return
    setStatus('loading')
    setMessage('')
    try {
      const st = checkinState()
      if (!st.open) {
        setStatus('error')
        setMessage(st.label)
        return
      }
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected.map((s) => s.id), date: st.date }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(json.error || 'Something went wrong. Try again.')
        return
      }
      setResult(json as { created: number; already: number; results: CheckResult[] })
      setStatus('done')
    } catch {
      setStatus('error')
      setMessage('Could not reach the server. Try again shortly.')
    }
  }

  function reset() {
    setStatus('idle')
    setName('')
    setSelected([])
    setResult(null)
    setMessage('')
  }

  const state = checkinState()

  return (
    <>
      <PageHero
        eyebrow="Club night"
        title="Check in"
        subtitle="Welcome! Type each name to check your family in together."
        photo={38}
      />

      <section className="container-page section-pad">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-gutter-md text-center shadow-soft">
          {!state.open ? (
            <div className="py-1">
              <QrCode className="mx-auto h-10 w-10 text-primary" aria-hidden />
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">Check-in isn't open yet</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{state.label}</p>
            </div>
          ) : status === 'done' && result ? (
            <div>
              <CheckCircle2 className="mx-auto h-12 w-12 text-tertiary" aria-hidden />
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">
                {result.created === 0
                  ? 'Already checked in'
                  : `${result.created} checked in`}
                {result.already > 0 ? ` · ${result.already} already in` : ''}
              </h2>
              <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-sm">
                {result.results.map((r, i) => (
                  <li key={`${r.name}-${i}`} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-on-surface">{r.name}</span>
                    {r.status === 'ok' && <span className="text-xs font-semibold text-tertiary">✓ in</span>}
                    {r.status === 'already' && <span className="text-xs font-semibold text-on-surface-variant">already in</span>}
                    {r.status === 'notfound' && <span className="text-xs font-semibold text-error">not found</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-on-surface-variant">See you on the field — have a great night!</p>
              <button
                type="button"
                className={`${buttonVariants({ variant: 'outline' })} mt-4`}
                onClick={reset}
              >
                Check in more people
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <QrCode className="mx-auto h-10 w-10 text-primary" aria-hidden />
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">Self check-in</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Scan and go — no sign-in needed.</p>

              <label htmlFor="checkin-name" className="sr-only">
                A family member's full name
              </label>
              <div className="relative mt-5" ref={boxRef}>
                <input
                  id="checkin-name"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    search(e.target.value)
                  }}
                  placeholder="Start typing a first name…"
                  autoComplete="off"
                  autoCapitalize="words"
                  autoFocus
                  className="w-full rounded-xl border-2 border-outline-variant bg-white px-4 py-3 text-lg text-on-surface outline-none transition-colors focus:border-primary"
                />
                {open && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-xl border border-outline-variant bg-white py-1 text-left shadow-soft">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => pick(s)}
                          className="w-full px-4 py-2 text-left text-lg text-on-surface transition-colors hover:bg-primary/10"
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selected.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {selected.map((s, i) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-container px-3 py-1 text-sm font-semibold text-on-primary-container"
                    >
                      {s.label}
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        aria-label={`Remove ${s.label}`}
                        className="ml-1 font-bold text-on-primary-container/70 transition-colors hover:text-on-primary-container"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className={`${buttonVariants({ size: 'lg' })} mt-4 w-full`}
                disabled={status === 'loading' || selected.length === 0}
              >
                {status === 'loading'
                  ? 'Checking in…'
                  : selected.length
                    ? `Check in ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`
                    : 'Add a name to check in'}
              </button>
              {status === 'error' && <p className="mt-3 text-sm font-semibold text-error">{message}</p>}
            </form>
          )}
        </div>
      </section>
    </>
  )
}
