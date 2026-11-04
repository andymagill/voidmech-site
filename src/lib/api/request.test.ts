import { describe, expect, it } from 'vitest'
import { voterNetwork } from './request'

describe('voterNetwork', () => {
  it('uses IPv4 addresses whole', () => {
    expect(voterNetwork('203.0.113.7')).toBe('203.0.113.7')
  })

  it('keeps only the first 64 bits of an IPv6 address', () => {
    expect(voterNetwork('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe('2001:0db8:0001:0002::/64')
  })

  it('treats compressed and full spellings of one /64 as the same network', () => {
    const expected = voterNetwork('2001:db8:1:2:0:0:0:1')
    expect(voterNetwork('2001:db8:1:2::1')).toBe(expected)
    expect(voterNetwork('2001:DB8:1:2::ffff')).toBe(expected)
    expect(voterNetwork('2001:db8:1:3::1')).not.toBe(expected)
  })

  it('handles :: at the start and end', () => {
    expect(voterNetwork('::1')).toBe('0000:0000:0000:0000::/64')
    expect(voterNetwork('2001:db8::')).toBe('2001:0db8:0000:0000::/64')
    expect(voterNetwork('::')).toBe('0000:0000:0000:0000::/64')
  })

  it('treats an IPv4-mapped IPv6 address as that IPv4 address', () => {
    expect(voterNetwork('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })

  it('returns anything it cannot parse unchanged', () => {
    expect(voterNetwork('local')).toBe('local')
    expect(voterNetwork('1:2:3')).toBe('1:2:3')
    expect(voterNetwork('1::2::3')).toBe('1::2::3')
    expect(voterNetwork('zzzz::1')).toBe('zzzz::1')
  })
})
