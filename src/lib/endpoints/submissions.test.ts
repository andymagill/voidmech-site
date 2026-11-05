import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeDb, fakeEnv, jsonRequest, turnstileFetch } from '#/test/fakes'
import { TURNSTILE_FIELD } from '#/lib/api/guards'
import { getSubmissionEndpoint } from './index'

/** Posts a form payload (with a Turnstile token) to a registered endpoint. */
async function submit(kind: string, body: Record<string, unknown>, db = fakeDb()) {
  const endpoint = getSubmissionEndpoint(kind)
  if (!endpoint) throw new Error(`no endpoint ${kind}`)

  const request = jsonRequest(`/api/submissions/${kind}`, {
    source: 'site_modal',
    [TURNSTILE_FIELD]: 'token',
    ...body,
  })
  const response = await endpoint(request, fakeEnv({ DB: db.db }))
  return { response, statements: db.statements, data: await response.json() }
}

beforeEach(() => {
  vi.stubGlobal('fetch', turnstileFetch(true))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('registry', () => {
  it('resolves known kinds and ignores inherited keys', () => {
    expect(getSubmissionEndpoint('feedback')).toBeTypeOf('function')
    expect(getSubmissionEndpoint('constructor')).toBeUndefined()
    expect(getSubmissionEndpoint('bug_report')).toBeUndefined()
  })
})

describe('newsletter', () => {
  it('stores a normalised email and ignores duplicates', async () => {
    const { response, statements, data } = await submit('newsletter', {
      email: '  Pilot@VoidMech.com ',
    })

    expect(response.status).toBe(201)
    expect(data).toMatchObject({ ok: true, kind: 'newsletter' })
    expect(statements[0].sql).toContain(`ON CONFLICT(email) WHERE kind = 'newsletter' DO NOTHING`)
    expect(statements[0].binds.slice(0, 4)).toEqual([
      'newsletter',
      'pilot@voidmech.com',
      'newsletter_opt_in',
      'Newsletter opt-in captured',
    ])
    expect(JSON.parse(statements[0].binds[4] as string)).toEqual({ source: 'site_modal' })
  })

  it('still returns 201 when the address already exists', async () => {
    const { response } = await submit('newsletter', { email: 'a@b.io' }, fakeDb({ changes: 0 }))
    expect(response.status).toBe(201)
  })

  it.each([{}, { email: '' }, { email: 'nope' }])('rejects %j with 400', async (body) => {
    const { response, statements } = await submit('newsletter', body)
    expect(response.status).toBe(400)
    expect(statements).toHaveLength(0)
  })
})

describe('feedback', () => {
  it('maps topic to subject and truncates the message', async () => {
    const { response, statements } = await submit('feedback', {
      topic: 'Controls',
      message: 'm'.repeat(2000),
      email: '',
    })

    expect(response.status).toBe(201)
    const [kind, email, subject, message] = statements[0].binds
    expect([kind, email, subject]).toEqual(['feedback', null, 'Controls'])
    expect((message as string).length).toBe(1500)
    expect(statements[0].sql).not.toContain('ON CONFLICT')
  })

  it('requires a message', async () => {
    const { response, data } = await submit('feedback', { message: '   ' })
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'message is required' })
  })

  it('rejects a malformed optional email', async () => {
    const { response } = await submit('feedback', { message: 'hi', email: 'bad' })
    expect(response.status).toBe(400)
  })
})

describe('bug-report', () => {
  it('falls back to the summary when details are blank and records metadata', async () => {
    const { response, statements } = await submit('bug-report', {
      summary: 'Crash on dock',
      details: ' ',
      severity: 'High',
      platform: 'Windows 11',
    })

    expect(response.status).toBe(201)
    const [kind, , subject, message, metadata] = statements[0].binds
    expect([kind, subject, message]).toEqual(['bug_report', 'Crash on dock', 'Crash on dock'])
    expect(JSON.parse(metadata as string)).toEqual({
      severity: 'High',
      platform: 'Windows 11',
      source: 'site_modal',
    })
  })

  it('requires a summary', async () => {
    const { response } = await submit('bug-report', { details: 'steps' })
    expect(response.status).toBe(400)
  })

  const storedSeverity = (binds: unknown[]) =>
    (JSON.parse(binds[4] as string) as { severity: string | null }).severity

  it.each([
    ['Low', 'Low'],
    ['critical', 'Critical'],
    ['  HIGH ', 'High'],
  ])('accepts severity %j and stores %j', async (sent, stored) => {
    const { response, statements } = await submit('bug-report', { summary: 's', severity: sent })
    expect(response.status).toBe(201)
    expect(storedSeverity(statements[0].binds)).toBe(stored)
  })

  it.each([undefined, '', '   '])('treats severity %j as not given', async (severity) => {
    const { response, statements } = await submit('bug-report', { summary: 's', severity })
    expect(response.status).toBe(201)
    expect(storedSeverity(statements[0].binds)).toBeNull()
  })

  it.each(['Urgent', 'High; DROP TABLE submissions', 'Highest'])(
    'rejects unknown severity %j with 400 and stores nothing',
    async (severity) => {
      const { response, statements, data } = await submit('bug-report', { summary: 's', severity })
      expect(response.status).toBe(400)
      expect((data as { error: string }).error).toBe('severity must be one of: Low, Medium, High, Critical')
      expect(statements).toHaveLength(0)
    },
  )

  it.each([7, ['High'], { level: 'High' }])(
    'ignores a non-string severity %j (the field helpers only read strings)',
    async (severity) => {
      const { response, statements } = await submit('bug-report', { summary: 's', severity })
      expect(response.status).toBe(201)
      expect(storedSeverity(statements[0].binds)).toBeNull()
    },
  )
})

describe('web form guards', () => {
  it('drops honeypot submissions without storing them', async () => {
    const { response, statements } = await submit('feedback', { message: 'hi', website: 'spam' })
    expect(response.status).toBe(201)
    expect(statements).toHaveLength(0)
  })

  it('rejects submissions without a Turnstile token', async () => {
    const { response } = await submit('feedback', { message: 'hi', [TURNSTILE_FIELD]: '' })
    expect(response.status).toBe(400)
  })
})
