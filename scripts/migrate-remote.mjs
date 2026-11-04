#!/usr/bin/env node
/**
 * Applies pending D1 migrations to the remote database that matches the branch
 * being built by Cloudflare Workers Builds, so the Deploy and Preview commands
 * can stay at Cloudflare's defaults (`wrangler deploy` / `wrangler preview`).
 *
 *   production branch (`main`) → voidmech-site          (what `wrangler deploy` ships)
 *   any other branch           → voidmech-site-preview  (what `wrangler preview` uses)
 *
 * Runs as the last step of `npm run build:cloudflare`, after the build succeeds,
 * so a failed build never touches the database. Outside Workers Builds
 * (no `WORKERS_CI`) it does nothing, so a local run cannot migrate a remote
 * database by accident. Use `--dry-run` to print the command instead.
 *
 * Migrations should be additive (new tables/columns) so the previous deploy keeps
 * working until the new one is live.
 */
import { spawnSync } from 'node:child_process'

const PRODUCTION_BRANCH = 'main'
const dryRun = process.argv.includes('--dry-run')

if (process.env.WORKERS_CI !== '1' && !dryRun) {
  console.log('Not a Workers Build (WORKERS_CI is not set); skipping remote D1 migrations.')
  process.exit(0)
}

const branch = process.env.WORKERS_CI_BRANCH
if (!branch) {
  console.error('WORKERS_CI_BRANCH is not set; cannot tell which database to migrate.')
  process.exit(dryRun ? 0 : 1)
}

const production = branch === PRODUCTION_BRANCH
const args = production
  ? ['wrangler', 'd1', 'migrations', 'apply', 'voidmech-site', '--remote']
  : [
      'wrangler', 'd1', 'migrations', 'apply', 'voidmech-site-preview', '--remote',
      '--config', 'wrangler.preview-migrations.jsonc',
    ]

console.log(`Branch "${branch}" → ${production ? 'production' : 'preview'} database`)
console.log(`> npx ${args.join(' ')}`)
if (dryRun) process.exit(0)

const result = spawnSync('npx', args, { stdio: 'inherit', shell: true })
process.exit(result.status ?? 1)
