import { createFileRoute } from '@tanstack/react-router'
import ScreenshotFigure from '#/components/ScreenshotFigure'
import { SectionHeading } from '#/components/ui/section-heading'
import {
  aboutImages,
  aboutBoilerplate,
  aboutCtas,
  aboutHero,
  aboutHighlights,
  aboutPrinciples,
} from '#/content/site-content'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="vm-wrap py-10">
      <section className="vm-panel p-6 md:p-8">
        <p className="vm-kicker">{aboutHero.eyebrow}</p>
        <h1 className="mt-4 font-mono text-4xl font-semibold uppercase tracking-[0.1em] text-[var(--vm-white)] md:text-5xl">
          {aboutHero.headline}
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-8 text-[rgba(225,230,232,0.85)]">
          {aboutHero.body}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {aboutPrinciples.map(({ kicker, title, body }) => (
            <article key={title} className="border border-[var(--vm-slate)] bg-[var(--vm-space)] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--vm-cyan)]">
                {kicker}
              </p>
              <p className="mt-2 font-mono text-lg uppercase tracking-[0.08em] text-[var(--vm-white)]">
                {title}
              </p>
              <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.75)]">{body}</p>
            </article>
          ))}
        </div>

        <ScreenshotFigure image={aboutImages.primary} className="mt-8" />
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="What makes it different" title="Design intent" />
        <ScreenshotFigure image={aboutImages.secondary} className="mt-4" />
        <ul className="mt-4 space-y-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
          {aboutHighlights.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--vm-orange)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="Team" title="Project boilerplate" />
        <p className="max-w-4xl text-base leading-8 text-[rgba(225,230,232,0.8)]">
          {aboutBoilerplate}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {aboutCtas.map((cta, index) => (
            <button
              key={cta}
              type="button"
              className={`inline-flex h-10 items-center justify-center border px-4 text-sm font-semibold uppercase tracking-[0.2em] ${
                index === 0
                  ? 'border-[var(--vm-cyan)] bg-[rgba(34,224,240,0.12)] text-[var(--vm-cyan)]'
                  : index === 1
                    ? 'border-[var(--vm-slate)] bg-[var(--vm-space)] text-[var(--vm-white)]'
                    : 'border-[var(--vm-orange)] bg-[rgba(245,138,31,0.12)] text-[var(--vm-orange)]'
              }`}
            >
              {cta}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
