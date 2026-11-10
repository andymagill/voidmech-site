# Architecture

VoidMech's public site: three marketing pages plus a small public API.
TanStack Start (React 19, file-based routing, SSR) runs on a Cloudflare Worker;
submissions are stored in Cloudflare D1.

## Entry points

| Entry | Role |
| --- | --- |
| `@tanstack/react-start/server-entry` | Worker `main` (see `wrangler.jsonc`); handles SSR, `/api/*` and `/media/*` |
| `src/router.tsx` | `getRouter()`: builds a fresh router per request |
| `src/routes/__root.tsx` | HTML shell: head tags, header, alpha banner, footer, submission modals |
| `src/routeTree.gen.ts` | **Generated** by the TanStack Start Vite plugin on `npm run dev`/`build`; never edit |

## Layout

```
src/
  routes/
    __root.tsx            document shell + global chrome
    index.tsx             /          hero, core systems, known issues, troubleshooting, FAQ,
                                     support cards ("Keep the signal open")
    roadmap.tsx           /roadmap   community poll (`PollVote`), milestones, latest build (itch.io CTA,
                                     release log `#release-log`), past polls
    api/submissions/
      $kind.ts            POST /api/submissions/:kind → endpoint registry
    api/votes/
      $pollId.ts          POST (cast vote) and GET (poll state) /api/votes/:pollId
    media/
      $file.ts            GET/HEAD /media/:file → hero clips from R2 with Range support (lib/endpoints/media.ts)
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
      vote.ts             community voting: `voteEndpoint(poll)` (POST) and `getPollState` (GET)
    votes.ts              `PollState` response type + tally helpers (client-safe)
    crash-fingerprint.ts  server-side crash grouping
    releases.ts           content/releases/*.md loader (release log, known versions)
    modal-hash.ts         closeHash() for hash modals + the router's scroll-restoration filter
    bug-report-options.ts  `BUG_SEVERITIES`, shared by the form and the endpoint (client-safe)
    utils.ts              `cn()` class-name helper
  content/
    site-content.ts       all page copy, screenshots and external links
    polls.ts              poll definitions (ids, options, open/close dates, cooldown) + status helpers
  components/
    Header / Footer / AlphaNotice / Logo     global chrome
    ScreenshotFigure.tsx  thumbnail + lightbox
    HeroVideo.tsx         home hero: SSR poster, random silent clip fades in on the client (skipped for reduced motion)
    Markdown.tsx          changelog Markdown subset → React elements (no raw HTML)
    SubmissionModals.tsx  newsletter / feedback / bug-report dialogs
    PollVote.tsx          one poll: ballot, restrictions, results, localStorage cache
    use-verified-submit.ts  Turnstile-guarded submit flow shared by the modals and the poll
    dialog-behavior.ts    shared by every overlay: ref-counted scroll lock, focus trap
    Turnstile.tsx         `useTurnstile` + mount point; explicit-render widget (no npm dependency)
    ui/                   shadcn-style primitives (native `<select>`, no Radix); `SectionHeading` takes `level` (1 for the page title)
  test/fakes.ts           fake D1, rate limiter, env and requests for unit tests
  test/turnstile.ts       fake Turnstile script for component tests; dom-matchers.ts: the few DOM matchers they use
  **/*.test.ts(x)         Vitest; component tests opt into jsdom with `// @vitest-environment jsdom`
  styles.css              Tailwind v4 entry + `--vm-*` design tokens (see Colour tokens), `.vm-*` classes
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
`ModalShell` listens to `hashchange`; closing calls `closeHash()` (`lib/modal-hash.ts`),
which clears the hash with `replaceState`, **keeping `history.state`** (the router's
location key) and dispatching `hashchange` itself. TanStack Router would otherwise scroll
the page to the top on every close, so `router.tsx` passes `shouldRestoreScroll` as
`scrollRestoration` to skip the router's scroll handling for exactly that update.

Every overlay (`ModalShell`, the `ScreenshotFigure` lightbox) uses `dialog-behavior.ts`:
`useScrollLock` is reference-counted (the page's `overflow` is saved by the first lock and
restored by the last release, in any order), and `useFocusTrap` handles initial focus,
Tab wrapping, Escape (innermost overlay only) and returning focus. Don't write
`document.body.style.overflow` anywhere else.

`SubmissionForm` posts every named form field as JSON with `source: "site_modal"`,
the Turnstile token (`cf-turnstile-response`) and the hidden honeypot (`website`). On
success it swaps the form for a confirmation panel that takes focus; API errors show
inline with the input kept.

