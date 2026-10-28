export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[var(--vm-slate)] px-4 pb-12 pt-8 text-[rgba(225,230,232,0.75)]">
      <div className="vm-wrap flex items-center justify-between gap-4">
        <p className="m-0 font-mono text-xs uppercase tracking-[0.18em] text-[rgba(225,230,232,0.75)]">
          &copy; {year} VoidMech.
        </p>

        <div className="flex items-center gap-4">
          <a
            href="https://voidmech.itch.io/voidmech-alpha"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            Itch.io
          </a>
          <a
            href="https://discord.gg/voidmech"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            Discord
          </a>
        </div>
      </div>
    </footer>
  )
}
