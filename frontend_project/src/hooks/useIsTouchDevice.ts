import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

function detectTouchDevice() {
  if (typeof window === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return window.matchMedia(`(pointer: coarse) and ${MOBILE_QUERY}`).matches
    || (hasTouch && window.matchMedia(MOBILE_QUERY).matches);
}

export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(detectTouchDevice);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(pointer: coarse) and ${MOBILE_QUERY}`);
    const update = () => setIsTouchDevice(detectTouchDevice());
    mediaQuery.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mediaQuery.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isTouchDevice;
}