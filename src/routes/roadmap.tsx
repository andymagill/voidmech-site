import { Link, createFileRoute } from '@tanstack/react-router'
import { alphaNoticeText } from '#/components/AlphaNotice'
import { BulletList } from '#/components/ui/bullet-list'
import { buttonVariants } from '#/components/ui/button'
import { ReleaseEntry } from '#/components/ReleaseEntry'
import ScreenshotFigure from '#/components/ScreenshotFigure'
import { SectionHeading } from '#/components/ui/section-heading'
import { PollVote } from '#/components/PollVote'
import { currentPoll, pollStatus, polls } from '#/content/polls'
import {
  buildDetails,
  latestBuild,
  releaseLog,
  roadmapPage,
  roadmapImages,
  roadmapMilestones,
  siteLinks,
} from '#/content/site-content'
import { latestRelease, releases } from '#/lib/releases'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/roadmap')({
  component: RoadmapPage,
})

function RoadmapPage() {
  const now = new Date()
  const featured = currentPoll(polls, now)
  const past = polls.filter((poll) => poll !== featured && pollStatus(poll, now) === 'closed')

  const latest = latestRelease()
  const earlier = releases.slice(1)
  const details = [
    { label: 'Current build', value: latest ? `Alpha ${latest.version}` : 'See itch.io' },
    { label: 'Updated', value: latest?.date ?? 'See itch.io' },
    ...buildDetails,
  ]

  return (
    <main className="vm-wrap pb-16 pt-10">
      {/* No visible page title: the poll leads. The h1 keeps the document outline intact. */}
      <h1 className="sr-only">{roadmapPage.title}</h1>

      {featured && (
        <section className="vm-panel p-6 md:p-8" aria-labelledby="community-poll-title">
          <SectionHeading eyebrow="Community" title={featured.question} id="community-poll-title" />
          <p className="mb-6 mt-2 max-w-3xl text-base leading-8 text-vm-text">
            {featured.description}
          </p>
          <PollVote poll={featured} />
        </section>
      )}

      <section className={cn('vm-panel p-6 md:p-8', featured && 'mt-10')} aria-label="Milestones">
        <div className="grid gap-4 md:grid-cols-3">
          {roadmapImages.map((image) => (
            <ScreenshotFigure key={image.src} image={image} className="vm-media-tile" />
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {roadmapMilestones.map(({ status, items }) => (
            <article key={status} className="border border-[var(--vm-slate)] bg-vm-surface-soft p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]">
                {status}
              </p>
              <BulletList items={items} className="mt-4 text-vm-text" />
            </article>
          ))}
        </div>
      </section>

      <section id="build" className="vm-panel mt-10 p-6 md:p-8" aria-labelledby="latest-build-title">
        <SectionHeading eyebrow={latestBuild.eyebrow} title={latestBuild.title} id="latest-build-title" />
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <ul className="space-y-3 text-sm leading-7 text-vm-text">
              {details.map(({ label, value }) => (
                <li key={label} className="flex justify-between gap-4 border-b border-[var(--vm-slate)] pb-2">
                  <span>{label}</span>
                  <span className="text-right text-[var(--vm-white)]">{value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-l-2 border-[var(--vm-orange)] pl-3 text-sm leading-7 text-[var(--vm-orange)]">
              {alphaNoticeText} Download at your own discretion.
            </p>
            <a href={siteLinks.itch} target="_blank" rel="noreferrer" className={cn(buttonVariants(), 'mt-6')}>
              {latestBuild.primaryCta}
            </a>
          </div>

          <div id="release-log">
            <p className="vm-kicker">{releaseLog.title}</p>
            <p className="mt-2 text-sm leading-7 text-vm-text">{releaseLog.body}</p>
            {latest ? (
              <ReleaseEntry
                release={latest}
                headingLevel={3}
                linkToPage
                className="mt-6 border-t border-[var(--vm-slate)] pt-6"
              />
            ) : (
              <p className="mt-6 text-sm leading-7 text-vm-text">{releaseLog.empty}</p>
            )}
            {earlier.length > 0 && (
              <nav
                className="mt-8 border-t border-[var(--vm-slate)] pt-6"
                aria-labelledby="earlier-releases-title"
              >
                <h3 id="earlier-releases-title" className="vm-kicker m-0">
                  {releaseLog.earlierTitle}
                </h3>
                <ul className="mt-3 text-sm leading-7 text-vm-text">
                  {earlier.map((release) => (
                    <li
                      key={release.version}
                      className="flex justify-between gap-4 border-b border-[var(--vm-slate)] py-2"
                    >
                      <Link
                        to="/releases/$version"
                        params={{ version: release.version }}
                        className="font-mono text-[var(--vm-white)] underline-offset-4 hover:text-[var(--vm-cyan)] hover:underline"
                      >
                        {release.version}
                      </Link>
                      <time dateTime={release.date} className="text-right">
                        {release.date}
                      </time>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
      </section>

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
