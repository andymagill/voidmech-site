# Architecture

VoidMech's public site: three marketing pages plus a small submissions API.
TanStack Start (React 19, file-based routing, SSR) runs on a Cloudflare Worker;
submissions are stored in Cloudflare D1.

## Entry points

| Entry | Role |
| --- | --- |
| `@tanstack/react-start/server-entry` | Worker `main` (see `wrangler.jsonc`); handles SSR and `/api/*` |
| `src/router.tsx` | `getRouter()`: builds a fresh router per request |
| `src/routes/__root.tsx` | HTML shell: head tags, header, alpha banner, footer, submission modals |
| `src/routeTree.gen.ts` | **Generated** by the router plugin/`npm run generate-routes`; never edit |

## Layout

```
src/
  routes/
    __root.tsx            document shell + global chrome
    index.tsx             /          hero, core systems, FAQ
    download.tsx          /download  itch.io CTA, build details, support cards
    roadmap.tsx           /roadmap   milestones, vote UI (not wired up), FAQ
    api/submissions/
      newsletter.ts       POST /api/submissions/newsletter
      feedback.ts         POST /api/submissions/feedback
      bug-report.ts       POST /api/submissions/bug-report
  lib/
    submissions.ts        validation + D1 insert shared by all three endpoints
    utils.ts              `cn()` class-name helper
  content/
    site-content.ts       all page copy, screenshots and external links
  components/
    Header / Footer / AlphaNotice / Logo     global chrome
    ScreenshotFigure.tsx  thumbnail + lightbox
    SubmissionModals.tsx  newsletter / feedback / bug-report dialogs
    ui/                   shadcn-style primitives (button, input, label,
                          textarea, section-heading, bullet-list)
  styles.css              Tailwind v4 entry + `--vm-*` design tokens, `.vm-*` classes
migrations/               D1 schema (squashed until production; see README)
content/                  authoring source material (markdown drafts, marketing PNGs)
```

## Data flows

**Page content.** Routes import copy and images from `content/site-content.ts`.
Screenshots resolve from `content/marketing-assets/` via `new URL(..., import.meta.url)`,
so only files referenced there ship in the build.

**Submission modals.** Modals are driven by the URL hash. Any page opens one
with `<a href="#feedback">` (`#newsletter`, `#feedback`, `#bug-report`).
`ModalShell` listens to `hashchange`; closing clears the hash.
`SubmissionForm` posts every named form field as JSON with `source: "site_modal"`,
shows API errors inline, and closes the modal on success.

**Submissions API.**
`route → handleSubmissionRequest(kind, request)` → read body (16 KB cap, must be a
JSON object) → `buildSubmissionRecord` (throws `SubmissionError` → 4xx) →
`INSERT` into `submissions` (failure → logged, generic 500).
Responses: `201 {ok, kind, createdAt}` or `{error}`.

The D1 binding is read from `env` in `cloudflare:workers`. Do **not** read it from
the route handler `context`: that is an empty object under
`@cloudflare/vite-plugin`, which previously made every submission fail with 500.

## Configuration notes

- `wrangler.jsonc` `d1_databases[0].database_id` is still `REPLACE_WITH_D1_DATABASE_ID`;
  set it (and apply migrations remotely) before deploying.
- After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` so
  `worker-configuration.d.ts` (`Env.DB`) stays in sync.
- TypeScript is strict with `noUnusedLocals/Parameters`; `npx tsc --noEmit` must stay clean.
- Path aliases `#/*` and `@/*` both map to `src/*`; code uses `#/`.

## Known gaps

- The roadmap "Cast vote" button and radios are UI only; nothing is submitted.
- `buildDetails` on the download page still holds placeholder version/date text.
- No automated tests exist; the API was verified manually against local D1.
