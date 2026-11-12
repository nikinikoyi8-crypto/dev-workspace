import { useEffect, useState } from 'react';

export type StoryViewport = 'mobile' | 'tablet' | 'desktop';

function readViewport(): StoryViewport {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia('(max-width: 767px)').matches) return 'mobile';
  if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet';
  return 'desktop';
}

export function useStoryViewport(): StoryViewport {
  const [viewport, setViewport] = useState<StoryViewport>(readViewport);

  useEffect(() => {
    const queries = [
      window.matchMedia('(max-width: 767px)'),
      window.matchMedia('(min-width: 768px) and (max-width: 1023px)'),
      window.matchMedia('(min-width: 1024px)'),
    ];
    const update = () => setViewport(readViewport());
    queries.forEach((query) => query.addEventListener('change', update));
    return () => queries.forEach((query) => query.removeEventListener('change', update));
  }, []);

  return viewport;
}
