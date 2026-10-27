// Wordmark from the game's title screen: monospaced CamelCase in small caps,
// full-size initials (V, M) with the remaining letters scaled down.
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="VoidMech"
      className={`inline-flex items-baseline font-mono font-bold uppercase leading-none text-[var(--vm-cyan)] ${className}`}
    >
      <span aria-hidden="true">V</span>
      <span aria-hidden="true" className="text-[0.74em]">
        oid
      </span>
      <span aria-hidden="true">M</span>
      <span aria-hidden="true" className="text-[0.74em]">
        ech
      </span>
    </span>
  )
}
