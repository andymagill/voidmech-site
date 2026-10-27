import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { SectionHeading } from '#/components/ui/section-heading'
import { downloadSteps } from '#/content/site-content'

export const Route = createFileRoute('/download')({
  component: DownloadPage,
})

function DownloadPage() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel p-6 md:p-8">
        <SectionHeading eyebrow="Alpha access" title="Download the VoidMech alpha" />
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="max-w-xl text-base leading-8 text-[rgba(225,230,232,0.8)]">
              Grab the current build, check the running notes, and send a report if you hit a blocker or mission-breaker.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="https://voidmech.itch.io/voidmech-alpha" target="_blank" rel="noreferrer" className="inline-flex">
                <Button className="uppercase tracking-[0.2em]">Download build</Button>
              </a>
              <a href="#newsletter" className="inline-flex">
                <Button variant="secondary" className="uppercase tracking-[0.2em]">
                  Newsletter
                </Button>
              </a>
            </div>
          </div>

          <div className="vm-ghost-block">
            <div className="vm-sigil" aria-label="Placeholder game asset" />
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {downloadSteps.map((step, index) => (
          <article key={step} className="vm-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]">
              Step {index + 1}
            </p>
            <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
              {step}
            </p>
          </article>
        ))}
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="Support" title="Keep the signal open" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link to="/" className="inline-flex">
            <Button variant="secondary" className="uppercase tracking-[0.2em]">
              Return home
            </Button>
          </Link>
          <a href="#feedback" className="inline-flex">
            <Button variant="secondary" className="uppercase tracking-[0.2em]">
              Send feedback
            </Button>
          </a>
          <a href="#bug-report" className="inline-flex">
            <Button variant="warning" className="uppercase tracking-[0.2em]">
              Report bug
            </Button>
          </a>
        </div>
      </section>
    </main>
  )
}
