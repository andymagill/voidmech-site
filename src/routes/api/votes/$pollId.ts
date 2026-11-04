import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getPoll } from '#/content/polls'
import { json } from '#/lib/api/http'
import { getPollState, voteEndpoint } from '#/lib/endpoints/vote'

/**
 * `POST /api/votes/:pollId` casts a vote; `GET` returns the caller's standing
 * (and the tallies, for voters and closed polls). Rules and guards live in
 * `#/lib/endpoints/vote`; polls are defined in `#/content/polls`.
 *
 * Bindings come from `cloudflare:workers`, not the handler context (see the
 * submissions route).
 */
export const Route = createFileRoute('/api/votes/$pollId')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const poll = getPoll(params.pollId)
        if (!poll) return json({ error: 'Not found' }, 404)

        return voteEndpoint(poll)(request, env)
      },
      GET: async ({ request, params }) => {
        const poll = getPoll(params.pollId)
        if (!poll) return json({ error: 'Not found' }, 404)

        return getPollState(poll, request, env)
      },
    },
  },
})
