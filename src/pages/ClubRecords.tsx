import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'
import { contactEmail, recordsPdf } from '@/data/site'
import { clubRecords, clubRecordsAsAt, displayDate, displayMark, type ClubRecord, type RecordEvent } from '@/data/clubRecords'
import { cn } from '@/lib/utils'

/**
 * The club's historical records (best ever mark per event, grade and gender).
 *
 * Club-night measurements are NOT shown here: they are private. Families see
 * their own children's results on /my-results with their access code, and the
 * committee sees everything in the admin portal.
 */
function Holder({ rec, unit }: { rec?: ClubRecord; unit: RecordEvent['unit'] }) {
  if (!rec) return <span className="text-on-surface-variant">—</span>
  return (
    <div>
      <p className="font-semibold text-on-surface">{displayMark(rec.mark, unit)}</p>
      <p className="text-on-surface">{rec.names.join(' & ')}</p>
      <p className="text-xs text-on-surface-variant">{[...new Set(rec.dates)].map(displayDate).join(', ')}</p>
    </div>
  )
}

export default function ClubRecords() {
  const [active, setActive] = useState(clubRecords[0].event)
  const ev = clubRecords.find((e) => e.event === active) ?? clubRecords[0]
  const grades = [...new Set(ev.rows.map((r) => r.grade))].sort((a, b) => a - b)

  return (
    <>
      <PageHero
        eyebrow="Taupō Athletics"
        title="Club Records"
        subtitle={`The best marks ever set at Taupō Athletics club nights, by event, grade and gender — as at the ${clubRecordsAsAt}.`}
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

        <nav aria-label="Events" className="mb-6 flex flex-wrap gap-2">
          {clubRecords.map((e) => (
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
                      <Holder rec={ev.rows.find((r) => r.grade === g && r.gender === 'F')} unit={ev.unit} />
                    </td>
                    <td className="px-3 py-3">
                      <Holder rec={ev.rows.find((r) => r.grade === g && r.gender === 'M')} unit={ev.unit} />
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
