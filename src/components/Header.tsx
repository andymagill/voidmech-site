import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--vm-slate)] bg-[rgba(10,20,32,0.9)] px-4 backdrop-blur">
      <nav className="vm-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <h2 className="m-0 flex-shrink-0 text-base">
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-[var(--vm-slate)] bg-[var(--vm-space)] px-3 py-1.5 font-mono text-xs tracking-[0.24em] uppercase no-underline"
          >
            <span className="h-2 w-2 bg-[var(--vm-cyan)]" />
            VoidMech
          </Link>
        </h2>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0">
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
