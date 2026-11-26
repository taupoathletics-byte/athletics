import { useEffect, useRef, useState } from 'react'
import { Copy, KeyRound, Search } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'

interface FamilyMember {
  name: string
  grade: string
  gender: string
}

interface ResultRow {
  memberName: string
  event: string
  grade: string
  gender: string
  date: string
  result: string
  season: string
  isTime: boolean
}

/**
 * A result as people read it. Adds the unit to a bare number, shows "1:17:9"
 * as 1:17.9 and "15,1" as 15.1s, and spells out NJ / NT.
 */
function fmt(r: ResultRow) {
  const v = String(r.result).trim().replace(',', '.')
  if (/^NJ$/i.test(v)) return 'No measured jump'
  if (/^NT$/i.test(v)) return 'No measured throw'
  const m = v.match(/^(\d+):(\d{2}):(\d+)$/)
  if (m) return `${Number(m[1])}:${m[2]}.${m[3]}`
  if (!v || v.includes(':') || /[a-z]/i.test(v)) return v
  return r.isTime ? `${v}s` : `${v}m`
}

/** A result as a number (seconds or metres), or null when there's no mark. */
function value(r: ResultRow): number | null {
  const s = String(r.result).trim().replace(',', '.').replace(/[a-z\s]/gi, '')
  if (!s) return null
  if (!r.isTime) {
    const v = parseFloat(s)
    return Number.isFinite(v) && v > 0 ? v : null
  }
  const parts = s.split(/[:.]/).filter((x) => x !== '')
  if (parts.some((x) => !/^\d+$/.test(x))) return null
  if (s.includes(':') || parts.length === 3) {
    const [mi, se, fr = ''] = parts
    return Number(mi) * 60 + Number(se) + (fr ? Number(fr) / 10 ** fr.length : 0)
  }
  const v = parseFloat(s)
  return Number.isFinite(v) && v > 0 ? v : null
}

interface Best {
  event: string
  row: ResultRow
  /** Set on the child's most recent night and better than anything before it. */
  fresh: boolean
}

const EVENT_ORDER = ['60m', '100m', '200m', '400m', '800m', '1500m', 'Long Jump', 'High Jump', 'Shot Put', 'Discus']

/** Each child's best mark per event, flagging a new PB from their latest night. */
function personalBests(records: ResultRow[]): { name: string; bests: Best[] }[] {
  const byChild = new Map<string, ResultRow[]>()
  for (const r of records) byChild.set(r.memberName, [...(byChild.get(r.memberName) || []), r])
  return [...byChild.entries()].map(([name, rows]) => {
    const latest = rows.map((r) => r.date).sort().pop() || ''
    const events = [...new Set(rows.map((r) => r.event))].sort((a, b) => EVENT_ORDER.indexOf(a) - EVENT_ORDER.indexOf(b))
    const bests: Best[] = []
    for (const event of events) {
      const scored = rows.filter((r) => r.event === event).map((r) => ({ r, v: value(r) })).filter((x) => x.v != null) as { r: ResultRow; v: number }[]
      if (!scored.length) continue
      const better = (a: number, b: number) => (scored[0].r.isTime ? a < b : a > b)
      const best = scored.reduce((x, y) => (better(y.v, x.v) ? y : x))
      const earlier = scored.filter((x) => x.r.date < best.r.date)
      bests.push({ event, row: best.r, fresh: best.r.date === latest && earlier.length > 0 && earlier.every((x) => better(best.v, x.v)) })
    }
    return { name, bests }
  })
}

/** "2026-10-22" → "22 Oct 2026". */
function fmtDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "Grade 9 · F" */
function fmtGrade(r: ResultRow) {
  const grade = /^\d+$/.test(r.grade) ? `Grade ${r.grade}` : r.grade
  return [grade, r.gender].filter(Boolean).join(' · ')
}

/**
 * Family self-service: a parent enters the access code issued at registration
 * and sees only their own children's results. No names of other members are
 * ever shown — the code is the credential and the response is scoped to it.
 */
