import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeDb, fakeEnv, fakeLimiter, nativeRequest } from '#/test/fakes'
import { CLIENT_KEY_HEADER } from '#/lib/api/guards'
import { getSubmissionEndpoint } from './index'
import { DEDUPE_WINDOW_MS } from './crash-report'

// Pretend 0.4.2 is the only published release.
vi.mock('#/lib/releases', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#/lib/releases')>()),
  isKnownVersion: (version: string) => version === '0.4.2',
}))

const headers = { 'content-type': 'application/json', [CLIENT_KEY_HEADER]: 'test-client-key' }
const INSTALL_ID = '0b1f6c3e-8d0a-4f55-9c58-1d2a3b4c5d6e'

const report = (overrides: Record<string, unknown> = {}) => ({
  version: '0.4.2',
  build: 'abc1234',
  platform: 'windows',
  os: 'Windows 11 10.0.26100',
  gpu: 'Intel(R) UHD Graphics',
  install_id: INSTALL_ID,
  exception: 'NullReferenceException: ship is null',
  stack: 'at Ship.Update (Ship.cs:120)\nat World.Tick (World.cs:88)',
  log_tail: 'line 1\nline 2',
  ...overrides,
})

async function send(
  body: unknown,
  {
    env = fakeEnv(),
    requestHeaders = headers,
    db,
  }: { env?: Env; requestHeaders?: Record<string, string>; db?: ReturnType<typeof fakeDb> } = {},
) {
  const store = db ?? fakeDb()
  const request = nativeRequest(
    '/api/submissions/crash-report',
    typeof body === 'string' ? body : JSON.stringify(body),
    requestHeaders,
  )
  const response = await getSubmissionEndpoint('crash-report')!(request, { ...env, DB: store.db })
  return { response, statements: store.statements, data: await response.json() }
}

/** Column values of the INSERT, by name. */
function inserted(statements: { sql: string; binds: unknown[] }[]) {
  const binds = statements[0].binds
  return {
    fingerprint: binds[0] as string,
    version: binds[1],
    build: binds[2],
    platform: binds[3],
    os: binds[4],
    gpu: binds[5],
    exception: binds[6],
    stack: binds[7],
    logTail: binds[8],
    installHash: binds[9] as string,
    unknownVersion: binds[10],
    createdAt: binds[11] as string,
    cutoff: binds[12] as string,
  }
}

afterEach(() => vi.restoreAllMocks())

describe('crash-report: storing', () => {
  it('stores a valid report with a server-side fingerprint and a hashed install id', async () => {
    const { response, statements, data } = await send(report())

    expect(response.status).toBe(201)
    expect(data).toEqual({ ok: true })
    const row = inserted(statements)
    expect(row).toMatchObject({
      version: '0.4.2',
      platform: 'windows',
      exception: 'NullReferenceException: ship is null',
      unknownVersion: 0,
    })
    expect(row.fingerprint).toMatch(/^[0-9a-f]{32}$/)
    expect(row.installHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(statements[0].binds)).not.toContain(INSTALL_ID)
  })

  it('flags a version with no release as unknown_version, but still stores it', async () => {
    const { response, statements } = await send(report({ version: '9.9.9-cracked' }))
    expect(response.status).toBe(201)
    expect(inserted(statements).unknownVersion).toBe(1)
  })

  it('ignores a client-supplied fingerprint and unknown fields', async () => {
    const { statements } = await send(
      report({ fingerprint: 'evil', is_admin: true, extra: 'x'.repeat(100) }),
    )
    expect(inserted(statements).fingerprint).not.toBe('evil')
    expect(JSON.stringify(statements[0].binds)).not.toContain('is_admin')
  })

  it('truncates long fields, keeps the END of the log, and strips control characters', async () => {
    const { statements } = await send(
      report({
        exception: `Boom${String.fromCharCode(0)}${'e'.repeat(3000)}`,
        stack: 's'.repeat(12000),
        log_tail: `START${'l'.repeat(12000)}END`,
        gpu: 'g'.repeat(1000),
      }),
    )
    const row = inserted(statements)
    expect((row.exception as string).length).toBe(1000)
    expect(row.exception).not.toContain(String.fromCharCode(0))
    expect((row.stack as string).length).toBe(8000)
    expect((row.logTail as string).length).toBe(8000)
    expect(row.logTail).toMatch(/END$/)
    expect(row.logTail).not.toContain('START')
    expect((row.gpu as string).length).toBe(200)
  })

  it('treats optional fields of the wrong type as absent', async () => {
    const { response, statements } = await send(
      report({ stack: { a: 1 }, gpu: 5, build: ['x'], log_tail: null }),
    )
    expect(response.status).toBe(201)
    expect(inserted(statements)).toMatchObject({ stack: null, gpu: null, build: null, logTail: null })
  })
})

