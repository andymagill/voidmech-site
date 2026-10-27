import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { SectionHeading } from '#/components/ui/section-heading'
import { faq, mechanics } from '#/content/site-content'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel grid gap-8 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8">
        <div>
          <p className="vm-kicker">Build / test / launch</p>
          <h1 className="mt-4 max-w-3xl font-mono text-4xl font-semibold uppercase tracking-[0.1em] text-[var(--vm-white)] md:text-6xl">
            VoidMech
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[rgba(225,230,232,0.85)]">
            A retro-futuristic mech combat prototype built around readable systems,
            weight-based tactics, and fast, tactical decisions under pressure.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/download">
              <Button className="uppercase tracking-[0.2em]">Download alpha</Button>
            </Link>
            <a href="https://discord.gg/voidmech" target="_blank" rel="noreferrer">
              <Button variant="secondary" className="uppercase tracking-[0.2em]">
                Join Discord
              </Button>
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#newsletter" className="vm-panel-link">
              Newsletter
            </a>
            <a href="#feedback" className="vm-panel-link">
              Feedback
            </a>
            <a href="#bug-report" className="vm-panel-link">
              Bug report
            </a>
          </div>
        </div>

        <div className="vm-hero-visual" aria-label="VoidMech placeholder hero art">
          <div className="vm-hero-window">
            <div className="vm-panel-core" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          eyebrow="Mission intel"
          title="Core systems"
          action={
            <a href="#feedback" className="nav-link">
              Signal feedback
            </a>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          {mechanics.map((item) => (
            <article key={item.title} className="vm-panel p-5 md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--vm-cyan)]">
                {item.kicker}
              </p>
              <h2 className="mt-3 font-mono text-xl uppercase tracking-[0.08em] text-[var(--vm-white)]">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.76)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="vm-panel mt-12 p-6 md:p-8">
        <SectionHeading eyebrow="FAQ" title="Pilot briefing" />

        <div className="vm-faq mt-6">
          {faq.map(({ question, answer }, index) => (
            <details key={question} open={index === 0} className="rounded-none">
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  )
}
