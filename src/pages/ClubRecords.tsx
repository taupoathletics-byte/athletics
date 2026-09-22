import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Trophy } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'
import { recordsPdf } from '@/data/site'

interface RecordRow {
  id: string
  memberName: string
  event: string
  grade: string
  gender: string
  date: string
  result: string
  value: number | null
  isTime: boolean
}

const EVENT_ORDER = ['60m', '100m', '200m', '400m', '800m', '1500m', 'Long Jump', 'High Jump', 'Shot Put', 'Discus']
const LIMIT = 10

function fmt(r: RecordRow) {
  return r.isTime ? `${r.result}s` : `${r.result}m`
}

/**
 * Public record board.
 *
 * Deliberately shows only the top 10 marks per event. A member's full record is
 * personal, so it is not exposed here — see the admin portal / the member-access
 * path for the complete history. This also keeps the published name list to the
 * athletes actually on the board rather than the whole membership.
 */
export default function ClubRecords() {
  const [records, setRecords] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/records')
      .then((r) => r.json())
      .then((d) => setRecords(d.records || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const board = useMemo(() => {
    const byEvent: Record<string, RecordRow[]> = {}
    for (const r of records) {
      if (r.value == null) continue
      ;(byEvent[r.event] ||= []).push(r)
    }
    return EVENT_ORDER.filter((e) => (byEvent[e]?.length || 0) > 0).map((event) => {
      const rows = byEvent[event]
        .sort((a, b) => (a.isTime ? a.value! - b.value! : b.value! - a.value!))
        .slice(0, LIMIT)
      return { event, rows }
    })
  }, [records])

  return (
    <>
      <PageHero
        eyebrow="Top 10 per event"
        title="Club Records"
        subtitle="The ten best recorded marks in each event. Records are measured in Grades 7–14 and updated through the season."
        photo={35}
      />

      <section className="container-page section-pad">
        {/* Family self-service: full record behind the access code. */}
        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-container/40 px-4 py-3">
          <p className="text-sm text-on-surface">
            <span className="font-semibold">Athletes &amp; families:</span> see your own full record with your access
            code.
          </p>
          <Link to="/my-results" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            View my results
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-on-surface-variant">Loading records…</p>
        ) : board.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-xl bg-white p-gutter-md text-center shadow-soft">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="text-on-surface-variant">
              No results recorded yet — the record board will appear here as volunteers enter results.
            </p>
            <a
              href={recordsPdf}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Download className="h-4 w-4" /> Open previous records (PDF, March 2025)
            </a>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {board.map(({ event, rows }) => (
                <div key={event} className="rounded-xl bg-white p-gutter-md shadow-soft">
                  <h3 className="mb-3 text-lg font-bold text-primary">{event}</h3>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant text-on-surface-variant">
                        <th className="py-1.5 font-semibold">#</th>
                        <th className="py-1.5 font-semibold">Grade</th>
                        <th className="py-1.5 font-semibold">Name</th>
                        <th className="py-1.5 font-semibold">Result</th>
                        <th className="py-1.5 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id} className="border-b border-outline-variant">
                          <td className="py-1.5 text-on-surface-variant">{i + 1}</td>
                          <td className="py-1.5 font-semibold text-on-surface">
                            {r.grade}
                            {r.gender}
                          </td>
                          <td className="py-1.5 text-on-surface">{r.memberName}</td>
                          <td className="py-1.5 text-on-surface">{fmt(r)}</td>
                          <td className="py-1.5 text-on-surface-variant">{r.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-on-surface-variant">
              Showing the ten best recorded marks in each event.{' '}
              <a
                href={recordsPdf}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                Download the full historical records PDF
              </a>
              .
            </p>
          </>
        )}
      </section>
    </>
  )
}
