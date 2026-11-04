import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SITE_ORIGIN,
  fakeDb,
  fakeEnv,
  fakeLimiter,
  jsonRequest,
  turnstileFetch,
  type RecordedStatement,
} from '#/test/fakes'
import type { Poll } from '#/content/polls'
import { getPollState, voteEndpoint } from './vote'

const NOW = new Date('2026-11-10T12:00:00Z')

const poll: Poll = {
  id: 'test-poll',
  question: 'Pick one',
  description: 'Test poll',
  opensAt: '2026-11-01T00:00:00Z',
  closesAt: null,
  options: [
    { id: 'alpha', kicker: 'A', title: 'Alpha', body: '', tint: 'cyan' },
    { id: 'beta', kicker: 'B', title: 'Beta', body: '', tint: 'orange' },
  ],
}

const closedPoll: Poll = { ...poll, id: 'old-poll', closesAt: '2026-11-05T00:00:00Z' }
const upcomingPoll: Poll = { ...poll, id: 'later-poll', opensAt: '2026-12-01T00:00:00Z' }

/** A D1 stand-in for the vote queries: the insert's `changes`, the voter's last vote, the tallies. */
function votesDb({
  changes = 1,
  last = null,
  tallies = [],
}: {
  changes?: number
  last?: { option_id: string; created_at: string } | null
  tallies?: { option_id: string; votes: number }[]
} = {}) {
  return fakeDb({
    respond: ({ sql }) => {
      if (sql.includes('INSERT INTO votes')) return { changes }
      if (sql.includes('GROUP BY')) return { rows: tallies }
      return { rows: last ? [last] : [] }
    },
  })
}

const insertOf = (statements: RecordedStatement[]) =>
  statements.find((statement) => statement.sql.includes('INSERT INTO votes'))!

const vote = (body: unknown = { option_id: 'alpha', 'cf-turnstile-response': 'token' }, headers = {}) =>
  jsonRequest(`/api/votes/${poll.id}`, body, { headers })

async function post(
  request: Request,
  { target = poll, env = fakeEnv(), db = votesDb() }: { target?: Poll; env?: Env; db?: ReturnType<typeof votesDb> } = {},
) {
  const response = await voteEndpoint(target)(request, { ...env, DB: db.db })
  return { response, statements: db.statements, data: (await response.json()) as Record<string, any> }
}

const get = (ip = '203.0.113.7') =>
  new Request(`${SITE_ORIGIN}/api/votes/${poll.id}`, { headers: { 'cf-connecting-ip': ip } })

async function read(
  target: Poll,
  { request = get(), env = fakeEnv(), db = votesDb() }: { request?: Request; env?: Env; db?: ReturnType<typeof votesDb> } = {},
) {
  const response = await getPollState(target, request, { ...env, DB: db.db })
  return { response, statements: db.statements, data: (await response.json()) as Record<string, any> }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  vi.stubGlobal('fetch', turnstileFetch())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST vote: casting', () => {
  it('stores the vote under a hashed voter and returns the voter\'s standing with tallies', async () => {
    const db = votesDb({
      last: { option_id: 'alpha', created_at: NOW.toISOString() },
      tallies: [
        { option_id: 'alpha', votes: 3 },
        { option_id: 'beta', votes: 1 },
      ],
    })
    const { response, data, statements } = await post(vote(), { db })

    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      ok: true,
      poll: { id: 'test-poll', status: 'open' },
      voter: {
        hasVoted: true,
        optionId: 'alpha',
        nextVoteAt: '2026-11-11T12:00:00.000Z',
        canVote: false,
      },
      results: { total: 4, counts: { alpha: 3, beta: 1 } },
    })

    const [pollId, optionId, voterHash, createdAt, cutoff] = insertOf(statements).binds
    expect(pollId).toBe('test-poll')
    expect(optionId).toBe('alpha')
    expect(voterHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(statements)).not.toContain('203.0.113.7')
    expect(createdAt).toBe(NOW.toISOString())
    expect(cutoff).toBe('2026-11-09T12:00:00.000Z')
  })

  it('does the cooldown check and the insert in one atomic statement', async () => {
    const { statements } = await post(vote())
    const sql = insertOf(statements).sql
    expect(sql).toMatch(/INSERT INTO votes[\s\S]*SELECT[\s\S]*WHERE NOT EXISTS/)
  })

  it('honours a poll-specific cooldown', async () => {
    const hourly: Poll = { ...poll, cooldownHours: 1 }
    const { statements } = await post(vote(), { target: hourly })
    expect(insertOf(statements).binds[4]).toBe('2026-11-10T11:00:00.000Z')
  })

  it('gives the same voter hash for the same network and poll, different ones otherwise', async () => {
    const hashOf = async (ip: string, target: Poll = poll) => {
      const { statements } = await post(vote(undefined, { 'cf-connecting-ip': ip }), { target })
      return insertOf(statements).binds[2]
    }

    const first = await hashOf('203.0.113.7')
    expect(await hashOf('203.0.113.7')).toBe(first)
    expect(await hashOf('203.0.113.8')).not.toBe(first)
    expect(await hashOf('203.0.113.7', { ...poll, id: 'other-poll' })).not.toBe(first)
  })

  it('counts every address inside one IPv6 /64 as the same voter', async () => {
    const hashOf = async (ip: string) => {
      const { statements } = await post(vote(undefined, { 'cf-connecting-ip': ip }))
      return insertOf(statements).binds[2]
    }

    const home = await hashOf('2001:db8:1:2:aaaa:bbbb:cccc:dddd')
    expect(await hashOf('2001:db8:1:2::1')).toBe(home)
    expect(await hashOf('2001:db8:1:3::1')).not.toBe(home)
  })

  it('uses a different hash under a different VOTE_SALT', async () => {
    const hashWith = async (salt: string) => {
      const { statements } = await post(vote(), { env: fakeEnv({ VOTE_SALT: salt }) })
      return insertOf(statements).binds[2]
    }
    expect(await hashWith('salt-one')).not.toBe(await hashWith('salt-two'))
  })
})

