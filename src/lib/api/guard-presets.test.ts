import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeEnv, fakeLimiter, jsonRequest, nativeRequest, turnstileFetch } from '#/test/fakes'
import { defineEndpoint, type BodyReader } from './endpoint'
import { browserGuards, CLIENT_KEY_HEADER, gameClientGuards, TURNSTILE_FIELD } from './guards'
import { ApiError, json, type Payload } from './http'

/** An endpoint that echoes the parsed payload, guarded by `guards`. */
function echoEndpoint(guards: typeof browserGuards, readBody?: BodyReader) {
  return defineEndpoint<Payload>({
    name: 'echo',
    maxBytes: 64 * 1024,
    readBody,
    guards,
    parse: (payload) => payload,
    store: async (_db, record) => json({ ok: true, keys: Object.keys(record) }, 201),
  })
}

const gameHeaders = {
  'content-type': 'application/json',
  [CLIENT_KEY_HEADER]: 'test-client-key',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('gameClientGuards (native clients)', () => {
  const endpoint = echoEndpoint(gameClientGuards)

  it('accepts a request with no Origin and no Turnstile token when the client key is valid', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const response = await endpoint(
      nativeRequest('/api/submissions/crash-report', '{"version":"0.4.2"}', gameHeaders),
      fakeEnv(),
    )

    expect(response.status).toBe(201)
    expect(fetchSpy).not.toHaveBeenCalled() // no Turnstile round trip
  })

  it('rejects a missing or wrong client key with 401', async () => {
    const noKey = await endpoint(nativeRequest('/api', '{}'), fakeEnv())
    const wrongKey = await endpoint(
      nativeRequest('/api', '{}', { ...gameHeaders, [CLIENT_KEY_HEADER]: 'nope' }),
      fakeEnv(),
    )
    expect([noKey.status, wrongKey.status]).toEqual([401, 401])
  })

  it('uses the game rate limiter, not the form limiter', async () => {
    const game = fakeLimiter(0)
    const form = fakeLimiter()
    const env = fakeEnv({ GAME_LIMITER: game.limiter, FORM_LIMITER: form.limiter })

    const response = await endpoint(nativeRequest('/api', '{}', gameHeaders), env)
    expect(response.status).toBe(429)
    expect(game.keys).toEqual(['echo:198.51.100.20'])
    expect(form.keys).toEqual([])
  })
})

describe('browserGuards (site forms)', () => {
  const endpoint = echoEndpoint(browserGuards)

  it('rejects the same native request with 403', async () => {
    const response = await endpoint(nativeRequest('/api', '{}', gameHeaders), fakeEnv())
    expect(response.status).toBe(403)
  })

  it('accepts a same-origin request with a Turnstile token', async () => {
    vi.stubGlobal('fetch', turnstileFetch(true))
    const response = await endpoint(jsonRequest('/api', { [TURNSTILE_FIELD]: 't' }), fakeEnv())
    expect(response.status).toBe(201)
  })
})

describe('custom body reader', () => {
  /** A multipart reader, as a future user-content upload endpoint might use. */
  const readMultipart: BodyReader = async (request, maxBytes) => {
    const form = await request.formData()
    const payload: Payload = {}
    let size = 0
    for (const [key, value] of form) {
      size += typeof value === 'string' ? value.length : value.size
      payload[key] = value
    }
    if (size > maxBytes) throw new ApiError(413, 'Upload is too large')
    return payload
  }

  it('lets an endpoint accept multipart uploads through the same pipeline', async () => {
    const form = new FormData()
    form.append('title', 'Scout frame')
    form.append('design', new File(['{"blocks":[]}'], 'scout.vmship', { type: 'application/json' }))

    const endpoint = echoEndpoint(gameClientGuards, readMultipart)
    const response = await endpoint(
      nativeRequest('/api/submissions/ship-design', form, { [CLIENT_KEY_HEADER]: 'test-client-key' }),
      fakeEnv(),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ ok: true, keys: ['title', 'design'] })
  })
})
