import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, FileText, Mail } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'
import { contactEmail } from '@/data/site'
import { policies, policyBySlug } from '@/data/policies'
import { cn } from '@/lib/utils'

/** Tab strip shared by the policy index and each policy page. */
function PolicyTabs({ active }: { active?: string }) {
  return (
    <nav aria-label="Club policies" className="flex flex-wrap gap-2">
      {policies.map((p) => (
        <Link
          key={p.slug}
          to={`/policies/${p.slug}`}
          aria-current={p.slug === active ? 'page' : undefined}
          className={cn(
            'min-h-[40px] rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
            p.slug === active
              ? 'border-primary bg-primary text-white'
              : 'border-outline-variant bg-white text-on-surface hover:border-primary',
          )}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  )
}

export default function Policies() {
  const { slug } = useParams()
  const policy = policyBySlug(slug)

  // /policies/something-else → the index rather than a broken page.
  if (slug && !policy) return <Navigate to="/policies" replace />

  if (!policy) {
    return (
      <>
        <PageHero
          eyebrow="Club information"
          title="Policies"
          subtitle="The club's safeguarding, complaints, refund and health & safety policies."
          photo={41}
          event="relays"
        />
        <section className="container-page section-pad">
          <div className="grid gap-4 sm:grid-cols-2">
            {policies.map((p) => (
              <Link
                key={p.slug}
                to={`/policies/${p.slug}`}
                className="group flex h-full flex-col rounded-xl bg-white p-gutter-sm shadow-soft transition-shadow hover:shadow-floating"
              >
                <span className="flex items-center gap-2 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                  <span className="font-display text-xl font-bold text-on-surface">{p.title}</span>
                </span>
                <span className="mt-2 flex-1 text-on-surface-variant">{p.summary}</span>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-primary">
                  Read the policy <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-10 flex flex-wrap items-center gap-2 text-on-surface-variant">
            <Mail className="h-5 w-5 text-signal" aria-hidden />
            Questions about a policy? Email{' '}
            <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHero eyebrow="Club policy" title={policy.title} subtitle={policy.summary} photo={41} event="hurdles" />

      <section className="container-page section-pad">
        <PolicyTabs active={policy.slug} />

        <article className="mt-8 max-w-3xl">
          {policy.reviewed && (
            <p className="mb-6 rounded-lg bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant">
              Effective {policy.reviewed}.
            </p>
          )}

          <div className="space-y-8">
            {policy.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-2xl font-bold text-on-surface">{section.heading}</h2>
                {section.paragraphs?.map((text) => (
                  <p key={text} className="mt-3 text-on-surface-variant">
                    {text}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((text) => (
                      <li key={text} className="flex gap-3 text-on-surface-variant">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`mailto:${contactEmail}`} className={buttonVariants({ variant: 'outline' })}>
              <Mail className="mr-2 h-4 w-4" aria-hidden />
              Ask the committee
            </a>
            <Link to="/policies" className={buttonVariants({ variant: 'ghost' })}>
              All policies
            </Link>
          </div>
        </article>
      </section>
    </>
  )
}
