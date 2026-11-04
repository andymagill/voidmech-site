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
| G1 | Crash report endpoint | todo | `POST /api/submissions/crash-report`, text JSON, server-side fingerprint, `gameClientGuards`. Contract in `docs/integrations/crash-reports.md`. |
| G1a | Crash abuse limits (server) | todo | The game binary can't be trusted, so limits live here: (1) per-install de-dup, where a repeat of the same install + fingerprint within 24h returns 202 and stores nothing; (2) a global `CRASH_LIMITER` binding (about 20/min, roughly 28k/day max) that caps total writes well inside D1's free 100k/day; (3) versions not in `content/releases` are stored but flagged `unknown_version` so triage can filter them; (4) strict schema and truncation. Stored text is never rendered on the site. |
| G1b | Game-side client rules (in the contract doc) | todo | These are good-client behaviour, not security: opt-in setting; queue on crash, upload on next launch; at most 1 report per fingerprint per session and about 10/day; honour 429 `Retry-After` and back off on 5xx; short timeout, never block play; replace the user's home path in logs/stack (e.g. `C:\Users\<name>` → `%USERPROFILE%`) before sending; HTTPS only. |
| G2 | Release notes from the game repo (was B2) | todo | Game repo tag `v*` → Action extracts the `CHANGELOG.md` section → commits `content/releases/<version>.md` here → deploy. Download page and `/patch-notes` read those files. |

## Phase 3: Community voting

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| V1 | Polls config | todo | `src/content/polls.ts`: options, `opensAt`/`closesAt`, `cooldownHours` (default 24). Reset = new poll id; closed polls show as past results. |
| V2 | Vote API | todo | `POST/GET /api/votes/$pollId`. One vote per voter (salted IP hash) per cooldown window; each window adds a vote. Tallies returned only to voters or for closed polls. |
| V3 | Roadmap vote UI (was B3) | todo | Wire the radios and "Cast vote", show results, cooldown and past results. |

## Phase 4: UI polish

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| U1 | Success feedback in modals (was H3) | done | Confirmation panel takes focus; Close returns focus to the opener. |
| U2 | Shared focus trap (was H4) | done | `useFocusTrap` and a ref-counted `useScrollLock` in `dialog-behavior.ts`, used by `ModalShell` and the lightbox. |
| U3 | Bug report form | todo | Severity as a select; prefill platform where available. |
| U4 | Turnstile UX | done | Interaction-only, runs on first focus, submit waits for the token, clear failure messages. |
| U5 | Vote UI states | todo | Selected, loading, cooldown and closed states. |
| U6 | Heading structure (was C1) | todo | Logo in `Header` becomes a non-heading. |
| U7 | Colour tokens (was C3) | todo | Promote repeated `rgba(225,230,232,…)` / `rgba(10,20,32,0.8)` to `--vm-*` tokens. |

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

### Smaller components

- `BulletList`: one item per entry, dot colour applied.
- `Header`: menu toggle sets `aria-expanded`; Escape closes it.

### End-to-end (Playwright, 3–4 specs)

- Home → Download → Roadmap navigation; exactly one `<h1>` per page.
- Newsletter modal from `/download` submits and the row exists in local D1.
- Feedback → "Report a bug" switch, submit with only a summary.
- Mobile viewport: nav opens and closes; no horizontal scroll.
