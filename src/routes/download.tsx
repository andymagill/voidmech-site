import { createFileRoute, Link } from '@tanstack/react-router'
import { BulletList } from '#/components/ui/bullet-list'
import { Button } from '#/components/ui/button'
import ScreenshotFigure from '#/components/ScreenshotFigure'
import { alphaNoticeText } from '#/components/AlphaNotice'
import { SectionHeading } from '#/components/ui/section-heading'
import {
  buildDetails,
  downloadGallery,
  downloadHero,
  downloadHeroImage,
  downloadSteps,
  knownIssues,
  patchHighlights,
  siteLinks,
  supportPrompts,
  troubleshootingSteps,
} from '#/content/site-content'

export const Route = createFileRoute('/download')({
  component: DownloadPage,
})

/** Support cards open the submission modals through their URL hash (see SubmissionModals). */
const supportCards = [
  { label: 'Bug report', tint: 'text-[var(--vm-orange)]', text: supportPrompts.bug, href: '#bug-report', cta: 'Report bug' },
  { label: 'Feedback', tint: 'text-[var(--vm-cyan)]', text: supportPrompts.feedback, href: '#feedback', cta: 'Send feedback' },
  { label: 'Newsletter', tint: 'text-[var(--vm-green)]', text: supportPrompts.newsletter, href: '#newsletter', cta: 'Join newsletter' },
]

function DownloadPage() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel p-6 md:p-8">
        <SectionHeading eyebrow={downloadHero.eyebrow} title={downloadHero.headline} />
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="max-w-xl text-base leading-8 text-[rgba(225,230,232,0.8)]">
              {downloadHero.body}
            </p>
            <p className="mt-4 max-w-xl border-l-2 border-[var(--vm-orange)] pl-3 text-sm leading-7 text-[var(--vm-orange)]">
              {alphaNoticeText} Download at your own discretion.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={siteLinks.itch} target="_blank" rel="noreferrer" className="inline-flex">
                <Button className="uppercase tracking-[0.2em]">{downloadHero.primaryCta}</Button>
              </a>
              <a href={siteLinks.discord} target="_blank" rel="noreferrer" className="inline-flex">
                <Button variant="secondary" className="uppercase tracking-[0.2em]">
                  {downloadHero.secondaryCta}
                </Button>
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {downloadHero.utilityLinks.map(({ label, href }) => (
                <a key={label} href={href} className="vm-panel-link">
                  {label}
                </a>
              ))}
            </div>
          </div>

          <ScreenshotFigure image={downloadHeroImage} className="vm-media-hero" />
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        {downloadSteps.map((step, index) => (
          <article key={step} className="vm-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]">
              Step {index + 1}
            </p>
            <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">{step}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="vm-panel p-6 md:p-8">
          <SectionHeading eyebrow="Build" title="Build details" />
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
            {buildDetails.map(({ label, value }) => (
              <li key={label} className="flex justify-between gap-4 border-b border-[var(--vm-slate)] pb-2">
                <span>{label}</span>
                <span className="text-right text-[var(--vm-white)]">{value}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="vm-panel p-6 md:p-8">
          <SectionHeading eyebrow="Highlights" title="Patch highlights" />
          <BulletList items={patchHighlights} dot="orange" className="mt-4 text-[rgba(225,230,232,0.8)]" />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {downloadGallery.map((image) => (
              <ScreenshotFigure key={image.src} image={image} className="vm-media-tile" />
            ))}
          </div>
        </article>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="vm-panel p-6 md:p-8">
          <SectionHeading eyebrow="Known issues" title="Current notes" />
          <BulletList items={knownIssues} dot="cyan" className="mt-4 text-[rgba(225,230,232,0.8)]" />
        </article>

        <article id="support" className="vm-panel p-6 md:p-8">
          <SectionHeading eyebrow="Troubleshooting" title="If the build fails to launch" />
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
            {troubleshootingSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="Support" title="Keep the signal open" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {supportCards.map(({ label, tint, text, href, cta }) => (
            <div key={label} className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-4">
              <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${tint}`}>{label}</p>
              <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">{text}</p>
              <a href={href} className="vm-panel-link mt-4 inline-flex">{cta}</a>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/" className="inline-flex">
            <Button variant="secondary" className="uppercase tracking-[0.2em]">
              Return home
            </Button>
          </Link>
          <Link to="/roadmap" className="inline-flex">
            <Button variant="secondary" className="uppercase tracking-[0.2em]">
              Read roadmap
            </Button>
          </Link>
          <a href={siteLinks.discord} target="_blank" rel="noreferrer" className="inline-flex">
            <Button variant="warning" className="uppercase tracking-[0.2em]">
              Join pilot Discord
            </Button>
          </a>
        </div>
      </section>
    </main>
  )
}
