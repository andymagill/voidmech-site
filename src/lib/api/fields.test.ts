import { describe, expect, it } from 'vitest'
import { optionalEmail, optionalInt, optionalOneOf, optionalText, requiredText } from './fields'
import { ApiError } from './http'

describe('optionalText', () => {
  it('trims and truncates', () => {
    expect(optionalText('  hello  ', 3)).toBe('hel')
  })

  it('returns null for blank and non-string values', () => {
    expect(optionalText('   ', 10)).toBeNull()
    expect(optionalText(42, 10)).toBeNull()
    expect(optionalText(undefined, 10)).toBeNull()
  })
})

describe('requiredText', () => {
  it('throws a 400 naming the field when blank', () => {
    expect(() => requiredText(' ', 10, 'message')).toThrowError(
      expect.objectContaining({ status: 400, message: 'message is required' }),
    )
  })
})

describe('optionalEmail', () => {
  it('lowercases and trims', () => {
    expect(optionalEmail('  Pilot@VoidMech.com ')).toBe('pilot@voidmech.com')
  })

  it('returns null when blank', () => {
    expect(optionalEmail('')).toBeNull()
    expect(optionalEmail(null)).toBeNull()
  })

  it('rejects malformed and over-long addresses', () => {
    expect(() => optionalEmail('not-an-email')).toThrow(ApiError)
    expect(() => optionalEmail(`${'a'.repeat(250)}@x.io`)).toThrow(ApiError)
  })
})

describe('optionalOneOf', () => {
  const levels = ['Low', 'High'] as const

  it('matches case-insensitively and returns the canonical value', () => {
    expect(optionalOneOf('high', levels, 'severity')).toBe('High')
  })

  it('returns null when blank and throws for unknown values', () => {
    expect(optionalOneOf('', levels, 'severity')).toBeNull()
    expect(() => optionalOneOf('Extreme', levels, 'severity')).toThrow(ApiError)
  })
})

describe('optionalInt', () => {
  it('accepts numbers and numeric strings, clamped and floored', () => {
    expect(optionalInt(12.9, 0, 100)).toBe(12)
    expect(optionalInt('512', 0, 100)).toBe(100)
    expect(optionalInt(-5, 0, 100)).toBe(0)
  })

  it('returns null for non-numeric input', () => {
    expect(optionalInt('abc', 0, 10)).toBeNull()
    expect(optionalInt('', 0, 10)).toBeNull()
    expect(optionalInt(Number.NaN, 0, 10)).toBeNull()
  })
})
