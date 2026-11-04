/**
 * Release notes, authored in the game repo's `CHANGELOG.md` and committed here
 * as `content/releases/<version>.md` by the game repo's release Action (see
 * docs/integrations/release-notes.md). One file per release:
 *
 *   ---
 *   version: 0.4.2-alpha
 *   date: 2026-11-04
 *   ---
 *   ### Added
 *   - ...
 *
 * The file name must equal `version`. The files are bundled at build time, so
 * `/patch-notes`, the download page and the crash-report endpoint (which flags
 * versions it has no release for) all read the same list.
 *
 * Files arrive by an automated commit to `main` that deploys without review,
 * so a malformed file is skipped with a warning instead of throwing: a throw
 * at module load would turn every request into a 500. CI validates the files.
 */

export type Release = {
  version: string
  /** `YYYY-MM-DD` */
  date: string
  /** Markdown body (the changelog section). */
  body: string
}

/** Same shape the crash-report endpoint accepts for `version`. */
export const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,39}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Case-insensitive, ignoring a leading `v`, so `v0.4.2-Alpha` matches `0.4.2-alpha`. */
export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v(?=\d)/i, '').toLowerCase()
}

/** Returns the release in `raw`, or an Error naming the problem. `file` is the path it was read from. */
export function parseRelease(file: string, raw: string): Release | Error {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw.replace(/^﻿/, ''))
  if (!match) return new Error('missing front matter')

  const fields: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([a-z_]+):\s*(.*?)\s*$/.exec(line)
    if (pair) fields[pair[1]] = pair[2].replace(/^(["'])(.*)\1$/, '$2')
  }

  const { version, date } = fields
  if (!version || !VERSION_PATTERN.test(version)) return new Error('invalid or missing version')
  if (!date || !DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) {
    return new Error('date must be YYYY-MM-DD')
  }

  const name = file.split('/').pop()?.replace(/\.md$/, '') ?? ''
  if (normalizeVersion(name) !== normalizeVersion(version)) {
    return new Error(`file name must match version (${version})`)
  }

  return { version, date, body: match[2].trim() }
}

/** Newest first: by date, then by version with numeric-aware comparison. */
function compareReleases(a: Release, b: Release): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return b.version.localeCompare(a.version, 'en', { numeric: true })
}

/** Parses a `{ path: raw }` map, skipping (and warning about) invalid files. Newest first. */
export function loadReleases(files: Record<string, string>): Release[] {
  const releases: Release[] = []
  for (const [file, raw] of Object.entries(files)) {
    const parsed = parseRelease(file, raw)
    if (parsed instanceof Error) {
      console.warn(`Skipping release file ${file}: ${parsed.message}`)
    } else {
      releases.push(parsed)
    }
  }
  return releases.sort(compareReleases)
}

const files = import.meta.glob<string>('/content/releases/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** All published releases, newest first. */
export const releases: ReadonlyArray<Release> = loadReleases(files)

export function latestRelease(): Release | undefined {
  return releases[0]
}

/** True when `version` has a release file. */
export function isKnownVersion(version: string, list: ReadonlyArray<Release> = releases): boolean {
  const wanted = normalizeVersion(version)
  return list.some((release) => normalizeVersion(release.version) === wanted)
}
