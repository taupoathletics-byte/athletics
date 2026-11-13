import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'
import { contactEmail, recordsPdf } from '@/data/site'
import { baseBoard, holderMark, isoToDisplay, type BoardEvent, type BoardRow, type RecordEvent } from '@/data/clubRecords'
import { cn } from '@/lib/utils'

/**
 * The club's records (best ever mark per event, grade and gender): the
 * historical list, plus any club-night result that has since beaten or
 * equalled one — the server adds those automatically (/api/clubrecords).
 *
 * Other club-night measurements are NOT shown here: they are private. Families
 * see their own children's results on /my-results with their access code.
 */
function Holder({ row, unit }: { row?: BoardRow; unit: RecordEvent['unit'] }) {
  if (!row || !row.holders.length) return <span className="text-on-surface-variant">—</span>
  const fresh = row.holders.some((h) => h.source === 'club-night')
  return (
    <div>
      <p className="font-semibold text-on-surface">
        {holderMark(row.holders[0], unit)}
        {fresh && (
          <span className="ml-2 inline-block rounded-full bg-signal px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-signal-ink">
            New
          </span>
        )}
      </p>
      <p className="text-on-surface">{row.holders.map((h) => h.name).join(' & ')}</p>
      <p className="text-xs text-on-surface-variant">{[...new Set(row.holders.map((h) => isoToDisplay(h.date)))].join(', ')}</p>
    </div>
  )
}

export default function ClubRecords() {
  const [board, setBoard] = useState<BoardEvent[]>(baseBoard)
  const [active, setActive] = useState(baseBoard[0].event)

  useEffect(() => {
    fetch('/api/clubrecords')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.events) && d.events.length) setBoard(d.events) })
      .catch(() => { /* keep the historical list */ })
  }, [])

  const ev = board.find((e) => e.event === active) ?? board[0]
  const grades = [...new Set(ev.rows.map((r) => r.grade))].sort((a, b) => a - b)
  const newCount = board.reduce((n, e) => n + e.rows.filter((r) => r.holders.some((h) => h.source === 'club-night')).length, 0)

  return (
    <>
      <PageHero
        eyebrow="Taupō Athletics"
        title="Club Records"
        subtitle="The best marks ever set at Taupō Athletics club nights, by event, grade and gender. New records are added as they're set."
        photo={35}
      />

      <section className="container-page section-pad">
        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-container/40 px-4 py-3">
          <p className="text-sm text-on-surface">
            <span className="font-semibold">Families:</span> your children&rsquo;s club night results are private — view
            them with your family access code.
          </p>
          <Link to="/my-results" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            View my results
          </Link>
        </div>

        {newCount > 0 && (
          <p className="mb-4 text-sm font-semibold text-on-surface">
            {newCount} new club record{newCount === 1 ? '' : 's'} set at club nights since the 2024/25 season — look for{' '}
            <span className="rounded-full bg-signal px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-signal-ink">New</span>.
          </p>
        )}

        <nav aria-label="Events" className="mb-6 flex flex-wrap gap-2">
          {board.map((e) => (
            <button
              key={e.event}
              type="button"
              aria-pressed={e.event === active}
              onClick={() => setActive(e.event)}
              className={cn(
                'min-h-[40px] rounded-full border px-4 text-sm font-semibold transition-colors',
                e.event === active
                  ? 'border-primary bg-primary text-white'
                  : 'border-outline-variant bg-white text-on-surface hover:border-primary',
              )}
            >
              {e.event}
            </button>
          ))}
        </nav>

        <div className="overflow-hidden rounded-xl bg-white shadow-soft">
          <h2 className="px-gutter-md pt-gutter-md text-xl font-bold text-primary">{ev.event}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th scope="col" className="px-gutter-md py-2 font-semibold">Grade</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Girls</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Boys</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g} className="border-b border-outline-variant align-top last:border-0">
                    <th scope="row" className="px-gutter-md py-3 font-semibold text-on-surface">{g}</th>
                    <td className="px-3 py-3">
                      <Holder row={ev.rows.find((r) => r.grade === g && r.gender === 'F')} unit={ev.unit} />
                    </td>
                    <td className="px-3 py-3">
                      <Holder row={ev.rows.find((r) => r.grade === g && r.gender === 'M')} unit={ev.unit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 text-sm text-on-surface-variant">
          Think a record is missing or wrong? Email{' '}
          <a href={`mailto:${contactEmail}`} className="font-semibold text-primary underline">
            {contactEmail}
          </a>
          .{' '}
          <a
            href={recordsPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary underline"
          >
            <Download className="h-4 w-4" /> Download the records (PDF)
          </a>
        </p>
      </section>
    </>
  )
}
