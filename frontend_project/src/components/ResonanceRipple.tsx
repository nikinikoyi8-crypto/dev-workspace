export function ResonanceRipple({ x, y, id }: { x: number; y: number; id: number }) {
  const gradientId = `resonance-gradient-${id}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-10 h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 resonance-ripple"
      style={{ left: x, top: y }}
    >
      <svg className="h-full w-full overflow-visible" viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF8A3D" />
            <stop offset="0.5" stopColor="#E84F9B" />
            <stop offset="1" stopColor="#7B45E8" />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r="29" stroke={`url(#${gradientId})`} strokeWidth="2" />
      </svg>
    </div>
  );
}