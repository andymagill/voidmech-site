import { createFileRoute, Link } from '@tanstack/react-router'
import FaqList from '#/components/FaqList'
import HeroVideo from '#/components/HeroVideo'
import ScreenshotFigure from '#/components/ScreenshotFigure'
import { BulletList } from '#/components/ui/bullet-list'
import { buttonVariants } from '#/components/ui/button'
import { SectionHeading } from '#/components/ui/section-heading'
import { cn } from '#/lib/utils'
import {
  faq,
  homeHero,
  homeHeroVideo,
  homeSystemGallery,
  knownIssues,
  mechanics,
  siteLinks,
  supportCards,
  troubleshootingSteps,
} from '#/content/site-content'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel grid gap-8 p-6 md:p-8 lg:grid-cols-2 lg:items-center xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="vm-kicker">{homeHero.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-balance font-mono text-4xl font-semibold tracking-[0.04em] text-[var(--vm-white)] lg:text-5xl">
            {homeHero.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-vm-text">
            {homeHero.body}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={siteLinks.itch} target="_blank" rel="noreferrer" className={buttonVariants()}>
              {homeHero.primaryCta}
            </a>
            <Link to="/roadmap" className={buttonVariants({ variant: 'secondary' })}>
              {homeHero.secondaryCta}
            </Link>
          </div>
        </div>

        <HeroVideo media={homeHeroVideo} className="vm-media-hero-video" />
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
              <h3 className="mt-3 font-mono text-xl tracking-[0.04em] text-[var(--vm-white)]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-vm-text-muted">
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

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="vm-panel p-6 md:p-8">
          <SectionHeading eyebrow="Known issues" title="Current notes" />
          <BulletList items={knownIssues} dot="cyan" className="mt-4 text-vm-text" />
        </article>

        <article className="vm-panel p-6 md:p-8">
          <SectionHeading eyebrow="Troubleshooting" title="If the build fails to launch" />
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-vm-text">
            {troubleshootingSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="FAQ" title="Pilot briefing" />

        <FaqList items={faq} />
      </section>

      <section id="support" className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="Support" title="Keep the signal open" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {supportCards.map(({ label, tint, text, href, cta }) => (
            <div key={label} className="border border-[var(--vm-slate)] bg-vm-surface-soft p-4">
              <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${tint}`}>{label}</p>
              <p className="mt-3 text-sm leading-7 text-vm-text">{text}</p>
              <a href={href} className={cn(buttonVariants({ variant: 'secondary' }), 'mt-4')}>
                {cta}
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
