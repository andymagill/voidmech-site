import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeDb, fakeEnv, jsonRequest } from '#/test/fakes'
import { defineEndpoint } from './endpoint'
import { ApiError, json } from './http'

afterEach(() => {
  vi.restoreAllMocks()
})

function endpoint(overrides: Partial<Parameters<typeof defineEndpoint<string>>[0]> = {}) {
  return defineEndpoint<string>({
    name: 'test',
    maxBytes: 1024,
    guards: [],
    parse: (payload) => String(payload.value),
    store: async (_db, record) => json({ stored: record }, 201),
    ...overrides,
  })
}

describe('defineEndpoint', () => {
  it('runs parse then store', async () => {
    const response = await endpoint()(jsonRequest('/api', { value: 'x' }), fakeEnv())
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ stored: 'x' })
  })

  it('stops at the first guard that returns a response', async () => {
    const parse = vi.fn(() => 'never')
    const second = vi.fn()
    const handler = endpoint({ guards: [() => json({ early: true }, 202), second], parse })

    const response = await handler(jsonRequest('/api', {}), fakeEnv())
    expect(response.status).toBe(202)
    expect(second).not.toHaveBeenCalled()
    expect(parse).not.toHaveBeenCalled()
  })

  it('maps ApiError to its status, message and extra fields', async () => {
    const handler = endpoint({
      parse: () => {
        throw new ApiError(429, 'Slow down', { extra: { nextVoteAt: 'later' } })
      },
    })

    const response = await handler(jsonRequest('/api', {}), fakeEnv())
    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({ error: 'Slow down', nextVoteAt: 'later' })
  })

  it('returns a generic 500 for unexpected errors without leaking details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { db } = fakeDb({ fail: true })
    const handler = endpoint({
      store: async (database) => {
        await database.prepare('INSERT').run()
        return json({}, 201)
      },
    })

    const response = await handler(jsonRequest('/api', {}), fakeEnv({ DB: db }))
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('secret internal detail')
    expect(log).toHaveBeenCalled()
  })

  it('returns 500 when the DB binding is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = fakeEnv({ DB: undefined as unknown as D1Database })
    const response = await endpoint()(jsonRequest('/api', {}), env)
    expect(response.status).toBe(500)
  })

  it('enforces the size cap before running guards', async () => {
    const guard = vi.fn()
    const handler = endpoint({ maxBytes: 10, guards: [guard] })
    const response = await handler(jsonRequest('/api', { value: 'x'.repeat(50) }), fakeEnv())
    expect(response.status).toBe(413)
    expect(guard).not.toHaveBeenCalled()
  })
})