describe('POST vote: restrictions', () => {
  it('answers 429 with Retry-After and the voter\'s standing when the cooldown has not elapsed', async () => {
    const votedAt = '2026-11-10T06:00:00.000Z'
    const db = votesDb({
      changes: 0,
      last: { option_id: 'beta', created_at: votedAt },
      tallies: [{ option_id: 'beta', votes: 2 }],
    })
    const { response, data } = await post(vote(), { db })

    expect(response.status).toBe(429)
    // The window ends 24 h after 06:00, which is 18 h from NOW.
    expect(response.headers.get('retry-after')).toBe(String(18 * 60 * 60))
    expect(data).toMatchObject({
      code: 'cooldown',
      error: expect.any(String),
      voter: { hasVoted: true, optionId: 'beta', nextVoteAt: '2026-11-11T06:00:00.000Z', canVote: false },
      results: { total: 2, counts: { alpha: 0, beta: 2 } },
    })
  })

  it('rejects an unknown option', async () => {
    const { response, statements } = await post(vote({ option_id: 'nope', 'cf-turnstile-response': 't' }))
    expect(response.status).toBe(400)
    expect(statements).toHaveLength(0)
  })

  it.each([{}, { option_id: 3 }, { option_id: null }, { option_id: ['alpha'] }])(
    'rejects a missing or non-string option (%j)',
    async (body) => {
      const { response } = await post(vote({ ...body, 'cf-turnstile-response': 't' }))
      expect(response.status).toBe(400)
    },
  )

  it('refuses votes in a closed poll with code "closed"', async () => {
    const { response, data, statements } = await post(vote(), { target: closedPoll })
    expect(response.status).toBe(409)
    expect(data).toMatchObject({ code: 'closed' })
    expect(statements).toHaveLength(0)
  })

  it('refuses votes in a poll that has not opened with code "upcoming"', async () => {
    const { response, data } = await post(vote(), { target: upcomingPoll })
    expect(response.status).toBe(409)
    expect(data).toMatchObject({ code: 'upcoming' })
  })

  it('fails closed with a generic 500 when VOTE_SALT is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { response, data, statements } = await post(vote(), {
      env: fakeEnv({ VOTE_SALT: undefined as unknown as string }),
    })
    expect(response.status).toBe(500)
    expect(data.error).toBe('Voting is temporarily unavailable')
    expect(statements).toHaveLength(0)
  })

  it('does not leak database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { response, data } = await post(vote(), { db: fakeDb({ fail: true }) as never })
    expect(response.status).toBe(500)
    expect(JSON.stringify(data)).not.toContain('secret internal detail')
  })
})

