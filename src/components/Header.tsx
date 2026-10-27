import { Link } from '@tanstack/react-router'
import Logo from './Logo'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--vm-slate)] bg-[rgba(10,20,32,0.9)] px-4 backdrop-blur">
      <nav className="vm-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <h2 className="m-0 flex-shrink-0 text-base">
          <Link
            to="/"
            className="inline-flex items-baseline gap-2 no-underline"
          >
            <Logo className="text-2xl tracking-[0.08em]" />
            <span className="font-sans text-[11px] font-medium lowercase tracking-[0.08em] text-[rgba(225,230,232,0.6)]">
              alpha
            </span>
          </Link>
        </h2>

        <div className="order-3 flex w-full flex-wrap items-center justify-end gap-x-4 gap-y-1 pb-1 sm:order-none sm:ml-auto sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Home
          </Link>
          <Link
            to="/download"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Download
          </Link>
          <Link
            to="/roadmap"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Roadmap
          </Link>
          <Link
            to="/about"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Game
          </Link>
        </div>
      </nav>
    </header>
  )
}
