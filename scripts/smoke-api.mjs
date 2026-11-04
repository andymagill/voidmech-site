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
// A poll id from src/content/polls.ts (this script is plain JS and can't import it).
const pollId = 'next-feature-1'
const firstOption = 'station-economy'

const results = []

async function check(name, { kind = 'feedback', path, method = 'POST', headers, body, raw }, expect) {
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
    const response = await fetch(`${base}${path ?? `/api/submissions/${kind}`}`, init)
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

  const expected = [expect.status].flat()
  const ok = expected.includes(status) && (!expect.data || expect.data(data))
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(status).padEnd(3)}  ${name}${ok ? '' : `  (expected ${expected.join(' or ')}) ${JSON.stringify(data)}`}`)
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

// Game endpoint: no client key is configured here, so these stop before any write.
await check('crash-report: text/plain → 415', { kind: 'crash-report', headers: { 'content-type': 'text/plain' }, raw: '{}' }, { status: 415 })
await check('crash-report: 40 KB body → 413', { kind: 'crash-report', body: { log_tail: 'x'.repeat(40_000) } }, { status: 413 })
await check('crash-report: no client key → 401', { kind: 'crash-report', headers: { origin: null }, body: { version: '0.0.0' } }, { status: 401 })

// Voting. None of these write: each stops at a guard, a lookup or a read.
const votes = `/api/votes/${pollId}`
await check('votes: unknown poll GET → 404', { path: '/api/votes/nope', method: 'GET' }, { status: 404 })
await check('votes: unknown poll POST → 404', { path: '/api/votes/nope', body: {} }, { status: 404 })
await check('votes: poll state → 200', { path: votes, method: 'GET' }, {
  status: 200,
  data: (d) => d?.poll?.id === pollId && typeof d?.voter?.hasVoted === 'boolean' && ('results' in d),
})
await check('votes: no Origin → 403', { path: votes, headers: { origin: null }, body: { option_id: firstOption } }, { status: 403 })
await check('votes: text/plain → 415', { path: votes, headers: { 'content-type': 'text/plain' }, raw: '{}' }, { status: 415 })
await check('votes: missing Turnstile token → 400', { path: votes, body: { option_id: firstOption } }, { status: 400 })

if (local) {
  const email = `${runId}@example.com`
  const isCreated = (kind) => (data) => data?.ok === true && data?.kind === kind

  await check('newsletter → 201', { kind: 'newsletter', body: { email, [`cf-turnstile-response`]: token } }, { status: 201, data: isCreated('newsletter') })
  await check('duplicate newsletter → 201', { kind: 'newsletter', body: { email: email.toUpperCase(), 'cf-turnstile-response': token } }, { status: 201, data: isCreated('newsletter') })
  await check('newsletter bad email → 400', { kind: 'newsletter', body: { email: 'nope', 'cf-turnstile-response': token } }, { status: 400 })
  await check('feedback → 201', { body: { topic: runId, message: `${runId} feedback`, 'cf-turnstile-response': token } }, { status: 201, data: isCreated('feedback') })
  await check('honeypot filled → fake 201', { kind: 'newsletter', body: { email: `bot-${email}`, website: 'http://spam', 'cf-turnstile-response': token } }, { status: 201, data: (d) => d?.ok === true && !d.kind })
  await check('bug report, summary only → 201', { kind: 'bug-report', body: { summary: `${runId} bug`, 'cf-turnstile-response': token } }, { status: 201, data: isCreated('bug_report') })

  // Voting writes one row per voter and poll, and the local database is not reset between runs:
  // on a re-run within the cooldown the first vote is refused with 429 instead.
  const voteBody = { option_id: firstOption, 'cf-turnstile-response': token }
  await check('votes: unknown option → 400', { path: votes, body: { option_id: 'nope', 'cf-turnstile-response': token } }, { status: 400 })
  await check('votes: vote → 201 (429 on a re-run)', { path: votes, body: voteBody }, {
    status: [201, 429],
    data: (d) => d?.voter?.hasVoted === true && d?.results?.total >= 1,
  })
  await check('votes: second vote inside the cooldown → 429', { path: votes, body: voteBody }, {
    status: 429,
    data: (d) => d?.code === 'cooldown' && d?.results?.total >= 1,
  })
  await check('votes: voter now sees results', { path: votes, method: 'GET' }, {
    status: 200,
    data: (d) => d?.voter?.hasVoted === true && d?.voter?.canVote === false && d?.results !== null,
  })

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
