type SectionHeadingProps = {
  eyebrow: string
  title: string
  action?: React.ReactNode
}

export function SectionHeading({ eyebrow, title, action }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="vm-kicker">{eyebrow}</p>
        <h2 className="mt-3 font-mono text-3xl tracking-[0.04em] text-[var(--vm-white)]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
