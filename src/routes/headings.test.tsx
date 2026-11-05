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
import { Route as DownloadRoute } from './download'
import { Route as IndexRoute } from './index'
import { Route as PatchNotesRoute } from './patch-notes'
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

  it('/download has one h1 and a clean outline', async () => {
    await renderPage('/download', DownloadRoute)
    expectValidOutline()
  })

  it('/patch-notes has one h1 and a clean outline', async () => {
    await renderPage('/patch-notes', PatchNotesRoute)
    expectValidOutline()
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