The bug-report form's Severity is an optional `<select>` over `BUG_SEVERITIES`
(`Not sure`, Low, Medium, High, Critical). The select is a convenience; the endpoint
is the authority: `severity` must match one of the list (case-insensitive, stored in its
canonical spelling), blank is stored as null and anything else is a 400, so a hand-built
request cannot put free text into `metadata_json`. The form no longer sends `platform`
(the game is Windows-only); the endpoint keeps it as optional free text.

**Headings.** Each page has exactly one `<h1>`, which is its hero (`SectionHeading
level={1}`; home has its own). Section headings are `h2`, items inside a section `h3`, and the
`Header` contains no heading (the logo is a link). `PollVote` takes `headingLevel`: `3`
under a section `h2` (the featured poll), `4` when the poll sits under its own `h3` (each
entry in "Past polls"). Dialog titles are `h2` and their confirmation `h3`. Don't skip
levels; `src/routes/headings.test.tsx` fails if a page does.

**Buttons.** `ui/button.tsx` is the only button look: `primary` (the main action in a group) and
`secondary` (everything else), in the mono, uppercase, tracked type the component sets itself, so call
sites pass no typography classes. Sizes: `default` (h-10), `sm` (h-8; Close, Try again) and `icon`
(the menu toggle). A link that should look like a button takes `buttonVariants({ variant })` on the
`<a>` / `<Link>`; don't nest a `<Button>` in a link. There is no third (warning) design and no
bespoke button CSS; change the look in `buttonVariants` only.

**Colour tokens.** `--vm-*` variables on `:root` in `styles.css` are the single source of
colour: the palette (`--vm-white`, `--vm-space`, `--vm-cyan`, …) plus alpha roles derived
from it with `color-mix` (`--vm-text-strong/-text/-text-muted/-text-dim`, `--vm-placeholder`,
`--vm-surface-soft/-surface/-surface-solid`). `@theme inline` registers each as
`--color-vm-*`, so components use utilities (`text-vm-text-muted`, `bg-vm-surface-soft`,
`placeholder:text-vm-placeholder`) rather than `rgba(…)` literals. To add a token, define it
on `:root`, add its `--color-vm-<name>: var(--vm-<name>)` line to `@theme inline`, then use
`text-vm-<name>` / `bg-vm-<name>`. Reach for an existing role before adding one; the
text roles are 0.9 / 0.8 / 0.75 / 0.6 / 0.55 alpha of `--vm-white`.

**Turnstile.** `useTurnstile()` renders the widget with `appearance: 'interaction-only'`
and `execution: 'execute'`, so nothing is visible and no challenge runs until the form is
used. The form calls `start()` on first focus or input; submitting without a token starts
the challenge and the button shows "Verifying…" until the token arrives, then sends.
Tokens are single-use (and expire after 300 s): after every attempt the form calls
`reset()`, and after a failure also `start()` so a fresh token is ready for the retry. An
expired token returns the status to `idle`, so the next focus or submit runs a new challenge. A submit that waits more than 45 s for a token (a challenge that never answers) gives up with a message and resets.
Cloudflare doesn't document that `execute()` is needed again after `reset()`; it is
(checked against the real script).

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

**Community voting.** Polls live in `src/content/polls.ts` (id, question, options, `opensAt`,
`closesAt` or null, `cooldownHours`, default 24). Votes are keyed by poll id: a reset is a new poll
with a new id, and the old one gets a `closesAt` and shows under "Past polls". Never change
`VOTE_SALT` while a poll is open.

- **Voter identity.** `voter_hash = HMAC(VOTE_SALT, voterNetwork(ip) + '|' + pollId)`; the raw IP is never
  stored. `voterNetwork` uses an IPv4 address whole and only the /64 of an IPv6 one (a household can rotate
  addresses inside its /64 freely). A missing `VOTE_SALT` fails closed with 500.
- **Cooldown.** Rolling from the voter's last vote, not a calendar day. Check and insert are one
  `INSERT ... SELECT ... WHERE NOT EXISTS`, so simultaneous requests can't both count. After the window the
  same voter can vote again; every vote is a row.
- **Shared IPs (NAT).** People behind one address (a household, school, office, mobile carrier NAT) share one
  vote per window. Accepted deliberately: a cookie or localStorage fallback is trivially cleared and would
  defeat the limit, and the poll is advisory. The UI explains this when a vote is refused.
- **Guards.** POST reuses `browserGuards` unchanged (`sameOrigin` → `FORM_LIMITER` → `honeypot` →
  `turnstile`). The limiter key includes the endpoint name, so votes count under `vote:<ip>`, separate from
  the forms. The cooldown check runs after Turnstile, so a repeat voter spends one token. There is no global
  write cap: writes are bounded per voter per day and Turnstile gates each one. GET changes no data, so it has
  no Origin or Turnstile check, but it is limited per IP by `READ_LIMITER` (30/min) to protect D1's read quota.
