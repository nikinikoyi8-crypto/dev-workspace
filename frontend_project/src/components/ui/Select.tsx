import { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export function Select({ label, error, className, children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-ink-100 mb-2">{label}</label>
      )}
      <div className="relative">
        <select
          className={cn(
            'w-full h-12 rounded-xl bg-ink-800/60 border border-white/[0.08] text-white',
            'px-4 pr-10 appearance-none transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:border-brand-pink/40 focus:bg-ink-800/80 focus:ring-2 focus:ring-brand-pink/10',
            error && 'border-red-500/50',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-200 pointer-events-none" />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
