# Release notes pipeline

The game repo owns the release notes (`CHANGELOG.md`). Publishing a release there
publishes them here. Every release gets its own page, `/releases/<version>`, and the
roadmap's latest build section shows the newest one in full in its right column, the
release log (`/roadmap#release-log`), with links to every earlier release below it.
The crash-report endpoint uses the same files to recognise real versions
(`docs/integrations/crash-reports.md`). A release new to the site is then announced:
an issue here carries a prefilled Reddit post and an itch.io devlog draft.

```
game repo: tools/push-itch.ps1 -Tag v0.4.2-alpha  ──►  gh workflow run (here)
   ──►  this repo's Publish release notes workflow reads CHANGELOG.md at the tag
   ──►  opens and squash-merges a PR adding content/releases/0.4.2-alpha.md
   ──►  Cloudflare Workers Builds deploys main  ──►  /roadmap and /releases/0.4.2-alpha update
   ──►  Announce release waits for the page, opens "Announce VoidMech 0.4.2-alpha"
   ──►  the maintainer posts to Reddit and itch.io from the issue and closes it
```

The job runs here, not in the game repo: the game repo is private and spends no
GitHub Actions minutes (its decision D237), and this repo is public, so its minutes are free.

## File format

`content/releases/<version>.md`, where `<version>` is the tag without the leading `v`:

```markdown
---
version: 0.4.2-alpha
date: 2026-11-04
---
### Added
- Railgun
```

- `version` must equal the file name, match `[0-9A-Za-z][0-9A-Za-z.+_-]*` (max 40 chars).
- `date` is `YYYY-MM-DD`.
- The body is a Markdown subset: headings (all shown as level 3), bullet and numbered
  lists, paragraphs, fenced code, `` `code` ``, `**bold**`, `*italic*`, and links to
  `http(s)` or `/paths`. Raw HTML is shown as text, not rendered.
- Releases are sorted by date, newest first.

A malformed file is skipped with a warning (it cannot break the site); the unit test
`content/releases: every committed release file is valid` fails CI on one.

## Release pages

`/releases/<version>` (`src/routes/releases.$version.tsx`) shows one release: the version as
the page title, its date, the notes, the itch.io button, and links to the newer and older
release and back to the release log. The newest is marked as the current build. An unknown
version is a 404; a known one spelled differently (`/releases/V0.4.2-Alpha`) is a 301 to the
file's spelling, so a link is stable once posted. CI requests every release's page and a missing one.

## Announcing a release

Reddit and itch.io cannot be posted to automatically from here:

- **Reddit** stopped granting new Data API access on 31 October 2026 and plans to end public
  API access around March 2027; a bot would need a Devvit app instead.
- **itch.io** has no API for devlogs, and its staff discourage automated posting.

So `.github/workflows/announce-release.yml` does everything but the click. For each new
release it waits until `/releases/<version>` answers 200 (up to 15 minutes, for the Workers
Builds deploy), then opens an issue titled `Announce VoidMech <version>`, labelled
`release-announcement` and assigned to the repo owner, written by
`scripts/release-announcement.mjs`:

- a checklist (Reddit, itch.io devlog);
- **Reddit:** an `old.reddit.com` submit link with the title and Markdown text filled in (the
  old site honours `title`, `text` and `selftext=true`; the new one may not), plus the same
  title and text to paste by hand. Past 7,000 characters the link carries only the title;
- **itch.io:** the title, and the notes rendered in the issue: copy them from the issue's
  rendered page into the devlog editor, which keeps headings, lists, bold and links.

Root-relative links in the notes (`/roadmap`) are made absolute, and both posts link the
release page and the itch.io page. The title is `VoidMech <version> release notes`.

It runs:

- from the Publish release notes workflow, when its merge added a file `main` did not have
  (re-publishing changed notes does not announce again);
- on a push to `main` that adds a `content/releases/*.md` file, e.g. merging by hand a PR the
  workflow could not merge (the workflow's own merges use `GITHUB_TOKEN`, which starts no
  workflow, so nothing runs twice);
- by hand: Actions > Announce release > Run workflow with a version, e.g. for a release
  published before this existed.

A version that already has a `release-announcement` issue, open or closed, is skipped. To
announce again, rename or delete the old issue.

