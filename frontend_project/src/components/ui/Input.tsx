import { InputHTMLAttributes, ReactNode, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  hint?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    leftIcon,
    hint,
    type = 'text',
    className,
    containerClassName,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && <label className="mb-1.5 block text-sm font-medium text-ink-100">{label}</label>}

      <div className={cn('group relative transition-all duration-250', isFocused && 'scale-[1.01]')}>
        {leftIcon && (
          <span
            className={cn(
              'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-all duration-200',
              isFocused
                ? 'text-brand-pink drop-shadow-[0_0_12px_rgba(232,79,155,0.45)]'
                : 'text-ink-300',
            )}
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          type={inputType}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'h-11 w-full rounded-2xl border border-white/[0.08] bg-ink-900/80 text-white placeholder:text-ink-400/80',
            'px-4 transition-all duration-250 ease-out shadow-inner shadow-black/10',
            'focus:outline-none',
            'group-focus-within:border-brand-pink/60 group-focus-within:bg-ink-900/90',
            'group-focus-within:shadow-[0_0_0_1px_rgba(232,79,155,0.22),0_0_0_6px_rgba(232,79,155,0.08),0_16px_32px_rgba(123,69,232,0.16)]',
            leftIcon && 'pl-11',
            isPassword && 'pr-12',
            error && 'border-red-500/70 bg-red-500/[0.04] text-red-50',
            className,
          )}
          {...props}
        />

        <div className="pointer-events-none absolute inset-x-2 bottom-0 h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-brand-pink to-transparent opacity-0 blur-[1px] transition-all duration-300 group-focus-within:scale-x-100 group-focus-within:opacity-100" />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-300 transition-colors duration-200 hover:text-white"
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-300">{hint}</p>
      ) : null}
    </div>
  );
});
