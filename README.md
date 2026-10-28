# VoidMech Site

Official landing site for VoidMech, built with TanStack Start and Cloudflare Workers.

## Stack

- TanStack Start
- React
- Vite
- Cloudflare Workers
- Cloudflare D1-ready submission endpoints
- Tailwind CSS with shadcn-style UI primitives

## Local development

```bash
npm install
npm run dev
```

Submissions need a local D1 table. Once, run:

```bash
npx wrangler d1 migrations apply voidmech-submissions --local
```

## Production build

```bash
npm run build
npx tsc --noEmit   # type check
```

## Database migrations

The site is pre-production and D1 is not connected yet, so the database is disposable. Until launch, squash schema changes into `migrations/0001_initial_submissions.sql` instead of stacking new numbered migrations, and recreate the database when the schema changes. Start adding incremental migrations (`0002_*`, ...) only once a production D1 database holds data worth keeping.

## Documentation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the file layout, entry points, and data flows.
Pending work and the recommended test plan are tracked in [docs/PLAN.md](docs/PLAN.md).
