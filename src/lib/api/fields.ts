import { ApiError } from './http'

/**
 * Field validators for JSON payloads. Text is trimmed and truncated rather
 * than rejected when too long; required fields and malformed values throw an
 * `ApiError(400)` naming the field.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LENGTH = 254 // RFC 5321 limit for a forwardable address

/** Trim and truncate; returns null for non-strings and blank strings. */
export function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export function requiredText(value: unknown, maxLength: number, field: string): string {
  const text = optionalText(value, maxLength)
  if (!text) {
    throw new ApiError(400, `${field} is required`)
  }

  return text
}

/**
 * Returns a lowercased, validated email, or null when the field is blank.
 * Throws when a value is present but invalid. Length is checked *before*
 * truncation is possible, so an over-long address is rejected rather than
 * silently cut into a different (possibly valid-looking) address.
 */
export function optionalEmail(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const email = value.trim().toLowerCase()
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(email)) {
    throw new ApiError(400, 'Email must be a valid address')
  }

  return email
}

/** Returns `value` if it is one of `allowed`, null when blank, and throws otherwise. */
export function optionalOneOf<T extends string>(
  value: unknown,
  allowed: ReadonlyArray<T>,
  field: string,
): T | null {
  const text = optionalText(value, 80)
  if (text === null) {
    return null
  }

  const match = allowed.find((option) => option.toLowerCase() === text.toLowerCase())
  if (!match) {
    throw new ApiError(400, `${field} must be one of: ${allowed.join(', ')}`)
  }

  return match
}

/**
 * Accepts a finite number (or numeric string) and clamps it into
 * `[min, max]`, rounding down. Returns null when absent or not numeric.
 */
export function optionalInt(value: unknown, min: number, max: number): number | null {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(number)) {
    return null
  }

  return Math.min(max, Math.max(min, Math.floor(number)))
}
