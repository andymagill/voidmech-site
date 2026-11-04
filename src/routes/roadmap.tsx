import { createFileRoute } from '@tanstack/react-router'
import { BulletList } from '#/components/ui/bullet-list'
import ScreenshotFigure from '#/components/ScreenshotFigure'
import { SectionHeading } from '#/components/ui/section-heading'
import { PollVote } from '#/components/PollVote'
import { currentPoll, pollStatus, polls } from '#/content/polls'
import { roadmapHero, roadmapImages, roadmapMilestones } from '#/content/site-content'

export const Route = createFileRoute('/roadmap')({
  component: RoadmapPage,
})

function RoadmapPage() {
  const now = new Date()
  const featured = currentPoll(polls, now)
  const past = polls.filter((poll) => poll !== featured && pollStatus(poll, now) === 'closed')

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

      {featured && (
        <section className="vm-panel mt-10 p-6 md:p-8" aria-labelledby="community-poll-title">
          <SectionHeading eyebrow="Community" title={featured.question} id="community-poll-title" />
          <p className="mb-6 mt-2 max-w-3xl text-base leading-8 text-[rgba(225,230,232,0.8)]">
            {featured.description}
          </p>
          <PollVote poll={featured} />
        </section>
      )}

      {past.length > 0 && (
        <section className="vm-panel mt-10 p-6 md:p-8" aria-labelledby="past-polls-title">
          <SectionHeading eyebrow="Community" title="Past polls" id="past-polls-title" />
          {past.map((poll) => (
            <article key={poll.id} className="mt-6">
              <h3 className="m-0 font-mono text-xl tracking-[0.04em] text-[var(--vm-white)]">
                {poll.question}
              </h3>
              <div className="mt-4">
                <PollVote poll={poll} headingLevel={4} />
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
