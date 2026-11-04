import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeEnv, fakeLimiter, jsonRequest, turnstileFetch } from '#/test/fakes'
import {
  clientKey,
  CLIENT_KEY_HEADER,
  honeypot,
  rateLimit,
  sameOrigin,
  turnstile,
  TURNSTILE_FIELD,
  type EndpointContext,
} from './guards'

function context(request: Request, env = fakeEnv()): EndpointContext {
  return { name: 'test', request, env, ip: '203.0.113.7', now: new Date() }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sameOrigin', () => {
  it('allows requests whose Origin matches the request URL', () => {
    expect(sameOrigin(context(jsonRequest('/api', {})), {})).toBeUndefined()
  })

  it.each([
    ['a different origin', { origin: 'https://evil.example' }],
    ['no origin', { origin: '' }],
  ])('rejects %s with 403', (_label, headers) => {
    expect(() => sameOrigin(context(jsonRequest('/api', {}, { headers })), {})).toThrowError(
      expect.objectContaining({ status: 403 }),
    )
  })
})

describe('honeypot', () => {
  it('passes when the field is empty', () => {
    expect(honeypot(context(jsonRequest('/api', {})), { website: '' })).toBeUndefined()
  })

  it('fakes success when the field is filled', async () => {
    const response = honeypot(context(jsonRequest('/api', {})), { website: 'http://spam' })
    expect(response).toBeInstanceOf(Response)
    expect((response as Response).status).toBe(201)
  })
})

describe('rateLimit', () => {
  it('keys by endpoint name and IP, and refuses with 429 past the limit', async () => {
    const { limiter, keys } = fakeLimiter(1)
    const ctx = context(jsonRequest('/api', {}), fakeEnv({ FORM_LIMITER: limiter }))
    const guard = rateLimit('FORM_LIMITER')

    await expect(guard(ctx, {})).resolves.toBeUndefined()
    await expect(guard(ctx, {})).rejects.toMatchObject({
      status: 429,
      headers: { 'retry-after': '60' },
    })
    expect(keys).toEqual(['test:203.0.113.7', 'test:203.0.113.7'])
  })

  it('fails open when the binding is missing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const env = fakeEnv({ FORM_LIMITER: undefined as unknown as RateLimit })
    await expect(rateLimit('FORM_LIMITER')(context(jsonRequest('/api', {}), env), {})).resolves.toBeUndefined()
  })
})

describe('turnstile', () => {
  it('requires a token', async () => {
    await expect(turnstile(context(jsonRequest('/api', {})), {})).rejects.toMatchObject({
      status: 400,
    })
  })

  it('passes when siteverify succeeds, sending the secret, token and IP', async () => {
    const fetchMock = vi.fn(turnstileFetch(true))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      turnstile(context(jsonRequest('/api', {})), { [TURNSTILE_FIELD]: 'token-123' }),
    ).resolves.toBeUndefined()

    const body = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData
    expect(body.get('secret')).toBe('test-turnstile-secret')
    expect(body.get('response')).toBe('token-123')
    expect(body.get('remoteip')).toBe('203.0.113.7')
  })

  it('rejects with 403 when siteverify fails', async () => {
    vi.stubGlobal('fetch', turnstileFetch(false))
    await expect(
      turnstile(context(jsonRequest('/api', {})), { [TURNSTILE_FIELD]: 'bad' }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('returns 503 when siteverify is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down')
    })
    await expect(
      turnstile(context(jsonRequest('/api', {})), { [TURNSTILE_FIELD]: 'token' }),
    ).rejects.toMatchObject({ status: 503 })
  })

  it('fails closed with 500 when the secret is not configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = fakeEnv({ TURNSTILE_SECRET_KEY: '' })
    await expect(
      turnstile(context(jsonRequest('/api', {}), env), { [TURNSTILE_FIELD]: 'token' }),
    ).rejects.toMatchObject({ status: 500 })
  })
})

describe('clientKey', () => {
  it('accepts the configured key', async () => {
    const request = jsonRequest('/api', {}, { headers: { [CLIENT_KEY_HEADER]: 'test-client-key' } })
    await expect(clientKey(context(request), {})).resolves.toBeUndefined()
  })

  it.each(['', 'wrong-key', 'test-client-key-extra'])('rejects %j with 401', async (key) => {
    const request = jsonRequest('/api', {}, { headers: { [CLIENT_KEY_HEADER]: key } })
    await expect(clientKey(context(request), {})).rejects.toMatchObject({ status: 401 })
  })
})
