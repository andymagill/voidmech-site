#!/usr/bin/env node
/**
 * Fails when deploy config is not safe to ship.
 *
 *   node scripts/check-deploy-config.mjs               placeholders only (previews)
 *   node scripts/check-deploy-config.mjs --production  also rejects Turnstile test keys
 *
 * Runs first in `npm run deploy:preview` and `npm run deploy:production`.
 */
import { readFileSync } from 'node:fs'

const production = process.argv.includes('--production')
const files = ['wrangler.jsonc', 'wrangler.preview-migrations.jsonc', '.env.production']
const problems = []

for (const file of files) {
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (line.includes('REPLACE_WITH_')) problems.push(`${file}:${index + 1}: placeholder: ${line.trim()}`)
    })
}

if (production) {
  // Cloudflare's published Turnstile test sitekeys (1x/2x/3x + 20 zeros...) always pass or
  // always fail, so a production form protected by one is effectively unprotected.
  const env = readFileSync('.env.production', 'utf8')
  const key = env.match(/^VITE_TURNSTILE_SITE_KEY=(.*)$/m)?.[1]?.trim() ?? ''
  if (!key) {
    problems.push('.env.production: VITE_TURNSTILE_SITE_KEY is missing')
  } else if (/^[123]x0{20}/.test(key)) {
    problems.push(`.env.production: VITE_TURNSTILE_SITE_KEY is a Turnstile test key (${key})`)
  }
}

if (problems.length) {
  console.error('Deploy blocked:')
  for (const problem of problems) console.error(`  ${problem}`)
  console.error('See README "Deploys" and "First deploy".')
  process.exit(1)
}

console.log(`Deploy config OK${production ? ' (production checks)' : ''}.`)
