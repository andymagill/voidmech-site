import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SiteImage } from '#/content/site-content'
import { useFocusTrap, useScrollLock } from './dialog-behavior'

/**
 * Full-size view of a screenshot, portalled to `document.body` so it escapes
 * any clipping or stacking context of the card it was opened from. Scroll lock and
 * focus handling come from `dialog-behavior`.
 */
function Lightbox({ image, onClose }: { image: SiteImage; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useScrollLock(true)
  useFocusTrap(dialogRef, true, onClose, closeRef)

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={image.caption}
      tabIndex={-1}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(7,16,24,0.92)] p-4 outline-none backdrop-blur-sm md:p-8"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <figure className="vm-media-frame relative z-10 m-0 flex max-h-full max-w-6xl flex-col bg-[var(--vm-space)]">
        <img
          src={image.src}
          alt={image.alt}
          decoding="async"
          className="block min-h-0 w-full object-contain"
          style={{ maxHeight: 'calc(100vh - 8rem)' }}
        />
        <figcaption className="flex items-center justify-between gap-4 border-t border-[var(--vm-slate)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(225,230,232,0.9)]">
          <span>{image.caption}</span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close screenshot"
            onClick={onClose}
            className="border border-[var(--vm-slate)] bg-[var(--vm-space)] px-2 py-1 text-[var(--vm-white)] hover:text-[var(--vm-cyan)]"
          >
            Close
          </button>
        </figcaption>
      </figure>
    </div>,
    document.body,
  )
}

/**
 * Screenshot thumbnail that expands into a `Lightbox` on click. Use
 * `loading="eager"` only for above-the-fold images (the home hero), so the
 * rest stay lazy.
 */
export default function ScreenshotFigure({
  image,
  className = '',
  loading = 'lazy',
}: {
  image: SiteImage
  className?: string
  loading?: 'lazy' | 'eager'
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <figure className={`vm-media-frame group ${className}`}>
        <button
          type="button"
          aria-label={`Expand screenshot: ${image.caption}`}
          onClick={() => setOpen(true)}
          className="block h-full w-full cursor-zoom-in border-0 bg-transparent p-0"
        >
          <img
            src={image.src}
            alt={image.alt}
            loading={loading}
            decoding="async"
            className="vm-media-image"
          />
        </button>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 border border-[rgba(34,224,240,0.4)] bg-[rgba(7,16,24,0.86)] px-1.5 py-1 font-mono text-[10px] leading-none text-[var(--vm-cyan)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Expand
        </span>
        <figcaption className="vm-media-caption pointer-events-none">{image.caption}</figcaption>
      </figure>
      {open && <Lightbox image={image} onClose={() => setOpen(false)} />}
    </>
  )
}
