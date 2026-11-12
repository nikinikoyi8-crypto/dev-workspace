import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, closeLabel, children }: BottomSheetProps) {
  useCloseOnBackButton(open, onClose);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className={cn('w-full max-h-[85vh] overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900 shadow-card animate-slide-up', 'sm:max-w-2xl sm:rounded-2xl sm:mb-4')}>
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button type="button" aria-label={closeLabel} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-white"><X className="h-5 w-5" /></button>
        </header>
        <div className="max-h-[calc(85vh-4.5rem)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
