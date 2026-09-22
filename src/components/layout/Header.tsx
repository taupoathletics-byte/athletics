import * as React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ChevronDown, Lock, Menu, X } from 'lucide-react'
import { navItems, clubName, links } from '@/data/site'
import { cn } from '@/lib/utils'

export function Header() {
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-white shadow-soft-sm">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/logo.svg" alt={`${clubName} logo`} className="h-11 w-11 rounded-full" />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-primary">{clubName}</div>
            <div className="text-xs text-on-surface-variant">Athletics for ages 3–14</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="group relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="invisible absolute left-0 top-full z-50 w-56 rounded-lg border border-outline-variant bg-white p-1 opacity-0 shadow-soft transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  {item.children.map((c) => (
                    <Link
                      key={c.label}
                      to={c.to!}
                      className="block rounded-md px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to!}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary',
                    isActive && 'text-primary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
          <a
            href={links.adminPortal}
            className="ml-2 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Lock className="h-4 w-4" aria-hidden />
            Admin Portal
          </a>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-outline-variant bg-white px-margin-mobile py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label} className="flex flex-col gap-1">
                  <span className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                    {item.label}
                  </span>
                  {item.children.map((c) => (
                    <NavLink
                      key={c.label}
                      to={c.to!}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-6 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to!}
                  end={item.to === '/'}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
                >
                  {item.label}
                </NavLink>
              ),
            )}
            <a
              href={links.adminPortal}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-primary"
            >
              <Lock className="h-4 w-4" aria-hidden />
              Admin Portal
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
