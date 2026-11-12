import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error: a plain .mjs script with no type declarations
import * as announce from '../../scripts/release-announcement.mjs'
import { releasePath } from './releases'

/**
 * scripts/release-announcement.mjs writes the "Announce <version>" issue that
 * the Announce release workflow opens. It is self-contained, so it is tested
 * as a program as well as by its exports.
 */
const SCRIPT = join(process.cwd(), 'scripts', 'release-announcement.mjs')
const SITE = 'https://voidmech.example.dev'
const ITCH = 'https://example.itch.io/voidmech'

const RAW = '---\nversion: 0.4.2-alpha\ndate: 2026-11-04\n---\nIntro.\n\n### Added\n- Railgun, see [the roadmap](/roadmap#build)\n'
const release = announce.parseReleaseFile(RAW)

describe('release announcement', () => {
  it('parses a release file like the site does', () => {
    expect(release).toEqual({
      version: '0.4.2-alpha',
      date: '2026-11-04',
      body: 'Intro.\n\n### Added\n- Railgun, see [the roadmap](/roadmap#build)',
    })
    expect(() => announce.parseReleaseFile('no front matter')).toThrow()
    expect(() => announce.parseReleaseFile('---\nversion: 1.0.0\ndate: 2026-01-01\n---\n')).toThrow(/empty/)
  })

  it('links the same release page the site serves', () => {
    expect(announce.releaseUrl(SITE, '0.4.2-alpha')).toBe(SITE + releasePath('0.4.2-alpha'))
    expect(announce.releaseUrl(SITE, '1.0.0+b')).toBe(SITE + releasePath('1.0.0+b'))
  })

  it('points root-relative links at the site, leaving absolute ones alone', () => {
    expect(announce.absolutizeLinks('[a](/x) [b](https://y.dev/z) [c](//evil.dev)', SITE)).toBe(
      `[a](${SITE}/x) [b](https://y.dev/z) [c](//evil.dev)`,
    )
  })

  it('prefills a Reddit text post with the title, notes and links', () => {
    const a = announce.buildAnnouncement(release, { site: `${SITE}/`, itch: ITCH, subreddit: 'r/VoidMech' })
    expect(a.title).toBe('VoidMech 0.4.2-alpha release notes')
    expect(a.subreddit).toBe('VoidMech')
    expect(a.textInLink).toBe(true)

    const url = new URL(a.submitUrl)
    expect(url.origin + url.pathname).toBe('https://old.reddit.com/r/VoidMech/submit')
    expect(url.searchParams.get('selftext')).toBe('true')
    expect(url.searchParams.get('title')).toBe(a.title)
    const text = url.searchParams.get('text')
    expect(text).toBe(a.redditBody)
    expect(text).toContain(`[the roadmap](${SITE}/roadmap#build)`)
    expect(text).toContain(`${SITE}/releases/0.4.2-alpha`)
    expect(text).toContain(ITCH)
  })

  it('lets the form pick the subreddit when none is set, and rejects a bad name', () => {
    const a = announce.buildAnnouncement(release, { site: SITE, itch: ITCH })
    expect(a.submitUrl.startsWith('https://old.reddit.com/submit?')).toBe(true)
    expect(() => announce.buildAnnouncement(release, { site: SITE, itch: ITCH, subreddit: 'a/b' })).toThrow()
    expect(() => announce.buildAnnouncement(release, { site: 'http://plain.dev', itch: ITCH })).toThrow(/https/)
  })

  it('drops the text from an over-long link and says to paste it', () => {
    const long = { ...release, body: '- ' + 'x'.repeat(announce.MAX_SUBMIT_URL) }
    const a = announce.buildAnnouncement(long, { site: SITE, itch: ITCH })
    expect(a.textInLink).toBe(false)
    expect(new URL(a.submitUrl).searchParams.has('text')).toBe(false)
    expect(announce.renderIssue(long, a)).toContain('too long to fit in the link')
  })

  it('fences pasted text so backticks in the notes cannot break out', () => {
    const tricky = { ...release, body: 'Use ```` and ``` freely' }
    const issue = announce.renderIssue(tricky, announce.buildAnnouncement(tricky, { site: SITE, itch: ITCH }))
    expect(issue).toContain('`````markdown\nUse ```` and ``` freely')
  })

  it('runs as a program: prints the issue, exits 1 on a bad file and 2 without options', () => {
    const dir = mkdtempSync(join(tmpdir(), 'announce-'))
    const good = join(dir, '0.4.2-alpha.md')
    const bad = join(dir, 'bad.md')
    writeFileSync(good, RAW)
    writeFileSync(bad, 'oops')
    const run = (args: string[]) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' })

    const ok = run([good, '--site', SITE, '--itch', ITCH, '--subreddit', 'VoidMech'])
    expect(ok.status).toBe(0)
    expect(ok.stdout).toContain('are live: https://voidmech.example.dev/releases/0.4.2-alpha')
    expect(ok.stdout).toContain('- [ ] Reddit')
    expect(ok.stdout).toContain('- [ ] itch.io devlog')
    expect(ok.stdout).toContain('[a new VoidMech devlog on itch.io](https://itch.io/dashboard/game/5337597/new-devlog)')
    expect(ok.stdout).toContain('Open the prefilled post on r/VoidMech')

    expect(run([bad, '--site', SITE, '--itch', ITCH]).status).toBe(1)
    expect(run([good]).status).toBe(2)
  })
})
