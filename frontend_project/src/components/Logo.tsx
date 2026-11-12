import { cn } from '@/utils/cn';

interface LogoProps {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  wordmarkClassName?: string;
  animated?: boolean;
}

export function Logo({ className, size = 36, withWordmark = false, wordmarkClassName, animated = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn('relative z-10', animated && 'animate-logo-fade opacity-0')}
        >
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF8A3D" />
              <stop offset="0.5" stopColor="#E84F9B" />
              <stop offset="1" stopColor="#7B45E8" />
            </linearGradient>
          </defs>
          {/* Abstract 'A' formed by overlapping strokes */}
          <path
            d="M24 6 L40 40"
            stroke="url(#logo-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M24 6 L8 40"
            stroke="url(#logo-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M15 28 L33 28"
            stroke="url(#logo-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="24" cy="6" r="3.5" fill="#E84F9B" />
        </svg>
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-xl -z-0',
            animated ? 'animate-pulse-glow' : '',
          )}
          style={{ background: 'rgba(232, 79, 155, 0.25)' }}
          aria-hidden
        />
      </div>
      {withWordmark && (
        <span
          className={cn(
            'font-display text-xl font-semibold tracking-tight text-white',
            wordmarkClassName,
          )}
        >
          Art<span className="text-gradient-brand">istry</span>
        </span>
      )}
    </div>
  );
}
