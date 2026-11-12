import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { canonicalizeUserKey } from '@/services/storyService';

type FollowingContextValue = {
  isFollowing: (handle: string) => boolean;
  hasFollowingData: boolean;
  toggleFollowing: (handle: string) => void;
  followingCount: number;
};

const STORAGE_KEY = 'art-social-following';
const FollowingContext = createContext<FollowingContextValue | null>(null);

function readFollowing(): Set<string> {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const handles = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(handles) ? handles.filter((handle): handle is string => typeof handle === 'string').map(canonicalizeUserKey).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

export function FollowingProvider({ children }: { children: ReactNode }) {
  const [followingHandles, setFollowingHandles] = useState<Set<string>>(readFollowing);
  const [hasFollowingData, setHasFollowingData] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
  });

  const value = useMemo<FollowingContextValue>(() => ({
    isFollowing: (handle) => followingHandles.has(canonicalizeUserKey(handle)),
    hasFollowingData,
    followingCount: followingHandles.size,
    toggleFollowing: (handle) => {
      setHasFollowingData(true);
      setFollowingHandles((currentHandles) => {
        const nextHandles = new Set(currentHandles);
        const canonicalHandle = canonicalizeUserKey(handle);
        if (nextHandles.has(canonicalHandle)) nextHandles.delete(canonicalHandle);
        else if (canonicalHandle) nextHandles.add(canonicalHandle);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...nextHandles]));
        } catch {}
        return nextHandles;
      });
    },
  }), [followingHandles, hasFollowingData]);

  return <FollowingContext.Provider value={value}>{children}</FollowingContext.Provider>;
}

export function useFollowing() {
  const context = useContext(FollowingContext);
  if (!context) throw new Error('useFollowing must be used within FollowingProvider');
  return context;
}
