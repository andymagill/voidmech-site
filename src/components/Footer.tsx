export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[var(--vm-slate)] px-4 pb-12 pt-8 text-[rgba(225,230,232,0.75)]">
      <div className="vm-wrap flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p className="m-0 font-mono text-xs uppercase tracking-[0.18em]">
          &copy; {year} VoidMech. All rights reserved.
        </p>
        <p className="m-0 font-mono text-xs uppercase tracking-[0.18em] text-[var(--vm-cyan)]">
          Hosted on Cloudflare Workers
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
