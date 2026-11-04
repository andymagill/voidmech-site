import { describe, expect, it } from 'vitest'
import { cooldownMs, currentPoll, getPoll, pollStatus, polls, type Poll } from './polls'

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p',
  question: 'q',
  description: 'd',
  opensAt: '2026-11-01T00:00:00Z',
  closesAt: '2026-12-01T00:00:00Z',
  options: [{ id: 'a', kicker: '', title: 'A', body: '', tint: 'cyan' }],
  ...overrides,
})

describe('poll config', () => {
  it('has unique poll ids and unique option ids within each poll', () => {
    expect(new Set(polls.map((p) => p.id)).size).toBe(polls.length)
    for (const p of polls) {
      expect(p.options.length).toBeGreaterThanOrEqual(2)
      expect(new Set(p.options.map((o) => o.id)).size).toBe(p.options.length)
    }
  })

  it('has valid dates, and closes after it opens', () => {
    for (const p of polls) {
      expect(Number.isNaN(Date.parse(p.opensAt))).toBe(false)
      if (p.closesAt !== null) {
        expect(Date.parse(p.closesAt)).toBeGreaterThan(Date.parse(p.opensAt))
      }
      if (p.cooldownHours !== undefined) expect(p.cooldownHours).toBeGreaterThan(0)
    }
  })

  it('finds a poll by id', () => {
    expect(getPoll(polls[0].id)).toBe(polls[0])
    expect(getPoll('missing')).toBeUndefined()
  })
})

describe('pollStatus', () => {
  const p = poll()

  it('is upcoming before opensAt, open from opensAt, closed from closesAt', () => {
    expect(pollStatus(p, new Date('2026-10-31T23:59:59Z'))).toBe('upcoming')
    expect(pollStatus(p, new Date('2026-11-01T00:00:00Z'))).toBe('open')
    expect(pollStatus(p, new Date('2026-11-30T23:59:59Z'))).toBe('open')
    expect(pollStatus(p, new Date('2026-12-01T00:00:00Z'))).toBe('closed')
  })

  it('stays open forever without a closesAt', () => {
    expect(pollStatus(poll({ closesAt: null }), new Date('2099-01-01T00:00:00Z'))).toBe('open')
  })
})

describe('cooldownMs', () => {
  it('defaults to 24 hours and honours an override', () => {
    expect(cooldownMs(poll())).toBe(24 * 60 * 60 * 1000)
    expect(cooldownMs(poll({ cooldownHours: 6 }))).toBe(6 * 60 * 60 * 1000)
  })
})

describe('currentPoll', () => {
  const now = new Date('2026-11-15T00:00:00Z')
  const old = poll({ id: 'old', opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-02-01T00:00:00Z' })
  const open = poll({ id: 'open' })
  const later = poll({ id: 'later', opensAt: '2027-01-01T00:00:00Z', closesAt: null })

  it('prefers the open poll, then the next to open, then the latest closed', () => {
    expect(currentPoll([old, later, open], now)?.id).toBe('open')
    expect(currentPoll([old, later], now)?.id).toBe('later')
    expect(currentPoll([old], now)?.id).toBe('old')
    expect(currentPoll([], now)).toBeUndefined()
  })
})
