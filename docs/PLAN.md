# Plan: pending work

Work is grouped into phases, one PR each, foundations first. Update the status
column as items land; delete rows once merged and no longer informative.

Status: `todo` · `doing` · `done` · `ops` (a manual step for the maintainer)

Constraints: free tier only; Cloudflare (Workers, D1, Turnstile, Rate Limiting)
and GitHub Actions; minimal dependencies; hosted on `workers.dev` for now (no
zone-level WAF, Cache API or Bot Fight Mode).

## Phase 1: Foundation

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| F1 | Modular endpoint pipeline | done | `src/lib/api/*` (body parsing, fields, guards, `defineEndpoint`) and `src/lib/endpoints/*` (one definition per kind) behind `src/routes/api/submissions/$kind.ts`. New kinds add a definition, not a route. |
| F2 | Final pre-production schema | done | `migrations/0001_initial.sql`: `submissions`, `crash_reports`, `votes`. Newsletter de-duplicated by a partial unique index (was H2). |
| F3 | Abuse protection (was H1) | done | Rate Limiting binding, Turnstile, honeypot, same-origin check for web forms; client-key header for the game; byte-based size caps (was H5). |
| F4 | Unit tests | done | Vitest over `src/lib/api` and endpoint parsers. |
| F5 | CI and deploy | done | `.github/workflows/ci.yml` checks every push (types, tests, build, production-build smoke test). Workers Builds: Build command `npm run build:cloudflare` (config check, build, branch-aware D1 migrations); default Deploy (`main`) and Preview (branches, Worker Previews + staging DB) commands. |
| F6 | Production setup | doing | Done: Worker `voidmech`; D1 `voidmech-site` (production) and `voidmech-site-preview` (previews) created + migrated; real Turnstile site key committed; production `TURNSTILE_SECRET_KEY` set. Left (ops): preview secret via `wrangler preview base-config secret put`, Workers Builds commands, push + manual browser test. |

## Phase 2: Game integration

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| G1 | Crash report endpoint | done | `POST /api/submissions/crash-report` (`src/lib/endpoints/crash-report.ts`): text JSON, server-side fingerprint (`src/lib/crash-fingerprint.ts`), `gameClientGuards` + global cap. Contract in `docs/integrations/crash-reports.md`. Migration `0002`. |
| G1a | Crash abuse limits (server) | done | The game binary can't be trusted, so limits live here: (1) per-install de-dup (atomic insert-if-absent; a repeat within 24h returns 202 and stores nothing); (2) global `CRASH_LIMITER` (20/min, about 28.8k/day max, fails closed) well inside D1's free 100k/day; (3) versions with no `content/releases` file are stored with `unknown_version = 1`; (4) strict schema and truncation. Stored text is never rendered on the site. |
| G1b | Game-side client rules (in the contract doc) | done (doc) | Written in `docs/integrations/crash-reports.md`: opt-in, queue and upload next launch, volume caps, honour 429/5xx, scrub home paths, HTTPS only. Implementing them is game-repo work. |
| G2 | Release notes from the game repo (was B2) | done (site side) | `src/lib/releases.ts` reads `content/releases/*.md`; `/patch-notes` and the download page show them; `scripts/extract-release-notes.mjs` + the workflow in `docs/integrations/release-notes.md` are for the game repo. |
| G3 | Phase 2 ops | ops | Set `GAME_CLIENT_KEY` for production and for previews (different values; see README). Add the `SITE_REPO_TOKEN` secret to the game repo and the workflow from `docs/integrations/release-notes.md`. Build the game-side crash reporter to the contract. Until the first release file lands, every crash report is flagged `unknown_version`. |

## Phase 3: Community voting

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| V1 | Polls config | done | `src/content/polls.ts`: options, `opensAt`/`closesAt` (null = no end), `cooldownHours` (default 24). Reset = new poll id; closed polls show as past results. |
| V2 | Vote API | done | `POST/GET /api/votes/$pollId` (`src/lib/endpoints/vote.ts`). One vote per voter (salted network hash) per rolling cooldown window; each window adds a vote. Tallies only to voters or for closed polls. Guard set, shared-IP policy and response shape: ARCHITECTURE.md "Community voting". No migration (the `0001` table covers it); new `READ_LIMITER` binding. |
| V3 | Roadmap vote UI (was B3) | done | `PollVote` wired into `/roadmap`: ballot, results, cooldown, closed polls and a "Past polls" section. Results cached in localStorage after a vote. |
| V4 | Phase 3 ops | ops | `VOTE_SALT` set for production and previews (different values). Never change it while a poll is open: every voter could vote again. To reset a poll, add a new poll id. |

