#!/usr/bin/env node
/**
 * Fails when deploy config still holds setup placeholders, so a build with
 * no database id or a fake Turnstile site key never goes live.
 * Runs first in `npm run deploy:production` and `npm run deploy:preview`.
 */
import { readFileSync } from 'node:fs'

const files = ['wrangler.jsonc', '.env.production']
const problems = []

for (const file of files) {
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (line.includes('REPLACE_WITH_')) problems.push(`${file}:${index + 1}: ${line.trim()}`)
    })
}

if (problems.length) {
  console.error('Deploy blocked: fill in these placeholders first (README "First deploy"):')
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log('Deploy config has no placeholders.')
