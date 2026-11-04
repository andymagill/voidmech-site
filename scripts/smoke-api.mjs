#!/usr/bin/env node
/**
 * HTTP smoke test for the submissions API.
 *
 *   node scripts/smoke-api.mjs http://localhost:3000 --local   # dev server or `vite preview`
 *   node scripts/smoke-api.mjs https://voidmech.<sub>.workers.dev
 *
 * Without --local only checks that never write to D1 run, so it is safe
 * against production. --local adds real submissions; they rely on the
 * always-pass Turnstile test secret in .dev.vars. Rows are tagged with the
 * printed run id so you can find them in D1 afterwards.
 *
 * Exit code 1 if any check fails.
 */

const args = process.argv.slice(2)
const base = (args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:3000').replace(/\/$/, '')
const local = args.includes('--local')
const runId = `smoke-${Date.now()}`
// Turnstile's documented dummy token; only the test secret accepts it.
const token = 'XXXX.DUMMY.TOKEN.XXXX'

const results = []

async function check(name, { kind = 'feedback', method = 'POST', headers, body, raw }, expect) {
  const init = {
    method,
    headers: { 'content-type': 'application/json', origin: base, ...headers },
  }
  if (method !== 'GET') init.body = raw ?? JSON.stringify(body ?? {})
  // Drop headers explicitly set to null (e.g. to send no Origin at all).
  for (const [key, value] of Object.entries(init.headers)) if (value === null) delete init.headers[key]

  let status
  let data
  try {
    const response = await fetch(`${base}/api/submissions/${kind}`, init)
    status = response.status
    const text = await response.text()
    try {
      data = JSON.parse(text)
    } catch {
      data = text.slice(0, 80)
    }
  } catch (error) {
    status = `network error: ${error.message}`
  }

  const ok = status === expect.status && (!expect.data || expect.data(data))
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(status).padEnd(3)}  ${name}${ok ? '' : `  (expected ${expect.status}) ${JSON.stringify(data)}`}`)
  return status
}

console.log(`Smoke testing ${base} (${local ? 'local, with writes' : 'read-only'}), run id ${runId}\n`)

// Checks that never write to D1.
await check('unknown kind → 404', { kind: 'nope' }, { status: 404 })
await check('GET → 405', { method: 'GET' }, { status: 405 })
await check('foreign Origin → 403', { headers: { origin: 'https://evil.example' }, body: { message: 'x' } }, { status: 403 })
await check('no Origin → 403', { headers: { origin: null }, body: { message: 'x' } }, { status: 403 })
await check('text/plain → 415', { headers: { 'content-type': 'text/plain' }, raw: '{}' }, { status: 415 })
await check('20 KB body → 413', { body: { message: 'x'.repeat(20_000) } }, { status: 413 })
await check('invalid JSON → 400', { raw: '{nope' }, { status: 400 })
await check('missing Turnstile token → 400', { body: { message: 'x' } }, { status: 400 })

if (local) {
  const email = `${runId}@example.com`
  const isCreated = (kind) => (data) => data?.ok === true && data?.kind === kind

  await check('newsletter → 201', { kind: 'newsletter', body: { email, [`cf-turnstile-response`]: token } }, { status: 201, data: isCreated('newsletter') })
  await check('duplicate newsletter → 201', { kind: 'newsletter', body: { email: email.toUpperCase(), 'cf-turnstile-response': token } }, { status: 201, data: isCreated('newsletter') })
  await check('newsletter bad email → 400', { kind: 'newsletter', body: { email: 'nope', 'cf-turnstile-response': token } }, { status: 400 })
  await check('feedback → 201', { body: { topic: runId, message: `${runId} feedback`, 'cf-turnstile-response': token } }, { status: 201, data: isCreated('feedback') })
  await check('honeypot filled → fake 201', { kind: 'newsletter', body: { email: `bot-${email}`, website: 'http://spam', 'cf-turnstile-response': token } }, { status: 201, data: (d) => d?.ok === true && !d.kind })
  await check('bug report, summary only → 201', { kind: 'bug-report', body: { summary: `${runId} bug`, 'cf-turnstile-response': token } }, { status: 201, data: isCreated('bug_report') })

  // FORM_LIMITER allows 5/min per endpoint and IP; bug-report has used 1.
  const statuses = []
  for (let attempt = 0; attempt < 6; attempt++) {
    statuses.push(await check(`bug report burst #${attempt + 1}`, { kind: 'bug-report', body: { summary: `${runId} burst`, 'cf-turnstile-response': token } }, { status: attempt < 4 ? 201 : 429 }))
  }

  console.log(`\nRows to expect in D1 (tagged ${runId}): 1 newsletter, 1 feedback, 5 bug reports; none for the honeypot.`)
  console.log(`  npx wrangler d1 execute voidmech-site --local --command "SELECT kind, email, subject FROM submissions WHERE subject LIKE '${runId}%' OR email LIKE '%${runId}%'"`)
  console.log('Rate limits are per minute: wait 60s before re-running against the same server.')
}

const failed = results.filter((ok) => !ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
