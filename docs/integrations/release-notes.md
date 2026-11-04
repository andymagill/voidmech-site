# Release notes pipeline

The game repo owns the release notes (`CHANGELOG.md`). Tagging a release publishes them
here automatically, and the site shows them on `/patch-notes` and the download page.
The crash-report endpoint uses the same files to recognise real versions
(`docs/integrations/crash-reports.md`).

```
game repo: git tag v0.4.2-alpha  ──►  Action extracts the changelog section
   ──►  commits content/releases/0.4.2-alpha.md to this repo's main
   ──►  Cloudflare Workers Builds deploys main  ──►  /patch-notes updates
```

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

## Workflow for the game repo

`.github/workflows/publish-release-notes.yml` in the **game** repo. It checks out this
repo, runs the script from there (no copy to keep in sync), and pushes to `main`:

```yaml
name: Publish release notes
on:
  push:
    tags: ['v*']

jobs:
  notes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: andymagill/voidmech-site
          token: ${{ secrets.SITE_REPO_TOKEN }}
          path: site
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Extract the changelog section
        run: node site/scripts/extract-release-notes.mjs CHANGELOG.md "$GITHUB_REF_NAME" site/content/releases
      - name: Commit to the site
        working-directory: site
        run: |
          git config user.name "voidmech-release-bot"
          git config user.email "release-bot@users.noreply.github.com"
          git add content/releases
          git diff --cached --quiet && { echo "No change"; exit 0; }
          git commit -m "Release notes for ${GITHUB_REF_NAME}"
          git push origin HEAD:main
```

Setup (one time, by the maintainer):

1. Create a fine-grained personal access token limited to **this repo**, permission
   *Contents: Read and write*, and store it in the game repo as the secret `SITE_REPO_TOKEN`.
2. If `main` here ever requires pull requests, change the last step to push a branch
   (`release-notes-<tag>`) and open a PR with `gh pr create`; Workers Builds then
   previews it before merge.
3. Re-running the workflow for a tag overwrites the same file, so it is safe to retry.

## Order of operations when releasing

1. Update `CHANGELOG.md`, tag `v<version>`; wait for the Action (a minute or two for the
   commit, plus the Workers Builds deploy).
2. Only then publish the build on itch.io. A build that reports crashes before its notes
   are live is stored with `unknown_version = 1` (nothing is lost; it just needs a
   different filter).
