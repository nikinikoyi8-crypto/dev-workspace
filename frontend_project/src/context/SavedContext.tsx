import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type SavedItemType = 'post' | 'reel';

type SavedContextValue = {
  toggleSaved: (id: number, type: SavedItemType) => void;
  isSaved: (id: number, type: SavedItemType) => boolean;
};

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());

  const value = useMemo<SavedContextValue>(() => ({
    toggleSaved: (id, type) => {
      setSavedKeys((currentKeys) => {
        const key = `${type}-${id}`;
        const nextKeys = new Set(currentKeys);
        if (nextKeys.has(key)) nextKeys.delete(key);
        else nextKeys.add(key);
        return nextKeys;
      });
    },
    isSaved: (id, type) => savedKeys.has(`${type}-${id}`),
  }), [savedKeys]);

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const context = useContext(SavedContext);
  if (!context) throw new Error('useSaved must be used within SavedProvider');
  return context;
}
