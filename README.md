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
cd voidmech-site
npm install
npm run dev
```

## Production build

```bash
cd voidmech-site
npm run build
```

## Database migrations

The site is pre-production and D1 is not connected yet, so the database is disposable. Until launch, squash schema changes into `migrations/0001_initial_submissions.sql` instead of stacking new numbered migrations, and recreate the database when the schema changes. Start adding incremental migrations (`0002_*`, ...) only once a production D1 database holds data worth keeping.

## Notes

This repository contains the public-facing game site shell, route structure, submission endpoints, and brand-aligned UI scaffolding.
