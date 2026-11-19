/**
 * components/Logo.tsx
 * The TEMPO wordmark: an amber "T" tile (a metronome-like stem) + the name.
 */
export default function Logo({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-display font-bold tracking-wide">
      <span className={`inline-flex items-center justify-center rounded-lg bg-amber text-ink ${small ? 'h-7 w-7 text-base' : 'h-9 w-9 text-xl'}`}>T</span>
      <span className={small ? 'text-base' : 'text-xl'}>TEMPO</span>
    </span>
  )
}
