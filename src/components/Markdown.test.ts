import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './Markdown'

const html = (source: string) => renderToStaticMarkup(createElement(Markdown, { source }))

describe('Markdown', () => {
  it('renders headings as h3, lists and paragraphs', () => {
    const out = html('## Fixed\n- one\n- two\n\nSome *new* text\ncontinued')
    expect(out).toContain('<h3')
    expect(out).toContain('Fixed')
    expect(out).toMatch(/<ul[^>]*><li>one<\/li><li>two<\/li><\/ul>/)
    expect(out).toContain('<em>new</em> text continued')
  })

  it('renders ordered lists, bold, inline and fenced code', () => {
    const out = html('1. first\n2. second\n\n**Bold** and `code`\n\n```\nlet x = 1 < 2\n```')
    expect(out).toMatch(/<ol[^>]*><li>first<\/li><li>second<\/li><\/ol>/)
    expect(out).toContain('<strong>Bold</strong>')
    expect(out).toContain('>code</code>')
    expect(out).toContain('let x = 1 &lt; 2')
  })

  it('escapes raw HTML instead of rendering it', () => {
    const out = html('<script>alert(1)</script> and <img src=x onerror=alert(1)>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;script&gt;')
  })

  it('links only http(s) and root-relative targets', () => {
    const out = html('[ok](https://example.com/a) [rel](/patch-notes) [bad](javascript:alert(1)) [proto](//evil.example)')
    expect(out).toContain('href="https://example.com/a"')
    expect(out).toContain('href="/patch-notes"')
    expect(out).not.toContain('javascript:')
    expect(out).not.toContain('href="//evil.example"')
    expect(out).toContain('bad')
  })

  it('does not italicise snake_case words', () => {
    expect(html('use some_var_name here')).toContain('some_var_name')
  })
})
