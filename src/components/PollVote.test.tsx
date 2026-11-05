// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { polls } from '#/content/polls'
import type { PollState } from '#/lib/votes'
import '#/test/dom-matchers'
import { installTurnstile } from '#/test/turnstile'
import { PollVote } from './PollVote'

const poll = polls[0]
const [first, second, third] = poll.options
const CACHE_KEY = `vm-poll:${poll.id}`

const open: PollState = {
  poll: { id: poll.id, status: 'open', opensAt: poll.opensAt, closesAt: null },
  voter: { hasVoted: false, optionId: null, votedAt: null, nextVoteAt: null, canVote: true },
  results: null,
}

const nextDay = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString()

/** The state after voting for `optionId` (tallies: 3 / 1 / 0). */
const afterVote = (optionId = first.id, nextVoteAt = nextDay): PollState => ({
  ...open,
  voter: { hasVoted: true, optionId, votedAt: new Date().toISOString(), nextVoteAt, canVote: false },
  results: { total: 4, counts: { [first.id]: 3, [second.id]: 1, [third.id]: 0 } },
})

const closed: PollState = {
  poll: { ...open.poll, status: 'closed', closesAt: '2026-12-01T00:00:00Z' },
  voter: { hasVoted: false, optionId: null, votedAt: null, nextVoteAt: null, canVote: false },
  results: { total: 10, counts: { [first.id]: 5, [second.id]: 4, [third.id]: 1 } },
}

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

/** Routes GET (poll state) and POST (vote) to the supplied responders. */
function mockApi({
  get = () => reply(200, open),
  post = () => reply(201, { ok: true, ...afterVote() }),
}: { get?: () => Response | Promise<Response>; post?: () => Response | Promise<Response> } = {}) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? post() : get(),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const posts = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')

const sentBody = (fetchMock: ReturnType<typeof mockApi>) =>
  JSON.parse((posts(fetchMock)[0][1] as RequestInit).body as string) as Record<string, string>

const castButton = () => screen.getByRole('button', { name: /cast vote|verifying|sending/i })
const radio = (title: string) => screen.getByRole('radio', { name: new RegExp(title, 'i') })

/** Renders the poll and waits for the first GET to settle into a ballot. */
async function renderBallot() {
  render(<PollVote poll={poll} />)
  await waitFor(() => expect(radio(first.title)).toBeEnabled())
}

