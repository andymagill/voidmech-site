# Crash reports: contract for the game client

`POST https://<site>/api/submissions/crash-report` (production:
`https://voidmech.andymagill.workers.dev` until a custom domain exists).

The game is an untrusted client: anything in the binary, including the client key, can
be extracted. So the **server enforces every limit** (section "What the server does"),
and the rules in "What the game must do" exist so a *well-behaved* build stays far from
those limits and never annoys the player. They are not a security measure.

## Request

Headers:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` (UTF-8). Anything else gets 415. |
| `X-VoidMech-Client` | The client key (secret `GAME_CLIENT_KEY`; baked into the build). |

Body, a single JSON object of text. Total size must stay under **32 KB** (413 otherwise).
Truncate on the client to the limits below; the server truncates again.

| Field | Required | Limit | Notes |
| --- | --- | --- | --- |
| `version` | yes | 40 chars, `[0-9A-Za-z][0-9A-Za-z.+_-]*` | The release version, **identical to the git tag without the leading `v`** (e.g. `0.4.2-alpha`). It is matched against `content/releases/<version>.md`; a version with no release file is stored but flagged `unknown_version`. Rejected (400) if over-long or malformed, never truncated. |
| `install_id` | yes | 16-64 chars, `[A-Za-z0-9_-]` | Random per-install id (a UUID v4 is fine), generated on first opt-in and kept locally. The server stores only its hash. Used for de-duplication, never for tracking: do not derive it from hardware, the account or the user name. |
| `platform` | yes | 40 chars | e.g. `windows`. |
| `exception` | yes | 1000 chars | Exception type and message. Only its first line feeds the fingerprint. |
| `stack` | no | 8000 chars | One frame per line, innermost first. |
| `log_tail` | no | 8000 chars, **last** chars kept | End of the game log. |
| `build` | no | 80 chars | Commit hash or build id. |
| `os` | no | 120 chars | |
| `gpu` | no | 200 chars | |

Unknown fields are ignored and never stored. Do not send a fingerprint: it is computed
server-side (below).

```json
{
  "version": "0.4.2-alpha",
  "build": "abc1234",
  "install_id": "0b1f6c3e-8d0a-4f55-9c58-1d2a3b4c5d6e",
  "platform": "windows",
  "os": "Windows 11 10.0.26100",
  "gpu": "Intel(R) UHD Graphics",
  "exception": "NullReferenceException: Object reference not set",
  "stack": "at Ship.Update (%USERPROFILE%\\VoidMech\\Ship.cs:120)\nat World.Tick (World.cs:88)",
  "log_tail": "..."
}
```

## Responses

JSON `{ "ok": true }` on success, `{ "error": "..." }` otherwise.

| Status | Meaning | Client action |
| --- | --- | --- |
| 201 | Stored. | Delete the queued report. |
| 202 | Accepted, **not stored** (`"duplicate": true`): this install already reported this crash in the last 24 h. | Delete the queued report. |
| 400 | Missing or invalid field. | Delete it (retrying cannot help); log locally. |
| 401 | Unknown client key. | Delete it; stop uploading for this session. |
| 413 / 415 | Too large / not JSON. | Delete it; this is a client bug. |
| 429 | Rate limited (per IP, or the site-wide cap). Has `Retry-After` (seconds). | Keep it queued; do not retry before `Retry-After`. |
| 5xx, timeout, no network | Server or network trouble. | Keep it queued; retry on a later launch, with backoff. |

## What the server does (G1a)

1. **Guards, in order:** per-IP limit (10/min, `GAME_LIMITER`) → client key →
   **site-wide cap** (20/min total, `CRASH_LIMITER`, about 28.8k/day, inside D1's free
   100k writes/day). The cap is checked after the key so junk can't spend it. If its binding
   is ever missing the endpoint answers 503 rather than running uncapped.
2. **Strict schema:** required fields, identifiers validated whole (not truncated), text
   fields truncated, control characters removed, wrong types treated as absent.
3. **Fingerprint (server-side):** SHA-256 over the normalised first line of `exception`
   plus the first 12 `stack` lines, with directories, addresses and all digits removed, so
   the same bug groups across installs, versions and line-number changes. 32 hex chars.
4. **Per-install de-duplication:** an insert that is skipped atomically if the same
   `install_hash` + `fingerprint` exists from the last 24 h (answered 202).
5. **`unknown_version`:** set to 1 when `version` has no file in `content/releases`
   (modified or fabricated build, or notes not published yet), still stored; triage with
   `WHERE unknown_version = 0`.
6. Stored text is **never rendered** on the site or in any HTML.

Triage examples:

```bash
npx wrangler d1 execute voidmech-site --remote --command \
  "SELECT fingerprint, COUNT(*) n, COUNT(DISTINCT install_hash) installs, MAX(created_at) last_seen
   FROM crash_reports WHERE unknown_version = 0 GROUP BY fingerprint ORDER BY n DESC LIMIT 20"
```

## What the game must do (G1b)

Good-client behaviour. None of this is enforceable server-side, and all of it keeps the
player's trust.

1. **Opt-in.** Off until the player turns it on in settings (and ask once, plainly, after
   a crash). Provide an off switch and a way to regenerate `install_id`. Nothing is sent
   or queued while it is off.
2. **Queue, then upload next launch.** On a crash write the report to a local file and
   exit; never do network I/O inside the crash handler. Upload from a background task after
   the next start.
3. **Volume:** at most **1 report per fingerprint per session** and about **10 per day** per install.
   The server also drops repeats, but do not rely on that.
4. **Never block play.** Short timeout (about 5 s), no retries in a loop, no spinner, no
   upload during gameplay-critical moments.
5. **Respect the server.** On 429 wait at least `Retry-After`. On 5xx or network errors
   keep the report and retry on a later launch with growing delay; discard reports older
   than 7 days. Obey the 4xx table above.
6. **Scrub personal data before sending.** Replace the user's home directory in `stack`,
   `log_tail` and `exception` (`C:\Users\<name>` → `%USERPROFILE%`, `/home/<name>` → `~`),
   and do not log or send anything else personal (account names, emails, tokens, chat).
7. **HTTPS only.** Never downgrade, never follow redirects to another host.
8. **Truncate** to the limits above before sending; `log_tail` keeps the *end*.
9. **Version string:** send the exact release version (the tag without `v`).

## Operations

- Secret: `npx wrangler secret put GAME_CLIENT_KEY` (production) and
  `npx wrangler preview base-config secret put GAME_CLIENT_KEY` (previews, use a different value).
  If the key is abused, rotate it and ship it in the next build; old builds then get 401 and stop.
- Schema: `migrations/0002_crash_report_flags.sql` (adds `unknown_version` and the de-dup index).
- Code: `src/lib/endpoints/crash-report.ts`, `src/lib/crash-fingerprint.ts`, `globalRateLimit` in `src/lib/api/guards.ts`.
- Smoke test against a deployment (read-only, writes nothing): `node scripts/smoke-api.mjs <url>`.
