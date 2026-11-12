import { useEffect } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void): void {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFirst = () => container.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const frame = requestAnimationFrame(focusFirst);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.getClientRects().length > 0);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [active, onEscape, ref]);
}
