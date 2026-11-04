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

| Branch | Build command | Deploy command | What deploy does |
| --- | --- | --- | --- |
| `main` (production) | `npm run build` | `npm run deploy:production` | placeholder check → remote D1 migrations → `wrangler deploy` |
| other branches | `npm run build` | `npm run deploy:preview` (non-production branch deploy command) | placeholder check → `wrangler versions upload`; production is untouched |

Branch previews are served at `<branch>-voidmech-site.<subdomain>.workers.dev`. They
share production's bindings and secrets, including the D1 database; until launch that
data is disposable. After a deploy, `node scripts/smoke-api.mjs <url>` runs checks that
write nothing.

If the migration step fails with an authorization error, give the Workers Builds API
token **Account → D1 → Edit**.

## First deploy

The database already exists (`voidmech-site`, id in `wrangler.jsonc`, schema applied).

1. **Turnstile widget** (dashboard: Turnstile → Add widget, mode "Managed"). Hostnames:
   `voidmech-site.<subdomain>.workers.dev` plus each branch preview hostname you test on
   (and any later custom domain). Put the **site key** in `.env.production`
   (`VITE_TURNSTILE_SITE_KEY`); it is public and committed.
2. **Worker secrets**, from your own terminal (each prompts for the value):
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY   # Turnstile secret key from step 1
   npx wrangler secret put GAME_CLIENT_KEY        # Phase 2: long random string, also baked into the game
   npx wrangler secret put VOTE_SALT              # Phase 3: long random string; never change it mid-poll
   ```
3. **Workers Builds commands** as in the table above.

To deploy by hand instead: `npm run build && npm run deploy:production`.

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