- **Who sees tallies.** Voters (any vote on record for that poll, even after the cooldown ended) and everyone
  once the poll is closed. Others get `results: null` and cost one indexed lookup; the `GROUP BY` over the poll's
  votes runs only for people allowed to see it. If a poll ever reaches tens of thousands of votes, keep running
  counts in a table instead.
- **Response shape** (`PollState` in `src/lib/votes.ts`):
  `{ poll: { id, status: 'upcoming'|'open'|'closed', opensAt, closesAt }, voter: { hasVoted, optionId, votedAt,
  nextVoteAt, canVote }, results: { total, counts } | null }`. `GET` returns it (404 for an unknown poll).
  `POST { option_id, cf-turnstile-response }` returns `201 { ok: true, ...PollState }`. Inside the cooldown it is
  `429` with `Retry-After` and `{ error, code: 'cooldown', ...PollState }`, so the UI can show results without
  another request. A poll that is not open is `409 { code: 'upcoming' | 'closed' }`; an unknown option is 400.
- **Why a factory.** `voteEndpoint(poll)` builds a `defineEndpoint` per request because the poll id comes
  from the route parameter, which `parse` cannot see. `getPollState` is separate: `defineEndpoint` reads a body.
- **Client.** `PollVote` renders a disabled ballot first; `GET` supplies the real state after mount (the server
  decides who has voted, from the network). Results appear inside the same three option cards as the
  ballot: the radio becomes the option's percentage, with the vote count, a bar and a marker on the voter's own
  choice (a voter whose cooldown has ended sees the radios and the shares together). A vote's response carries the results; they are cached in
  `localStorage` (`vm-poll:<id>`) so the next visit paints them immediately, labelled with when they were saved,
  until the `GET` confirms or replaces them. Open polls send `no-store`, so a browser can't replay a pre-vote
  response; closed ones allow `private, max-age=300`. The Turnstile flow is `use-verified-submit.ts`, shared with
  the modals. The widget's container stays mounted for the page's lifetime: a widget cannot render into a
  container that does not exist yet.

**Release notes.** `content/releases/<version>.md` (front matter `version`, `date`, then
a changelog section) is bundled at build time by `src/lib/releases.ts`
(`import.meta.glob`). It feeds the roadmap's latest build section (`latestRelease()` for the build
details, and the release log in its right column, `#release-log`, every release through `ReleaseEntry`), and the crash
endpoint's `unknown_version` flag. A bad file is skipped with a warning, never
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
| `votes` | Roadmap votes (one row per vote); `voter_hash` is an HMAC of the voter's network + poll id. See "Community voting". |

## Configuration notes

- The Worker is `voidmech`. Production uses D1 `voidmech-site`; branch builds are Worker
  Previews that use D1 `voidmech-site-preview` and separate rate-limit namespaces, declared
  in the `previews` block of `wrangler.jsonc` (Previews inherit nothing from production).
  See README "Deploys".
- R2 binding `MEDIA` (bucket `voidmech`, shared by production and previews) holds the
  home hero clips. They are served by `/media/:file`, not static assets, because static
  assets ignore `Range` and Safari/iOS will not play video without `206` responses. Keys
  carry a content hash and are cached as immutable; encode and upload steps are in
  `content/marketing-assets/web/README.md`.
- Rate-limit bindings in `wrangler.jsonc`: `FORM_LIMITER` (per IP, forms), `GAME_LIMITER` (per IP, game),
  `CRASH_LIMITER` (global, crash reports), `READ_LIMITER` (per IP, poll state reads); each has a separate counter for previews.
- Secrets: `TURNSTILE_SECRET_KEY`, `GAME_CLIENT_KEY`, `VOTE_SALT`. Local values live in
  `.dev.vars` (copied from `.dev.vars.example`); production values via
  `wrangler secret put`; preview values via `wrangler preview base-config secret put`.
- The public Turnstile site key is a build-time Vite variable (`VITE_TURNSTILE_SITE_KEY`
  in `.env.development` / `.env.production`).
- After changing bindings, run `npm run cf-typegen` so `worker-configuration.d.ts` stays
  in sync; CI fails if it drifts.
- TypeScript is strict with `noUnusedLocals/Parameters`; `npx tsc --noEmit` must stay clean.
- Path aliases `#/*` and `@/*` both map to `src/*`; code uses `#/`.
