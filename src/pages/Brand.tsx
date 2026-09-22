import { PageHero } from '@/components/PageHero'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Swatch {
  name: string
  hex: string
  className: string
  textClass?: string
}

const brand: Swatch[] = [
  { name: 'Primary (steel blue)', hex: '#5b84a8', className: 'bg-primary', textClass: 'text-on-primary' },
  { name: 'Primary container', hex: '#cfe1f0', className: 'bg-primary-container', textClass: 'text-on-primary-container' },
  { name: 'CTA (coral)', hex: '#ff7f50', className: 'bg-coral-active', textClass: 'text-white' },
  { name: 'Get Set Go (teal)', hex: '#006a63', className: 'bg-tertiary', textClass: 'text-on-tertiary' },
  { name: 'Mint Go', hex: '#4fd1c5', className: 'bg-mint-go', textClass: 'text-on-tertiary-container' },
  { name: 'Secondary', hex: '#705d00', className: 'bg-secondary', textClass: 'text-on-secondary' },
  { name: 'Sky info', hex: '#0ea5e9', className: 'bg-sky-info', textClass: 'text-white' },
  { name: 'Sunflower caution', hex: '#ffd700', className: 'bg-sunflower-caution', textClass: 'text-on-surface' },
]

const neutrals: Swatch[] = [
  { name: 'Surface', hex: '#fef8f1', className: 'bg-surface', textClass: 'text-on-surface' },
  { name: 'Background', hex: '#fff9f2', className: 'bg-background', textClass: 'text-foreground' },
  { name: 'On surface', hex: '#1d1b17', className: 'bg-on-surface', textClass: 'text-surface' },
  { name: 'Inverse surface', hex: '#32302c', className: 'bg-inverse-surface', textClass: 'text-inverse-on-surface' },
]

function SwatchGrid({ items }: { items: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.name} className={`rounded-xl p-4 ring-1 ring-black/5 ${s.className}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide ${s.textClass ?? 'text-white'}`}>
            {s.name}
          </div>
          <div className={`mt-1 font-mono text-sm ${s.textClass ?? 'text-white'}`}>{s.hex}</div>
        </div>
      ))}
    </div>
  )
}

export default function Brand() {
  return (
    <>
      <PageHero eyebrow="Style guide" title="Brand" subtitle="Design tokens, type and components for the Taupō Athletics Club site." />

      <section className="container-page section-pad space-y-12">
        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Colour</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Steel-blue brand derived from the club logo.</p>
          <div className="mt-4">
            <SwatchGrid items={brand} />
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Surfaces &amp; neutrals</h2>
          <div className="mt-4">
            <SwatchGrid items={neutrals} />
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Typography</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white p-gutter-sm shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Fraunces — display</p>
              <p className="mt-2 font-display text-5xl font-bold text-on-surface">Taupō</p>
              <p className="mt-1 font-display text-2xl text-on-surface-variant">Get Set Go · 3–6 yrs</p>
            </div>
            <div className="rounded-xl bg-white p-gutter-sm shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Inter — body</p>
              <p className="mt-2 text-2xl font-medium text-on-surface">Taupō Athletics Club</p>
              <p className="mt-1 text-on-surface-variant">
                Fun, whānau-friendly athletics at Owen Delany Park. Macron renders correctly in both faces: Ō.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Buttons</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button>Register</Button>
            <Button variant="secondary">Club Nights</Button>
            <Button variant="outline">Meet our team</Button>
            <Button variant="mint">Volunteer</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Badges</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="mint">Get Set Go</Badge>
            <Badge variant="coral">Ribbon Day</Badge>
            <Badge variant="sky">Info</Badge>
            <Badge variant="sunflower">Caution</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Logo</h2>
          <div className="mt-4 flex items-center gap-6">
            <img src="/logo.svg" alt="Taupō Athletics Club logo" className="h-24 w-24 rounded-full bg-white p-1 shadow-soft" />
            <img src="/favicon.svg" alt="Favicon" className="h-10 w-10" />
            <p className="text-sm text-on-surface-variant">
              Circular club mark. Keep it on white/light surfaces; use the wordmark alongside it in Fraunces.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
