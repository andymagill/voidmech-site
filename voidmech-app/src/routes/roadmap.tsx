import { createFileRoute } from '@tanstack/react-router'
import { SectionHeading } from '#/components/ui/section-heading'
import { roadmapMilestones } from '#/content/site-content'

export const Route = createFileRoute('/roadmap')({
  component: RoadmapPage,
})

function RoadmapPage() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel p-6 md:p-8">
        <SectionHeading eyebrow="Progress" title="Roadmap" />

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {roadmapMilestones.map(({ status, items }) => (
            <article key={status} className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]">
                {status}
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[rgba(225,230,232,0.82)]">
                {items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--vm-orange)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="Community" title="Feature voting" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--vm-orange)]">
              Top voted
            </p>
            <h3 className="mt-3 font-mono text-xl uppercase tracking-[0.08em] text-[var(--vm-white)]">
              Better squad loadouts
            </h3>
            <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
              More flexible module slots, quick-save presets, and a clearer weapon tuning loop.
            </p>
          </article>

          <article className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--vm-green)]">
              Next up
            </p>
            <h3 className="mt-3 font-mono text-xl uppercase tracking-[0.08em] text-[var(--vm-white)]">
              Mission replay tools
            </h3>
            <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
              Review movement, enemy pressure, and pilot decisions after a deployment ends.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}
