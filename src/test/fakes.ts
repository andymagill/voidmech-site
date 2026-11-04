/** Test doubles for the Workers environment. */

export type RecordedStatement = { sql: string; binds: unknown[] }

/**
 * A minimal D1 stand-in that records every statement. `run` resolves with
 * `{ meta: { changes } }`, `all` with `{ results: rows }` and `first` with the
 * first row. Pass `fail` to make every call reject.
 */
export function fakeDb({
  fail = false,
  changes = 1,
  rows = [] as unknown[],
}: { fail?: boolean; changes?: number; rows?: unknown[] } = {}) {
  const statements: RecordedStatement[] = []

  const execute = (statement: RecordedStatement) => {
    statements.push(statement)
    if (fail) throw new Error('D1_ERROR: secret internal detail')
  }

  const db = {
    prepare(sql: string) {
      const statement: RecordedStatement = { sql, binds: [] }
      const bound = {
        bind(...binds: unknown[]) {
          statement.binds = binds
          return bound
        },
        async run() {
          execute(statement)
          return { success: true, meta: { changes } }
        },
        async all() {
          execute(statement)
          return { success: true, results: rows, meta: { changes: 0 } }
        },
        async first() {
          execute(statement)
          return rows[0] ?? null
        },
      }
      return bound
    },
  }

  return { db: db as unknown as D1Database, statements }
}

/** A rate limiter that allows the first `allow` calls, then refuses. */
export function fakeLimiter(allow = Number.POSITIVE_INFINITY) {
  const keys: string[] = []
  const limiter = {
    async limit({ key }: { key: string }) {
      keys.push(key)
      return { success: keys.length <= allow }
    },
  }
  return { limiter: limiter as unknown as RateLimit, keys }
}

export function fakeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: fakeDb().db,
    FORM_LIMITER: fakeLimiter().limiter,
    GAME_LIMITER: fakeLimiter().limiter,
    TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
    GAME_CLIENT_KEY: 'test-client-key',
    VOTE_SALT: 'test-salt',
    ...overrides,
  } as Env
}

export const SITE_ORIGIN = 'https://voidmech.example'

/** A same-origin JSON POST, as the site's own forms send it. */
export function jsonRequest(
  path: string,
  body: unknown,
  { headers = {}, raw }: { headers?: Record<string, string>; raw?: string } = {},
) {
  return new Request(`${SITE_ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: SITE_ORIGIN,
      'cf-connecting-ip': '203.0.113.7',
      ...headers,
    },
    body: raw ?? JSON.stringify(body),
  })
}

/**
 * A POST as a native client (the game) sends it: no `Origin` header and no
 * Turnstile token. Pass the client key via `headers`.
 */
export function nativeRequest(
  path: string,
  body: BodyInit,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  return new Request(`${SITE_ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'cf-connecting-ip': '198.51.100.20', 'user-agent': 'VoidMech/0.4.2', ...headers },
    body,
  })
}

/** A `fetch` replacement that answers Turnstile siteverify with `success`. */
export function turnstileFetch(success = true) {
  return async () =>
    new Response(
      JSON.stringify({ success, 'error-codes': success ? [] : ['invalid-input-response'] }),
      { headers: { 'content-type': 'application/json' } },
    )
}
