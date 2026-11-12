import type { ReactNode } from 'react'

/**
 * Renders the small Markdown subset used by changelog sections: headings,
 * bullet and numbered lists, paragraphs, fenced code, and inline code, bold,
 * italic and links. Output is React elements, never an HTML string, so text
 * from the changelog cannot inject markup; only `http(s)` and root-relative
 * link targets are linked.
 *
 * Every heading renders at one level, `headingLevel` (default `h3`), so the
 * caller can nest changelog headings under its own release heading.
 * Nested lists are flattened to one level.
 */

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|(?:\*([^*\s][^*]*)\*|(?<![A-Za-z0-9])_([^_\s][^_]*)_(?![A-Za-z0-9]))|\[([^\]]+)\]\(([^)\s]+)\)/g

function safeHref(href: string): string | null {
  return /^(https?:\/\/|\/(?!\/))/i.test(href) ? href : null
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let index = 0

  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const key = `${keyPrefix}-${index++}`
    const [, code, bold, italicStar, italicUnderscore, label, href] = match

    if (code !== undefined) {
      nodes.push(
        <code key={key} className="bg-[var(--vm-space)] px-1 font-mono text-[0.9em] text-[var(--vm-cyan)]">
          {code}
        </code>,
      )
    } else if (bold !== undefined) {
      nodes.push(<strong key={key}>{inline(bold, key)}</strong>)
    } else if (italicStar !== undefined || italicUnderscore !== undefined) {
      nodes.push(<em key={key}>{inline(italicStar ?? italicUnderscore, key)}</em>)
    } else {
      const safe = safeHref(href)
      nodes.push(
        safe ? (
          <a key={key} href={safe} rel="noreferrer" className="text-[var(--vm-cyan)] underline">
            {label}
          </a>
        ) : (
          label
        ),
      )
    }
    last = match.index + match[0].length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string }

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    if (line.trimStart().startsWith('```')) {
      const code: string[] = []
      for (i++; i < lines.length && !lines[i].trimStart().startsWith('```'); i++) code.push(lines[i])
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }

    const heading = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', text: heading[1] })
      continue
    }

    const item = /^\s*(?:([-*+])|\d+[.)])\s+(.*)$/.exec(line)
    if (item) {
      const ordered = !item[1]
      const previous = blocks[blocks.length - 1]
      if (previous?.type === 'list' && previous.ordered === ordered) previous.items.push(item[2])
      else blocks.push({ type: 'list', ordered, items: [item[2]] })
      continue
    }

    const previous = blocks[blocks.length - 1]
    const continuesParagraph = previous?.type === 'paragraph' && lines[i - 1]?.trim()
    if (continuesParagraph) previous.text += ` ${line.trim()}`
    else blocks.push({ type: 'paragraph', text: line.trim() })
  }

  return blocks
}

type MarkdownProps = {
  source: string
  /** Level for every heading in `source`; one below the heading that introduces it. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
}

export function Markdown({ source, headingLevel = 3 }: MarkdownProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className="space-y-3 text-sm leading-7 text-vm-text">
      {parseBlocks(source).map((block, index) => {
        const key = `b${index}`
        switch (block.type) {
          case 'heading':
            return (
              <Heading
                key={key}
                className="m-0 pt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--vm-cyan)]"
              >
                {inline(block.text, key)}
              </Heading>
            )
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List
                key={key}
                className={`m-0 space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </List>
            )
          }
          case 'code':
            return (
              <pre key={key} className="m-0 overflow-x-auto bg-[var(--vm-space)] p-3 font-mono text-xs">
                <code>{block.text}</code>
              </pre>
            )
          default:
            return (
              <p key={key} className="m-0">
                {inline(block.text, key)}
              </p>
            )
        }
      })}
    </div>
  )
}
