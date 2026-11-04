import { describe, expect, it } from 'vitest'
import { crashFingerprint, normalizeLine } from './crash-fingerprint'

describe('normalizeLine', () => {
  it.each([
    ['at Ship.Update (C:\\Users\\Ann\\game\\Ship.cs:120)', 'at Ship.Update (Ship.cs:#)'],
    ['at Ship.Update (/home/ann/game/Ship.cs:7)', 'at Ship.Update (Ship.cs:#)'],
    ['Access violation at 0x7FF61234ABCD', 'Access violation at ADDR'],
    ['Index 5 out of range  of 3', 'Index # out of range of #'],
  ])('%s', (input, expected) => {
    expect(normalizeLine(input)).toBe(expected)
  })
})

describe('crashFingerprint', () => {
  it('is 32 hex chars, deterministic, and only uses the first line of the exception', async () => {
    const a = await crashFingerprint('Boom: 1\nsecond line differs', 'at A.b (A.cs:1)')
    const b = await crashFingerprint('Boom: 2\nanother', 'at A.b (A.cs:99)')
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).toBe(b)
  })

  it('changes with a different exception or different frames', async () => {
    const base = await crashFingerprint('Boom', 'at A.b (A.cs:1)')
    expect(await crashFingerprint('Bang', 'at A.b (A.cs:1)')).not.toBe(base)
    expect(await crashFingerprint('Boom', 'at C.d (C.cs:1)')).not.toBe(base)
    expect(await crashFingerprint('Boom', null)).not.toBe(base)
  })

  it('looks only at the top frames, so deep recursion differences do not split a crash', async () => {
    const top = Array.from({ length: 12 }, (_, i) => `at F${String.fromCharCode(65 + i)}.run`).join('\n')
    expect(await crashFingerprint('Boom', `${top}\nat deep.one`)).toBe(
      await crashFingerprint('Boom', `${top}\nat other.deep`),
    )
  })
})
