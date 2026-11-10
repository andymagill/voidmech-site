import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { serveMedia } from '#/lib/endpoints/media'

/**
 * `GET`/`HEAD /media/:file` serves hero video clips from R2 with Range
 * support (see `#/lib/endpoints/media`). Bindings come from
 * `cloudflare:workers`, not the handler context (see the submissions route).
 */
export const Route = createFileRoute('/media/$file')({
  server: {
    handlers: {
      GET: ({ request, params }) => serveMedia(request, env, params.file),
      HEAD: ({ request, params }) => serveMedia(request, env, params.file),
    },
  },
})
