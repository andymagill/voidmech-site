import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import FaqList from '#/components/FaqList'
import ScreenshotFigure from '#/components/ScreenshotFigure'
import { SectionHeading } from '#/components/ui/section-heading'
import {
  faq,
  homeHero,
  homeHeroImage,
  homeSystemGallery,
  mechanics,
  siteLinks,
} from '#/content/site-content'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel grid gap-8 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8">
        <div>
          <p className="vm-kicker">{homeHero.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-mono text-4xl font-semibold tracking-[0.04em] text-[var(--vm-white)] md:text-6xl">
            {homeHero.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[rgba(225,230,232,0.85)]">
            {homeHero.body}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/download">
              <Button className="uppercase tracking-[0.2em]">{homeHero.primaryCta}</Button>
            </Link>
            <a href={siteLinks.discord} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="uppercase tracking-[0.2em]">
                {homeHero.secondaryCta}
              </Button>
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {homeHero.tertiaryLinks.map(({ label, href }) => (
              <a key={label} href={href} className="vm-panel-link">
                {label}
              </a>
            ))}
          </div>
        </div>

        <ScreenshotFigure image={homeHeroImage} className="vm-media-hero" loading="eager" />
      </section>

      <section className="mt-10">
        <SectionHeading
          eyebrow="Mission intel"
          title="Core systems"
          action={<a href="#feedback" className="nav-link">Signal feedback</a>}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {mechanics.map((item) => (
            <article key={item.title} className="vm-panel p-5 md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--vm-cyan)]">
                {item.kicker}
              </p>
              <h2 className="mt-3 font-mono text-xl tracking-[0.04em] text-[var(--vm-white)]">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.76)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {homeSystemGallery.map((image) => (
            <ScreenshotFigure key={image.src} image={image} className="vm-media-tile" />
          ))}
        </div>
      </section>

      <section className="vm-panel mt-12 p-6 md:p-8">
        <SectionHeading eyebrow="FAQ" title="Pilot briefing" />

        <FaqList items={faq} />
      </section>
    </main>
  )
}
