import { createFileRoute } from '@tanstack/react-router'
import { buildReleaseFeed } from '#/lib/feeds'
import { releases } from '#/lib/releases'

/** `GET /feed.xml`: Atom feed of release notes. */
export const Route = createFileRoute('/feed.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildReleaseFeed(releases), {
          headers: {
            'content-type': 'application/atom+xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
