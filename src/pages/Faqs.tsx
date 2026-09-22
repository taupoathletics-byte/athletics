import { PageHero } from '@/components/PageHero'
import { Accordion } from '@/components/ui/accordion'
import { faqs } from '@/data/site'

export default function Faqs() {
  return (
    <>
      <PageHero
        eyebrow="Good to know"
        title="FAQs"
        subtitle="Frequently asked questions about registration, club nights and events."
        photo={47}
      />

      <section className="container-page section-pad">
        {faqs.map((cat) => (
          <div key={cat.category} className="mb-10">
            <h2 className="mb-4 font-display text-2xl font-bold text-on-surface">{cat.category}</h2>
            <Accordion
              items={cat.items.map((item) => ({
                value: `${cat.category}-${item.q}`,
                title: item.q,
                content: (
                  <>
                    {item.a}
                    {item.link && (
                      <>
                        {' '}
                        <a
                          className="font-semibold text-primary underline"
                          href={item.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.link.label}
                        </a>
                      </>
                    )}
                  </>
                ),
              }))}
            />
          </div>
        ))}
      </section>
    </>
  )
}
