import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Use the static PNG from `public/` instead of the heavy animated WebP
const LOGO_SRC = '/assets/images/logo-icon.png';

// Show the logo for 4 seconds before fading out
const DISPLAY_MS = 4000;
// Simple fade duration for both fade-in and fade-out
const FADE_MS = 300;

export default function Splash() {
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let enterTimer: number | undefined;
    let exitTimer: number | undefined;
    let navigationTimer: number | undefined;

    // Trigger fade-in on next tick so CSS transition runs
    enterTimer = window.setTimeout(() => setEntered(true), 20);

    // After DISPLAY_MS, start fade-out and navigate after fade completes
    exitTimer = window.setTimeout(() => setLeaving(true), DISPLAY_MS);
    navigationTimer = window.setTimeout(() => navigate('/welcome'), DISPLAY_MS + FADE_MS);

    return () => {
      if (enterTimer) window.clearTimeout(enterTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
      if (navigationTimer) window.clearTimeout(navigationTimer);
    };
  }, [navigate]);

  return (
    <main
      className={`fixed inset-0 flex items-center justify-center bg-[#0D0A10] transition-opacity ease-out ${
        entered && !leaving ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transitionDuration: `${FADE_MS}ms`,
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        overflow: 'hidden',
        transform: 'none',
        animation: 'none',
      }}
    >
      <img
        src={LOGO_SRC}
        alt="Artistry"
        draggable={false}
        loading="eager"
        decoding="sync"
        aria-hidden
        className="object-contain select-none block w-[60vw] max-w-[320px] md:w-[30vw] md:max-w-[420px] h-auto max-h-[60vh] md:max-h-[70vh]"
        style={{
          background: 'transparent',
          display: 'block',
          margin: '0 auto',
          maxWidth: '80vw',
          objectFit: 'contain',
          transition: `opacity ${FADE_MS}ms ease-out`,
          opacity: entered && !leaving ? 1 : 0,
        }}
      />
    </main>
  );
}
