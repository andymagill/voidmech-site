import { ApiError, json, type Payload } from './http'
import { optionalText } from './fields'
import { safeEqual } from './request'

/**
 * Abuse-protection checks run by `defineEndpoint` before parsing. A guard
 * throws an `ApiError` to reject the request, returns a `Response` to end it
 * early (the honeypot fakes success), or returns nothing to continue.
 *
 * Every guard here is free and works on `workers.dev`.
 */

export type EndpointContext = {
  /** Endpoint name, e.g. `feedback`. Used in rate-limit keys and logs. */
  name: string
  request: Request
  env: Env
  ip: string
  now: Date
}

export type Guard = (
  ctx: EndpointContext,
  payload: Payload,
) => Response | void | Promise<Response | void>

/** Form field the Turnstile widget fills with its token. */
export const TURNSTILE_FIELD = 'cf-turnstile-response'

/** Hidden form field that people never fill in and naive bots do. */
export const HONEYPOT_FIELD = 'website'

/** Header carrying the game client's key. */
export const CLIENT_KEY_HEADER = 'x-voidmech-client'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Per-IP rate limit through a Workers Rate Limiting binding. Limits are
 * configured in `wrangler.jsonc`. Fails open (with a log) when the binding is
 * missing, since the other guards still apply.
 */
export function rateLimit(binding: 'FORM_LIMITER' | 'GAME_LIMITER' | 'READ_LIMITER'): Guard {
  return async (ctx) => {
    const limiter = ctx.env[binding] as RateLimit | undefined
    if (!limiter) {
      console.warn(`Rate limit binding ${binding} is unavailable; skipping.`)
      return
    }

    const { success } = await limiter.limit({ key: `${ctx.name}:${ctx.ip}` })
    if (!success) {
      throw new ApiError(429, 'Too many requests. Wait a minute and try again.', {
        headers: { 'retry-after': '60' },
      })
    }
  }
}

/**
 * One counter shared by every caller, for endpoints whose total write volume
 * must stay inside a quota (crash reports vs D1's free daily writes) no matter
 * how many IPs or fake clients send traffic. Place it after the guards that
 * identify legitimate callers so junk can't spend the budget.
 *
 * Unlike `rateLimit`, this fails closed when the binding is missing: its whole
 * purpose is the quota, and an unlimited endpoint is the failure it prevents.
 */
export function globalRateLimit(binding: 'CRASH_LIMITER'): Guard {
  return async (ctx) => {
    const limiter = ctx.env[binding] as RateLimit | undefined
    if (!limiter) {
      console.error(`Rate limit binding ${binding} is unavailable; rejecting request.`)
      throw new ApiError(503, 'Service unavailable', { headers: { 'retry-after': '300' } })
    }

    const { success } = await limiter.limit({ key: ctx.name })
    if (!success) {
      throw new ApiError(429, 'The service is busy. Try again later.', {
        headers: { 'retry-after': '60' },
      })
    }
  }
}

/**
 * Requires the browser's `Origin` header to match this site. Blocks
 * cross-site form posts and scripts that don't bother to fake the header.
 */
export const sameOrigin: Guard = (ctx) => {
  const origin = ctx.request.headers.get('origin')
  if (!origin || origin !== new URL(ctx.request.url).origin) {
    throw new ApiError(403, 'Requests must come from the VoidMech site')
  }
}

/**
 * Silently accepts and drops submissions that fill the hidden honeypot field,
 * so bots get no signal that they were caught.
 */
export const honeypot: Guard = (_ctx, payload) => {
  if (optionalText(payload[HONEYPOT_FIELD], 200)) {
    return json({ ok: true }, 201)
  }
}

/** Verifies the Turnstile token in the payload with Cloudflare's siteverify API. */
export const turnstile: Guard = async (ctx, payload) => {
  const secret = ctx.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set; rejecting submission.')
    throw new ApiError(500, 'Submissions are temporarily unavailable')
  }

  const token = optionalText(payload[TURNSTILE_FIELD], 2048)
  if (!token) {
    throw new ApiError(400, 'Complete the verification challenge and try again')
  }

  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  if (ctx.ip !== 'local') body.append('remoteip', ctx.ip)

  let result: { success?: boolean; 'error-codes'?: string[] }
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body })
    result = (await response.json()) as typeof result
  } catch (error) {
    console.error('Turnstile siteverify request failed', error)
    throw new ApiError(503, 'Verification is unavailable right now. Try again shortly.')
  }

  if (!result.success) {
    throw new ApiError(403, 'Verification failed. Retry the challenge and submit again.', {
      extra: { codes: result['error-codes'] ?? [] },
    })
  }
}

/**
 * Requires the game's client key header. The key ships inside the game, so it
 * is a filter against random traffic rather than a real secret; rotate it per
 * release with `wrangler secret put GAME_CLIENT_KEY` if it gets abused.
 *
 * Native clients send no `Origin` header and cannot run Turnstile, so this
 * (plus a rate limit) replaces the browser-only guards for game traffic.
 */
export const clientKey: Guard = async (ctx) => {
  const expected = ctx.env.GAME_CLIENT_KEY
  if (!expected) {
    console.error('GAME_CLIENT_KEY is not set; rejecting game request.')
    throw new ApiError(500, 'Service unavailable')
  }

  const provided = ctx.request.headers.get(CLIENT_KEY_HEADER) ?? ''
  if (!(await safeEqual(provided, expected))) {
    throw new ApiError(401, 'Unknown client')
  }
}

/*
 * Guard presets by caller type. Each endpoint picks the preset for whoever
 * calls it; the shared route applies no guards of its own.
 */

/**
 * For forms on the site's own pages. `sameOrigin` and `turnstile` need a
 * browser, so never use this preset for game or other native clients.
 * Cheap checks run first; Turnstile (a network call) runs last.
 */
export const browserGuards: ReadonlyArray<Guard> = [
  sameOrigin,
  rateLimit('FORM_LIMITER'),
  honeypot,
  turnstile,
]

/**
 * For the game client (crash reports, and in-game uploads later). No
 * `Origin` or Turnstile requirement; the client key filters random traffic.
 */
export const gameClientGuards: ReadonlyArray<Guard> = [rateLimit('GAME_LIMITER'), clientKey]
