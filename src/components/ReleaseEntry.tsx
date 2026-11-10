import { Markdown } from '#/components/Markdown'
import type { Release } from '#/lib/releases'

type ReleaseEntryProps = {
  release: Release
  /** Level of the version heading; changelog headings render one level below. */
  headingLevel?: 3 | 4
  className?: string
}

/** One release from `content/releases`: version, date and changelog body. */
export function ReleaseEntry({ release, headingLevel = 3, className }: ReleaseEntryProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <article id={release.version} className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Heading className="m-0 font-mono text-2xl tracking-[0.04em] text-[var(--vm-white)]">
          {release.version}
        </Heading>
        <time
          dateTime={release.date}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]"
        >
          {release.date}
        </time>
      </div>
      <div className="mt-4">
        <Markdown source={release.body} headingLevel={headingLevel === 3 ? 4 : 5} />
      </div>
    </article>
  )
}
