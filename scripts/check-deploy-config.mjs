#!/usr/bin/env node
/**
 * Fails when the build config is not safe to ship: setup placeholders left in,
 * or a Turnstile test key in a production-mode build.
 *
 * Runs first in `npm run build:cloudflare` (Workers Builds) and in CI. It checks
 * the key the build will actually use: a `VITE_TURNSTILE_SITE_KEY` environment
 * variable (for example a Workers Builds variable) overrides `.env.production`,
 * the same way Vite resolves it.
 */
import { readFileSync } from 'node:fs'

const files = ['wrangler.jsonc', 'wrangler.preview-migrations.jsonc', '.env.production']
const problems = []

for (const file of files) {
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (line.includes('REPLACE_WITH_')) problems.push(`${file}:${index + 1}: placeholder: ${line.trim()}`)
    })
}

// Cloudflare's published Turnstile test sitekeys (1x/2x/3x + 20 zeros...) always pass or
// always fail, so a deployed form protected by one is effectively unprotected.
const fromFile = readFileSync('.env.production', 'utf8').match(/^VITE_TURNSTILE_SITE_KEY=(.*)$/m)?.[1]
const key = (process.env.VITE_TURNSTILE_SITE_KEY ?? fromFile ?? '').trim()
if (!key) {
  problems.push('VITE_TURNSTILE_SITE_KEY is missing (.env.production)')
} else if (/^[123]x0{20}/.test(key)) {
  problems.push(`VITE_TURNSTILE_SITE_KEY is a Turnstile test key (${key}); use a real widget's site key`)
}

if (problems.length) {
  console.error('Build config check failed:')
  for (const problem of problems) console.error(`  ${problem}`)
  console.error('See README "Deploys" and "First deploy".')
  process.exit(1)
}

console.log('Build config check OK.')
