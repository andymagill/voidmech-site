# VoidMech Site

Official landing site for VoidMech, built with TanStack Start and Cloudflare Workers.

## Stack

- TanStack Start, React, Vite
- Cloudflare Workers, D1, Turnstile, Workers Rate Limiting
- Tailwind CSS with shadcn-style UI primitives
- Vitest for unit tests; GitHub Actions for CI and deploys

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars        # local Worker secrets (Turnstile test keys)
npx wrangler d1 migrations apply voidmech-site --local
npm run dev
```

`.env.development` and `.dev.vars.example` use Cloudflare's always-pass Turnstile
test keys, so forms work locally without a real widget.

If you had a local database from before the schema was squashed, delete
`.wrangler/state/v3/d1` and apply migrations again.

## Checks

```bash
npx tsc --noEmit   # type check
npm test           # unit tests
npm run build
```

To test the real production bundle (dev mode can hide Worker-only failures):

```bash
npx vite preview --port 4173                                # after npm run build
node scripts/smoke-api.mjs http://localhost:4173 --local    # in another terminal
```

After a deploy, `node scripts/smoke-api.mjs <workers.dev URL>` (no `--local`) runs only
checks that write nothing.

CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull
request, plus a check that `worker-configuration.d.ts` matches `wrangler types`.
It does not deploy. After changing bindings in `wrangler.jsonc` or secrets in
`.dev.vars.example`, run `npm run cf-typegen` and commit the result.

## Deploys

Cloudflare Workers Builds (the Worker's GitHub integration) builds every push.
Set these in the dashboard (Worker → Settings → Build):

| Setting | Value |
| --- | --- |
| Build command | `npm run build:cloudflare` |
| Deploy command | default (`npx wrangler deploy`), runs for the production branch `main` |
| Preview command | default (`npx wrangler preview`); enable Branch control → Preview Builds |

`wrangler deploy` and `wrangler preview` only upload the Worker; neither applies D1
migrations. So the Build command does the extra work, in this order:
`scripts/check-deploy-config.mjs` (fails on setup placeholders or a Turnstile test key)
→ `vite build` → `scripts/migrate-remote.mjs`, which uses the `WORKERS_CI_BRANCH`
variable Workers Builds provides to migrate `voidmech-site` for `main` and
`voidmech-site-preview` for every other branch. It runs after the build succeeds, so a
failed build never touches a database, and does nothing outside Workers Builds. Write
migrations to be additive (new tables or columns) so the live version keeps working
until the new one deploys. Both default commands read the Vite plugin's generated
config (`dist/server/wrangler.json`, found through `.wrangler/deploy/config.json`),
which includes the `previews` block.

Branch builds use [Worker Previews](https://developers.cloudflare.com/workers/previews/)
(open beta): a stable URL per branch, `<branch>-voidmech.<subdomain>.workers.dev`. A
Preview **inherits nothing from production**, so everything it needs is declared in the
`previews` block of `wrangler.jsonc`:

- **Data:** the `voidmech-site-preview` D1 database (not production's), so preview
  submissions never touch real rows.
- **Rate limits:** separate counters (`namespace_id` 2001/2002).
- **Secrets:** separate from production; set with
  `npx wrangler preview base-config secret put <NAME>`. Base secrets apply only to
  Previews created *after* they are set.

`wrangler.preview-migrations.jsonc` exists only so `migrations apply` can target the
staging database (it reads the top-level `d1_databases`); keep its id in sync with the
`previews` block. After a deploy, `node scripts/smoke-api.mjs <url>` runs checks that
write nothing. The API token used by Workers Builds needs **Account → D1 → Edit**.

## First deploy

The Worker is `voidmech`. Databases `voidmech-site` (production) and
`voidmech-site-preview` (previews) exist with the schema applied; their ids are in
`wrangler.jsonc`.

1. **Turnstile widget** (dashboard: Turnstile → Add widget, mode "Managed"). Type the
   hostname `<subdomain>.workers.dev` (it covers the production URL and every preview
   URL), plus any later custom domain. Put the **site key** in `.env.production`
   (`VITE_TURNSTILE_SITE_KEY`); it is public and committed. The Cloudflare build refuses
   Cloudflare's test keys (`npm run check:config`).
2. **Secrets**, from your own terminal (each prompts for the value). Production and
   previews are separate stores:
   ```bash
   # production
   npx wrangler secret put TURNSTILE_SECRET_KEY   # secret key from step 1
   npx wrangler secret put GAME_CLIENT_KEY        # long random string, also baked into the game (crash reports)
   npx wrangler secret put VOTE_SALT              # long random string (e.g. openssl rand -hex 32); never change it mid-poll
   # previews (same names; use different values for GAME_CLIENT_KEY and VOTE_SALT)
   npx wrangler preview base-config secret put TURNSTILE_SECRET_KEY
   npx wrangler preview base-config secret put GAME_CLIENT_KEY   # a different value from production
   npx wrangler preview base-config secret put VOTE_SALT         # a different value from production
   ```
3. **Workers Builds commands** as in the table above.

To deploy by hand instead: `npx wrangler d1 migrations apply voidmech-site --remote`, then `npm run build && npx wrangler deploy`.

## Database migrations

Until the production database holds data worth keeping, schema changes may be squashed
into `migrations/0001_initial.sql` by recreating both remote databases. **`0001` has
already been applied remotely, so prefer incremental migrations (`0002_*`, ...)**: D1
only applies migration files it has not seen. Both deploy scripts apply pending
migrations to their database (`voidmech-site` for `main`, `voidmech-site-preview` for
branches), so each new file reaches staging first.

Inspect data with wrangler, for example:

```bash
npx wrangler d1 execute voidmech-site --remote --command "SELECT kind, COUNT(*) FROM submissions GROUP BY kind"
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): file layout, entry points, data flows.
- [docs/PLAN.md](docs/PLAN.md): pending work by phase and the remaining test plan.
- [docs/integrations/crash-reports.md](docs/integrations/crash-reports.md): API contract and client rules for the game's crash reporter.
- [docs/integrations/release-notes.md](docs/integrations/release-notes.md): how a game release tag becomes patch notes here.
