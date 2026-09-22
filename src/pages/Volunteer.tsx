import { Mail } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'
import { contactEmail } from '@/data/site'
import { capsNote } from '@/data/fees'
import { volunteerRoles } from '@/data/volunteers'

export default function Volunteer() {
  return (
    <>
      <PageHero
        eyebrow="Get involved"
        title="We need people just like you"
        subtitle="Our club runs entirely on volunteers — and we would love your help."
        photo={46}
      />

      <section className="container-page section-pad">
        <div className="rounded-xl border-l-4 border-l-coral-active bg-white p-gutter-sm shadow-soft">
          <h2 className="font-display text-2xl font-bold text-on-surface">Can you help?</h2>
          <p className="mt-3 text-on-surface-variant">
            We are always after helpers on club nights — setting up, timing and recording, moving groups between
            events, and pack-down. {capsNote}
          </p>
        </div>

        <h2 className="mt-12 font-display text-3xl font-bold text-on-surface">Our vacancies</h2>

        {/* Table on wide screens */}
        <div className="mt-5 hidden overflow-hidden rounded-xl bg-white shadow-soft sm:block">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Volunteer roles, what they entail and the time commitment</caption>
            <thead>
              <tr className="bg-primary text-white">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  What it entails
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Time commitment
                </th>
              </tr>
            </thead>
            <tbody>
              {volunteerRoles.map((r) => (
                <tr key={r.role} className="border-t border-outline-variant align-top">
                  <th scope="row" className="px-4 py-4 text-left font-bold text-on-surface">
                    {r.role}
                  </th>
                  <td className="px-4 py-4">
                    <ul className="space-y-1.5 text-on-surface-variant">
                      {r.entails.map((e) => (
                        <li key={e} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                          {e}
                        </li>
                      ))}
                    </ul>
                    {r.footnote && (
                      <p className="mt-2 text-sm italic text-on-surface-variant">{r.footnote}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <ul className="space-y-1.5 text-on-surface-variant">
                      {r.commitment.map((c) => (
                        <li key={c} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary" aria-hidden />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stacked cards on phones — no horizontal scrolling */}
        <ul className="mt-5 space-y-4 sm:hidden">
          {volunteerRoles.map((r) => (
            <li key={r.role} className="rounded-xl bg-white p-gutter-sm shadow-soft">
              <h3 className="font-display text-lg font-bold text-primary">{r.role}</h3>
              <h4 className="mt-3 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                What it entails
              </h4>
              <ul className="mt-1 space-y-1.5 text-on-surface-variant">
                {r.entails.map((e) => (
                  <li key={e} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {e}
                  </li>
                ))}
              </ul>
              <h4 className="mt-3 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                Time commitment
              </h4>
              <ul className="mt-1 space-y-1.5 text-on-surface-variant">
                {r.commitment.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
              {r.footnote && <p className="mt-3 text-sm italic text-on-surface-variant">{r.footnote}</p>}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-xl bg-surface-container-low p-gutter-sm sm:flex-row sm:items-center">
          <p className="text-on-surface-variant">
            Keen, or just want to know more? We would love to hear from you.
          </p>
          <a
            href={`mailto:${contactEmail}`}
            className={`${buttonVariants({ variant: 'mint' })} sm:ml-auto`}
          >
            <Mail className="mr-2 h-4 w-4" aria-hidden />
            Email the club
          </a>
        </div>
      </section>
    </>
  )
}
