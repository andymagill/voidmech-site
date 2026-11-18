import { describe, expect, it } from 'vitest'
import { buildReleaseFeed, buildSitemap, escapeXml } from './feeds'
import type { Release } from './releases'

const releases: Release[] = [
  { version: '0.2.0', date: '2026-11-16', body: 'Salvage & <free> aim.' },
  { version: '0.1.0-alpha.1', date: '2026-11-13', body: 'First build.' },
]

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;',
    )
  })
})

describe('buildSitemap', () => {
  const xml = buildSitemap(releases)

  it('lists the homepage, the roadmap and every release', () => {
    expect(xml).toContain('<loc>https://voidmech.com/</loc>')
    expect(xml).toContain('<loc>https://voidmech.com/roadmap</loc>')
    expect(xml).toContain('<loc>https://voidmech.com/releases/0.2.0</loc><lastmod>2026-11-16</lastmod>')
    expect(xml).toContain('<loc>https://voidmech.com/releases/0.1.0-alpha.1</loc><lastmod>2026-11-13</lastmod>')
  })

  it('dates the homepage and roadmap by the newest release', () => {
    expect(xml).toContain('<loc>https://voidmech.com/</loc><lastmod>2026-11-16</lastmod>')
  })

  it('still lists the fixed pages with no releases', () => {
    const empty = buildSitemap([])
    expect(empty).toContain('<loc>https://voidmech.com/roadmap</loc></url>')
    expect(empty).not.toContain('lastmod')
  })
})

describe('buildReleaseFeed', () => {
  const xml = buildReleaseFeed(releases)

  it('is an Atom feed updated at the newest release', () => {
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
    expect(xml).toContain('<updated>2026-11-16T00:00:00Z</updated>')
  })

  it('has one entry per release, linking its page', () => {
    expect(xml.match(/<entry>/g)).toHaveLength(2)
    expect(xml).toContain('<id>https://voidmech.com/releases/0.2.0</id>')
  })

  it('escapes release text', () => {
    expect(xml).toContain('Salvage &amp; &lt;free&gt; aim.')
    expect(xml).not.toContain('<free>')
  })
})
