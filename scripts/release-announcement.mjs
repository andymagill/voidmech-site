#!/usr/bin/env node
/**
 * Writes the body of the "Announce <version>" GitHub issue that
 * .github/workflows/announce-release.yml opens when a new release lands in
 * content/releases/. Neither Reddit (no new Data API access since 31 October
 * 2026) nor itch.io (no devlog API) can be posted to by a bot here, so the
 * issue carries everything a person needs to post in a minute: a Reddit submit
 * link with the title and text filled in, and an itch.io devlog draft to copy.
 * Self-contained, so it imports nothing from src/. See
 * docs/integrations/release-notes.md.
 *
 *   node release-announcement.mjs <content/releases/<version>.md> --site <url> --itch <url>
 *        [--subreddit <name>] [--itch-devlog <url>]
 *
 * Prints the issue body (Markdown) on stdout. Exits 1 on a malformed file or option.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Same rules as src/lib/releases.ts. */
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,39}$/
const SUBREDDIT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_]{1,20}$/
/** Longer submit links risk a 414 from Reddit; past this the text is pasted by hand. */
export const MAX_SUBMIT_URL = 7000
/** VoidMech's "new devlog" editor on itch.io. */
export const DEFAULT_ITCH_DEVLOG = 'https://itch.io/dashboard/game/5337597/new-devlog'

/** `{ version, date, body }` from a release file, or throws. */
export function parseReleaseFile(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw.replace(/^﻿/, ''))
  if (!match) throw new Error('missing front matter')
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([a-z_]+):\s*(.*?)\s*$/.exec(line)
    if (pair) fields[pair[1]] = pair[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  if (!fields.version || !VERSION_PATTERN.test(fields.version)) throw new Error('invalid or missing version')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date ?? '')) throw new Error('date must be YYYY-MM-DD')
  const body = match[2].replace(/\r\n?/g, '\n').trim()
  if (!body) throw new Error('empty release notes')
  return { version: fields.version, date: fields.date, body }
}

/** Same path as src/lib/releases.ts `releasePath`. */
export const releaseUrl = (site, version) => `${site}/releases/${encodeURIComponent(version)}`

/** Root-relative links (`](/roadmap)`) point at the site once the text leaves it. */
export function absolutizeLinks(markdown, site) {
  return markdown.replace(/\]\((\/(?!\/)[^)\s]*)\)/g, (_all, path) => `](${site}${path})`)
}

/** A code fence longer than any run of backticks in `text`, so the text cannot close it early. */
function fence(text, info = '') {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  const ticks = '`'.repeat(Math.max(3, longest + 1))
  return `${ticks}${info}\n${text}\n${ticks}`
}

function normalizeSite(url, name) {
  if (!/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(url ?? '')) throw new Error(`--${name} must be an https URL`)
  return url.replace(/\/+$/, '')
}

/**
 * Everything the issue needs. `subreddit` may be empty (the submit form then
 * asks for one) and may carry a leading `r/`.
 */
export function buildAnnouncement(release, { site, itch, subreddit = '', itchDevlog = DEFAULT_ITCH_DEVLOG }) {
  site = normalizeSite(site, 'site')
  itch = normalizeSite(itch, 'itch')
  itchDevlog = normalizeSite(itchDevlog, 'itch-devlog')
  const sub = subreddit.trim().replace(/^\/?r\//i, '')
  if (sub && !SUBREDDIT_PATTERN.test(sub)) throw new Error(`"${subreddit}" is not a subreddit name`)

  const pageUrl = releaseUrl(site, release.version)
  const notes = absolutizeLinks(release.body, site)
  const title = `VoidMech ${release.version} release notes`

  const redditBody = `${notes}\n\n---\n\nFull notes and earlier builds: ${pageUrl}  \nDownload the alpha on itch.io: ${itch}`
  const itchBody = `${notes}\n\nFull notes and earlier builds: [${pageUrl}](${pageUrl})`

  // old.reddit.com fills in a text post from these parameters; the new site may not.
  const submitBase = `https://old.reddit.com/${sub ? `r/${sub}/` : ''}submit`
  const params = new URLSearchParams({ selftext: 'true', title, text: redditBody })
  let submitUrl = `${submitBase}?${params}`
  const textInLink = submitUrl.length <= MAX_SUBMIT_URL
  if (!textInLink) submitUrl = `${submitBase}?${new URLSearchParams({ selftext: 'true', title })}`

  return { title, pageUrl, redditBody, itchBody, submitUrl, textInLink, subreddit: sub, itchDevlog }
}

/** The issue body: a checklist, the Reddit link and text, and the itch.io devlog draft. */
export function renderIssue(release, announcement) {
  const { title, pageUrl, redditBody, itchBody, submitUrl, textInLink, subreddit, itchDevlog } = announcement
  const where = subreddit ? `r/${subreddit}` : 'Reddit (choose the subreddit on the form)'

  return `The release notes for **${release.version}** (${release.date}) are live: ${pageUrl}

Post them in both places, tick each box, then close this issue.

- [ ] Reddit
- [ ] itch.io devlog

## Reddit

**[Open the prefilled post on ${where}](${submitUrl})**, check the title and text, add a flair if the subreddit asks for one, and submit.${
    textInLink ? '' : '\n\nThe notes are too long to fit in the link, so the form has only the title: paste the text below into the body.'
  }

<details>
<summary>Title and text, to paste by hand</summary>

Title:

${fence(title, 'text')}

Text (Markdown: in the new Reddit editor, switch to Markdown mode before pasting):

${fence(redditBody, 'markdown')}

</details>

## itch.io devlog

1. Open [a new VoidMech devlog on itch.io](${itchDevlog}).
2. Title:

   ${fence(title, 'text').split('\n').join('\n   ')}

3. Select the notes between the two lines below **on this issue's rendered page** (not its source), copy, and paste them into the post body. The editor keeps the headings, lists, bold and links.
4. Pick the post type (an update), then publish.

---

${itchBody}

---
`
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
    console.error(
      'usage: release-announcement.mjs <release.md> --site <url> --itch <url> [--subreddit <name>] [--itch-devlog <url>]',
    )
    return 2
  }

  try {
    const release = parseReleaseFile(readFileSync(file, 'utf8'))
    const announcement = buildAnnouncement(release, {
      site: options.site,
      itch: options.itch,
      subreddit: options.subreddit ?? '',
      itchDevlog: options['itch-devlog'] || DEFAULT_ITCH_DEVLOG,
    })
    process.stdout.write(renderIssue(release, announcement))
    return 0
  } catch (error) {
    console.error(`error: ${error.message}`)
    return 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)))
