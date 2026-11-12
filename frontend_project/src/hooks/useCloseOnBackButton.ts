import { useEffect, useRef } from 'react';

const HISTORY_KEY = '__closeOnBackEntryId';

export function useCloseOnBackButton(isOpen: boolean, onClose: () => void): void {
  const entryIdRef = useRef<number | null>(null);
  const openPathRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  const ignoreNextPopStateRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const isMobileLike = typeof window !== 'undefined' && (
      window.matchMedia('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0
    );

    if (!isMobileLike) {
      return;
    }

    if (isOpen) {
      if (entryIdRef.current !== null) {
        return;
      }

      const entryId = Date.now() + Math.random();
      const previousState = (window.history.state ?? {}) as Record<string, unknown>;
      openPathRef.current = window.location.pathname;

      window.history.pushState({ ...previousState, [HISTORY_KEY]: entryId }, '', window.location.href);
      entryIdRef.current = entryId;

      const handlePopState = () => {
        if (ignoreNextPopStateRef.current) {
          ignoreNextPopStateRef.current = false;
          return;
        }

        const currentState = window.history.state as Record<string, unknown> | null;
        if (currentState?.[HISTORY_KEY] === entryIdRef.current) {
          return;
        }

        onCloseRef.current();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);

        if (entryIdRef.current !== entryId) {
          return;
        }

        entryIdRef.current = null;
        openPathRef.current = null;
      };
    }

    const currentState = window.history.state as Record<string, unknown> | null;
    const hasActiveEntry = entryIdRef.current !== null &&
      openPathRef.current === window.location.pathname &&
      currentState &&
      currentState[HISTORY_KEY] === entryIdRef.current;

    if (hasActiveEntry) {
      ignoreNextPopStateRef.current = true;
      window.history.back();
    }

    entryIdRef.current = null;
    openPathRef.current = null;
  }, [isOpen]);
}
