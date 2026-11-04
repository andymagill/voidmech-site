# Architecture

VoidMech's public site: three marketing pages plus a small public API.
TanStack Start (React 19, file-based routing, SSR) runs on a Cloudflare Worker;
submissions are stored in Cloudflare D1.

## Entry points

| Entry | Role |
| --- | --- |
| `@tanstack/react-start/server-entry` | Worker `main` (see `wrangler.jsonc`); handles SSR and `/api/*` |
| `src/router.tsx` | `getRouter()`: builds a fresh router per request |
| `src/routes/__root.tsx` | HTML shell: head tags, header, alpha banner, footer, submission modals |
| `src/routeTree.gen.ts` | **Generated** by the TanStack Start Vite plugin on `npm run dev`/`build`; never edit |

## Layout

```
src/
  routes/
    __root.tsx            document shell + global chrome
    index.tsx             /          hero, core systems, FAQ
    download.tsx          /download  itch.io CTA, build details, support cards
    roadmap.tsx           /roadmap   milestones, vote UI (not wired up yet), FAQ
    patch-notes.tsx       /patch-notes  release notes from content/releases
    api/submissions/
      $kind.ts            POST /api/submissions/:kind → endpoint registry
  lib/
    api/                  endpoint framework (no endpoint-specific logic)
      http.ts             json(), ApiError, readJsonBody (content type + byte cap)
      fields.ts           text/email/enum/int validators
      guards.ts           rateLimit, sameOrigin, honeypot, turnstile, clientKey
      endpoint.ts         defineEndpoint: body → guards → parse → store
      request.ts          clientIp, hmacHex, sha256Hex, safeEqual
    endpoints/            one definition per kind + registry (index.ts)
      shared.ts           web form guards, `submissions` table insert
      newsletter.ts / feedback.ts / bug-report.ts   browser forms
      crash-report.ts     game client (see docs/integrations/crash-reports.md)
    crash-fingerprint.ts  server-side crash grouping
    releases.ts           content/releases/*.md loader (patch notes, known versions)
    utils.ts              `cn()` class-name helper
  content/
    site-content.ts       all page copy, screenshots and external links
  components/
    Header / Footer / AlphaNotice / Logo     global chrome
    ScreenshotFigure.tsx  thumbnail + lightbox
    Markdown.tsx          changelog Markdown subset → React elements (no raw HTML)
    SubmissionModals.tsx  newsletter / feedback / bug-report dialogs
    Turnstile.tsx         explicit-render Turnstile widget (no npm dependency)
    ui/                   shadcn-style primitives
  test/fakes.ts           fake D1, rate limiter, env and requests for unit tests
  styles.css              Tailwind v4 entry + `--vm-*` design tokens, `.vm-*` classes
migrations/               D1 schema (0001 squashed baseline; add 0002+ incrementally, see README)
content/                  authoring source material (markdown drafts, marketing PNGs)
  releases/               <version>.md release notes, committed by the game repo's Action
scripts/                  deploy checks, smoke test, extract-release-notes.mjs (runs in the game repo too)
docs/integrations/        contracts with the game repo: crash-reports.md, release-notes.md
.github/workflows/        CI checks only (deploys: Cloudflare Workers Builds, see README)
```

## Data flows

**Page content.** Routes import copy and images from `content/site-content.ts`.
Screenshots are static imports from `content/marketing-assets/`, so only files
referenced there ship in the build. Don't use `new URL(path, import.meta.url)` for
assets: Vite leaves it untouched in the Worker bundle, where it throws at module load
and every request returns 500 (dev mode hides this; the CI preview smoke test catches it).

**Submission modals.** Modals are driven by the URL hash. Any page opens one
with `<a href="#feedback">` (`#newsletter`, `#feedback`, `#bug-report`).
`ModalShell` listens to `hashchange`; closing clears the hash.
`SubmissionForm` posts every named form field as JSON with `source: "site_modal"`,
including the Turnstile token (`cf-turnstile-response`) and the hidden honeypot
(`website`). It shows API errors inline, resets the Turnstile widget after a
failure (tokens are single-use), and closes the modal on success.

**API pipeline.** `POST /api/submissions/:kind` looks the kind up in
`src/lib/endpoints/index.ts` (unknown → 404; GET → 405). Each endpoint is a
`defineEndpoint({ name, maxBytes, guards, parse, store })`:

1. Read the body: `readJsonBody` by default (requires `application/json`, byte cap → 413,
   JSON object → 400). An endpoint can pass its own `readBody`, e.g. multipart for uploads.
