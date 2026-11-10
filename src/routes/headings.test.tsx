// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import Header from '#/components/Header'
import { installTurnstile } from '#/test/turnstile'
import type { Poll } from '#/content/polls'
import { mechanics } from '#/content/site-content'
import type { Release } from '#/lib/releases'
import { Route as IndexRoute } from './index'
import { Route as RoadmapRoute } from './roadmap'

/**
 * Document outline per page: exactly one `h1`, and no level skipped on the way
 * down (h2 -> h4 is a skip; going back up is fine). The real route tree isn't
 * rendered because its root is the full HTML shell; instead each page component
 * is mounted under the real `Header` in a small test router.
 */

const mockPolls = vi.hoisted(() => ({
  list: [] as Poll[],
}))

vi.mock('#/content/polls', async (importOriginal) => {
  const original = await importOriginal<typeof import('#/content/polls')>()
  return {
    ...original,
    get polls() {
      return mockPolls.list
    },
  }
})

/** One release whose changelog has its own headings, so the h3 -> h4 nesting is checked. */
const mockReleases = vi.hoisted(() => ({
  list: [] as Release[],
}))

const testRelease: Release = {
  version: '9.9.9-test',
  date: '2026-01-01',
  body: '### Added\n- A thing\n\n### Fixed\n- Another',
}

vi.mock('#/lib/releases', async (importOriginal) => {
  const original = await importOriginal<typeof import('#/lib/releases')>()
  return {
    ...original,
    get releases() {
      return mockReleases.list
    },
    latestRelease: () => mockReleases.list[0],
  }
})

const option = (id: string) => ({
  id,
  kicker: `Option ${id}`,
  title: `Title ${id}`,
  body: `Body ${id}`,
  tint: 'cyan' as const,
})

const openPoll: Poll = {
  id: 'open-poll',
  question: 'Open question',
  description: 'Open description',
  opensAt: '2020-01-01T00:00:00Z',
  closesAt: null,
  options: [option('a'), option('b')],
}

const closedPoll: Poll = {
  id: 'closed-poll',
  question: 'Closed question',
  description: 'Closed description',
  opensAt: '2019-01-01T00:00:00Z',
  closesAt: '2019-06-01T00:00:00Z',
  options: [option('c'), option('d')],
}

const noVote = { hasVoted: false, optionId: null, votedAt: null, nextVoteAt: null }

/** GET /api/votes/:id -> an open ballot for `openPoll`, final results for `closedPoll`. */
function stubVoteApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const closed = String(url).includes(closedPoll.id)
      const poll = closed ? closedPoll : openPoll
      const body = closed
        ? {
            poll: { id: poll.id, status: 'closed', opensAt: poll.opensAt, closesAt: poll.closesAt },
            voter: { ...noVote, canVote: false },
            results: { total: 3, counts: { c: 2, d: 1 } },
          }
        : {
            poll: { id: poll.id, status: 'open', opensAt: poll.opensAt, closesAt: null },
            voter: { ...noVote, canVote: true },
            results: null,
          }
      return new Response(JSON.stringify(body), { status: 200 })
    }),
  )
}

type PageRoute = { options: { component?: unknown } }

async function renderPage(path: string, page: PageRoute) {
  const Page = page.options.component as () => React.JSX.Element
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Header />
        <Outlet />
      </>
    ),
  })
  const pageRoute = createRoute({ getParentRoute: () => rootRoute, path, component: Page })
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(<RouterProvider router={router} />)
  await screen.findByRole('main')
}

/** Heading levels in document order, with their text for failure messages. */
function outline() {
  return Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((heading) => ({
    level: Number(heading.tagName[1]),
    text: heading.textContent?.trim() ?? '',
  }))
}