describe('PollVote', () => {
  let turnstile: ReturnType<typeof installTurnstile>

  beforeEach(() => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    window.localStorage.clear()
    turnstile = installTurnstile()
  })

  afterEach(() => {
    cleanup()
    delete window.turnstile
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('loading and ballot', () => {
    it('shows a disabled, busy ballot until the first response arrives', async () => {
      let release!: (response: Response) => void
      mockApi({ get: () => new Promise<Response>((resolve) => (release = resolve)) })
      const { container } = render(<PollVote poll={poll} />)

      expect(screen.getByText('Checking your ballot…')).toBeInTheDocument()
      expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
      expect(radio(first.title)).toBeDisabled()
      expect(castButton()).toBeDisabled()

      await act(async () => release(reply(200, open)))
      await waitFor(() => expect(radio(first.title)).toBeEnabled())
      expect(container.firstElementChild).toHaveAttribute('aria-busy', 'false')
    })

    it('offers every option as a radio in one labelled group and shows no results to a new voter', async () => {
      mockApi()
      await renderBallot()

      expect(screen.getByRole('group', { name: poll.question })).toBeInTheDocument()
      expect(screen.getAllByRole('radio')).toHaveLength(poll.options.length)
      expect(screen.queryByText('Results')).toBeNull()
    })

    it('marks the chosen option as selected', async () => {
      mockApi()
      await renderBallot()

      fireEvent.click(radio(second.title))
      expect(radio(second.title)).toBeChecked()
      expect(radio(first.title)).not.toBeChecked()
    })

    it('asks for a choice instead of sending an empty vote, and moves focus to the options', async () => {
      const fetchMock = mockApi()
      await renderBallot()

      fireEvent.click(castButton())
      expect(screen.getByRole('alert')).toHaveTextContent('Pick an option first.')
      expect(radio(first.title)).toHaveFocus()
      expect(posts(fetchMock)).toHaveLength(0)

      fireEvent.click(radio(first.title))
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('casting a vote', () => {
    it('verifies, sends the option and token, then shows the results with focus on them', async () => {
      const fetchMock = mockApi()
      await renderBallot()
      await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())

      fireEvent.click(radio(first.title))
      fireEvent.click(castButton())
      expect(castButton()).toHaveTextContent('Verifying…')
      expect(castButton()).toBeDisabled()
      expect(posts(fetchMock)).toHaveLength(0)

      turnstile.solve('token-1')
      await screen.findByRole('heading', { name: 'Results' })

      expect(sentBody(fetchMock)).toEqual({ option_id: first.id, 'cf-turnstile-response': 'token-1' })
      expect(screen.getByRole('heading', { name: 'Results' })).toHaveFocus()
      expect(screen.getByText(/Vote counted for/)).toHaveTextContent(first.title)
      // The ballot is replaced by the results while the cooldown runs.
      expect(screen.queryByRole('button', { name: /cast vote/i })).toBeNull()
      expect(screen.queryByRole('radio')).toBeNull()
      // The same three option cards stay in place, with their full text, now carrying the shares.
      const cards = screen.getAllByRole('listitem')
      expect(cards).toHaveLength(poll.options.length)
      poll.options.forEach((option, index) => {
        expect(cards[index]).toHaveTextContent(option.title)
        expect(cards[index]).toHaveTextContent(option.body)
      })
      expect(cards[0]).toHaveTextContent('75%')
      expect(screen.getByText('Your vote')).toBeInTheDocument()
      expect(screen.getByText('3 votes · 75%')).toBeInTheDocument()
      expect(screen.getByText('1 vote · 25%')).toBeInTheDocument()
      expect(screen.getByText('0 votes · 0%')).toBeInTheDocument()
    })

    it('caches the results from the response in localStorage', async () => {
      mockApi()
      await renderBallot()
      await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())

      fireEvent.click(radio(second.title))
      fireEvent.click(castButton())
      turnstile.solve('token-1')
      await screen.findByRole('heading', { name: 'Results' })

      const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY)!)
      expect(cached.state.results.total).toBe(4)
      expect(cached.state.voter.hasVoted).toBe(true)
    })

    it('shows the cooldown reason, the shared-connection note and the results on a 429', async () => {
      mockApi({
        post: () =>
          reply(
            429,
            { error: 'You have already voted in this poll recently', code: 'cooldown', ...afterVote(second.id) },
            { 'retry-after': '72000' },
          ),
      })
      await renderBallot()
      await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())

      fireEvent.click(radio(first.title))
      fireEvent.click(castButton())
      turnstile.solve('token-1')

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('You have already voted in this poll recently')
      expect(alert).toHaveTextContent('You can vote again after')
      expect(alert).toHaveTextContent('share a connection')
      expect(screen.queryByRole('button', { name: /cast vote/i })).toBeNull()
      expect(screen.getByText('Your vote').closest('li')).toHaveTextContent(second.title)
    })

    it.each([
      [403, { error: 'Verification failed. Retry the challenge and submit again.' }, /Verification failed/],
      [429, { error: 'Too many requests. Wait a minute and try again.' }, /Too many attempts\. Wait 60 seconds/],
      [500, { error: 'Could not save your submission. Try again later.' }, /Could not save/],
    ])('explains a %i and keeps the ballot usable for a retry', async (status, body, message) => {
      mockApi({ post: () => reply(status, body, status === 429 ? { 'retry-after': '60' } : {}) })
      await renderBallot()
      await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())

      fireEvent.click(radio(first.title))
      fireEvent.click(castButton())
      turnstile.solve('token-1')

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(castButton()).toBeEnabled()
      expect(radio(first.title)).toBeChecked()
      // A new challenge is started for the retry.
      expect(turnstile.api.reset).toHaveBeenCalled()
    })

    it('reports a network failure', async () => {
      const fetchMock = mockApi()
      await renderBallot()
      await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())
      fetchMock.mockImplementation(async (_url, init) => {
        if (init?.method === 'POST') throw new TypeError('offline')
        return reply(200, open)
      })

      fireEvent.click(radio(first.title))
      fireEvent.click(castButton())
      turnstile.solve('token-1')

      expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
    })

    it('reloads the poll when the server says it has closed', async () => {
      const fetchMock = mockApi({
        post: () => reply(409, { error: 'This poll has closed', code: 'closed' }),
      })
      await renderBallot()
      await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())

      fireEvent.click(radio(first.title))
      fireEvent.click(castButton())
      turnstile.solve('token-1')

      expect(await screen.findByRole('alert')).toHaveTextContent('This poll has closed')
      const gets = fetchMock.mock.calls.filter(([, init]) => init?.method !== 'POST')
      expect(gets.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('restrictions on load', () => {
    it('shows results, not the ballot, to someone still inside their cooldown', async () => {
      mockApi({ get: () => reply(200, afterVote(third.id)) })
      render(<PollVote poll={poll} />)

      await screen.findByRole('heading', { name: 'Results' })
      expect(screen.getByText(/You already voted. You can vote again/)).toBeInTheDocument()
      expect(screen.queryByRole('radio')).toBeNull()
      expect(screen.queryByRole('button', { name: /cast vote/i })).toBeNull()
      expect(screen.getByText('Your vote').closest('li')).toHaveTextContent(third.title)
    })

    it('brings the ballot back when the cooldown ends, keeping the results visible', async () => {
      const endsSoon = new Date(Date.now() + 800).toISOString()
      mockApi({ get: () => reply(200, afterVote(first.id, endsSoon)) })
      render(<PollVote poll={poll} />)

      await screen.findByRole('heading', { name: 'Results' })
      expect(screen.queryByRole('radio')).toBeNull()

      await waitFor(() => expect(radio(first.title)).toBeEnabled(), { timeout: 3000 })
      expect(screen.getByRole('heading', { name: 'Results' })).toBeInTheDocument()
      // Radios and shares share the cards; the voter's earlier choice stays marked.
      expect(screen.getByText('3 votes · 75%')).toBeInTheDocument()
      expect(screen.getByText('Your vote').closest('label')).toHaveTextContent(first.title)
    })

    it('shows when voting opens and keeps the ballot disabled for an upcoming poll', async () => {
      const upcoming: PollState = {
        ...open,
        poll: { ...open.poll, status: 'upcoming', opensAt: '2099-01-01T00:00:00Z' },
        voter: { ...open.voter, canVote: false },
      }
      mockApi({ get: () => reply(200, upcoming) })
      render(<PollVote poll={poll} />)

      await screen.findByText(/Voting opens/)
      expect(radio(first.title)).toBeDisabled()
      expect(castButton()).toBeDisabled()
    })

    it('shows final results and no ballot for a closed poll', async () => {
      mockApi({ get: () => reply(200, closed) })
      render(<PollVote poll={poll} />)

      await screen.findByRole('heading', { name: 'Results' })
      expect(screen.getByText(/Voting closed/)).toBeInTheDocument()
      expect(screen.getByText('10 votes in total')).toBeInTheDocument()
      expect(screen.getByText('5 votes · 50%')).toBeInTheDocument()
      expect(screen.queryByRole('radio')).toBeNull()
      expect(screen.queryByText('Your vote')).toBeNull()
      expect(screen.getAllByRole('listitem')).toHaveLength(poll.options.length)
    })
  })

  describe('cached results', () => {
    const cache = (state: PollState) =>
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ state, savedAt: '2026-11-10T10:00:00Z' }))

    it('paints saved results at once, then replaces them with the server\'s answer', async () => {
      cache(afterVote())
      let release!: (response: Response) => void
      mockApi({ get: () => new Promise<Response>((resolve) => (release = resolve)) })
      render(<PollVote poll={poll} />)

      expect(await screen.findByText('3 votes · 75%')).toBeInTheDocument()
      expect(screen.getByText(/Showing results saved/)).toBeInTheDocument()

      await act(async () => release(reply(200, { ...afterVote(), results: { total: 8, counts: { [first.id]: 6, [second.id]: 2, [third.id]: 0 } } })))
      await screen.findByText('6 votes · 75%')
      expect(screen.queryByText(/Showing results saved/)).toBeNull()
    })

    it('lets the server override a stale cache (a different network has not voted)', async () => {
      cache(afterVote())
      mockApi()
      render(<PollVote poll={poll} />)

      await waitFor(() => expect(radio(first.title)).toBeEnabled())
      expect(screen.queryByRole('heading', { name: 'Results' })).toBeNull()
    })

    it('keeps showing saved results, with a retry, when the refresh fails', async () => {
      cache(afterVote())
      const fetchMock = mockApi({ get: () => reply(500, { error: 'down' }) })
      render(<PollVote poll={poll} />)

      await screen.findByText(/Could not refresh this poll/)
      expect(screen.getByText('3 votes · 75%')).toBeInTheDocument()

      fetchMock.mockImplementation(async () => reply(200, afterVote()))
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      await waitFor(() => expect(screen.queryByText(/Could not refresh/)).toBeNull())
    })

    it('offers a retry when there is nothing cached and the poll cannot load', async () => {
      const fetchMock = mockApi({ get: () => reply(503, {}) })
      render(<PollVote poll={poll} />)

      await screen.findByText(/Could not load this poll/)
      fetchMock.mockImplementation(async () => reply(200, open))
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      await waitFor(() => expect(radio(first.title)).toBeEnabled())
    })

    it('ignores corrupt or foreign cache entries and still works when storage throws', async () => {
      window.localStorage.setItem(CACHE_KEY, '{not json')
      mockApi()
      render(<PollVote poll={poll} />)
      await waitFor(() => expect(radio(first.title)).toBeEnabled())
      cleanup()

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      render(<PollVote poll={poll} />)
      await waitFor(() => expect(radio(first.title)).toBeEnabled())
      vi.restoreAllMocks()
    })
  })

  describe('heading levels', () => {
    const levelsOf = () =>
      Object.fromEntries(
        screen.getAllByRole('heading').map((heading) => [heading.textContent, Number(heading.tagName[1])]),
      )

    it('uses h3 for the option titles and the results heading by default', async () => {
      mockApi({ get: () => reply(200, closed) })
      render(<PollVote poll={poll} />)
      await screen.findByRole('heading', { name: 'Results' })

      const levels = levelsOf()
      expect(levels['Results']).toBe(3)
      expect(levels[first.title]).toBe(3)
    })

    it('moves everything to h4 when the poll sits under its own h3', async () => {
      mockApi({ get: () => reply(200, closed) })
      render(<PollVote poll={poll} headingLevel={4} />)
      await screen.findByRole('heading', { name: 'Results' })

      const levels = levelsOf()
      expect(levels['Results']).toBe(4)
      expect(levels[first.title]).toBe(4)
      expect(Object.values(levels)).not.toContain(3)
    })
  })
})
