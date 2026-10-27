import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="vm-wrap py-10">
      <section className="vm-panel p-6 md:p-8">
        <p className="vm-kicker">Game profile</p>
        <h1 className="mt-4 font-mono text-4xl font-semibold uppercase tracking-[0.1em] text-[var(--vm-white)] md:text-5xl">
          Tactical voxel mech-builder
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-8 text-[rgba(225,230,232,0.85)]">
          VoidMech is built around clear systems and deliberate decisions:
          weight distribution, power routing, and pilot feedback loops. Every
          panel and readout uses the same tactical language—fast to scan,
          precise under pressure.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="border border-[var(--vm-slate)] bg-[var(--vm-space)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--vm-cyan)]">
              Design rule
            </p>
            <p className="mt-2 font-mono text-lg uppercase tracking-[0.08em] text-[var(--vm-white)]">
              Legibility first
            </p>
          </article>
          <article className="border border-[var(--vm-slate)] bg-[var(--vm-space)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--vm-orange)]">
              Interaction
            </p>
            <p className="mt-2 font-mono text-lg uppercase tracking-[0.08em] text-[var(--vm-white)]">
              Precision over spectacle
            </p>
          </article>
          <article className="border border-[var(--vm-slate)] bg-[var(--vm-space)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--vm-green)]">
              Voice
            </p>
            <p className="mt-2 font-mono text-lg uppercase tracking-[0.08em] text-[var(--vm-white)]">
              Tactical and direct
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}