describe('POST vote: guards', () => {
  it('requires a same-origin request', async () => {
    const { response, statements } = await post(vote(undefined, { origin: 'https://evil.example' }))
    expect(response.status).toBe(403)
    expect(statements).toHaveLength(0)
  })

  it('requires a Turnstile token', async () => {
    const { response, statements } = await post(vote({ option_id: 'alpha' }))
    expect(response.status).toBe(400)
    expect(statements).toHaveLength(0)
  })

  it('rejects a token Cloudflare refuses', async () => {
    vi.stubGlobal('fetch', turnstileFetch(false))
    const { response, statements } = await post(vote())
    expect(response.status).toBe(403)
    expect(statements).toHaveLength(0)
  })

  it('rate limits per IP under its own "vote" key, before Turnstile runs', async () => {
    const { limiter, keys } = fakeLimiter(0)
    const fetchSpy = vi.fn(turnstileFetch())
    vi.stubGlobal('fetch', fetchSpy)

    const { response } = await post(vote(), { env: fakeEnv({ FORM_LIMITER: limiter }) })
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(keys).toEqual(['vote:203.0.113.7'])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects non-JSON bodies and oversized bodies', async () => {
    const text = new Request(`${SITE_ORIGIN}/api/votes/test-poll`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: SITE_ORIGIN },
      body: '{}',
    })
    expect((await post(text)).response.status).toBe(415)
    expect((await post(vote({ option_id: 'x'.repeat(3000) }))).response.status).toBe(413)
  })
})

describe('GET vote state', () => {
  const voted = { option_id: 'alpha', created_at: '2026-11-10T06:00:00.000Z' }
  const tallies = [
    { option_id: 'alpha', votes: 5 },
    { option_id: 'beta', votes: 2 },
  ]

  it('gives a person who has not voted their status but no tallies, and skips the tally query', async () => {
    const { response, data, statements } = await read(poll, { db: votesDb({ tallies }) })

    expect(response.status).toBe(200)
    expect(data).toEqual({
      poll: { id: 'test-poll', status: 'open', opensAt: poll.opensAt, closesAt: null },
      voter: { hasVoted: false, optionId: null, votedAt: null, nextVoteAt: null, canVote: true },
      results: null,
    })
    expect(statements.some((statement) => statement.sql.includes('GROUP BY'))).toBe(false)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('gives a voter tallies and the end of their cooldown', async () => {
    const { data } = await read(poll, { db: votesDb({ last: voted, tallies }) })
    expect(data.voter).toMatchObject({
      hasVoted: true,
      optionId: 'alpha',
      nextVoteAt: '2026-11-11T06:00:00.000Z',
      canVote: false,
    })
    expect(data.results).toEqual({ total: 7, counts: { alpha: 5, beta: 2 } })
  })

  it('keeps showing tallies to a past voter once the cooldown is over, and lets them vote again', async () => {
    const old = { option_id: 'beta', created_at: '2026-11-08T12:00:00.000Z' }
    const { data } = await read(poll, { db: votesDb({ last: old, tallies }) })
    expect(data.voter.canVote).toBe(true)
    expect(data.results).not.toBeNull()
  })

  it('shows tallies to everyone for a closed poll, cacheable only by the voter\'s own browser', async () => {
    const { response, data } = await read(closedPoll, { db: votesDb({ tallies }) })
    expect(data.poll.status).toBe('closed')
    expect(data.voter.canVote).toBe(false)
    expect(data.results).toEqual({ total: 7, counts: { alpha: 5, beta: 2 } })
    expect(response.headers.get('cache-control')).toBe('private, max-age=300')
  })

  it('hides tallies and voting before a poll opens', async () => {
    const { data } = await read(upcomingPoll)
    expect(data.poll.status).toBe('upcoming')
    expect(data.voter.canVote).toBe(false)
    expect(data.results).toBeNull()
  })

  it('ignores tally rows for options no longer in the poll', async () => {
    const { data } = await read(closedPoll, {
      db: votesDb({ tallies: [...tallies, { option_id: 'removed', votes: 99 }] }),
    })
    expect(data.results).toEqual({ total: 7, counts: { alpha: 5, beta: 2 } })
  })

  it('rate limits reads per IP under its own key', async () => {
    const { limiter, keys } = fakeLimiter(0)
    const { response } = await read(poll, { env: fakeEnv({ READ_LIMITER: limiter }) })
    expect(response.status).toBe(429)
    expect(keys).toEqual(['vote-state:203.0.113.7'])
  })

  it('fails closed without VOTE_SALT and hides database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const noSalt = await read(poll, { env: fakeEnv({ VOTE_SALT: undefined as unknown as string }) })
    expect(noSalt.response.status).toBe(500)

    const broken = await read(poll, { db: fakeDb({ fail: true }) as never })
    expect(broken.response.status).toBe(500)
    expect(JSON.stringify(broken.data)).not.toContain('secret internal detail')
  })
})
