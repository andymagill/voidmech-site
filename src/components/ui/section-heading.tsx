type SectionHeadingProps = {
  eyebrow: string
  title: string
  /** Id for the `h2`, so a section can name itself with `aria-labelledby`. */
  id?: string
  action?: React.ReactNode
}

/** Eyebrow + title pair that opens every page section; `action` sits right-aligned on wide screens. */
export function SectionHeading({ eyebrow, title, id, action }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="vm-kicker">{eyebrow}</p>
        <h2 id={id} className="mt-3 font-mono text-3xl tracking-[0.04em] text-[var(--vm-white)]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
