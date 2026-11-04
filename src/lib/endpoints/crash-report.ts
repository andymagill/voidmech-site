import { defineEndpoint } from '#/lib/api/endpoint'
import { ApiError, json } from '#/lib/api/http'
import { gameClientGuards, globalRateLimit } from '#/lib/api/guards'
import { sha256Hex } from '#/lib/api/request'
import { crashFingerprint } from '#/lib/crash-fingerprint'
import { isKnownVersion, VERSION_PATTERN } from '#/lib/releases'

/**
 * POST /api/submissions/crash-report, sent by the game client. The contract,
 * including what the game must do, is docs/integrations/crash-reports.md.
 *
 * The client is untrusted (the key ships inside the binary), so every limit
 * is enforced here: strict field validation and truncation, a per-install
 * 24 h de-duplication, a global write cap, and a flag on versions that have
 * no release. Stored text is never rendered on the site.
 */

/** Text only, a few KB in practice; anything near this is not a crash report. */
const MAX_BYTES = 32 * 1024

/** A repeat of the same crash from the same install inside this window is dropped. */
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Random per-install id made by the game (a UUID is typical). */
const INSTALL_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

export type CrashRecord = {
  fingerprint: string
  version: string
  build: string | null
  platform: string
  os: string | null
  gpu: string | null
  exception: string
  stack: string | null
  logTail: string | null
  installHash: string
  unknownVersion: boolean
}

/** Control characters (except tab, newline) have no place in stored text. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g

/** Trimmed text of at most `max` characters, keeping the start (`head`) or the end (`tail`). */
function text(value: unknown, max: number, keep: 'head' | 'tail' = 'head'): string | null {
  if (typeof value !== 'string') return null
  const clean = value.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').trim()
  if (!clean) return null
  return keep === 'head' ? clean.slice(0, max) : clean.slice(-max)
}

function required(value: unknown, max: number, field: string): string {
  const result = text(value, max)
  if (!result) throw new ApiError(400, `${field} is required`)
  return result
}

/**
 * An identifier is validated whole, never truncated: cutting an over-long id
 * down would make different clients collide on the same stored value.
 */
function identifier(value: unknown, pattern: RegExp, field: string): string {
  const result = typeof value === 'string' ? value.trim() : ''
  if (!result) throw new ApiError(400, `${field} is required`)
  if (!pattern.test(result)) throw new ApiError(400, `${field} is not valid`)
  return result
}

export const crashReport = defineEndpoint<CrashRecord>({
  name: 'crash-report',
  maxBytes: MAX_BYTES,
  // Identify the caller first; the global cap last, so junk can't spend its budget.
  guards: [...gameClientGuards, globalRateLimit('CRASH_LIMITER')],
  parse: async (payload) => {
    const version = identifier(payload.version, VERSION_PATTERN, 'version')
    const installId = identifier(payload.install_id, INSTALL_ID_PATTERN, 'install_id')

    const exception = required(payload.exception, 1000, 'exception')
    const stack = text(payload.stack, 8000)

    return {
      fingerprint: await crashFingerprint(exception, stack),
      version,
      build: text(payload.build, 80),
      platform: required(payload.platform, 40, 'platform'),
      os: text(payload.os, 120),
      gpu: text(payload.gpu, 200),
      exception,
      stack,
      logTail: text(payload.log_tail, 8000, 'tail'),
      // The raw id never reaches the database. It is a random UUID, so an
      // unsalted hash cannot be reversed by guessing.
      installHash: await sha256Hex(`crash-install:${installId}`),
      unknownVersion: !isKnownVersion(version),
    }
  },
  store: async (db, record, ctx) => {
    const createdAt = ctx.now.toISOString()
    const cutoff = new Date(ctx.now.getTime() - DEDUPE_WINDOW_MS).toISOString()

    // One statement, so two simultaneous copies of the same report can't both pass the check.
    const result = await db
      .prepare(
        `INSERT INTO crash_reports
           (fingerprint, version, build, platform, os, gpu, exception, stack, log_tail,
            install_hash, unknown_version, metadata_json, created_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, '{}', ?12
         WHERE NOT EXISTS (
           SELECT 1 FROM crash_reports
           WHERE install_hash = ?10 AND fingerprint = ?1 AND created_at > ?13
         )`,
      )
      .bind(
        record.fingerprint,
        record.version,
        record.build,
        record.platform,
        record.os,
        record.gpu,
        record.exception,
        record.stack,
        record.logTail,
        record.installHash,
        record.unknownVersion ? 1 : 0,
        createdAt,
        cutoff,
      )
      .run()

    // Accepted but not stored: this install already reported this crash today.
    if (result.meta.changes === 0) return json({ ok: true, duplicate: true }, 202)
    return json({ ok: true }, 201)
  },
})
