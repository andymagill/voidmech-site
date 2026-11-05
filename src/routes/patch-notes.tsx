import { createFileRoute, Link } from '@tanstack/react-router'
import { Markdown } from '#/components/Markdown'
import { buttonVariants } from '#/components/ui/button'
import { SectionHeading } from '#/components/ui/section-heading'
import { patchNotesHero, siteLinks } from '#/content/site-content'
import { releases } from '#/lib/releases'

export const Route = createFileRoute('/patch-notes')({
  head: () => ({
    meta: [
      { title: 'Patch notes | VoidMech' },
      { name: 'description', content: 'What changed in each public VoidMech alpha build.' },
    ],
  }),
  component: PatchNotesPage,
})

function PatchNotesPage() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel p-6 md:p-8">
        <SectionHeading level={1} eyebrow={patchNotesHero.eyebrow} title={patchNotesHero.headline} />
        <p className="mt-4 max-w-3xl text-base leading-8 text-vm-text">
          {patchNotesHero.body}
        </p>
      </section>

      {releases.length === 0 ? (
        <section className="vm-panel mt-10 p-6 md:p-8">
          <p className="m-0 text-sm leading-7 text-vm-text">
            {patchNotesHero.empty}
          </p>
        </section>
      ) : (
        releases.map((release) => (
          <article key={release.version} id={release.version} className="vm-panel mt-10 p-6 md:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="m-0 font-mono text-2xl tracking-[0.04em] text-[var(--vm-white)]">
                {release.version}
              </h2>
              <time
                dateTime={release.date}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]"
              >
                {release.date}
              </time>
            </div>
            <div className="mt-4">
              <Markdown source={release.body} />
            </div>
          </article>
        ))
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link to="/download" className={buttonVariants()}>
          Download alpha
        </Link>
        <a href="#bug-report" className={buttonVariants({ variant: 'secondary' })}>
          Report a bug
        </a>
        <a
          href={siteLinks.discord}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'secondary' })}
        >
          Join pilot Discord
        </a>
      </div>
    </main>
  )
}
