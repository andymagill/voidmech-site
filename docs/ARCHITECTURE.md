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
      newsletter.ts / feedback.ts / bug-report.ts
    utils.ts              `cn()` class-name helper
  content/
    site-content.ts       all page copy, screenshots and external links
  components/
    Header / Footer / AlphaNotice / Logo     global chrome
    ScreenshotFigure.tsx  thumbnail + lightbox
    SubmissionModals.tsx  newsletter / feedback / bug-report dialogs
    Turnstile.tsx         explicit-render Turnstile widget (no npm dependency)
    ui/                   shadcn-style primitives
  test/fakes.ts           fake D1, rate limiter, env and requests for unit tests
  styles.css              Tailwind v4 entry + `--vm-*` design tokens, `.vm-*` classes
migrations/               D1 schema (squashed until production; see README)
content/                  authoring source material (markdown drafts, marketing PNGs)
.github/workflows/        CI checks; deploy on main
```

## Data flows

**Page content.** Routes import copy and images from `content/site-content.ts`.
Screenshots resolve from `content/marketing-assets/` via `new URL(..., import.meta.url)`,
so only files referenced there ship in the build.

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

1. `readJsonBody`: requires `application/json`, enforces the byte cap (413), requires a JSON object (400).
2. Guards in order. Web forms use `sameOrigin` → `rateLimit('FORM_LIMITER')` → `honeypot` → `turnstile`.
3. `parse` validates into a record; validation failures throw `ApiError` (4xx).
4. `store` writes to D1 and builds the response.

Any non-`ApiError` failure is logged and returns a generic 500, so internals never reach clients.
To add a kind: write a definition in `src/lib/endpoints/`, register it in `index.ts`,
and add a table or `CHECK` value in the migration if it needs new storage.

**Abuse protection.** All free and available on `workers.dev`:

| Guard | Purpose |
| --- | --- |
| `rateLimit` | Workers Rate Limiting binding, keyed by `endpoint:ip`. Limits in `wrangler.jsonc`. Best effort, per location. Fails open if the binding is missing. |
| `sameOrigin` | `Origin` must equal the request's origin. |
| `honeypot` | Filled `website` field → fake 201, nothing stored. |
| `turnstile` | Server-side siteverify of the widget token. Fails closed. |
| `clientKey` | `X-VoidMech-Client` header for game traffic. A filter, not a real secret. |

**Bindings.** Read `env` from `cloudflare:workers` in route files and pass it into
endpoints. Do **not** read bindings from the route handler `context`: that is an
empty object under `@cloudflare/vite-plugin`, which previously made every
submission fail with 500.

## Storage

| Table | Holds |
| --- | --- |
| `submissions` | Newsletter, feedback and bug reports. Kind-specific extras in `metadata_json`. A partial unique index keeps one newsletter row per email; duplicates still return 201. |
| `crash_reports` | Game crash reports, grouped by `fingerprint` (endpoint lands in Phase 2). |
| `votes` | Roadmap votes; `voter_hash` is an HMAC of IP + poll id (endpoint lands in Phase 3). |

## Configuration notes

- `wrangler.jsonc` `d1_databases[0].database_id` is still `REPLACE_WITH_D1_DATABASE_ID`;
  see README "First deploy".
- Secrets: `TURNSTILE_SECRET_KEY`, `GAME_CLIENT_KEY`, `VOTE_SALT`. Local values live in
  `.dev.vars` (copied from `.dev.vars.example`); production values via `wrangler secret put`.
- The public Turnstile site key is a build-time Vite variable (`VITE_TURNSTILE_SITE_KEY`
  in `.env.development` / `.env.production`).
- After changing bindings, run `npm run cf-typegen` so `worker-configuration.d.ts` stays
  in sync; CI fails if it drifts.
- TypeScript is strict with `noUnusedLocals/Parameters`; `npx tsc --noEmit` must stay clean.
- Path aliases `#/*` and `@/*` both map to `src/*`; code uses `#/`.
