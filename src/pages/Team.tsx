import * as React from 'react'
import { Link } from 'react-router-dom'
import { HeartHandshake, X } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Photo } from '@/components/Photo'
import { buttonVariants } from '@/components/ui/button'
import { committee, type Person } from '@/data/committee'
import { contactEmail } from '@/data/site'

const TONE: Record<string, string> = {
  blue: 'bg-primary-container text-on-primary-container',
  teal: 'bg-tertiary-container/60 text-on-tertiary-container',
  neutral: 'bg-surface-container-high text-on-surface',
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** A card only opens a dialog when there is something more to show. */
function hasProfile(p: Person) {
  return Boolean(p.bio || p.card || (p.qa && p.qa.length > 0))
}

function PersonCard({ p, tone, onOpen }: { p: Person; tone: string; onOpen?: () => void }) {
  const inner = (
    <>
      {p.photo ? (
        <img
          src={p.photo}
          alt=""
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${TONE[tone]}`}
        >
          {initials(p.name)}
        </span>
      )}
      <span className="text-left">
        <span className="block font-semibold text-on-surface">{p.name}</span>
        <span className="block text-sm text-on-surface-variant">{p.role}</span>
        {p.extra && <span className="block text-sm text-primary">{p.extra}</span>}
      </span>
    </>
  )

  if (!onOpen) {
    return (
      <div className="flex items-center gap-4 rounded-xl bg-white p-gutter-sm shadow-soft">{inner}</div>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-xl bg-white p-gutter-sm text-left shadow-soft transition-shadow hover:shadow-floating focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {inner}
    </button>
  )
}

export default function Team() {
  const [open, setOpen] = React.useState<Person | null>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <PageHero
        eyebrow="Our people"
        title="Meet Our Team"
        subtitle="The committee, coaches and friends of the committee who make club nights happen."
        photo={41}
      />

      <section className="container-page section-pad">
        <Photo
          id={42}
          sizes="100vw"
          className="mb-10 aspect-[21/9] w-full rounded-xl shadow-soft"
        />

        {committee.map((group) => (
          <div key={group.id} className="mb-12">
            <h2 className="font-display text-2xl font-bold text-on-surface md:text-3xl">{group.title}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.people.map((p) => (
                <PersonCard
                  key={p.name}
                  p={p}
                  tone={group.tone}
                  onOpen={hasProfile(p) ? () => setOpen(p) : undefined}
                />
              ))}

              {/* Fill the orphan slot at the end of a group with a recruiting card. */}
              <Link
                to="/volunteer"
                className="flex items-center gap-4 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low p-gutter-sm transition-colors hover:border-primary hover:bg-white"
              >
                <span
                  aria-hidden
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral-active/15 text-coral-active"
                >
                  <HeartHandshake className="h-7 w-7" />
                </span>
                <span>
                  <span className="block font-semibold text-on-surface">Could this be you?</span>
                  <span className="block text-sm text-on-surface-variant">
                    We need helpers on Thursday nights.
                  </span>
                </span>
              </Link>
            </div>
          </div>
        ))}

        <p className="text-on-surface-variant">
          We can always do with more helping hands — email{' '}
          <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>{' '}
          or talk to one of the team on Thursday night.
        </p>
        <Link to="/volunteer" className={`${buttonVariants({ variant: 'mint' })} mt-4`}>
          See our vacancies
        </Link>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${open.name}, ${open.role}`}
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-gutter-md shadow-floating"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <h2 className="font-display text-2xl font-bold text-on-surface">{open.name}</h2>
            <p className="text-on-surface-variant">{open.role}</p>
            {open.extra && <p className="text-on-surface-variant">{open.extra}</p>}
            {open.card && (
              // The club's own designed profile card. The Q&A below repeats its
              // words as real text, so the image is decorative here.
              <img
                src={open.card}
                alt=""
                loading="lazy"
                className="mt-4 w-full rounded-lg"
              />
            )}
            {open.bio && <p className="mt-4 text-on-surface-variant">{open.bio}</p>}
            {open.qa && (
              <dl className="mt-4 space-y-3">
                {open.qa.map((item) => (
                  <div key={item.q}>
                    <dt className="font-semibold text-on-surface">{item.q}</dt>
                    <dd className="text-on-surface-variant">{item.a}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
    </>
  )
}
