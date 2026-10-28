import { Link } from '@tanstack/react-router'
import type { FaqEntry, FaqLink } from '#/content/site-content'

// Colour comes from the global `a` rule in styles.css.
const inlineLinkClass = 'no-underline hover:underline'
const labelLinkClass = `font-mono uppercase tracking-[0.14em] ${inlineLinkClass}`

function AnswerLink({ link }: { link: FaqLink }) {
  const className = link.label ? labelLinkClass : inlineLinkClass

  // Route links navigate client-side; hash links just open a submission modal.
  return 'to' in link ? (
    <Link to={link.to} className={className}>
      {link.text}
    </Link>
  ) : (
    <a href={link.href} className={className}>
      {link.text}
    </a>
  )
}

/**
 * Accordion of FAQ entries; the first one starts open. An answer is a plain
 * string or a list of paragraphs, each a mix of text and links (see `FaqLink`).
 */
export default function FaqList({ items }: { items: ReadonlyArray<FaqEntry> }) {
  return (
    <div className="vm-faq mt-6">
      {items.map(({ question, answer }, index) => (
        <details key={question} open={index === 0} className="rounded-none">
          <summary>{question}</summary>
          {typeof answer === 'string' ? (
            <p>{answer}</p>
          ) : (
            // One wrapper keeps `<details>` at two grid children (summary + body).
            <div>
              {answer.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>
                  {paragraph.map((part, partIndex) =>
                    typeof part === 'string' ? (
                      part
                    ) : (
                      <AnswerLink key={partIndex} link={part} />
                    ),
                  )}
                </p>
              ))}
            </div>
          )}
        </details>
      ))}
    </div>
  )
}
