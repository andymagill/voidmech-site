#!/usr/bin/env node
/**
 * Turns one section of a Keep a Changelog style CHANGELOG.md into
 * `<out-dir>/<version>.md` with the front matter the site reads
 * (src/lib/releases.ts). Run by .github/workflows/publish-release-notes.yml
 * on the game repo's changelog; self-contained, so it imports nothing.
 * See docs/integrations/release-notes.md.
 *
 *   node extract-release-notes.mjs <CHANGELOG.md> <version> <out-dir> [--date YYYY-MM-DD]
 *
 * `version` may carry a leading `v` (a git tag). The section heading may be
 * `## [0.4.2-alpha] - 2026-11-04`, `## 0.4.2-alpha (2026-11-04)` or
 * `## v0.4.2-alpha`; the date comes from the heading, else `--date`, else today (UTC).
 * Exits 1 with a message when the section is missing or empty.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,39}$/

const normalize = (version) => version.trim().replace(/^v(?=\d)/i, '').toLowerCase()

/** Returns `{ version, date, body }` for `version`, or throws an Error. */
export function extractRelease(changelog, version, fallbackDate = new Date().toISOString().slice(0, 10)) {
  const wanted = normalize(version)
  const lines = changelog.replace(/^﻿/, '').split(/\r?\n/)
  const heading = /^##\s+\[?v?([^\]\s()]+)\]?(?:\s*(?:[-–—]|\()?\s*(\d{4}-\d{2}-\d{2})\)?)?\s*$/

  let start = -1
  let date = fallbackDate
  for (let i = 0; i < lines.length; i++) {
    const match = heading.exec(lines[i])
    if (match && normalize(match[1]) === wanted) {
      start = i
      if (match[2]) date = match[2]
      break
    }
  }
  if (start === -1) throw new Error(`No "## ${version}" section found in the changelog`)

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i
      break
    }
  }

  const body = lines
    .slice(start + 1, end)
    // Link reference definitions ("[0.4.2]: https://...") trail the last section.
    .filter((line) => !/^\[[^\]]+\]:\s+\S+\s*$/.test(line))
    .join('\n')
    .trim()
  if (!body) throw new Error(`The "${version}" section is empty`)

  const outVersion = version.trim().replace(/^v(?=\d)/i, '')
  if (!VERSION_PATTERN.test(outVersion)) throw new Error(`"${version}" is not a valid version`)

  return { version: outVersion, date, body }
}

export function renderRelease({ version, date, body }) {
  return `---\nversion: ${version}\ndate: ${date}\n---\n${body}\n`
}

function main(argv) {
  const dateFlag = argv.indexOf('--date')
  const date = dateFlag === -1 ? undefined : argv[dateFlag + 1]
  const positional = argv.filter((arg, i) => !arg.startsWith('--') && argv[i - 1] !== '--date')
  const [changelogPath, version, outDir] = positional
  if (!changelogPath || !version || !outDir) {
    console.error('usage: extract-release-notes.mjs <CHANGELOG.md> <version> <out-dir> [--date YYYY-MM-DD]')
    return 2
  }

  try {
    const release = extractRelease(readFileSync(changelogPath, 'utf8'), version, date)
    mkdirSync(outDir, { recursive: true })
    const file = join(outDir, `${release.version}.md`)
    writeFileSync(file, renderRelease(release))
    console.log(`Wrote ${file}`)
    return 0
  } catch (error) {
    console.error(`error: ${error.message}`)
    return 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)))
