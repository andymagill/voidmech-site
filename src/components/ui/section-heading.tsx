type SectionHeadingProps = {
  eyebrow: string
  title: string
  /** Id for the heading, so a section can name itself with `aria-labelledby`. */
  id?: string
  /** `1` for the page title (once per page); every other section heading keeps the default `2`. */
  level?: 1 | 2
  action?: React.ReactNode
}

/** Eyebrow + title pair that opens every page section; `action` sits right-aligned on wide screens. */
export function SectionHeading({ eyebrow, title, id, level = 2, action }: SectionHeadingProps) {
  const Heading = `h${level}` as const

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="vm-kicker">{eyebrow}</p>
        <Heading id={id} className="mt-3 font-mono text-3xl tracking-[0.04em] text-[var(--vm-white)]">
          {title}
        </Heading>
      </div>
      {action}
    </div>
  )
}
