import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error: a plain .mjs script with no type declarations
import * as discord from '../../scripts/discord-announcement.mjs'
// @ts-expect-error: a plain .mjs script with no type declarations
import { parseReleaseFile } from '../../scripts/release-announcement.mjs'

/**
 * scripts/discord-announcement.mjs writes the webhook payload the Announce
 * release workflow posts to Discord. Tested as a program as well as by its exports.
 */
const SCRIPT = join(process.cwd(), 'scripts', 'discord-announcement.mjs')
const SITE = 'https://voidmech.example.dev'
const ITCH = 'https://example.itch.io/voidmech'

const RAW = '---\nversion: 0.4.2-alpha\ndate: 2026-11-04\n---\nIntro, @everyone.\n\n### Added\n- Railgun, see [the roadmap](/roadmap#build)\n'
const release = parseReleaseFile(RAW)

describe('discord announcement', () => {
  it('posts one embed with the notes, the release page and itch.io, and no mentions', () => {
    const payload = discord.buildDiscordPayload(release, { site: SITE, itch: ITCH })
    expect(payload.allowed_mentions).toEqual({ parse: [] })
    expect(payload.embeds).toHaveLength(1)
    const [embed] = payload.embeds
    expect(embed.title).toBe('VoidMech 0.4.2-alpha')
    expect(embed.url).toBe(`${SITE}/releases/0.4.2-alpha`)
    expect(embed.footer).toEqual({ text: 'Released 2026-11-04' })
    expect(embed.description).toBe(
      `Intro, @everyone.\n\n### Added\n- Railgun, see [the roadmap](${SITE}/roadmap#build)` +
        `\n\n**[Read the full notes](${SITE}/releases/0.4.2-alpha)** · [Download on itch.io](${ITCH})`,
    )
  })

  it('rejects a non-https site or itch.io URL', () => {
    expect(() => discord.buildDiscordPayload(release, { site: 'http://x.dev', itch: ITCH })).toThrow(/--site/)
    expect(() => discord.buildDiscordPayload(release, { site: SITE, itch: '' })).toThrow(/--itch/)
  })

  it('leaves notes that fit alone', () => {
    expect(discord.fitNotes('a\nb', 10)).toEqual({ text: 'a\nb', cut: false })
  })

  it('cuts long notes at a whole line, never ending on a heading', () => {
    const notes = '### Added\n- one\n- two\n\n### Fixed\n- three'
    const { text, cut } = discord.fitNotes(notes, 33)
    expect(cut).toBe(true)
    expect(text).toBe('### Added\n- one\n- two\n\n…')
    expect(text.length).toBeLessThanOrEqual(33)
  })

  it('closes a code fence the cut leaves open', () => {
    const notes = 'Intro\n```\nline one\nline two\nline three\n```\nAfter'
    const { text } = discord.fitNotes(notes, 30)
    expect(text).toBe('Intro\n```\nline one\n```\n\n…')
    expect(text.length).toBeLessThanOrEqual(30)
  })

  it('hard-cuts a first line longer than the limit', () => {
    const { text } = discord.fitNotes('x'.repeat(50), 20)
    expect(text).toBe('x'.repeat(17) + '\n\n…')
  })

  it('keeps every committed release inside Discord limits', () => {
    for (const version of ['0.1.0-alpha.1', '0.2.0']) {
      const committed = parseReleaseFile(readFileSync(join(process.cwd(), 'content', 'releases', `${version}.md`), 'utf8'))
      const [embed] = discord.buildDiscordPayload(committed, { site: SITE, itch: ITCH }).embeds
      expect(embed.description.length).toBeLessThanOrEqual(discord.MAX_DESCRIPTION)
      expect(embed.description).toContain('[Read the full notes]')
    }
  })

  it('runs as a program: prints JSON, exits 1 on a bad file and 2 without options', () => {
    const dir = mkdtempSync(join(tmpdir(), 'discord-'))
    const good = join(dir, '0.4.2-alpha.md')
    const bad = join(dir, 'bad.md')
    writeFileSync(good, RAW)
    writeFileSync(bad, 'oops')
    const run = (args: string[]) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' })

    const ok = run([good, '--site', SITE, '--itch', ITCH])
    expect(ok.status).toBe(0)
    expect(JSON.parse(ok.stdout).embeds[0].title).toBe('VoidMech 0.4.2-alpha')

    expect(run([bad, '--site', SITE, '--itch', ITCH]).status).toBe(1)
    expect(run([good]).status).toBe(2)
  })
})