function expectValidOutline() {
  const headings = outline()
  expect(headings.filter(({ level }) => level === 1)).toHaveLength(1)
  expect(headings[0].level).toBe(1)

  headings.forEach(({ level, text }, index) => {
    if (index === 0) return
    const previous = headings[index - 1]
    expect(
      level <= previous.level + 1,
      `"${text}" (h${level}) follows "${previous.text}" (h${previous.level}), skipping a level`,
    ).toBe(true)
  })
}

describe('heading outline', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    window.localStorage.clear()
    installTurnstile()
    mockPolls.list = [openPoll]
    mockReleases.list = [testRelease]
    stubVoteApi()
  })

  afterEach(() => {
    cleanup()
    delete window.turnstile
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('/ has one h1 and a clean outline, with the system cards one level under "Core systems"', async () => {
    await renderPage('/', IndexRoute)
    expectValidOutline()

    const levels = Object.fromEntries(outline().map(({ level, text }) => [text, level]))
    expect(levels['Core systems']).toBe(2)
    for (const { title } of mechanics) expect(levels[title]).toBe(3)
  })

  it('/ no longer carries the latest build or release notes', async () => {
    await renderPage('/', IndexRoute)
    expectValidOutline()
    expect(screen.queryByRole('heading', { name: 'Latest build' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '9.9.9-test' })).toBeNull()
  })

  it('/ puts the FAQ above the support section', async () => {
    await renderPage('/', IndexRoute)
    const titles = outline().map(({ text }) => text)
    expect(titles.indexOf('Pilot briefing')).toBeLessThan(titles.indexOf('Keep the signal open'))
  })

  describe('/roadmap', () => {
    it('nests the featured poll: page h1, poll h2, options h3', async () => {
      await renderPage('/roadmap', RoadmapRoute)
      await screen.findByRole('radio', { name: /Title a/ })

      expectValidOutline()
      const levels = Object.fromEntries(outline().map(({ level, text }) => [text, level]))
      expect(levels['Open question']).toBe(2)
      expect(levels['Title a']).toBe(3)
      expect(levels['Title b']).toBe(3)
    })

    it('puts the poll first and nests the release log in "Latest build": h2 section, h3 version, h4 changelog', async () => {
      await renderPage('/roadmap', RoadmapRoute)
      await screen.findByRole('radio', { name: /Title a/ })

      expectValidOutline()
      const headings = outline()
      expect(headings[0]).toEqual({ level: 1, text: 'VoidMech roadmap' })
      expect(headings[1].text).toBe('Open question')
      expect(document.querySelector('main > section')?.getAttribute('aria-labelledby')).toBe(
        'community-poll-title',
      )
      const levels = Object.fromEntries(headings.map(({ level, text }) => [text, level]))
      expect(levels['Latest build']).toBe(2)
      expect(levels['9.9.9-test']).toBe(3)
      expect(levels['Added']).toBe(4)
      expect(levels['Fixed']).toBe(4)
    })

    it('still has a clean outline with no open poll and no published release', async () => {
      mockPolls.list = []
      mockReleases.list = []
      await renderPage('/roadmap', RoadmapRoute)

      expectValidOutline()
      expect(screen.getByRole('heading', { name: 'Latest build' })).toBeTruthy()
      expect(screen.queryByRole('heading', { name: '9.9.9-test' })).toBeNull()
    })

    it('nests past polls under "Past polls": h2 section, h3 question, h4 options and results', async () => {
      mockPolls.list = [openPoll, closedPoll]
      await renderPage('/roadmap', RoadmapRoute)
      await waitFor(() =>
        expect(screen.getAllByRole('heading', { name: 'Results' }).length).toBeGreaterThan(0),
      )

      expectValidOutline()
      const levels = Object.fromEntries(outline().map(({ level, text }) => [text, level]))
      expect(levels['Past polls']).toBe(2)
      expect(levels['Closed question']).toBe(3)
      expect(levels['Title c']).toBe(4)
      expect(levels['Title d']).toBe(4)
      expect(levels['Results']).toBe(4)
    })
  })
})
