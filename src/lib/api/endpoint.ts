import { ApiError, errorResponse, json, readJsonBody, type Payload } from './http'
import type { EndpointContext, Guard } from './guards'
import { clientIp } from './request'

/**
 * Declarative POST endpoints. Each endpoint (one per file in
 * `src/lib/endpoints/`) states its size cap, abuse guards, how to validate
 * the payload into a record, and how to store it. The pipeline is always:
 *
 *   read JSON body (size cap) → guards in order → parse → store
 *
 * `parse` and guards throw `ApiError` for expected failures (4xx). Anything
 * else is logged and returned as a generic 500, so internal details never
 * reach the client.
 */

export type EndpointDefinition<TRecord> = {
  name: string
  maxBytes: number
  guards: ReadonlyArray<Guard>
  parse: (payload: Payload, ctx: EndpointContext) => TRecord | Promise<TRecord>
  store: (db: D1Database, record: TRecord, ctx: EndpointContext) => Promise<Response>
}

/**
 * A ready-to-mount handler. `env` is passed in (rather than imported from
 * `cloudflare:workers`) so endpoints can be tested with a fake environment.
 */
export type Endpoint = (request: Request, env: Env) => Promise<Response>

export function defineEndpoint<TRecord>(definition: EndpointDefinition<TRecord>): Endpoint {
  return async (request, env) => {
    const ctx: EndpointContext = {
      name: definition.name,
      request,
      env,
      ip: clientIp(request),
      now: new Date(),
    }

    try {
      if (!env.DB) {
        console.error('D1 binding `DB` is unavailable; check wrangler.jsonc d1_databases.')
        return json({ error: 'Submissions are temporarily unavailable' }, 500)
      }

      const payload = await readJsonBody(request, definition.maxBytes)

      for (const guard of definition.guards) {
        const early = await guard(ctx, payload)
        if (early) return early
      }

      const record = await definition.parse(payload, ctx)
      return await definition.store(env.DB, record, ctx)
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error)
      }

      console.error(`[api:${definition.name}] request failed`, error)
      return json({ error: 'Could not save your submission. Try again later.' }, 500)
    }
  }
}
