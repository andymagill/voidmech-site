const dotColors = {
  cyan: 'bg-[var(--vm-cyan)]',
  orange: 'bg-[var(--vm-orange)]',
} as const

/** Dot-bulleted list used for highlights, known issues and roadmap items. */
export function BulletList({
  items,
  dot = 'orange',
  className = '',
}: {
  items: ReadonlyArray<string>
  dot?: keyof typeof dotColors
  className?: string
}) {
  return (
    <ul className={`space-y-3 text-sm leading-7 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dotColors[dot]}`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
