import { useEffect, useRef } from 'react';
import type { TouchEventHandler } from 'react';

const DOUBLE_TAP_DELAY = 300;
const MAX_TAP_MOVEMENT = 10;

export function useDoubleTap(
  onDoubleTap: (x: number, y: number) => void,
  onSingleTap?: () => void,
) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const singleTapTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
  }, []);

  const onTouchStart: TouchEventHandler<HTMLElement> = (event) => {
    const touch = event.touches[0];
    if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd: TouchEventHandler<HTMLElement> = (event) => {
    const touch = event.changedTouches[0];
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!touch || !start) return;

    if (event.target instanceof Element && event.target.closest('button, a, input, textarea, select')) {
      lastTapRef.current = null;
      if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
      return;
    }

    const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
    if (moved > MAX_TAP_MOVEMENT) {
      lastTapRef.current = null;
      if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
      return;
    }

    const now = Date.now();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const lastTap = lastTapRef.current;

    if (lastTap && now - lastTap.time <= DOUBLE_TAP_DELAY) {
      if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
      lastTapRef.current = null;
      onDoubleTap(x, y);
      return;
    }

    lastTapRef.current = { time: now, x, y };
    if (onSingleTap) {
      if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = window.setTimeout(() => {
        lastTapRef.current = null;
        singleTapTimeoutRef.current = null;
        onSingleTap();
      }, DOUBLE_TAP_DELAY);
    }
  };

  return { onTouchStart, onTouchEnd };
}