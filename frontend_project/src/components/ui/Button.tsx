import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'flat';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'py-3 px-8 text-base rounded-xl gap-2.5',
};

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-gradient bg-brand-animated text-white shadow-glow-brand hover:brightness-110 active:brightness-95 animate-gradient-flow btn-scale-up hover:scale-105',
  secondary:
    'bg-brand-gradient-soft text-white shadow-glow-brand/60 border border-white/[0.06] hover:brightness-105 btn-scale-up hover:scale-105',
  ghost: 'text-ink-100 hover:text-white hover:bg-white/[0.04]',
  outline:
    'border border-white/15 text-white hover:bg-white/[0.04] hover:border-white/25',
  flat: 'text-white',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center font-medium no-tap-highlight select-none',
        variant !== 'flat' && 'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
