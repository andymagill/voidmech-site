import { createFileRoute } from '@tanstack/react-router'
import { BulletList } from '#/components/ui/bullet-list'
import ScreenshotFigure from '#/components/ScreenshotFigure'
import { SectionHeading } from '#/components/ui/section-heading'
import {
  roadmapCommunityVotes,
  roadmapFaq,
  roadmapHero,
  roadmapImages,
  roadmapMilestones,
} from '#/content/site-content'

export const Route = createFileRoute('/roadmap')({
  component: RoadmapPage,
})

function RoadmapPage() {
  return (
    <main className="vm-wrap pb-16 pt-10">
      <section className="vm-panel p-6 md:p-8">
        <SectionHeading eyebrow={roadmapHero.eyebrow} title={roadmapHero.headline} />
        <p className="mt-4 max-w-3xl text-base leading-8 text-[rgba(225,230,232,0.8)]">
          {roadmapHero.body}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {roadmapImages.map((image) => (
            <ScreenshotFigure key={image.src} image={image} className="vm-media-tile" />
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {roadmapMilestones.map(({ status, items }) => (
            <article key={status} className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]">
                {status}
              </p>
              <BulletList items={items} className="mt-4 text-[rgba(225,230,232,0.82)]" />
            </article>
          ))}
        </div>
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="Community" title="Vote on the next feature" />
        <p className="mt-2 max-w-3xl text-base leading-8 text-[rgba(225,230,232,0.8)]">
          Community feedback is reviewed weekly and mapped into scoped work. Pick the feature you want prioritised next.
        </p>

        <form className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {roadmapCommunityVotes.map(({ kicker, title, body, tint }) => (
              <label
                key={title}
                className="block cursor-pointer border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-5 transition hover:border-[var(--vm-cyan)]"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="roadmap-vote"
                    className="mt-1 h-4 w-4 accent-[var(--vm-cyan)]"
                  />
                  <div className="flex-1">
                    <p
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                        tint === 'orange'
                          ? 'text-[var(--vm-orange)]'
                          : tint === 'cyan'
                            ? 'text-[var(--vm-cyan)]'
                            : 'text-[var(--vm-green)]'
                      }`}
                    >
                      {kicker}
                    </p>
                    <h3 className="mt-3 font-mono text-xl tracking-[0.04em] text-[var(--vm-white)]">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">{body}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center border border-[var(--vm-cyan)] bg-[rgba(34,224,240,0.12)] px-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--vm-cyan)]"
            >
              Cast vote
            </button>
          </div>
        </form>
      </section>

      <section className="vm-panel mt-10 p-6 md:p-8">
        <SectionHeading eyebrow="Roadmap FAQ" title="Mission updates" />
        <div className="vm-faq mt-6">
          {roadmapFaq.map(({ question, answer }, index) => (
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
