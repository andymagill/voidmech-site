export const alphaNoticeText =
  'VoidMech is an incomplete alpha. Expect missing features, bugs, and frequent changes.'

export default function AlphaNotice() {
  return (
    <div
      role="note"
      className="border-b border-[rgba(245,138,31,0.4)] bg-[rgba(245,138,31,0.1)] px-4 py-2"
    >
      <p className="vm-wrap m-0 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--vm-orange)]">
        {alphaNoticeText}
      </p>
    </div>
  )
}
