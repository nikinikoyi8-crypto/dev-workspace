import { TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-ink-100 mb-2">{label}</label>
      )}
      <textarea
        className={cn(
          'w-full rounded-xl bg-ink-800/60 border border-white/[0.08] text-white placeholder:text-ink-300',
          'px-4 py-3 transition-all duration-200 resize-none',
          'focus:outline-none focus:border-brand-pink/40 focus:bg-ink-800/80 focus:ring-2 focus:ring-brand-pink/10',
          error && 'border-red-500/50',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-300">{hint}</p>
      ) : null}
    </div>
  );
}
