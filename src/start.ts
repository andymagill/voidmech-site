import { createMiddleware, createStart } from '@tanstack/react-start'
import { isProductionHost } from '#/lib/seo'

/**
 * Keeps every host except voidmech.com out of search indexes. The Worker also
 * answers on workers.dev (previews and the production fallback), which would
 * otherwise be crawled as a duplicate of the real site.
 */
const noindexOffProduction = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  const result = await next()
  if (isProductionHost(new URL(request.url).hostname)) return result

  // Copy the response so its headers are mutable whatever produced it.
  const response = new Response(result.response.body, result.response)
  response.headers.set('x-robots-tag', 'noindex, nofollow')
  return { ...result, response }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [noindexOffProduction],
}))
