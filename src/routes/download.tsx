import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { SectionHeading } from '#/components/ui/section-heading'
import {
  buildDetails,
  downloadGallery,
  downloadHero,
  downloadHeroImage,
  downloadSteps,
  knownIssues,
  patchHighlights,
  supportPrompts,
  troubleshootingSteps,
} from '#/content/site-content'

export const Route = createFileRoute('/download')({
  component: DownloadPage,
})

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

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="https://voidmech.itch.io/voidmech-alpha" target="_blank" rel="noreferrer" className="inline-flex">
                <Button className="uppercase tracking-[0.2em]">{downloadHero.primaryCta}</Button>
              </a>
              <a href="https://discord.gg/voidmech" target="_blank" rel="noreferrer" className="inline-flex">
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

          <figure className="vm-media-frame vm-media-hero">
            <img
              src={downloadHeroImage.src}
              alt={downloadHeroImage.alt}
              loading="lazy"
              decoding="async"
              className="vm-media-image"
            />
            <figcaption className="vm-media-caption">{downloadHeroImage.caption}</figcaption>
          </figure>
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
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
            {patchHighlights.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--vm-orange)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {downloadGallery.map((image) => (
              <figure key={image.src} className="vm-media-frame vm-media-tile">
                <img src={image.src} alt={image.alt} loading="lazy" decoding="async" className="vm-media-image" />
                <figcaption className="vm-media-caption">{image.caption}</figcaption>
              </figure>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="vm-panel p-6 md:p-8">
          <SectionHeading eyebrow="Known issues" title="Current notes" />
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">
            {knownIssues.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--vm-cyan)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
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
          <div className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-orange)]">
              Bug report
            </p>
            <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">{supportPrompts.bug}</p>
            <a href="#bug-report" className="vm-panel-link mt-4 inline-flex">Report bug</a>
          </div>
          <div className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]">
              Feedback
            </p>
            <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">{supportPrompts.feedback}</p>
            <a href="#feedback" className="vm-panel-link mt-4 inline-flex">Send feedback</a>
          </div>
          <div className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-green)]">
              Newsletter
            </p>
            <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">{supportPrompts.newsletter}</p>
            <a href="#newsletter" className="vm-panel-link mt-4 inline-flex">Join newsletter</a>
          </div>
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
          <a href="https://discord.gg/voidmech" target="_blank" rel="noreferrer" className="inline-flex">
            <Button variant="warning" className="uppercase tracking-[0.2em]">
              Join pilot Discord
            </Button>
          </a>
        </div>
      </section>
    </main>
  )
}
