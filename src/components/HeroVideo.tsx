import { useEffect, useRef, useState } from 'react'
import type { SiteHeroVideo } from '#/content/site-content'

/**
 * Silent, looping gameplay clip with no player controls. The server renders
 * only the still poster, so markup matches on hydration. On the client a
 * random clip is picked and fades in over the poster once it is actually
 * playing. Visitors who prefer reduced motion (or whose browser blocks
 * autoplay) keep the poster, and reduced-motion visitors never download a clip.
 */
export default function HeroVideo({
  media,
  className = '',
}: {
  media: SiteHeroVideo
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [clipIndex, setClipIndex] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const clip = clipIndex === null ? null : media.clips[clipIndex]

  useEffect(() => {
    // No matchMedia (e.g. jsdom) is treated like reduced motion: keep the poster.
    if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setClipIndex(Math.floor(Math.random() * media.clips.length))
  }, [media.clips.length])

  useEffect(() => {
    const video = videoRef.current
    if (!clip || !video) return
    // React doesn't reliably reflect `muted` to the element, and browsers only
    // autoplay muted video; set it here before asking to play.
    video.muted = true
    video.play().catch(() => {
      // Autoplay blocked (e.g. low-power mode): the poster stays up.
    })
  }, [clip])

  return (
    <figure className={`vm-media-frame ${className}`}>
      <img
        src={media.poster.src}
        alt={media.poster.alt}
        loading="eager"
        decoding="async"
        className="vm-media-image"
      />
      {clip && (
        <video
          ref={videoRef}
          src={clip.src}
          muted
          loop
          playsInline
          autoPlay
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          className="vm-media-image absolute inset-0 transition-opacity duration-700 ease-out"
          style={{ opacity: playing ? 1 : 0 }}
        />
      )}
      <figcaption className="vm-media-caption pointer-events-none">
        {playing && clip ? clip.caption : media.poster.caption}
      </figcaption>
    </figure>
  )
}
