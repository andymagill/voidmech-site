import { createFileRoute } from '@tanstack/react-router'
import { buildSitemap } from '#/lib/feeds'
import { releases } from '#/lib/releases'

/** `GET /sitemap.xml`: the homepage, the roadmap and every release page. */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildSitemap(releases), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
