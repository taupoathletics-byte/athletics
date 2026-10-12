import { Photo } from '@/components/Photo'
import { RegisterButton } from '@/components/RegisterButton'
import { noWaitlistNote, registration } from '@/data/fees'
import { Reveal } from './motion'

/** Sixes "Big group booking?" banner — here, the registration call to action. */
export function RegisterBanner() {
  return (
    <section className="relative bg-[linear-gradient(to_bottom,#F6F3EC_0,#F6F3EC_50%,#0c2033_50%,#0c2033_100%)] py-10 md:py-16">
      <Reveal className="container-page">
        <div className="relative grid items-center gap-6 overflow-hidden rounded-xl bg-sky p-5 md:grid-cols-[1fr_1.2fr_1fr] md:p-6">
          <span aria-hidden className="track-lanes absolute inset-x-0 top-[22%] h-10 opacity-90" />
          <span aria-hidden className="track-lanes absolute inset-x-0 bottom-[22%] h-10 opacity-90" />
          <Photo id={39} sizes="(min-width: 768px) 28vw, 100vw" className="relative hidden aspect-[4/3] rounded-lg ring-4 ring-sky md:block" />
          <div className="relative rounded-lg bg-sky px-2 py-4 text-center">
            <p className="display-xl text-[2.6rem] text-ink md:text-5xl">{registration.seasonLabel} registrations open</p>
            <p className="mx-auto mt-3 max-w-sm text-[15px] text-ink/80">
              {registration.coversLabel}. {noWaitlistNote}
            </p>
            <RegisterButton className="mt-5 px-7 py-3 text-base">Register on GameDay</RegisterButton>
          </div>
          <Photo id={44} sizes="(min-width: 768px) 28vw, 100vw" className="relative hidden aspect-[4/3] rounded-lg ring-4 ring-sky md:block" />
        </div>
      </Reveal>
    </section>
  )
}
