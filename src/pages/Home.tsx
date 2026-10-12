import { Link } from 'react-router-dom'
import { AlertTriangle, Heart } from 'lucide-react'
import { FacebookFeed } from '@/components/FacebookFeed'
import { SponsorStrip } from '@/components/SponsorStrip'
import { CrewQuotes } from '@/components/athletics/CrewQuotes'
import { EventsExplorer } from '@/components/athletics/EventsExplorer'
import { FeatureBlocks } from '@/components/athletics/FeatureBlocks'
import { LifeStrip } from '@/components/athletics/LifeStrip'
import { Marquee, Reveal, SectionLabel } from '@/components/athletics/motion'
import { NextNightPanel } from '@/components/athletics/NextNightPanel'
import { ProgrammeCards } from '@/components/athletics/ProgrammeCards'
import { RegisterBanner } from '@/components/athletics/RegisterBanner'
import { WordRows } from '@/components/athletics/WordRows'
import { ZoomHero } from '@/components/athletics/ZoomHero'
import { Hurdle } from '@/components/athletics/icons'
import { contactEmail, venue } from '@/data/site'

const TICKER = ['Ages 3–14', 'No experience needed', 'Thursdays 5:30pm', venue.name, 'Whānau welcome', 'Term 4 & Term 1']

/**
 * Home — a scroll-driven page inspired by sixescricket.com, with athletics kit
 * (shot puts, batons, hurdles, rosettes) where Sixes uses cricket balls. Every
 * fact on it comes from src/data; every photo is the club's own.
 */
export default function Home() {
  return (
    <>
      <ZoomHero />
      <NextNightPanel />
      <ProgrammeCards />

      <Marquee
        className="border-y-4 border-ink bg-ink-3 py-3 text-cream"
        items={TICKER.map((t) => (
          <span className="font-display text-2xl font-black uppercase tracking-wide md:text-3xl">{t}</span>
        ))}
        separator={<Hurdle className="h-7 w-7 shrink-0" />}
        fast
      />

      <LifeStrip />
      <EventsExplorer />
      <WordRows />
      <FeatureBlocks />
      <CrewQuotes />
      <RegisterBanner />

      {/* Stay in the loop — weather calls go to Facebook by 4pm */}
      <section className="bg-ink pb-16 pt-6 text-cream md:pb-24">
        <div className="container-page grid items-start gap-10 lg:grid-cols-[1fr_500px]">
          <Reveal>
            <h2 className="display-xl text-[clamp(3rem,8vw,6.5rem)]">Stay in the loop</h2>
            <p className="mt-4 max-w-lg text-lg text-cream/75">
              Everything time-sensitive goes to our Facebook page first — weather calls, Ribbon Day entry deadlines and
              what&rsquo;s on at the next club night.
            </p>
            <div className="mt-6 flex max-w-lg items-start gap-3 rounded-xl bg-cream/10 p-4 ring-1 ring-cream/15">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-signal-light" aria-hidden />
              <p className="text-cream/85">
                <strong className="text-cream">Weather cancellations</strong> are posted by 4pm on Thursday. Check
                Facebook before you leave home.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/events" className="rounded-full border-2 border-cream/80 px-6 py-2.5 font-display text-lg font-extrabold uppercase tracking-wide transition-colors hover:bg-cream hover:text-ink">
                Upcoming events
              </Link>
              <Link to="/faqs" className="rounded-full border-2 border-cream/80 px-6 py-2.5 font-display text-lg font-extrabold uppercase tracking-wide transition-colors hover:bg-cream hover:text-ink">
                FAQs
              </Link>
            </div>
          </Reveal>
          <div className="overflow-hidden rounded-2xl bg-cream p-5 text-on-surface">
            <FacebookFeed />
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="bg-cream py-16 md:py-20">
        <div className="container-page">
          <SectionLabel>
            <Heart className="h-5 w-5 text-signal" aria-hidden /> Thank you to our sponsors
          </SectionLabel>
          <div className="mt-8">
            <SponsorStrip />
          </div>
          <p className="mt-6 text-center text-on-surface-variant">
            Want to support the club? Email{' '}
            <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  )
}
