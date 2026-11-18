/**
 * Search and social metadata shared by every route: absolute URLs, per-page
 * `head()` output (title, description, canonical, Open Graph, Twitter) and the
 * schema.org JSON-LD that describes the game, its FAQ and its releases.
 *
 * Each route builds its own head with `pageHead` so its canonical URL and
 * `og:url` name that page, not the homepage.
 */

import { buildDetails, faq, homeHero, siteLinks } from '#/content/site-content'
import type { FaqEntry } from '#/content/site-content'
import { releasePath } from '#/lib/releases'
import type { Release } from '#/lib/releases'

/** Production origin, no trailing slash. */
export const SITE_ORIGIN = 'https://voidmech.com'

/** Hosts that should be indexed; every other host (workers.dev previews, localhost) is `noindex`. */
export const PRODUCTION_HOSTS: ReadonlyArray<string> = ['voidmech.com', 'www.voidmech.com']

export const SITE_NAME = 'VoidMech'

/** Social share image, 1780x792. */
export const SHARE_IMAGE = {
  url: `${SITE_ORIGIN}/assets/images/voidmech-meta.jpg`,
  width: 1780,
  height: 792,
  alt: 'VoidMech logo and tagline over a blocky modular spaceship floating in a starfield.',
}

export const HOME_TITLE = `${SITE_NAME} | Spaceship Building & Combat Sandbox`

export const HOME_DESCRIPTION =
  'VoidMech is a ship-building space-combat sandbox where your block layout controls mass, thrust, balance and handling. Mine, dock, rebuild and fight. Alpha build for Windows on itch.io.'

/** Absolute URL for a root-relative `path`. */
export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

/** True when `hostname` is a production host that search engines should index. */
export function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.includes(hostname.toLowerCase())
}

/** Serializes JSON-LD for a `<script>`: `<` is escaped so text cannot close the tag. */
export function jsonLdScript(data: unknown) {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data).replace(/</g, '\\u003c'),
  }
}

type PageHeadOptions = {
  /** Root-relative path, e.g. `/roadmap`. */
  path: string
  title: string
  description: string
  /** schema.org JSON-LD objects to embed. */
  jsonLd?: ReadonlyArray<unknown>
  /** Extra `<link>` tags, e.g. an image preload. */
  links?: ReadonlyArray<Record<string, string>>
  ogType?: 'website' | 'article'
}

/** Everything a route's `head()` returns for one page. Overrides the root's defaults. */
export function pageHead({ path, title, description, jsonLd = [], links = [], ogType = 'website' }: PageHeadOptions) {
  const url = absoluteUrl(path)
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: ogType },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: url }, ...links],
    scripts: jsonLd.map(jsonLdScript),
  }
}

/** Plain text of an FAQ answer: link labels kept, markup dropped, paragraphs joined by a space. */
export function faqAnswerText(answer: FaqEntry['answer']): string {
  if (typeof answer === 'string') return answer
  return answer
    .map((paragraph) => paragraph.map((part) => (typeof part === 'string' ? part : part.text)).join(''))
    .join(' ')
}

const publisher = {
  '@type': 'Organization',
  '@id': `${SITE_ORIGIN}/#organization`,
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  logo: absoluteUrl('/assets/icons/favicon.png'),
  sameAs: [siteLinks.itch, siteLinks.reddit],
}

const platform = buildDetails.find((detail) => detail.label === 'Platform')?.value.replace(/\s*\(.*\)$/, '')

/** The game, the site and the publisher, linked by `@id`. */
export function homeJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@graph': [
        publisher,
        {
          '@type': 'WebSite',
          '@id': `${SITE_ORIGIN}/#website`,
          url: `${SITE_ORIGIN}/`,
          name: SITE_NAME,
          description: HOME_DESCRIPTION,
          publisher: { '@id': publisher['@id'] },
          inLanguage: 'en',
        },
        {
          '@type': 'VideoGame',
          '@id': `${SITE_ORIGIN}/#game`,
          name: SITE_NAME,
          url: `${SITE_ORIGIN}/`,
          description: homeHero.body,
          image: SHARE_IMAGE.url,
          genre: ['Simulation', 'Sandbox', 'Space combat'],
          applicationCategory: 'Game',
          ...(platform ? { gamePlatform: platform, operatingSystem: platform } : {}),
          gameMode: 'Single-player',
          publisher: { '@id': publisher['@id'] },
          sameAs: [siteLinks.itch, siteLinks.reddit],
        },
      ],
    },
  ]
}

/** FAQPage built from the homepage FAQ, so the markup always matches the visible answers. */
export function faqJsonLd(entries: ReadonlyArray<FaqEntry> = faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(entry.answer) },
    })),
  }
}

/** Breadcrumb trail; each item is `[name, root-relative path]`. */
export function breadcrumbJsonLd(items: ReadonlyArray<readonly [name: string, path: string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  }
}

/** One release as a schema.org `Article` about the game build. */
export function releaseJsonLd(release: Release, title: string, description: string) {
  const url = absoluteUrl(releasePath(release.version))
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      url,
      mainEntityOfPage: url,
      datePublished: release.date,
      dateModified: release.date,
      image: SHARE_IMAGE.url,
      inLanguage: 'en',
      author: { '@id': publisher['@id'] },
      publisher,
      about: {
        '@type': 'VideoGame',
        '@id': `${SITE_ORIGIN}/#game`,
        name: SITE_NAME,
        softwareVersion: release.version,
        url: `${SITE_ORIGIN}/`,
      },
    },
    breadcrumbJsonLd([
      [SITE_NAME, '/'],
      ['Roadmap', '/roadmap'],
      [title, releasePath(release.version)],
    ]),
  ]
}