## Phase 4: UI polish

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| U1 | Success feedback in modals (was H3) | done | Confirmation panel takes focus; Close returns focus to the opener. |
| U2 | Shared focus trap (was H4) | done | `useFocusTrap` and a ref-counted `useScrollLock` in `dialog-behavior.ts`, used by `ModalShell` and the lightbox. |
| U3 | Bug report form | done | Severity is an optional select (`BUG_SEVERITIES` in `src/lib/bug-report-options.ts`: Low, Medium, High, Critical); the endpoint validates it with `optionalOneOf` and answers 400 for anything else. The Platform field was dropped from the form while the game is Windows-only; the endpoint still accepts `platform` as optional free text, so bring the field back (a select, prefilled from `navigator.userAgentData`) when a second platform ships. |
| U4 | Turnstile UX | done | Interaction-only, runs on first focus, submit waits for the token, clear failure messages. |
| U5 | Vote UI states | done | Loading, selected, verifying/sending, cooldown, results, closed and upcoming states, with specific restriction messages. In `PollVote`. |
| U6 | Heading structure (was C1) | done | The `Header` logo is a plain link, not a heading. The page titles on `/download`, `/roadmap` and `/patch-notes` were `h2` (those pages had no `h1`): `SectionHeading` takes `level={1}`. Home card titles are `h3` under "Core systems". `src/routes/headings.test.tsx` asserts one `h1` and no skipped level per page, including the roadmap polls (featured: h2 → h3; past: h2 → h3 → h4). |
| U7 | Colour tokens (was C3) | done | Role tokens on `:root` (`--vm-text-strong/-text/-text-muted/-text-dim`, `--vm-placeholder`, `--vm-surface-soft/-surface/-surface-solid`), derived from `--vm-white` / `--vm-space` and exposed to Tailwind with `@theme inline` (`text-vm-text-muted`, `bg-vm-surface-soft`, …). Ten text alphas and five surface alphas collapsed into these (nearest token, at most about 0.05 apart). Other `rgba()` values (cyan glows, slate borders, the darker panel variants in `styles.css`) are untouched. |

## Later

| # | Item | Notes |
| --- | --- | --- |
| C2 | Import style | `__root.tsx` uses relative imports; the rest use `#/`. |
| C4 | Unused tooling config | `components.json` (`rsc: true`, uninstalled `lucide`) and `.cta.json` are scaffold leftovers. |
| C5 | Content duplication | Copy lives in both `content/*.md` and `src/content/site-content.ts`. Pick a source of truth. |
| C6 | Unreferenced marketing PNGs | Keep as source assets or move out of the repo. |
| L1 | Alerts (was H6) | Discord webhook for new bug reports and new crash fingerprints; or a periodic check on 5xx in Workers Logs. |
| L2 | User content submissions | New endpoint definition plus R2 for files. Public content is a bigger abuse target than crash reports, and a client key embedded in the game can't stop a determined uploader. Preferred: export the file in-game and upload it on the website (gets `browserGuards` and Turnstile for free). Either way, uploads land in a moderation queue and nothing is public until approved. Accounts (e.g. itch.io OAuth) only if that proves insufficient. |
| L3 | Custom domain | Then add a WAF rate-limit rule and consider Bot Fight Mode (exempt the game API). |

## Phase 5: Content revisions

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| R1 | Content revisions | todo | Details supplied by the maintainer when this phase starts. Ask for them before planning; do not guess scope. |

## Tests still to add

Unit tests for the pipeline land in Phase 1. Remaining:

### Integration: API against local D1

Use `@cloudflare/vitest-pool-workers` (or `wrangler dev --local` plus `fetch`) with
migrations applied:

- POST a valid payload to each kind, then `SELECT` and assert the row.
- Assert the `CHECK(kind IN (...))` constraint and `NOT NULL message` hold.
- Non-POST methods return 404/405 rather than crashing.

### Component: `SubmissionModals`

Done (`SubmissionModals.test.tsx`, `scroll-lock.test.tsx`, `modal-hash.test.ts`, Vitest + React
Testing Library + jsdom, fetch and the Turnstile script faked): hash open/close, scroll lock,
Escape/backdrop/Close, form switching, Tab wrap, payload and token, confirmation focus, error
handling, Turnstile timing, retry and expiry.

### Votes against a real D1

`vote.test.ts` fakes D1, so the SQL itself (the atomic insert-if-absent, the tally `GROUP BY`) is only exercised
by `scripts/smoke-api.mjs --local`. Cover it in the integration suite above: two concurrent votes from one
voter store one row; a vote after the cooldown stores a second.

### Smaller components

- `BulletList`: one item per entry, dot colour applied.
- `Header`: menu toggle sets `aria-expanded`; Escape closes it.

### End-to-end (Playwright, 3–4 specs)

- Home → Download → Roadmap navigation; exactly one `<h1>` per page.
- Newsletter modal from `/download` submits and the row exists in local D1.
- Feedback → "Report a bug" switch, submit with only a summary.
- Mobile viewport: nav opens and closes; no horizontal scroll.
