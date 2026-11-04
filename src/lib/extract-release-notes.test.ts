import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseRelease } from './releases'

/**
 * The extractor is copied into the game repo, so it is tested as a program
 * and its output is checked against the site's own release parser.
 */
const SCRIPT = join(process.cwd(), 'scripts', 'extract-release-notes.mjs')

const CHANGELOG = `# Changelog

## [Unreleased]
- not yet

## [0.4.2-alpha] - 2026-11-04
### Added
- Railgun

### Fixed
- Camera jitter

## 0.4.1-alpha (2026-10-01)
- Older

## v0.4.0-alpha
- Oldest

[0.4.2-alpha]: https://example.com/compare/0.4.1...0.4.2
`

function run(args: string[], changelog = CHANGELOG) {
  const dir = mkdtempSync(join(tmpdir(), 'release-notes-'))
  const changelogPath = join(dir, 'CHANGELOG.md')
  writeFileSync(changelogPath, changelog)
  const result = spawnSync('node', [SCRIPT, changelogPath, ...args.slice(0, 1), dir, ...args.slice(1)], {
    encoding: 'utf8',
  })
  return { dir, result }
}

describe('extract-release-notes', () => {
  it('writes <version>.md with front matter that the site accepts', () => {
    const { dir, result } = run(['v0.4.2-alpha'])
    expect(result.status).toBe(0)

    const raw = readFileSync(join(dir, '0.4.2-alpha.md'), 'utf8')
    const parsed = parseRelease('/content/releases/0.4.2-alpha.md', raw)
    expect(parsed).toEqual({
      version: '0.4.2-alpha',
      date: '2026-11-04',
      body: '### Added\n- Railgun\n\n### Fixed\n- Camera jitter',
    })
  })

  it('stops at the next section and drops trailing link references', () => {
    const { dir } = run(['0.4.2-alpha'])
    const raw = readFileSync(join(dir, '0.4.2-alpha.md'), 'utf8')
    expect(raw).not.toContain('Older')
    expect(raw).not.toContain('https://example.com/compare')
  })

  it('reads the date from "(date)" headings, and falls back to --date when the heading has none', () => {
    const older = run(['0.4.1-alpha'])
    expect(readFileSync(join(older.dir, '0.4.1-alpha.md'), 'utf8')).toContain('date: 2026-10-01')

    const undated = run(['v0.4.0-alpha', '--date', '2026-09-09'])
    expect(readFileSync(join(undated.dir, '0.4.0-alpha.md'), 'utf8')).toContain('date: 2026-09-09')
  })

  it('fails clearly for a missing or empty section', () => {
    const missing = run(['9.9.9'])
    expect(missing.result.status).toBe(1)
    expect(missing.result.stderr).toMatch(/No "## 9\.9\.9" section/)

    const empty = run(['1.0.0'], '## 1.0.0\n\n## 0.9.0\n- x\n')
    expect(empty.result.status).toBe(1)
    expect(empty.result.stderr).toMatch(/empty/)
  })

  it('prints usage and exits 2 without arguments', () => {
    expect(() => execFileSync('node', [SCRIPT], { stdio: 'pipe' })).toThrow(/status 2|usage/i)
  })
})
