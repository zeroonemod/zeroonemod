/**
 * Green success check: the circle pops in, the white tick draws itself and a soft ring pulses out.
 * With reduced motion the global rule in index.css shortens the animations, so the final state shows at once.
 */
export function AnimatedCheck({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';
  const icon = size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  return (
    <span className={`success-check-pop flex ${box} shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" className={icon}>
        <path d="M5.5 12.5l4.25 4.25L18.5 8" pathLength={1} className="success-check-draw" />
      </svg>
    </span>
  );
}
