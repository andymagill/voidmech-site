import { defineEndpoint, type Endpoint } from '#/lib/api/endpoint'
import { ApiError, errorResponse, json, type Payload } from '#/lib/api/http'
import { browserGuards, rateLimit, type EndpointContext } from '#/lib/api/guards'
import { clientIp, hmacHex, voterNetwork } from '#/lib/api/request'
import { cooldownMs, pollStatus, type Poll } from '#/content/polls'
import { normalizeCounts, type PollState } from '#/lib/votes'

/**
 * Community voting: `POST /api/votes/:pollId` casts a vote and
 * `GET /api/votes/:pollId` reports the caller's standing. Rules:
 *
 * - The voter is an HMAC of their network (IPv4, or the /64 of an IPv6
 *   address) and the poll id under `VOTE_SALT`. The raw IP is never stored.
 * - One vote per voter per rolling cooldown window (`cooldownHours`, default 24)
 *   counted from their last vote; each new window adds another vote.
 * - Tallies go only to people who have voted, or to everyone once the poll closed.
 *
 * Several people on one connection (home, school, office, mobile carrier NAT)
 * share one vote per window. That is accepted: the poll is advisory, and a
 * cookie fallback would be trivial to clear.
 */

/** A vote is `{ option_id, cf-turnstile-response }`; anything larger is not a vote. */
const MAX_BYTES = 2 * 1024

type VoteRecord = {
  poll: Poll
  optionId: string
  voterHash: string
}

/** The voter's hash for a poll, or throws if `VOTE_SALT` is missing (never vote with an empty salt). */
async function voterHashFor(env: Env, poll: Poll, ip: string): Promise<string> {
  const salt = env.VOTE_SALT
  if (!salt) {
    console.error('VOTE_SALT is not set; refusing to handle votes.')
    throw new ApiError(500, 'Voting is temporarily unavailable')
  }
  return hmacHex(salt, `${voterNetwork(ip)}|${poll.id}`)
}

type LastVote = { option_id: string; created_at: string }

/** The voter's standing in `poll`, and the tallies if they are allowed to see them. */
async function readState(
  db: D1Database,
  poll: Poll,
  voterHash: string,
  now: Date,
): Promise<PollState> {
  const status = pollStatus(poll, now)

  const last = await db
    .prepare(
      `SELECT option_id, created_at FROM votes
       WHERE poll_id = ?1 AND voter_hash = ?2
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(poll.id, voterHash)
    .first<LastVote>()

  const nextVoteAt = last
    ? new Date(Date.parse(last.created_at) + cooldownMs(poll)).toISOString()
    : null
  const canVote = status === 'open' && (nextVoteAt === null || Date.parse(nextVoteAt) <= now.getTime())

  // The only query that scales with the number of votes, so only people who may see it pay for it.
  let results: PollState['results'] = null
  if (last || status === 'closed') {
    const { results: rows } = await db
      .prepare(
        `SELECT option_id, COUNT(*) AS votes FROM votes
         WHERE poll_id = ?1 GROUP BY option_id`,
      )
      .bind(poll.id)
      .all<{ option_id: string; votes: number }>()
    results = normalizeCounts(
      poll.options.map((option) => option.id),
      rows,
    )
  }

  return {
    poll: { id: poll.id, status, opensAt: poll.opensAt, closesAt: poll.closesAt },
    voter: {
      hasVoted: last !== null,
      optionId: last?.option_id ?? null,
      votedAt: last?.created_at ?? null,
      nextVoteAt,
      canVote,
    },
    results,
  }
}

/**
 * `POST /api/votes/:pollId`. Built per request because the poll comes from
 * the route parameter, which `parse` cannot see.
 */
export function voteEndpoint(poll: Poll): Endpoint {
  return defineEndpoint<VoteRecord>({
    name: 'vote',
    maxBytes: MAX_BYTES,
    guards: browserGuards,
    parse: async (payload: Payload, ctx: EndpointContext) => {
      const status = pollStatus(poll, ctx.now)
      if (status !== 'open') {
        throw new ApiError(
          409,
          status === 'upcoming' ? 'This poll has not opened yet' : 'This poll has closed',
          { extra: { code: status } },
        )
      }

      const optionId = typeof payload.option_id === 'string' ? payload.option_id : ''
      if (!poll.options.some((option) => option.id === optionId)) {
        throw new ApiError(400, 'Choose one of the listed options')
      }

      return { poll, optionId, voterHash: await voterHashFor(ctx.env, poll, ctx.ip) }
    },
    store: async (db, record, ctx) => {
      const createdAt = ctx.now.toISOString()
      const cutoff = new Date(ctx.now.getTime() - cooldownMs(poll)).toISOString()

      // Check and insert in one statement so two simultaneous requests can't both count.
      const result = await db
        .prepare(
          `INSERT INTO votes (poll_id, option_id, voter_hash, created_at)
           SELECT ?1, ?2, ?3, ?4
           WHERE NOT EXISTS (
             SELECT 1 FROM votes
             WHERE poll_id = ?1 AND voter_hash = ?3 AND created_at > ?5
           )`,
        )
        .bind(record.poll.id, record.optionId, record.voterHash, createdAt, cutoff)
        .run()

      const state = await readState(db, poll, record.voterHash, ctx.now)

      if (result.meta.changes === 0) {
        const wait = Math.max(
          1,
          Math.ceil((Date.parse(state.voter.nextVoteAt ?? createdAt) - ctx.now.getTime()) / 1000),
        )
        throw new ApiError(429, 'You have already voted in this poll recently', {
          extra: { code: 'cooldown', ...state },
          headers: { 'retry-after': String(wait) },
        })
      }

      return json({ ok: true, ...state }, 201)
    },
  })
}

/**
 * `GET /api/votes/:pollId`: the caller's standing plus, for voters and closed
 * polls, the tallies. Read-only, so it needs no Origin or Turnstile check, but
 * it is rate limited per IP to protect D1's free read quota. It doesn't fit
 * `defineEndpoint`, which reads a request body.
 */
export async function getPollState(poll: Poll, request: Request, env: Env): Promise<Response> {
  const ctx: EndpointContext = {
    name: 'vote-state',
    request,
    env,
    ip: clientIp(request),
    now: new Date(),
  }

  try {
    if (!env.DB) {
      console.error('D1 binding `DB` is unavailable; check wrangler.jsonc d1_databases.')
      return json({ error: 'Voting is temporarily unavailable' }, 500)
    }

    await rateLimit('READ_LIMITER')(ctx, {})
    const voterHash = await voterHashFor(env, poll, ctx.ip)
    const state = await readState(env.DB, poll, voterHash, ctx.now)

    // Final tallies never change; let the voter's own browser reuse them. Not `public`: the body is per voter.
    const headers: Record<string, string> =
      state.poll.status === 'closed' ? { 'cache-control': 'private, max-age=300' } : {}
    return json(state, 200, headers)
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error)

    console.error('[api:vote-state] request failed', error)
    return json({ error: 'Could not load the poll. Try again later.' }, 500)
  }
}
