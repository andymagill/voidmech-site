#!/usr/bin/env node
/**
 * Writes the Discord webhook payload that .github/workflows/announce-release.yml
 * posts when a new release lands in content/releases/: one embed with the
 * version, the notes (cut at a whole line to fit Discord's limits) and links to
 * the release page and itch.io. Mentions are switched off, so an "@everyone"
 * in the notes is only text. Shares its parsing with release-announcement.mjs
 * and imports nothing from src/. See docs/integrations/release-notes.md.
 *
 *   node discord-announcement.mjs <content/releases/<version>.md> --site <url> --itch <url>
 *
 * Prints the payload (JSON) on stdout. Exits 1 on a malformed file or option.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { absolutizeLinks, parseReleaseFile, releaseUrl } from './release-announcement.mjs'

/** Discord's limit on an embed description, in characters. */
export const MAX_DESCRIPTION = 4096
/** The site's cyan, as Discord's embed colour integer. */
export const EMBED_COLOR = 0x22e0f0

function httpsUrl(url, name) {
  if (!/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(url ?? '')) throw new Error(`--${name} must be an https URL`)
  return url.replace(/\/+$/, '')
}

/**
 * `markdown` cut to at most `max` characters at a line boundary, never ending
 * on a heading or inside a code fence, with "…" where text was dropped.
 * Returns `{ text, cut }`.
 */
export function fitNotes(markdown, max) {
  if (markdown.length <= max) return { text: markdown, cut: false }
  const ELLIPSIS = '\n\n…'
  const CLOSE = '\n```'
  const kept = []
  let length = 0
  let inFence = false
  for (const line of markdown.split('\n')) {
    const added = (kept.length ? 1 : 0) + line.length
    const opensOrCloses = /^\s*(```|~~~)/.test(line)
    const fenceAfter = opensOrCloses ? !inFence : inFence
    // Room for the ellipsis, and for closing a fence left open.
    if (length + added + ELLIPSIS.length + (fenceAfter ? CLOSE.length : 0) > max) break
    kept.push(line)
    length += added
    inFence = fenceAfter
  }
  // A heading or blank line with nothing under it is dropped too.
  while (kept.length && !inFence && (/^\s*$/.test(kept.at(-1)) || /^#{1,6}\s/.test(kept.at(-1)))) kept.pop()
  let text = kept.join('\n')
  if (inFence) text += CLOSE
  if (!text) text = markdown.slice(0, max - ELLIPSIS.length).trimEnd()
  return { text: text + ELLIPSIS, cut: true }
}

/** The webhook payload for one release. */
export function buildDiscordPayload(release, { site, itch }) {
  site = httpsUrl(site, 'site')
  itch = httpsUrl(itch, 'itch')
  const pageUrl = releaseUrl(site, release.version)
  const links = `\n\n**[Read the full notes](${pageUrl})** · [Download on itch.io](${itch})`
  const { text } = fitNotes(absolutizeLinks(release.body, site), MAX_DESCRIPTION - links.length)

  return {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `VoidMech ${release.version}`,
        url: pageUrl,
        description: text + links,
        color: EMBED_COLOR,
        footer: { text: `Released ${release.date}` },
      },
    ],
  }
}

function main(argv) {
  const options = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) options[argv[i].slice(2)] = argv[++i] ?? ''
    else positional.push(argv[i])
  }
  const [file] = positional
  if (!file || !options.site || !options.itch) {
    console.error('usage: discord-announcement.mjs <release.md> --site <url> --itch <url>')
    return 2
  }

  try {
    const release = parseReleaseFile(readFileSync(file, 'utf8'))
    process.stdout.write(JSON.stringify(buildDiscordPayload(release, { site: options.site, itch: options.itch })))
    return 0
  } catch (error) {
    console.error(`error: ${error.message}`)
    return 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)))
