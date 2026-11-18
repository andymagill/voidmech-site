/**
 * Crawler-facing documents built from the release list: `/sitemap.xml` and the
 * Atom release feed `/feed.xml`. Pure functions of `releases`, so the routes
 * that serve them (`src/routes/sitemap[.]xml.ts`, `src/routes/feed[.]xml.ts`)
 * stay thin and the output is easy to test.
 */

import { releasePath } from '#/lib/releases'
import type { Release } from '#/lib/releases'
import { absoluteUrl, SITE_NAME } from '#/lib/seo'
import { releasePage } from '#/content/site-content'

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** `<urlset>` for the homepage, the roadmap and every release page. `releases` is newest first. */
export function buildSitemap(releases: ReadonlyArray<Release>): string {
  const newest = releases[0]?.date
  const urls: Array<{ path: string; lastmod?: string }> = [
    { path: '/', lastmod: newest },
    { path: '/roadmap', lastmod: newest },
    ...releases.map((release) => ({ path: releasePath(release.version), lastmod: release.date })),
  ]
  const entries = urls.map(({ path, lastmod }) => {
    const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : ''
    return `  <url><loc>${escapeXml(absoluteUrl(path))}</loc>${lastmodTag}</url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
}

/** Atom feed of release notes, newest first. `releases` is newest first. */
export function buildReleaseFeed(releases: ReadonlyArray<Release>): string {
  const updated = `${releases[0]?.date ?? '1970-01-01'}T00:00:00Z`
  const entries = releases.map((release) => {
    const url = absoluteUrl(releasePath(release.version))
    return [
      '  <entry>',
      `    <title>${escapeXml(`${releasePage.title(release.version)} release notes`)}</title>`,
      `    <id>${escapeXml(url)}</id>`,
      `    <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>`,
      `    <updated>${release.date}T00:00:00Z</updated>`,
      `    <summary>${escapeXml(releasePage.description(release.version, release.date))}</summary>`,
      `    <content type="text">${escapeXml(release.body)}</content>`,
      '  </entry>',
    ].join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${SITE_NAME} release notes</title>`,
    `  <id>${absoluteUrl('/feed.xml')}</id>`,
    `  <link rel="self" type="application/atom+xml" href="${absoluteUrl('/feed.xml')}"/>`,
    `  <link rel="alternate" type="text/html" href="${absoluteUrl('/roadmap')}"/>`,
    `  <updated>${updated}</updated>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n')
}
