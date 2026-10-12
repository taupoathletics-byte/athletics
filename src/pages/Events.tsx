import { CalendarPlus, ExternalLink, Info, Medal, Shirt, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero } from '@/components/PageHero'
import { Photo } from '@/components/Photo'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { awbopCalendarUrl, links, ribbonEvents } from '@/data/site'
import {
  CURRENT_SEASON,
  FAMILY_CLASSES,
  FAMILY_LABELS,
  familyOf,
  ribbonDayKit,
  splitEvents,
  toIcs,
  upcomingEvents,
  type ClubEvent,
} from '@/data/events'

const PHOTO_BAND = [35, 36, 37, 38]

function formatRange(e: ClubEvent) {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }
  const start = new Date(`${e.start}T00:00:00`).toLocaleDateString('en-NZ', opts)
  if (!e.end) return start
  return `${start} – ${new Date(`${e.end}T00:00:00`).toLocaleDateString('en-NZ', opts)}`
}

function downloadIcs(e: ClubEvent) {
  const blob = new Blob([toIcs(e)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.name.replace(/\W+/g, '-').toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function EventChips({ list }: { list: string }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {splitEvents(list).map((e) => {
        const fam = familyOf(e)
        return (
          <li
            key={e}
            className={`rounded-full border px-2.5 py-0.5 text-sm ${
              fam ? FAMILY_CLASSES[fam] : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
            }`}
          >
            {e}
          </li>
        )
      })}
    </ul>
  )
}

export default function Events() {
  const upcoming = upcomingEvents()

  return (
    <>
      <PageHero
        eyebrow="Beyond club nights"
        title="Events"
        subtitle="Regional Ribbon Days and other competing opportunities outside of Taupō throughout the season."
        photo={36}
      />

      <section className="container-page section-pad space-y-12">
        {/* Upcoming events */}
        <div>
          <h2 className="font-display text-3xl font-bold text-on-surface">
            Upcoming Ribbon Days &amp; events
          </h2>
          {upcoming.length > 0 ? (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e, i) => (
                <li key={e.name} className="rounded-xl bg-white p-gutter-sm shadow-soft">
                  {i === 0 && (
                    <span className="mb-2 inline-block rounded-full bg-signal px-2.5 py-0.5 text-sm font-semibold text-signal-ink">
                      Next up
                    </span>
                  )}
                  <p className="font-display text-lg font-bold text-primary">{formatRange(e)}</p>
                  <h3 className="mt-1 font-bold text-on-surface">{e.name}</h3>
                  <p className="text-on-surface-variant">{e.venue}</p>
                  {e.note && <p className="mt-1 text-sm text-on-surface-variant">{e.note}</p>}
                  <button
                    type="button"
                    onClick={() => downloadIcs(e)}
                    className={`${buttonVariants({ variant: 'outline' })} mt-3`}
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" aria-hidden />
                    Add to calendar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 flex items-start gap-3 rounded-xl border-l-4 border-l-sky-info bg-white p-gutter-sm shadow-soft">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-info" aria-hidden />
              <div>
                <p className="font-semibold text-on-surface">
                  The {CURRENT_SEASON} fixture dates have not been confirmed yet.
                </p>
                <p className="mt-1 text-on-surface-variant">
                  Athletics Waikato Bay of Plenty publishes the regional calendar before the season starts. We will
                  list the dates here and share them on Facebook and at club nights as soon as they are out.
                </p>
                <a
                  href={awbopCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonVariants({ variant: 'outline' })} mt-3`}
                >
                  AWBoP events calendar
                  <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Photo band */}
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PHOTO_BAND.map((id) => (
            <li key={id}>
              <Photo
                id={id}
                sizes="(min-width: 768px) 25vw, 50vw"
                className="aspect-[4/3] w-full rounded-lg"
              />
            </li>
          ))}
        </ul>

        {/* What to bring */}
        <div className="rounded-xl border-l-4 border-l-tertiary bg-white p-gutter-sm shadow-soft">
          <div className="flex items-center gap-2 text-tertiary">
            <Shirt className="h-5 w-5" aria-hidden />
            <h2 className="font-display text-2xl font-bold text-on-surface">
              What to bring on a Ribbon Day
            </h2>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {ribbonDayKit.map((item) => (
              <li key={item} className="flex items-start gap-2 text-on-surface-variant">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-on-surface-variant">
            Club singlets are ordered direct from Code Sport —{' '}
            <a
              className="font-semibold text-primary underline"
              href={links.codesport}
              target="_blank"
              rel="noopener noreferrer"
            >
              order a club singlet
            </a>
            . Age flashes are free from the check-in desk on club night.
          </p>
        </div>

        {/* Ribbon day events table */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Medal className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="font-display text-3xl font-bold text-on-surface">Ribbon Day events</h2>
            </div>
            <Link to="/registration" className="font-semibold text-primary underline">
              Find my child&rsquo;s grade →
            </Link>
          </div>

          <p className="max-w-3xl text-on-surface-variant">
            Ribbon days are a great extension of what the athletes learn at club nights and are a fun day out. If a
            Ribbon Day is washed out on the Saturday, it may be run on the Sunday. Hurdles and walks are optional
            events; host clubs may offer some, but not necessarily all, of the events for each age group. An athlete
            cannot compete in more than 2 longer events (400m, 800m, 1500m, Walk) on any one day.
          </p>

          {/* Legend */}
          <ul className="mt-5 flex flex-wrap gap-2">
            {(Object.keys(FAMILY_LABELS) as (keyof typeof FAMILY_LABELS)[]).map((f) => (
              <li key={f} className={`rounded-full border px-2.5 py-0.5 text-sm ${FAMILY_CLASSES[f]}`}>
                {FAMILY_LABELS[f]}
              </li>
            ))}
          </ul>

          <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Ribbon Day events offered for each grade</caption>
                <thead>
                  <tr className="bg-surface-container-low">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-surface-container-low px-4 py-3 font-semibold text-on-surface"
                    >
                      Grade
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-on-surface">
                      Events
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ribbonEvents.map((r) => (
                    <tr key={r.grade} className="border-t border-outline-variant">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 text-left font-semibold text-on-surface"
                      >
                        {r.grade}
                      </th>
                      <td className="px-4 py-3">
                        <EventChips list={r.events} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pentathlon */}
        <Card className="border-l-4 border-l-sky-info p-gutter-sm">
          <CardContent className="p-0">
            <h2 className="font-display text-2xl font-bold text-on-surface">Pentathlon</h2>
            <p className="mt-2 text-on-surface-variant">
              A variation on the Ribbon Day programme run by the Cambridge Athletics Club in February. Children aged 7,
              8 and 9 compete in 100m, 200m, long jump and discus in the morning. Children aged 10 to 14 compete in the
              pentathlon in the afternoon: 200m, 800m, long jump, shot put and discus. Entry is by pre-registration only
              for athletes in Grades 7&ndash;14 — contact the club secretary for more information.
            </p>
          </CardContent>
        </Card>

        {/* WBOP champs */}
        <Card className="border-l-4 border-l-sky-info p-gutter-sm">
          <CardContent className="p-0">
            <h2 className="font-display text-2xl font-bold text-on-surface">
              Waikato Bay of Plenty Children&rsquo;s Champs
            </h2>
            <p className="mt-2 text-on-surface-variant">
              Held once a year in March in either Hamilton or Tauranga, this is an opportunity to compete for medals and
              is one of the highlights of the year for our competitive athletes. Details are shared on club nights and
              our Facebook page when it is time to enter. There is a fee per event and normally a maximum of four
              events can be entered. Parents and guardians register and pay online through Athletic.net.
            </p>
          </CardContent>
        </Card>

        {/* Colgate */}
        <Card className="border-l-4 border-l-sky-info p-gutter-sm">
          <CardContent className="p-0">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-tertiary" aria-hidden />
              <h2 className="font-display text-2xl font-bold text-on-surface">Colgate Games</h2>
            </div>
            <p className="mt-2 text-on-surface-variant">
              Held in the summer school holiday break each year, with a North Island and a South Island event. It is a
              great opportunity to compete against athletes from around the country. No qualification standards are
              required and all registered athletes are welcome to enter, but no late entries are accepted — please let
              us know if you intend to compete.
            </p>
            <a
              href="https://athletics.org.nz/colgate-games/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonVariants({ variant: 'outline' })} mt-4`}
            >
              Colgate Games website
              <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden />
            </a>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
