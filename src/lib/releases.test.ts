import { describe, expect, it, vi } from 'vitest'
import { isKnownVersion, loadReleases, normalizeVersion, parseRelease } from './releases'

const file = (version: string, date = '2026-11-04', body = '### Added\n- A thing') =>
  `---\nversion: ${version}\ndate: ${date}\n---\n${body}\n`

describe('parseRelease', () => {
  it('parses front matter and body', () => {
    expect(parseRelease('/content/releases/0.4.2-alpha.md', file('0.4.2-alpha'))).toEqual({
      version: '0.4.2-alpha',
      date: '2026-11-04',
      body: '### Added\n- A thing',
    })
  })

  it('accepts CRLF, a BOM and quoted values', () => {
    const raw = '﻿---\r\nversion: "1.0.0"\r\ndate: 2026-01-02\r\n---\r\nBody\r\n'
    expect(parseRelease('1.0.0.md', raw)).toMatchObject({ version: '1.0.0', body: 'Body' })
  })

  it.each([
    ['no front matter', 'just text', '0.1.0.md'],
    ['bad version', file('../etc'), '../etc.md'],
    ['missing date', '---\nversion: 0.1.0\n---\nx', '0.1.0.md'],
    ['impossible date', file('0.1.0', '2026-13-45'), '0.1.0.md'],
    ['file name differs from version', file('0.1.0'), '0.2.0.md'],
  ])('rejects %s', (_name, raw, path) => {
    expect(parseRelease(path, raw)).toBeInstanceOf(Error)
  })
})

describe('loadReleases', () => {
  it('sorts newest first and skips invalid files without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const releases = loadReleases({
      '/content/releases/0.1.0.md': file('0.1.0', '2026-01-01'),
      '/content/releases/0.10.0.md': file('0.10.0', '2026-03-01'),
      '/content/releases/0.9.0.md': file('0.9.0', '2026-03-01'),
      '/content/releases/broken.md': 'oops',
    })

    expect(releases.map((r) => r.version)).toEqual(['0.10.0', '0.9.0', '0.1.0'])
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('isKnownVersion', () => {
  const list = [{ version: '0.4.2-alpha', date: '2026-11-04', body: '' }]

  it('matches ignoring case and a leading v', () => {
    expect(normalizeVersion(' v0.4.2-ALPHA ')).toBe('0.4.2-alpha')
    expect(isKnownVersion('v0.4.2-Alpha', list)).toBe(true)
    expect(isKnownVersion('0.4.3-alpha', list)).toBe(false)
    expect(isKnownVersion('0.4.2', list)).toBe(false)
  })
})

describe('content/releases', () => {
  it('every committed release file is valid', () => {
    const files = import.meta.glob<string>('/content/releases/*.md', {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    const problems = Object.entries(files).flatMap(([path, raw]) => {
      const result = parseRelease(path, raw)
      return result instanceof Error ? [`${path}: ${result.message}`] : []
    })
    expect(problems).toEqual([])
  })
})