describe('crash-report: de-duplication', () => {
  it('inserts only when this install has not reported this fingerprint in the last 24 hours', async () => {
    const { statements } = await send(report())
    const row = inserted(statements)

    expect(statements[0].sql).toContain('WHERE NOT EXISTS')
    expect(statements[0].sql).toMatch(/install_hash = \?10 AND fingerprint = \?1 AND created_at > \?13/)
    expect(Date.parse(row.createdAt) - Date.parse(row.cutoff)).toBe(DEDUPE_WINDOW_MS)
  })

  it('answers 202 and reports a duplicate when nothing was inserted', async () => {
    const { response, data } = await send(report(), { db: fakeDb({ changes: 0 }) })
    expect(response.status).toBe(202)
    expect(data).toEqual({ ok: true, duplicate: true })
  })

  it('gives the same crash the same fingerprint across installs, lines and paths', async () => {
    const a = await send(
      report({
        stack: 'at Ship.Update (C:\\Users\\<name>\\game\\Ship.cs:120)\nat World.Tick (World.cs:88)',
      }),
    )
    const b = await send(
      report({
        install_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        stack: 'at Ship.Update (D:\\Games\\VoidMech\\Ship.cs:140)\nat World.Tick (World.cs:90)',
      }),
    )
    const c = await send(report({ exception: 'IndexOutOfRangeException: 3' }))

    expect(inserted(a.statements).fingerprint).toBe(inserted(b.statements).fingerprint)
    expect(inserted(a.statements).installHash).not.toBe(inserted(b.statements).installHash)
    expect(inserted(a.statements).fingerprint).not.toBe(inserted(c.statements).fingerprint)
  })
})

describe('crash-report: validation', () => {
  it.each([
    ['version', { version: undefined }],
    ['platform', { platform: '' }],
    ['exception', { exception: '   ' }],
    ['install_id', { install_id: undefined }],
    ['a non-string required field', { exception: { text: 'x' } }],
  ])('requires %s', async (_name, overrides) => {
    const { response, statements } = await send(report(overrides))
    expect(response.status).toBe(400)
    expect(statements).toHaveLength(0)
  })

  it.each(['../../etc', 'v 1', '1.0.0\n2.0.0', 'x'.repeat(41), '-1'])(
    'rejects version %j',
    async (version) => {
      expect((await send(report({ version }))).response.status).toBe(400)
    },
  )

  it.each(['short', 'has spaces in it......', 'x'.repeat(65), '../../../../etc/passwd/xx'])(
    'rejects install_id %j',
    async (install_id) => {
      expect((await send(report({ install_id }))).response.status).toBe(400)
    },
  )

  it('rejects non-JSON, invalid JSON and oversized bodies', async () => {
    const plain = await send(report(), { requestHeaders: { ...headers, 'content-type': 'text/plain' } })
    expect(plain.response.status).toBe(415)
    expect((await send('{nope')).response.status).toBe(400)
    expect((await send(report({ log_tail: 'x'.repeat(40 * 1024) }))).response.status).toBe(413)
  })
})

describe('crash-report: abuse limits', () => {
  it('requires the client key and checks it before spending the global budget', async () => {
    const global = fakeLimiter()
    const { response } = await send(report(), {
      env: fakeEnv({ CRASH_LIMITER: global.limiter }),
      requestHeaders: { 'content-type': 'application/json' },
    })
    expect(response.status).toBe(401)
    expect(global.keys).toEqual([])
  })

  it('applies the per-IP game limit', async () => {
    const { response } = await send(report(), {
      env: fakeEnv({ GAME_LIMITER: fakeLimiter(0).limiter }),
    })
    expect(response.status).toBe(429)
  })

  it('applies one global limit shared by every caller, with Retry-After', async () => {
    const global = fakeLimiter(1)
    const env = fakeEnv({ CRASH_LIMITER: global.limiter })

    expect((await send(report(), { env })).response.status).toBe(201)
    const limited = await send(report(), { env })

    expect(limited.response.status).toBe(429)
    expect(limited.response.headers.get('retry-after')).toBe('60')
    expect(global.keys).toEqual(['crash-report', 'crash-report']) // not per IP
    expect(limited.statements).toHaveLength(0)
  })

  it('fails closed if the global limiter binding is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { response, statements } = await send(report(), {
      env: fakeEnv({ CRASH_LIMITER: undefined as unknown as RateLimit }),
    })
    expect(response.status).toBe(503)
    expect(statements).toHaveLength(0)
  })

  it('returns a generic 500 when D1 fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { response, data } = await send(report(), { db: fakeDb({ fail: true }) })
    expect(response.status).toBe(500)
    expect(JSON.stringify(data)).not.toContain('secret internal detail')
  })
})
