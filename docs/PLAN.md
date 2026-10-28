# Plan: pending work

Tracks follow-ups found during the stabilization audit. Update the status column
as items land; delete rows once merged and no longer informative.

Status: `todo` · `doing` · `done` · `decision` (needs a product call first)

## 1. Launch blockers

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| B1 | Create the production D1 database and set `database_id` in `wrangler.jsonc` | todo | Currently `REPLACE_WITH_D1_DATABASE_ID`. Then `wrangler d1 migrations apply voidmech-submissions --remote` and `npm run cf-typegen`. |
| B2 | Fill in download page build details | todo | `buildDetails` in `src/content/site-content.ts` still shows `[version placeholder]` / `[date placeholder]`. |
| B3 | Roadmap vote UI | decision | "Cast vote" button and radios in `src/routes/roadmap.tsx` submit nothing. Either remove them, or add a `vote` submission kind (migration + endpoint + form wiring). Visitors currently get no feedback when clicking. |

## 2. Hardening

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| H1 | Abuse protection on `/api/submissions/*` | todo | Endpoints are unauthenticated and unthrottled. Options: Cloudflare rate-limiting rule, Turnstile on the modals, or a honeypot field. Pick one before launch. |
| H2 | Duplicate newsletter sign-ups | todo | Same email can be inserted repeatedly. Needs a partial unique index on `(email) WHERE kind = 'newsletter'` (squash into `0001` while pre-production) and `INSERT OR IGNORE`/conflict handling that still returns 201. |
| H3 | Success feedback in modals | todo | On success the modal just closes. Show a short confirmation (and move focus somewhere sensible) so users know it was sent. |
| H4 | Modal focus trap | todo | `ModalShell` focuses the dialog and handles Escape, but Tab can still reach the page behind it. `ScreenshotFigure`'s lightbox traps Tab; reuse one approach for both. |
| H5 | Body-size check uses characters, not bytes | todo | `readPayload` caps `raw.length`. Fine as a coarse guard; switch to `Content-Length`/byte count if a stricter limit matters. |
| H6 | Observability | todo | `console.error` goes to Workers Logs (enabled in `wrangler.jsonc`). Add an alert or a periodic check on 5xx from the submissions routes. |

## 3. Cleanup and consistency

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| C1 | Heading structure | todo | `Header` renders the logo as `<h2>` and pages start at `<h1>` below it. Make the logo a non-heading. |
| C2 | Import style | todo | `__root.tsx` uses relative imports; the rest use `#/`. Pick one (the codebase mostly uses `#/`). |
| C3 | Repeated colour literals | todo | `rgba(225,230,232,0.xx)` and `rgba(10,20,32,0.8)` appear across routes. Promote to tokens in `src/styles.css`. |
| C4 | Unused tooling config | todo | `components.json` (`rsc: true`, `lucide` icon set that isn't installed) and `.cta.json` are scaffold leftovers; confirm and trim. |
| C5 | Content duplication | todo | Copy lives in both `content/*.md` and `src/content/site-content.ts`. Decide which is the source of truth, or generate one from the other. |
| C6 | Unreferenced marketing PNGs | decision | `vm_fight_02/04/07/23`, `vm_station_traffic_01`, `vm_ui_*` and `vm_editor_scout_01` are no longer imported. Keep as source assets or move out of the repo (large binaries). |

## 4. Tests

The repo has no test runner. Recommended setup: **Vitest** for unit and API tests
(already Vite-based, so config is minimal) and **Playwright** for a small set of
browser flows. Add `npm test` and run `tsc --noEmit` + tests in CI.

### 4.1 Unit tests: `src/lib/submissions.ts` (highest value)

Export `buildSubmissionRecord` (or test through `handleSubmissionRequest` with a
fake `D1Database`) and cover:

- **Newsletter:** valid email is lowercased and trimmed; missing, blank, malformed, and >254-char emails are rejected with 400; `source` is truncated at 80 chars.
- **Feedback:** blank/whitespace/non-string `message` rejected; message truncated at 1500; optional email accepted when blank, rejected when malformed; `topic` becomes `subject`.
- **Bug report:** `summary` required and capped at 220; `message` falls back to `summary` when `details` is blank; severity/platform capped at 40/120; metadata keys are always present (null when absent).
- **Body parsing:** invalid JSON, empty body, `null`, array, number, and string bodies all return 400; a body over 16K chars returns 413.
- **Persistence:** success returns 201 with `{ok, kind, createdAt}` and binds the six columns in order; a throwing `run()` returns 500 with a generic message and does not leak the underlying error; a missing `env.DB` returns 500.

Mock `cloudflare:workers` (`vi.mock`) to supply `env.DB`.

### 4.2 Integration test: API against local D1

Use `@cloudflare/vitest-pool-workers` (or `wrangler dev --local` plus `fetch`) with
migrations applied, to guard against the regression found in the audit
(binding unreachable, every request 500):

- POST valid payload to each of the three routes, then `SELECT` and assert the row (kind, email, subject, `metadata_json`).
- Assert the `CHECK(kind IN (...))` constraint and `NOT NULL message` hold.
- Non-POST methods return 404/405 rather than crashing.

### 4.3 Component tests: `SubmissionModals`

Vitest + React Testing Library + jsdom, mocking `fetch`:

- Setting `location.hash` to `#feedback` opens that modal and sets `body` overflow hidden; clearing it closes and restores overflow.
- Escape, backdrop click, and the Close button each clear the hash.
- Submitting posts the named fields plus `source: "site_modal"` to the right endpoint.
- While in flight the submit button is disabled and a second submit is ignored.
- A 400 `{error}` response renders inline in a `role="alert"` and keeps the modal open with field values intact.
- A network failure (`fetch` rejects) shows the generic network message.
- Success resets the form and closes the modal.
- Modals switch correctly via the in-modal links (`#feedback` ↔ `#bug-report`).

### 4.4 Component tests: smaller pieces

- `ScreenshotFigure`: click opens the lightbox, Escape and Close dismiss it, focus returns to the thumbnail, body scroll is restored.
- `BulletList`: renders one item per entry and applies the dot colour.
- `Header`: menu toggle sets `aria-expanded`; Escape closes it.

### 4.5 End-to-end (Playwright, 3–4 specs)

- Home → Download → Roadmap navigation; each page has exactly one `<h1>`.
- "Join newsletter" link on `/download` opens the modal, a valid email submits, and the row exists in local D1.
- Feedback → "Report a bug" switch, submit with only a summary.
- Mobile viewport: nav menu opens and closes; no horizontal scroll on any page.

### 4.6 Static checks to add to CI

- `npx tsc --noEmit`
- `npm run build`
- Check that `worker-configuration.d.ts` is current (`npm run cf-typegen` leaves no diff), which would have caught the missing `Env.DB`.

## Suggested order

1. B1, B2, B3 (launch blockers)
2. 4.1 + 4.2 (protect the API fix), wire into CI
3. H1, H2, H3
4. 4.3, then H4
5. Cleanup items and 4.4/4.5 as time allows