export default function MyResults() {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle')
  const [message, setMessage] = useState('')
  const [data, setData] = useState<{ members: FamilyMember[]; records: ResultRow[] }>({ members: [], records: [] })

  const [showLookup, setShowLookup] = useState(false)
  const [lookupFirst, setLookupFirst] = useState('')
  const [lookupLast, setLookupLast] = useState('')
  const [lookupDob, setLookupDob] = useState('')
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle')
  const [lookupMessage, setLookupMessage] = useState('')
  const [foundCode, setFoundCode] = useState('')
  const [foundFirst, setFoundFirst] = useState('')
  const [copied, setCopied] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  // The emailed link ends "#code=ABCD2345". The part after "#" never reaches a
  // server or log; take the code from it, then clear it from the address bar
  // so it isn't left in history or a shared screenshot.
  useEffect(() => {
    const m = window.location.hash.match(/code=([A-Za-z0-9 ]+)/)
    if (!m) return
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setCode(m[1])
    void lookup(m[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await lookup(code)
  }

  async function lookup(raw: string) {
    const c = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (c.length < 6) {
      setStatus('error')
      setMessage('Enter the access code you were given.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch(`/api/myrecords?code=${encodeURIComponent(c)}`)
      const json = await res.json().catch(() => ({}))
      if (res.status === 404) {
        setStatus('error')
        setMessage("That code isn't recognised. Check it and try again.")
        return
      }
      if (!res.ok) {
        setStatus('error')
        setMessage(json.error || 'Something went wrong. Try again.')
        return
      }
      setData(json)
      setStatus('ok')
    } catch {
      setStatus('error')
      setMessage('Could not reach the server. Try again shortly.')
    }
  }

  async function findCode(e: React.FormEvent) {
    e.preventDefault()
    if (!lookupFirst.trim() || !lookupLast.trim() || !lookupDob) {
      setLookupStatus('error')
      setLookupMessage('Enter the child’s first name, last name and date of birth.')
      return
    }
    setLookupStatus('loading')
    setLookupMessage('')
    try {
      const res = await fetch('/api/codelookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: lookupFirst, lastName: lookupLast, birthDate: lookupDob }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 404) {
        setLookupStatus('error')
        setLookupMessage(json.error || 'No member matches those details. Check the spelling and date of birth.')
        return
      }
      if (!res.ok) {
        setLookupStatus('error')
        setLookupMessage(json.error || 'Something went wrong. Try again.')
        return
      }
      setFoundCode(json.code)
      setFoundFirst(json.firstName)
      setLookupStatus('ok')
    } catch {
      setLookupStatus('error')
      setLookupMessage('Could not reach the server. Try again shortly.')
    }
  }

  async function copyCode() {
    if (!foundCode) return
    try {
      await navigator.clipboard.writeText(foundCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  async function viewResults() {
    if (!foundCode) return
    setShowLookup(false)
    setCode(foundCode)
    await lookup(foundCode)
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <PageHero
        eyebrow="Athletes & families"
        title="My Results"
        subtitle="Enter your family access code to see your children's recorded results."
        photo={35}
      />

      <section className="container-page section-pad">
        <form onSubmit={submit} className="mx-auto max-w-xl rounded-xl bg-white p-gutter-md shadow-soft">
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="h-5 w-5" aria-hidden />
            <label htmlFor="code" className="font-semibold text-on-surface">
              Access code
            </label>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Your family access code is the same for every child in your family. Can&rsquo;t find it? Look it up below with
            your child&rsquo;s name and date of birth.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. K7XQ2MP9"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border-2 border-outline-variant bg-white px-4 py-2.5 font-mono text-lg uppercase tracking-widest text-on-surface outline-none transition-colors focus:border-primary"
            />
            <button type="submit" className={buttonVariants({ size: 'lg' })} disabled={status === 'loading'}>
              {status === 'loading' ? '…' : 'View'}
            </button>
          </div>
          {status === 'error' && <p className="mt-3 text-sm font-semibold text-error">{message}</p>}
        </form>

        <div className="mx-auto mt-4 max-w-xl text-center">
          <button
            type="button"
            onClick={() => setShowLookup((v) => !v)}
            className="text-sm font-semibold text-primary underline underline-offset-2 hover:no-underline"
          >
            Can&rsquo;t find your access code?
          </button>
        </div>

        {showLookup && (
          <form onSubmit={findCode} className="mx-auto mt-4 max-w-xl rounded-xl bg-white p-gutter-md shadow-soft">
            <div className="flex items-center gap-2 text-primary">
              <Search className="h-5 w-5" aria-hidden />
              <h2 className="font-semibold text-on-surface">Find your access code</h2>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              Enter one child&rsquo;s details to look up your family&rsquo;s code.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="lookup-first" className="text-sm font-semibold text-on-surface">
                  First name
                </label>
                <input
                  id="lookup-first"
                  value={lookupFirst}
                  onChange={(e) => setLookupFirst(e.target.value)}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border-2 border-outline-variant bg-white px-4 py-2.5 text-on-surface outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="lookup-last" className="text-sm font-semibold text-on-surface">
                  Last name
                </label>
                <input
                  id="lookup-last"
                  value={lookupLast}
                  onChange={(e) => setLookupLast(e.target.value)}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border-2 border-outline-variant bg-white px-4 py-2.5 text-on-surface outline-none transition-colors focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="lookup-dob" className="text-sm font-semibold text-on-surface">
                  Date of birth
                </label>
                <input
                  id="lookup-dob"
                  type="date"
                  value={lookupDob}
                  onChange={(e) => setLookupDob(e.target.value)}
                  className="mt-1 w-full rounded-lg border-2 border-outline-variant bg-white px-4 py-2.5 text-on-surface outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`${buttonVariants({ size: 'lg' })} mt-4 w-full`}
              disabled={lookupStatus === 'loading'}
            >
              {lookupStatus === 'loading' ? 'Looking up…' : 'Find code'}
            </button>
            {lookupStatus === 'error' && <p className="mt-3 text-sm font-semibold text-error">{lookupMessage}</p>}

            {lookupStatus === 'ok' && (
              <div className="mt-4 rounded-lg bg-surface-container-low p-4 text-center">
                <p className="text-sm text-on-surface-variant">
                  Your family access code{foundFirst ? ` for ${foundFirst}` : ''} is
                </p>
                <p className="mt-1 font-mono text-2xl font-bold uppercase tracking-[0.2em] text-primary">{foundCode}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={copyCode} className={buttonVariants({ variant: 'outline' })}>
                    <Copy className="mr-1.5 h-4 w-4" aria-hidden />
                    {copied ? 'Copied' : 'Copy code'}
                  </button>
                  <button type="button" onClick={viewResults} className={buttonVariants({})}>
                    View my results
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {status === 'ok' && (
          <div ref={resultsRef} className="mx-auto mt-8 max-w-3xl">
            <h2 className="text-lg font-bold text-on-surface">Your family&rsquo;s results</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{data.members.map((m) => m.name).join(', ')}</p>

            {data.records.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {personalBests(data.records).map((c) => (
                  <div key={c.name} className="rounded-xl bg-white p-gutter-sm shadow-soft">
                    <h3 className="font-bold text-on-surface">{c.name}</h3>
                    <p className="text-xs text-on-surface-variant">Personal bests</p>
                    {c.bests.length ? (
                      <ul className="mt-2 grid gap-1.5">
                        {c.bests.map((b) => (
                          <li key={b.event} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-surface-container pb-1.5 last:border-0">
                            <span className="text-on-surface">{b.event}</span>
                            <span className="font-semibold text-on-surface">
                              {fmt(b.row)}
                              {b.fresh && (
                                <span className="ml-2 rounded-full bg-signal px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-signal-ink">
                                  New PB
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-on-surface-variant">No measured marks yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data.records.length === 0 ? (
              <p className="mt-4 rounded-xl bg-white p-gutter-sm text-on-surface-variant shadow-soft">
                No results recorded yet — they&rsquo;ll appear here as the season progresses.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant">
                        <th className="px-4 py-3 font-semibold">Athlete</th>
                        <th className="px-4 py-3 font-semibold">Event</th>
                        <th className="px-4 py-3 font-semibold">Grade</th>
                        <th className="px-4 py-3 font-semibold">Result</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Season</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.records]
                        .sort((a, b) => a.memberName.localeCompare(b.memberName) || EVENT_ORDER.indexOf(a.event) - EVENT_ORDER.indexOf(b.event) || b.date.localeCompare(a.date))
                        .map((r, i) => (
                        <tr key={i} className="border-t border-surface-container">
                          <td className="px-4 py-2.5 font-semibold text-on-surface">{r.memberName}</td>
                          <td className="px-4 py-2.5 text-on-surface">{r.event}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-on-surface">{fmtGrade(r)}</td>
                          <td className="px-4 py-2.5 text-on-surface">{fmt(r)}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-on-surface-variant">{fmtDate(r.date)}</td>
                          <td className="px-4 py-2.5 text-on-surface-variant">{r.season}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
