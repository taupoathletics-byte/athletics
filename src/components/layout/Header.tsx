import * as React from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Lock, Menu, X } from 'lucide-react'
import { RegisterButton } from '@/components/RegisterButton'
import { navItems, clubName, links } from '@/data/site'
import { cn } from '@/lib/utils'

const linkBase =
  'whitespace-nowrap rounded-md px-2.5 py-2 font-display text-[1.05rem] font-extrabold uppercase tracking-[0.06em] text-cream/85 transition-colors hover:text-signal-light'

/**
 * Sixes-style bar: navy, condensed uppercase nav, red Register. Sticky, with
 * a lane-stripe (red / off-white) edge underneath.
 */
export function Header() {
  const [open, setOpen] = React.useState(false)
  const location = useLocation()
  React.useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-50 bg-ink text-cream shadow-[0_2px_0_#b04f49,0_4px_0_#F6F3EC,0_6px_0_#0c2033]">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[72px]">
        {/* Badge + name */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${clubName} home`}>
          <img src="/logo.svg" alt="" className="h-10 w-10 rounded-full bg-cream p-0.5 md:h-11 md:w-11" />
          <span className="font-display text-2xl font-black uppercase leading-none tracking-wide text-cream">
            Taupō <span className="text-signal">Athletics</span>
          </span>
        </Link>

        <nav className="hidden items-center xl:flex" aria-label="Primary">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="group relative">
                <button type="button" aria-haspopup="menu" className={cn(linkBase, 'flex items-center gap-1')}>
                  {item.label}
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <div className="invisible absolute left-0 top-full z-50 w-60 pt-2 opacity-0 transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="rounded-xl bg-ink-2 p-2 shadow-floating ring-1 ring-cream/10">
                    {item.children.map((c) => (
                      <Link
                        key={c.label}
                        to={c.to!}
                        className="block rounded-lg px-3 py-2.5 font-display text-lg font-extrabold uppercase tracking-wide text-cream hover:bg-cream/10 hover:text-signal-light"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to!}
                end={item.to === '/'}
                className={({ isActive }) => cn(linkBase, isActive && 'text-signal-light')}
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={links.adminPortal}
            className="hidden items-center gap-1.5 rounded-full border-2 border-cream/70 px-3.5 py-1.5 font-display text-base font-extrabold uppercase tracking-wide text-cream transition-colors hover:bg-cream hover:text-ink md:inline-flex"
          >
            <Lock className="h-4 w-4" aria-hidden /> Admin
          </a>
          <RegisterButton pulse={false} className="hidden px-4 py-2 font-display text-base font-extrabold uppercase tracking-wide sm:inline-flex">
            Register
          </RegisterButton>
          <button
            type="button"
            className="-mr-2 rounded-md p-2 text-cream hover:bg-cream/10 xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="max-h-[calc(100svh-64px)] overflow-y-auto border-t border-cream/10 bg-ink px-margin-mobile pb-6 pt-2 xl:hidden" aria-label="Mobile">
          <div className="flex flex-col">
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label} className="border-b border-cream/10 py-2">
                  <span className="block px-1 py-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-soft">{item.label}</span>
                  {item.children.map((c) => (
                    <NavLink key={c.label} to={c.to!} className="block px-1 py-2 font-display text-3xl font-black uppercase text-cream hover:text-signal">
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to!}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn('border-b border-cream/10 px-1 py-3 font-display text-3xl font-black uppercase text-cream hover:text-signal', isActive && 'text-signal')
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
            <RegisterButton pulse={false} className="mt-5 py-3 font-display text-lg font-extrabold uppercase tracking-wide sm:hidden">
              Register for the season
            </RegisterButton>
            <a href={links.adminPortal} className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border-2 border-cream/70 px-4 py-3 font-display text-lg font-extrabold uppercase tracking-wide text-cream">
              <Lock className="h-4 w-4" aria-hidden /> Admin portal
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
