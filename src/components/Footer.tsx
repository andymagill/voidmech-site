import { siteLinks } from '#/content/site-content'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[var(--vm-slate)] px-4 pb-12 pt-8 text-vm-text-muted">
      <div className="vm-wrap flex items-center justify-between gap-4">
        <p className="m-0 font-mono text-xs uppercase tracking-[0.18em] text-vm-text-muted">
          &copy; {year} VoidMech.
        </p>

        <div className="flex items-center gap-4">
          <a
            href={siteLinks.itch}
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            Itch.io
          </a>
          {/* Opens the newsletter modal on any page (see SubmissionModals). */}
          <a href="#newsletter" className="nav-link">
            Newsletter
          </a>
        </div>
      </div>
    </footer>
  )
}
