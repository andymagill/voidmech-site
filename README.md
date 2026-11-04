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

CI (`.github/workflows/deploy.yml`) runs these on every push and pull request,
plus a check that `worker-configuration.d.ts` matches `wrangler types`.
After changing bindings in `wrangler.jsonc` or secrets in `.dev.vars.example`,
run `npm run cf-typegen` and commit the result.

## First deploy

Everything except two dashboard steps can be done with wrangler.

1. **Turnstile widget** (dashboard: Turnstile → Add widget). Add the hostname
   `voidmech-site.<your-subdomain>.workers.dev` (and any later custom domain), mode
   "Managed". Put the **site key** in `.env.production` (`VITE_TURNSTILE_SITE_KEY`); it
   is public and committed. Keep the **secret key** for step 4.
2. **API token for CI** (dashboard: My Profile → API Tokens → Create token). Start from
   the "Edit Cloudflare Workers" template and add **Account → D1 → Edit**. Note your
   account ID.
3. **Database**:
   ```bash
   npx wrangler login
   npx wrangler d1 create voidmech-site
   ```
   Paste the printed `database_id` into `wrangler.jsonc`.
4. **Worker secrets** (each prompts for the value):
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY   # from step 1
   npx wrangler secret put GAME_CLIENT_KEY        # any long random string; also baked into the game
   npx wrangler secret put VOTE_SALT              # any long random string; never change it mid-poll
   ```
   If the Worker does not exist yet, wrangler offers to create it.
5. **GitHub secrets** (repo → Settings → Secrets and variables → Actions):
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
6. Push to `main`. CI applies migrations to the remote database and deploys. Until the
   `CLOUDFLARE_API_TOKEN` secret exists, the deploy job is skipped.

To deploy by hand instead: `npx wrangler d1 migrations apply voidmech-site --remote`
then `npm run deploy`.

## Database migrations

Until the production database holds data worth keeping, squash schema changes into
`migrations/0001_initial.sql` and recreate the database when it changes. **Once the
first remote migration has run, stop squashing:** add incremental migrations
(`0002_*`, ...) instead, since D1 only applies migration files it has not seen.

Inspect data with wrangler, for example:

```bash
npx wrangler d1 execute voidmech-site --remote --command "SELECT kind, COUNT(*) FROM submissions GROUP BY kind"
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): file layout, entry points, data flows.
- [docs/PLAN.md](docs/PLAN.md): pending work by phase and the remaining test plan.
