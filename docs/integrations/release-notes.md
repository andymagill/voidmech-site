# Release notes pipeline

The game repo owns the release notes (`CHANGELOG.md`). Publishing a release there
publishes them here, and the site shows them on the roadmap's latest build section: the
build details and, in its right column, the release log (`/roadmap#release-log`).
The crash-report endpoint uses the same files to recognise real versions
(`docs/integrations/crash-reports.md`).

```
game repo: tools/push-itch.ps1 -Tag v0.4.2-alpha  ──►  gh workflow run (here)
   ──►  this repo's Publish release notes workflow reads CHANGELOG.md at the tag
   ──►  commits content/releases/0.4.2-alpha.md to main
   ──►  Cloudflare Workers Builds deploys main  ──►  /roadmap updates
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
4. runs the release unit tests, because a push made with `GITHUB_TOKEN` does not start CI;
5. commits `Release notes for <tag>` and pushes to `main`, which Workers Builds deploys.
   An unchanged file is "No change" and a success, so a re-run is safe.

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
4. If `main` here ever requires pull requests, change the last step to push a branch
   (`release-notes-<tag>`) and open a PR with `gh pr create`; Workers Builds then
   previews it before merge.

Only people with write access here can start the workflow, and pull requests from forks
never see the secret. The key reads the game repo and nothing else.

## Order of operations when releasing

The game repo's order (its DEV-GUIDE, "Publishing a release"): write the version's
`CHANGELOG.md` section, tag and push the tag, make and check the draft GitHub Release,
publish it, then `tools/push-itch.ps1 -Tag v<version>`, which pushes the build to itch.io
and then starts this workflow. The notes are live a minute or two later, plus the Workers
Builds deploy; itch.io is still processing the build by then. A crash report from the new
version that arrives first is stored with `unknown_version = 1` (nothing is lost; it just
needs a different filter).
