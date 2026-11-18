import { describe, expect, it } from 'vitest'
import type { FaqEntry } from '#/content/site-content'
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqAnswerText,
  faqJsonLd,
  homeJsonLd,
  isProductionHost,
  jsonLdScript,
  pageHead,
  releaseJsonLd,
} from './seo'

describe('absoluteUrl', () => {
  it('prefixes the production origin', () => {
    expect(absoluteUrl('/roadmap')).toBe('https://voidmech.com/roadmap')
    expect(absoluteUrl('roadmap')).toBe('https://voidmech.com/roadmap')
  })
})

describe('isProductionHost', () => {
  it.each([
    ['voidmech.com', true],
    ['WWW.VoidMech.com', true],
    ['voidmech.example.workers.dev', false],
    ['localhost', false],
  ])('%s → %s', (host, expected) => {
    expect(isProductionHost(host)).toBe(expected)
  })
})

describe('pageHead', () => {
  const head = pageHead({ path: '/roadmap', title: 'T', description: 'D', jsonLd: [{ '@type': 'Thing' }] })

  it('points the canonical link and og:url at the page itself', () => {
    expect(head.links).toContainEqual({ rel: 'canonical', href: 'https://voidmech.com/roadmap' })
    expect(head.meta).toContainEqual({ property: 'og:url', content: 'https://voidmech.com/roadmap' })
  })

  it('repeats the title and description for Open Graph and Twitter', () => {
    expect(head.meta).toContainEqual({ title: 'T' })
    expect(head.meta).toContainEqual({ property: 'og:title', content: 'T' })
    expect(head.meta).toContainEqual({ name: 'twitter:title', content: 'T' })
    expect(head.meta).toContainEqual({ property: 'og:description', content: 'D' })
    expect(head.meta).toContainEqual({ name: 'twitter:description', content: 'D' })
  })

  it('embeds each JSON-LD object as a script', () => {
    expect(head.scripts).toEqual([{ type: 'application/ld+json', children: '{"@type":"Thing"}' }])
  })
})

describe('jsonLdScript', () => {
  it('escapes < so text cannot close the script tag', () => {
    const { children } = jsonLdScript({ text: '</script><b>' })
    expect(children).not.toContain('<')
    expect(JSON.parse(children).text).toBe('</script><b>')
  })
})

describe('faqAnswerText', () => {
  it('returns a string answer unchanged', () => {
    expect(faqAnswerText('plain')).toBe('plain')
  })

  it('flattens links to their text and joins paragraphs', () => {
    const answer: FaqEntry['answer'] = [
      ['See the ', { text: 'roadmap', to: '/roadmap' }, '.'],
      [{ text: 'BUG REPORT', href: '#bug-report', label: true }, ': details'],
    ]
    expect(faqAnswerText(answer)).toBe('See the roadmap. BUG REPORT: details')
  })
})

describe('faqJsonLd', () => {
  it('makes one Question per FAQ entry with the visible answer text', () => {
    const data = faqJsonLd([{ question: 'Q?', answer: 'A.' }])
    expect(data['@type']).toBe('FAQPage')
    expect(data.mainEntity).toEqual([
      { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } },
    ])
  })

  it('covers the real homepage FAQ', () => {
    const data = faqJsonLd()
    expect(data.mainEntity.length).toBeGreaterThan(0)
    for (const item of data.mainEntity) expect(item.acceptedAnswer.text.length).toBeGreaterThan(0)
  })
})

describe('homeJsonLd', () => {
  it('describes the game, site and publisher in one linked graph', () => {
    const [{ '@graph': graph }] = homeJsonLd() as Array<{ '@graph': Array<{ '@type': string }> }>
    expect(graph.map((node) => node['@type'])).toEqual(['Organization', 'WebSite', 'VideoGame'])
  })
})

describe('breadcrumbJsonLd', () => {
  it('numbers items from 1 with absolute URLs', () => {
    const data = breadcrumbJsonLd([
      ['Home', '/'],
      ['Roadmap', '/roadmap'],
    ])
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://voidmech.com/' },
      { '@type': 'ListItem', position: 2, name: 'Roadmap', item: 'https://voidmech.com/roadmap' },
    ])
  })
})

describe('releaseJsonLd', () => {
  it('dates the article by the release and links its own page', () => {
    const [article, breadcrumbs] = releaseJsonLd({ version: '0.2.0', date: '2026-11-16', body: '' }, 'VoidMech 0.2.0', 'desc')
    expect(article).toMatchObject({
      '@type': 'Article',
      url: 'https://voidmech.com/releases/0.2.0',
      datePublished: '2026-11-16',
      about: { softwareVersion: '0.2.0' },
    })
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
  })
})
