export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[var(--vm-slate)] px-4 pb-12 pt-8 text-[rgba(225,230,232,0.75)]">
      <div className="vm-wrap">
        <p className="m-0 text-center font-mono text-xs uppercase tracking-[0.18em] sm:text-left">
          &copy; {year} VoidMech. All rights reserved.
        </p>
      </div>
      <div className="vm-wrap mt-5 flex justify-end gap-4">
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
    </footer>
  )
}
