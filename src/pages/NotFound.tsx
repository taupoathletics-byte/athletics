import { Link } from 'react-router-dom'
import { PageHero } from '@/components/PageHero'
import { buttonVariants } from '@/components/ui/button'

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Club nights', to: '/club-nights' },
  { label: 'Registration', to: '/registration' },
  { label: 'My Results', to: '/my-results' },
]

export default function NotFound() {
  return (
    <>
      <PageHero
        title="Page not found"
        subtitle="Sorry, we couldn't find that page. It may have moved when the club website was updated."
      />

      <section className="container-page section-pad">
        <ul className="flex flex-wrap gap-3">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={buttonVariants({ variant: 'outline' })}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