2. Guards in order. Guards belong to the endpoint, not the route, chosen by caller type:
   - `browserGuards` (site forms): `sameOrigin` → `rateLimit('FORM_LIMITER')` → `honeypot` → `turnstile`.
   - `gameClientGuards` (the game, other native clients): `rateLimit('GAME_LIMITER')` → `clientKey`.
     Native clients send no `Origin` and can't run Turnstile, so they never get the browser preset.
     `crash-report` appends `globalRateLimit('CRASH_LIMITER')` after the key check.
3. `parse` validates into a record; validation failures throw `ApiError` (4xx).
4. `store` writes to D1 and builds the response.

Any non-`ApiError` failure is logged and returns a generic 500, so internals never reach clients.
To add a kind: write a definition in `src/lib/endpoints/`, register it in `index.ts`,
and add a table or `CHECK` value in the migration if it needs new storage.

**Release notes.** `content/releases/<version>.md` (front matter `version`, `date`, then
a changelog section) is bundled at build time by `src/lib/releases.ts`
(`import.meta.glob`). It feeds `/patch-notes`, the download page's current build, and
the crash endpoint's `unknown_version` flag. A bad file is skipped with a warning, never
thrown, because an automated commit to `main` deploys without review and a throw at module
load would 500 every request; a unit test fails CI on one. The game repo's Action creates
the files (`docs/integrations/release-notes.md`).

**Crash reports.** The game POSTs to `/api/submissions/crash-report` (contract:
`docs/integrations/crash-reports.md`). Because the game can't be trusted, the endpoint
validates strictly, computes the fingerprint itself, de-duplicates per install in one atomic
`INSERT ... WHERE NOT EXISTS` (202 for repeats), and is capped site-wide by `CRASH_LIMITER`.

**Abuse protection.** All free and available on `workers.dev`:

| Guard | Purpose |
| --- | --- |
| `rateLimit` | Workers Rate Limiting binding, keyed by `endpoint:ip`. Limits in `wrangler.jsonc`. Best effort, per location. Fails open if the binding is missing. |
| `sameOrigin` | `Origin` must equal the request's origin. |
| `honeypot` | Filled `website` field → fake 201, nothing stored. |
| `turnstile` | Server-side siteverify of the widget token. Fails closed. |
| `clientKey` | `X-VoidMech-Client` header for game traffic. A filter, not a real secret. |
| `globalRateLimit` | One counter for all callers (not per IP), to keep total D1 writes under quota. Fails closed if the binding is missing. |

**Bindings.** Read `env` from `cloudflare:workers` in route files and pass it into
endpoints. Do **not** read bindings from the route handler `context`: that is an
empty object under `@cloudflare/vite-plugin`, which previously made every
submission fail with 500.

## Storage

| Table | Holds |
| --- | --- |
| `submissions` | Newsletter, feedback and bug reports. Kind-specific extras in `metadata_json`. A partial unique index keeps one newsletter row per email; duplicates still return 201. |
| `crash_reports` | Game crash reports, grouped by server-computed `fingerprint`; `install_hash` is a hash of the game's random install id; `unknown_version = 1` when the version has no release file. At most one row per install + fingerprint per 24 h. |
| `votes` | Roadmap votes; `voter_hash` is an HMAC of IP + poll id (endpoint lands in Phase 3). |

## Configuration notes

- The Worker is `voidmech`. Production uses D1 `voidmech-site`; branch builds are Worker
  Previews that use D1 `voidmech-site-preview` and separate rate-limit namespaces, declared
  in the `previews` block of `wrangler.jsonc` (Previews inherit nothing from production).
  See README "Deploys".
- Rate-limit bindings in `wrangler.jsonc`: `FORM_LIMITER` (per IP, forms), `GAME_LIMITER` (per IP, game),
  `CRASH_LIMITER` (global, crash reports); each has a separate counter for previews.
- Secrets: `TURNSTILE_SECRET_KEY`, `GAME_CLIENT_KEY`, `VOTE_SALT`. Local values live in
  `.dev.vars` (copied from `.dev.vars.example`); production values via
  `wrangler secret put`; preview values via `wrangler preview base-config secret put`.
- The public Turnstile site key is a build-time Vite variable (`VITE_TURNSTILE_SITE_KEY`
  in `.env.development` / `.env.production`).
- After changing bindings, run `npm run cf-typegen` so `worker-configuration.d.ts` stays
  in sync; CI fails if it drifts.
- TypeScript is strict with `noUnusedLocals/Parameters`; `npx tsc --noEmit` must stay clean.
- Path aliases `#/*` and `@/*` both map to `src/*`; code uses `#/`.
