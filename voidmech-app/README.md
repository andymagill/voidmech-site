# VoidMech Official Site (TanStack Start + Cloudflare Workers)

This project is the initial website foundation for VoidMech:

- TanStack Start app for the site UI and routes
- Cloudflare Workers deployment target
- Cloudflare D1 persistence for player submissions
- Submission endpoints:
  - `POST /api/submissions/newsletter`
  - `POST /api/submissions/feedback`
  - `POST /api/submissions/bug-report`
- ShadCN-style UI primitives under `src/components/ui`

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Configure D1

1. Create the database:

   ```bash
   npx wrangler d1 create voidmech-submissions
   ```

2. Copy the returned `database_id` into `wrangler.jsonc`:
   - Replace `REPLACE_WITH_D1_DATABASE_ID`

3. Apply migrations:

   ```bash
   npx wrangler d1 migrations apply voidmech-submissions --local
   npx wrangler d1 migrations apply voidmech-submissions --remote
   ```

## Deploy

```bash
npx wrangler deploy
```

## Notes

- External links for Itch/Discord are set in:
  - `src/routes/index.tsx`
  - `src/components/Header.tsx`
  - `src/components/Footer.tsx`
- Update those URLs once final community/store URLs are confirmed.
