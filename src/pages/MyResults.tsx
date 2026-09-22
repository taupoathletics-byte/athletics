import { useState } from 'react'
import { KeyRound } from 'lucide-react'
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

function fmt(r: ResultRow) {
  return r.isTime ? `${r.result}s` : `${r.result}m`
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
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
            Your family access code was issued at registration. It is the same for every child in your family. If you
            don't have it, ask at the check-in desk on club night.
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

        {status === 'ok' && (
          <div className="mx-auto mt-8 max-w-3xl">
            <h2 className="text-lg font-bold text-on-surface">Your family&rsquo;s results</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{data.members.map((m) => m.name).join(', ')}</p>

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
                      {data.records.map((r, i) => (
                        <tr key={i} className="border-t border-surface-container">
                          <td className="px-4 py-2.5 font-semibold text-on-surface">{r.memberName}</td>
                          <td className="px-4 py-2.5 text-on-surface">{r.event}</td>
                          <td className="px-4 py-2.5 text-on-surface">
                            {r.grade}
                            {r.gender}
                          </td>
                          <td className="px-4 py-2.5 text-on-surface">{fmt(r)}</td>
                          <td className="px-4 py-2.5 text-on-surface-variant">{r.date}</td>
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
