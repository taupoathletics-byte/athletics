import { useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, ExternalLink, Info, Mail, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero } from '@/components/PageHero'
import { RegisterButton } from '@/components/RegisterButton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { contactEmail, seasonDates } from '@/data/site'
import { capsNote, fees, noWaitlistNote, registration } from '@/data/fees'
import { developmentSquad, groupTimeLabel } from '@/data/clubNights'
import { birthYearOptions, competitionYear, gradeForBirthYear } from '@/data/grades'

const STEPS = [
  'Open the GameDay form',
  'Fill in your athlete’s details',
  'Pay the season fee',
]

export default function Registration() {
  const [birthYear, setBirthYear] = useState<number>(2018)
  const grade = gradeForBirthYear(birthYear)

  return (
    <>
      <PageHero
        eyebrow={`Season ${registration.seasonLabel}`}
        title="Registration"
        subtitle="Everything parents need to know before signing up — what it costs, how to register, and which grade your child is in."
        photo={38}
      />

      <section className="container-page section-pad">
        {/* The three questions, answered immediately */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-coral-active p-gutter-sm">
            <CardContent className="space-y-2 p-0">
              <div className="flex items-center gap-2 text-coral-active">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                <h2 className="font-display text-xl font-bold text-on-surface">Registrations are open</h2>
              </div>
              <p className="text-on-surface-variant">
                Registrations for the {registration.seasonLabel} season are open now. {registration.coversLabel}.
              </p>
              <RegisterButton className="mt-2 w-full">Register on GameDay</RegisterButton>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sky-info p-gutter-sm">
            <CardContent className="space-y-2 p-0">
              <h2 className="font-display text-xl font-bold text-on-surface">What does it cost?</h2>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Season fees by grade</caption>
                <tbody>
                  {fees.map((f) => (
                    <tr key={f.group} className="border-b border-outline-variant last:border-0">
                      <td className="py-2 pr-2 text-on-surface">
                        {f.group}
                        {f.note && <span className="block text-xs text-on-surface-variant">{f.note}</span>}
                      </td>
                      <td className="py-2 text-right font-semibold text-on-surface">{f.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-on-surface-variant">{registration.coversLabel}.</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-tertiary p-gutter-sm">
            <CardContent className="space-y-3 p-0">
              <h2 className="font-display text-xl font-bold text-on-surface">How do I register?</h2>
              <ol className="space-y-2 text-sm text-on-surface-variant">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tertiary text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="flex items-start gap-2 text-sm text-on-surface-variant">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Questions? Email{' '}
                  <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Junior caps */}
        <div className="mt-8 rounded-xl border-l-4 border-l-coral-active bg-white p-gutter-sm shadow-soft">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-6 w-6 shrink-0 text-coral-active" aria-hidden />
            <div>
              <h2 className="font-display text-xl font-bold text-on-surface">Junior grades are capped this season</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                <li>
                  <Badge variant="outline">Grades 3 &amp; 4 — 10 per age group</Badge>
                </li>
                <li>
                  <Badge variant="outline">Grades 5 &amp; 6 — 20 per age group</Badge>
                </li>
              </ul>
              <p className="mt-3 text-on-surface-variant">
                {capsNote}{' '}
                <Link to="/volunteer" className="font-semibold text-primary underline">
                  See how you can help
                </Link>
                .
              </p>
              <p className="mt-2 font-semibold text-on-surface">{noWaitlistNote}</p>
            </div>
          </div>
        </div>

        {/* Grade finder — one card, result directly under the select */}
        <div className="mt-12 rounded-xl bg-white p-gutter-sm shadow-soft md:p-gutter-md">
          <h2 className="font-display text-2xl font-bold text-on-surface">What grade is my child?</h2>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Grade is your child&rsquo;s age at <strong>31 December {competitionYear}</strong>, and it stays the same all
            season even if they have a birthday after that date.
          </p>

          <label htmlFor="birth-year" className="mt-5 block text-sm font-bold text-on-surface">
            Your child&rsquo;s birth year
          </label>
          <select
            id="birth-year"
            value={birthYear}
            onChange={(e) => setBirthYear(Number(e.target.value))}
            className="mt-2 w-full max-w-xs rounded-lg border-2 border-outline-variant bg-white px-3 py-2.5 font-semibold text-on-surface outline-none focus:border-primary"
          >
            {birthYearOptions.map((y) => (
              <option key={y} value={y}>
                Born {y}
              </option>
            ))}
          </select>

          {grade && (
            <div
              key={grade.age}
              className="mt-5 animate-fade-in-up rounded-xl bg-surface-container-low p-gutter-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-5xl font-bold text-primary">{grade.age}</span>
                <div>
                  <div className="text-sm text-on-surface-variant">
                    Years old on 31 Dec {competitionYear}
                  </div>
                  <div className="font-display text-xl font-bold text-on-surface">{grade.gradeLabel}</div>
                </div>
              </div>

              {/* Grade · fee · club night time · cap */}
              <p className="mt-4 text-lg font-semibold text-on-surface">
                {grade.gradeLabel}
                {grade.fee && <> · {grade.fee.fee}</>}
                {grade.group && <> · Thursdays {groupTimeLabel(grade.group)}</>}
                {grade.cap && <> · capped at {grade.cap.perAgeGroup} per age group</>}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{grade.programme}</Badge>
              </div>

              {grade.cap && (
                <p className="mt-3 text-sm text-on-surface-variant">{noWaitlistNote}</p>
              )}

              <div className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                  Ribbon Day events
                </h3>
                <p className="mt-1 text-on-surface">{grade.ribbon}</p>
              </div>

              <RegisterButton className="mt-5">Register {grade.gradeLabel}</RegisterButton>
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="mt-12 rounded-xl bg-white p-gutter-sm shadow-soft">
          <h2 className="font-display text-2xl font-bold text-on-surface">A few things to know</h2>
          <ul className="mt-4 space-y-3 text-on-surface-variant">
            <li className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-info" aria-hidden />
              <span>
                <strong className="text-on-surface">Junior grades are capped.</strong> Grades 3 &amp; 4 take 10 per age
                group and Grades 5 &amp; 6 take 20, and there is no waitlist once a grade is full.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-coral-active" aria-hidden />
              <span>
                <strong className="text-on-surface">No refunds.</strong> There are no refunds if your child decides they
                do not want to continue for the season.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-sky-info" aria-hidden />
              <span>
                <strong className="text-on-surface">Age group.</strong> Your child&rsquo;s grade is their age at{' '}
                <strong>31 December {competitionYear}</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-sky-info" aria-hidden />
              <span>
                <strong className="text-on-surface">The GameDay form times out after 15 minutes.</strong> Have your
                payment method ready before you start.
              </span>
            </li>
          </ul>
        </div>

        {/* Season at a glance */}
        <div className="mt-12 rounded-xl border border-outline-variant bg-surface-container-low p-gutter-sm">
          <h2 className="font-display text-xl font-bold text-on-surface">Season at a glance</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">Term 4</dt>
              <dd className="mt-1 text-on-surface">{seasonDates.clubNights[0]}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">Term 1</dt>
              <dd className="mt-1 text-on-surface">{seasonDates.clubNights[1]}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                Development Squad
              </dt>
              <dd className="mt-1 text-on-surface">
                {developmentSquad.day} {developmentSquad.start}&ndash;{developmentSquad.finish}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link to="/club-nights" className="inline-block py-1 text-primary underline">
              Club Nights
            </Link>
            <Link to="/events" className="inline-block py-1 text-primary underline">
              Ribbon Days &amp; events
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
