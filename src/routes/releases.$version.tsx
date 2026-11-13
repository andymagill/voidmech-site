import { Link, createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { alphaNoticeText } from '#/components/AlphaNotice'
import { Markdown } from '#/components/Markdown'
import { buttonVariants } from '#/components/ui/button'
import { SectionHeading } from '#/components/ui/section-heading'
import { latestBuild, releaseAnnouncements, releasePage, siteLinks } from '#/content/site-content'
import { releaseIndex, releases } from '#/lib/releases'
import { cn } from '#/lib/utils'

/**
 * `/releases/<version>`: one release's notes, the page the roadmap's release
 * log links to and the Reddit and itch.io announcements point at
 * (`scripts/release-announcement.mjs`). An unknown version is a 404; a known one
 * spelled differently (`v0.4.2-Alpha`) redirects to the file's spelling.
 */
export const Route = createFileRoute('/releases/$version')({
  loader: ({ params }) => {
    const index = releaseIndex(params.version, releases)
    if (index === -1) throw notFound()
    const release = releases[index]
    if (release.version !== params.version) {
      throw redirect({ to: '/releases/$version', params: { version: release.version }, statusCode: 301 })
    }
    return {
      release,
      isLatest: index === 0,
      newer: releases[index - 1] as (typeof releases)[number] | undefined,
      older: releases[index + 1] as (typeof releases)[number] | undefined,
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${releasePage.title(loaderData.release.version)} release notes | VoidMech` },
            {
              name: 'description',
              content: releasePage.description(loaderData.release.version, loaderData.release.date),
            },
          ],
        }
      : {},
  component: ReleasePage,
})

const navLinkClass =
  'flex flex-col gap-1 border border-[var(--vm-slate)] bg-vm-surface-soft p-4 no-underline hover:border-[var(--vm-cyan)]'

function ReleasePage() {
  const { release, isLatest, newer, older } = Route.useLoaderData()
  const releaseAnnouncement = releaseAnnouncements[release.version as keyof typeof releaseAnnouncements]

  return (
    <main className="vm-wrap pb-16 pt-10">
      <article className="vm-panel p-6 md:p-8">
        <Link
          to="/roadmap"
          hash="release-log"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-vm-text-dim no-underline hover:text-[var(--vm-cyan)]"
        >
          ← {releasePage.backLink}
        </Link>
        <div className="mt-6">
          <SectionHeading
            level={1}
            eyebrow={isLatest ? `${releasePage.eyebrow} · ${releasePage.latestBadge}` : releasePage.eyebrow}
            title={releasePage.title(release.version)}
            action={
              <time
                dateTime={release.date}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]"
              >
                {release.date}
              </time>
            }
          />
        </div>
        <div className="mt-6 max-w-3xl">
          <Markdown source={release.body} headingLevel={2} />
        </div>
        {isLatest && (
          <p className="mt-8 max-w-3xl border-l-2 border-[var(--vm-orange)] pl-3 text-sm leading-7 text-[var(--vm-orange)]">
            {alphaNoticeText} Download at your own discretion.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {releaseAnnouncement?.reddit && (
            <a
              href={releaseAnnouncement.reddit}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'secondary' })}
            >
              Discuss on Reddit
            </a>
          )}
          {releaseAnnouncement?.itch && (
            <a
              href={releaseAnnouncement.itch}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'secondary' })}
            >
              View on Itch.io
            </a>
          )}
        </div>
      </article>

      {(newer || older) && (
        <nav aria-label="Other releases" className="mt-6 grid gap-4 sm:grid-cols-2">
          {newer ? (
            <Link to="/releases/$version" params={{ version: newer.version }} className={navLinkClass}>
              <span className="vm-kicker">← {releasePage.newer}</span>
              <span className="font-mono text-lg text-[var(--vm-white)]">{newer.version}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {older && (
            <Link
              to="/releases/$version"
              params={{ version: older.version }}
              className={cn(navLinkClass, 'sm:items-end sm:text-right')}
            >
              <span className="vm-kicker">{releasePage.older} →</span>
              <span className="font-mono text-lg text-[var(--vm-white)]">{older.version}</span>
            </Link>
          )}
        </nav>
      )}
    </main>
  )
}
