import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { json } from '#/lib/api/http'
import { getSubmissionEndpoint } from '#/lib/endpoints'

/**
 * POST /api/submissions/:kind. Validation, abuse guards and storage live in
 * the endpoint definitions under `#/lib/endpoints`.
 *
 * Bindings come from `cloudflare:workers`, not the handler context: that
 * context is an empty object under @cloudflare/vite-plugin.
 */
export const Route = createFileRoute('/api/submissions/$kind')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const endpoint = getSubmissionEndpoint(params.kind)
        if (!endpoint) {
          return json({ error: 'Not found' }, 404)
        }

        return endpoint(request, env)
      },
      // Without this, a GET falls through to an empty HTML page.
      GET: async () => json({ error: 'Method not allowed' }, 405, { allow: 'POST' }),
    },
  },
})
