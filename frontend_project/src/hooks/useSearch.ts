import { useEffect, useMemo, useState } from 'react';
import type { Artwork } from '@/pages/MainApp';

export type SearchTab = 'top' | 'accounts' | 'tags';
export type SearchRecent = { key: string; title: string; subtitle: string; handle: string; imageUrl?: string; workId: number };

const STORAGE_KEY = 'artsocial-search-recent';

export function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean).join(' ');
}

function readRecent(): SearchRecent[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is SearchRecent => Boolean(item && typeof item === 'object' && 'key' in item && 'title' in item && 'handle' in item)) : [];
  } catch {
    return [];
  }
}

export function useSearch(works: Artwork[]) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('top');
  const [recent, setRecent] = useState<SearchRecent[]>(readRecent);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 10)));
    } catch {
      // Storage may be unavailable in restricted contexts.
    }
  }, [recent]);

  const normalizedQuery = normalizeSearch(debouncedQuery);
  const matchingWorks = useMemo(() => {
    if (!normalizedQuery) return [];
    return works.filter((work) => normalizeSearch([work.artist, work.handle, work.title, work.medium, work.caption].join(' ')).includes(normalizedQuery));
  }, [normalizedQuery, works]);
  const accounts = useMemo(() => {
    const seen = new Set<string>();
    return matchingWorks.filter((work) => !seen.has(work.handle) && seen.add(work.handle));
  }, [matchingWorks]);
  const tags = useMemo(() => {
    const seen = new Set<string>();
    return matchingWorks.filter((work) => {
      const tag = normalizeSearch(work.medium);
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
  }, [matchingWorks]);

  const addRecent = (work: Artwork) => {
    const item: SearchRecent = { key: work.handle, title: work.artist, subtitle: work.handle, handle: work.handle, imageUrl: work.avatarUrl, workId: work.id };
    setRecent((items) => [item, ...items.filter((entry) => entry.key !== item.key)].slice(0, 10));
  };

  return {
    query, setQuery, tab, setTab, recent, matchingWorks, accounts, tags, addRecent,
    removeRecent: (key: string) => setRecent((items) => items.filter((item) => item.key !== key)),
    clearRecent: () => setRecent([]),
    hasQuery: Boolean(normalizedQuery),
  };
}
