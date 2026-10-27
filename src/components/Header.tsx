import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import Logo from './Logo'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/download', label: 'Download' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/about', label: 'Game' },
] as const

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      className="border-b border-[var(--vm-slate)] bg-[rgba(10,20,32,0.9)] px-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setMenuOpen(false)
      }}
    >
      <nav className="vm-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <h2 className="m-0 flex-shrink-0 text-base">
          <Link
            to="/"
            className="inline-flex items-baseline gap-2 no-underline"
            onClick={() => setMenuOpen(false)}
          >
            <Logo className="text-2xl tracking-[0.08em]" />
            <span className="font-sans text-[11px] font-medium lowercase tracking-[0.08em] text-[rgba(225,230,232,0.6)]">
              alpha
            </span>
          </Link>
        </h2>

        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center border border-[var(--vm-slate)] bg-[var(--vm-space)] text-[var(--vm-white)] sm:hidden"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path d="M3 3l12 12M15 3L3 15" />
            ) : (
              <path d="M2 4.5h14M2 9h14M2 13.5h14" />
            )}
          </svg>
        </button>

        <div
          id="site-nav"
          className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col items-end gap-4 pb-2 pt-1 sm:ml-auto sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-x-4 sm:pb-0 sm:pt-0`}
        >
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
