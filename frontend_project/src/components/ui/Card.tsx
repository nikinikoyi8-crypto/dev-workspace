import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl shadow-card',
        hover && 'transition-all duration-300 hover:border-white/[0.12] hover:shadow-premium hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}