Each setting has a default in the workflow; a repository variable of the same name overrides
it (Settings > Secrets and variables > Actions > Variables):

| Variable | Default | Use |
| --- | --- | --- |
| `REDDIT_SUBREDDIT` | `VoidMech` ([r/VoidMech](https://www.reddit.com/r/VoidMech/)) | Subreddit for the submit link |
| `SITE_URL` | `https://voidmech.andymagill.workers.dev` | Site the posts link to; change it with a custom domain |
| `ITCH_URL` | `https://ndxmii.itch.io/voidmech` | The game's itch.io page |
| `ITCH_DEVLOG_URL` | `https://itch.io/dashboard/game/5337597/new-devlog` | The devlog editor the issue links to |

## Extracting from the changelog

`scripts/extract-release-notes.mjs` (self-contained, tested here) reads a Keep a
Changelog style file. Headings may be `## [0.4.2-alpha] - 2026-11-04`,
`## 0.4.2-alpha (2026-11-04)` or `## v0.4.2-alpha`; the section runs to the next `##`.

```bash
node scripts/extract-release-notes.mjs CHANGELOG.md v0.4.2-alpha content/releases [--date 2026-11-04]
```

It exits 1 when the section is missing or empty, so a tag without notes fails the Action
instead of publishing nothing.

## The workflow

`.github/workflows/publish-release-notes.yml`, started by hand (`workflow_dispatch`) with
one input, the game's tag (`v0.4.2-alpha`). It:

1. checks the tag is `vX.Y.Z` or `vX.Y.Z-suffix`;
2. checks out this repo's `main` and, with the read-only deploy key, only `CHANGELOG.md`
   from the game repo at `refs/tags/<tag>`, so the notes are the tagged ones, never a later edit;
3. runs `scripts/extract-release-notes.mjs` into `content/releases/`;
4. runs the release unit tests, because a push or PR made with `GITHUB_TOKEN` does not start CI;
5. commits `Release notes for <tag>` on a branch `release-notes-<tag>`, opens a PR and
   squash-merges it, then deletes the branch. `main` takes changes only through a pull
   request (the Default ruleset, no approvals or checks required), so the PR is the record;
   Workers Builds deploys the merge. An unchanged file is "No change" and a success, and a
   branch or open PR left by a failed run is reused, so a re-run is safe;
6. if the merge added a release `main` did not have, calls Announce release (above), which
   needs `issues: write`.

The game repo starts it from `tools/push-itch.ps1`, after the itch.io push:

```bash
gh workflow run publish-release-notes.yml --repo andymagill/voidmech-site -f tag=v0.4.2-alpha
```

The same command, or Actions > Publish release notes > Run workflow, publishes or
re-publishes any tag by hand; `v0.1.0-alpha.1`, older than the workflow, is published that way.

Setup (one time, by the maintainer):

1. Make an SSH key pair with no passphrase (`ssh-keygen -t ed25519 -f game_read_key`).
2. Add the public half to the **game** repo as a deploy key, write access **off**.
3. Store the private half in **this** repo as the Actions secret `GAME_REPO_KEY`, then
   delete both local files.
4. Settings > Actions > General > Workflow permissions: tick **Allow GitHub Actions to
   create and approve pull requests**, or step 5 cannot open its PR.
5. If the ruleset ever requires approvals or status checks, the job's merge fails and its
   PR waits for a person (a `GITHUB_TOKEN` PR starts no CI, so a required check never
   reports): merge it by hand.

Only people with write access here can start the workflow, and pull requests from forks
never see the secret. The key reads the game repo and nothing else.

## Order of operations when releasing

The game repo's order (its DEV-GUIDE, "Publishing a release"): write the version's
`CHANGELOG.md` section, tag and push the tag, make and check the draft GitHub Release,
publish it, then `tools/push-itch.ps1 -Tag v<version>`, which pushes the build to itch.io
and then starts this workflow. The notes are live a minute or two later, plus the Workers
Builds deploy; itch.io is still processing the build by then. The announcement issue opens
as soon as the release page is live; post to itch.io once the build shows there. A crash report from the new
version that arrives first is stored with `unknown_version = 1` (nothing is lost; it just
needs a different filter).
