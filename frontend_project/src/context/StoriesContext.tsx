import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { useFollowing } from '@/context/FollowingContext';
import { useLanguage } from '@/context/useLanguage';
import { canonicalizeUserKey, createStory, createStoryId, deleteStory, getStoryUserKey, listStories, loadSeenStoryIds, loadStories, persistSeenStoryIds, persistStories, recordView as serviceRecordView, toggleLike as serviceToggleLike, setReaction as serviceSetReaction, listViewers as serviceListViewers } from '@/services/storyService';
import type { CreateStoryInput, Story, StoryReaction, StoryViewerProfile } from '@/services/storyService';
import { getDemoStories } from '@/data/demoStories';

interface StoriesContextValue {
  stories: Story[];
  viewerRequest: StoryViewerRequest | null;
  isStoryVisible: (story: Story) => boolean;
  getUserStories: (userKey: string) => Story[];
  getFirstUnseenStoryIndex: (userKey: string) => number;
  hasActiveStory: (userKey: string) => boolean;
  hasUnseenStory: (userKey: string) => boolean;
  markStorySeen: (storyId: string) => void;
  openStories: (userKey: string, startAtFirstUnseen?: boolean, options?: StoryViewerOptions) => void;
  closeStories: () => void;
  addStory: (input: CreateStoryInput) => Promise<Story>;
  removeStory: (id: string) => Promise<void>;
  recordView: (id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>) => Promise<void>;
  toggleLike: (id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>) => Promise<void>;
  setReaction: (id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>, reaction: StoryReaction) => Promise<void>;
  listViewers: (id: string) => Promise<StoryViewerProfile[]>;
}

export interface StoryStatus {
  hasActiveStory: boolean;
  hasUnseenStory: boolean;
}

interface StoryStatusStore {
  snapshots: ReadonlyMap<string, StoryStatus>;
  listeners: Map<string, Set<() => void>>;
  openStories: (userKey: string) => void;
  subscribe: (userKey: string, listener: () => void) => () => void;
  getSnapshot: (userKey: string) => StoryStatus;
}

const EMPTY_STORY_STATUS: StoryStatus = { hasActiveStory: false, hasUnseenStory: false };

export interface StoryViewerOptions {
  storyGroups?: Story[][];
  initialGroupIndex?: number;
  onStoryGroupChange?: (stories: Story[]) => void;
}

export interface StoryViewerRequest extends StoryViewerOptions {
  userKey: string;
  startAtFirstUnseen: boolean;
  requestId: number;
}

const StoriesContext = createContext<StoriesContextValue | null>(null);
const StoryStatusContext = createContext<StoryStatusStore | null>(null);

function createStoryStatusStore(): StoryStatusStore {
  const store: StoryStatusStore = {
    snapshots: new Map(),
    listeners: new Map(),
    openStories: () => undefined,
    subscribe(userKey, listener) {
      const listeners = store.listeners.get(userKey) ?? new Set<() => void>();
      listeners.add(listener);
      store.listeners.set(userKey, listeners);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) store.listeners.delete(userKey);
      };
    },
    getSnapshot: (userKey) => store.snapshots.get(userKey) ?? EMPTY_STORY_STATUS,
  };
  return store;
}

export function StoriesProvider({ children }: { children: ReactNode }) {
  const { state: profile } = useOnboarding();
  const { isFollowing, hasFollowingData } = useFollowing();
  const { t } = useLanguage();
  const currentUserKey = canonicalizeUserKey(profile.username || profile.email || 'current-artist') || 'current-artist';
  const demoStories = useMemo(() => getDemoStories(t), [t]);
  const [stories, setStories] = useState<Story[]>(() => [...listStories(), ...demoStories]);
  const [storyStatusStore] = useState(createStoryStatusStore);
  const [viewerRequest, setViewerRequest] = useState<StoryViewerRequest | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [seenState, setSeenState] = useState(() => ({ userKey: currentUserKey, ids: loadSeenStoryIds(currentUserKey) }));
  const checkedBlobUrls = useRef(new Set<string>());
  const [verifiedBlobUrls, setVerifiedBlobUrls] = useState<ReadonlySet<string>>(() => new Set());
  const seenStoryIds = seenState.userKey === currentUserKey ? seenState.ids : [];
  const isStoryVisible = useCallback((story: Story) => {
    if (story.mediaUrl.startsWith('blob:') && !verifiedBlobUrls.has(story.mediaUrl)) return false;
    if (story.audience !== 'followers' || getStoryUserKey(story) === currentUserKey) return true;
    // TODO: Replace this permissive fallback once follower relationships are loaded from the backend.
    if (!hasFollowingData) return true;
    return [story.ownerId, story.username, story.artistProfileUrl].some((handle) => {
      const normalizedHandle = canonicalizeUserKey(handle);
      return normalizedHandle && isFollowing(normalizedHandle);
    });
  }, [currentUserKey, hasFollowingData, isFollowing, verifiedBlobUrls]);
  const statusSnapshots = useMemo(() => {
    const storiesByUser = new Map<string, { hasUnseenStory: boolean }>();
    for (const story of stories) {
      if (story.expiresAt <= Date.now() || !isStoryVisible(story)) continue;
      const userKey = getStoryUserKey(story);
      if (!userKey) continue;
      const status = storiesByUser.get(userKey) ?? { hasUnseenStory: false };
      if (!seenStoryIds.includes(story.id)) status.hasUnseenStory = true;
      storiesByUser.set(userKey, status);
    }

    const nextSnapshots = new Map<string, StoryStatus>();
    storiesByUser.forEach((status, userKey) => {
      const previous = storyStatusStore.snapshots.get(userKey);
      nextSnapshots.set(userKey, previous?.hasUnseenStory === status.hasUnseenStory
        ? previous
        : { hasActiveStory: true, hasUnseenStory: status.hasUnseenStory });
    });
    return nextSnapshots;
  }, [isStoryVisible, seenStoryIds, stories, storyStatusStore]);
  useLayoutEffect(() => {
    const previous = storyStatusStore.snapshots;
    storyStatusStore.snapshots = statusSnapshots;
    const userKeys = new Set([...previous.keys(), ...statusSnapshots.keys()]);
    userKeys.forEach((userKey) => {
      const before = previous.get(userKey) ?? EMPTY_STORY_STATUS;
      const after = statusSnapshots.get(userKey) ?? EMPTY_STORY_STATUS;
      if (before.hasActiveStory === after.hasActiveStory && before.hasUnseenStory === after.hasUnseenStory) return;
      storyStatusStore.listeners.get(userKey)?.forEach((listener) => listener());
    });
  }, [statusSnapshots, storyStatusStore]);

  useEffect(() => {
    const demoIds = new Set(demoStories.map((story) => story.id));
    setStories((current) => [...current.filter((story) => !demoIds.has(story.id) && !story.id.startsWith('demo-')), ...demoStories]);
  }, [demoStories]);

  useEffect(() => {
    let active = true;
    void loadStories().then((loadedStories) => {
      if (!active) {
        loadedStories.forEach(revokeStoryUrls);
        return;
      }
      setStories((current) => {
        const validLoadedStories = loadedStories.filter((story) => !story.id.startsWith('demo-'));
        const loadedIds = new Set(validLoadedStories.map((story) => story.id));
        return [...validLoadedStories, ...current.filter((story) => !loadedIds.has(story.id) && story.expiresAt > Date.now())];
      });
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistStories(stories);
  }, [hydrated, stories]);

  useEffect(() => {
    const candidates = stories.filter((story) => story.mediaUrl.startsWith('blob:') && !checkedBlobUrls.current.has(story.mediaUrl));
    if (!candidates.length) return;
    let active = true;
    void Promise.all(candidates.map(async (story) => {
      try {
        const response = await fetch(story.mediaUrl);
        return { story, available: response.ok };
      } catch {
        return { story, available: false };
      }
    })).then((results) => {
      if (!active) return;
      results.forEach(({ story }) => checkedBlobUrls.current.add(story.mediaUrl));
      const verifiedUrls = results.filter((result) => result.available).map((result) => result.story.mediaUrl);
      if (verifiedUrls.length) {
        setVerifiedBlobUrls((current) => new Set([...current, ...verifiedUrls]));
      }
      const unavailable = results.filter((result) => !result.available).map((result) => result.story);
      if (!unavailable.length) return;
      const unavailableIds = new Set(unavailable.map((story) => story.id));
      unavailable.forEach((story) => {
        revokeStoryUrls(story);
        void deleteStory(story.id).catch(() => undefined);
      });
      setStories((current) => current.filter((story) => !unavailableIds.has(story.id)));
    });
    return () => { active = false; };
  }, [stories]);

  useEffect(() => {
    const activeBlobUrls = new Set(stories.filter((story) => story.mediaUrl.startsWith('blob:')).map((story) => story.mediaUrl));
    checkedBlobUrls.current.forEach((url) => {
      if (!activeBlobUrls.has(url)) checkedBlobUrls.current.delete(url);
    });
    setVerifiedBlobUrls((current) => {
      const next = new Set([...current].filter((url) => activeBlobUrls.has(url)));
      return next.size === current.size ? current : next;
    });
  }, [stories]);

  useEffect(() => {
    if (seenState.userKey === currentUserKey) return;
    setSeenState({ userKey: currentUserKey, ids: loadSeenStoryIds(currentUserKey) });
  }, [currentUserKey, seenState.userKey]);

  useEffect(() => {
    if (!hydrated || seenState.userKey !== currentUserKey) return;
    const activeIds = new Set(stories.filter((story) => story.expiresAt > Date.now()).map((story) => story.id));
    const retainedIds = seenState.ids.filter((id) => activeIds.has(id));
    if (retainedIds.length !== seenState.ids.length) {
      setSeenState({ userKey: currentUserKey, ids: retainedIds });
    }
  }, [currentUserKey, hydrated, seenState, stories]);

  useEffect(() => {
    if (seenState.userKey === currentUserKey) persistSeenStoryIds(currentUserKey, seenState.ids);
  }, [currentUserKey, seenState]);

  useEffect(() => {
    if (!hydrated) return;
    const expiredStories = stories.filter((story) => story.expiresAt <= Date.now());
    if (expiredStories.length) {
      expiredStories.forEach(revokeStoryUrls);
      setStories((current) => current.filter((story) => story.expiresAt > Date.now()));
      return;
    }
    const nextExpiration = stories.reduce<number | null>((nearest, story) => (
      story.expiresAt > Date.now() && (nearest === null || story.expiresAt < nearest) ? story.expiresAt : nearest
    ), null);
    if (nextExpiration === null) return;
    const timeoutId = window.setTimeout(() => {
      setStories((current) => {
        const activeStories = current.filter((story) => story.expiresAt > Date.now());
        current.filter((story) => story.expiresAt <= Date.now()).forEach(revokeStoryUrls);
        return activeStories.length === current.length ? current : activeStories;
      });
    }, Math.max(0, nextExpiration - Date.now()) + 1);
    return () => window.clearTimeout(timeoutId);
  }, [hydrated, stories]);

  const addStory = useCallback(async (input: CreateStoryInput) => {
    const id = createStoryId();
    let optimisticStory: Story | undefined;
    try {
      return await createStory(input, {
        id,
        onOptimisticCreate: (story) => {
          optimisticStory = story;
          setStories((current) => [...current.filter((item) => item.id !== id && item.expiresAt > Date.now()), story]);
        },
      });
    } catch (error) {
      setStories((current) => current.filter((story) => story.id !== id));
      if (optimisticStory) revokeStoryUrls(optimisticStory);
      await deleteStory(id).catch(() => undefined);
      throw error;
    }
  }, []);

  const removeStory = useCallback(async (id: string) => {
    const removed = stories.find((story) => story.id === id);
    setStories((current) => current.filter((story) => story.id !== id));
    setViewerRequest((current) => current?.storyGroups ? {
      ...current,
      storyGroups: current.storyGroups.map((group) => group.filter((story) => story.id !== id)),
    } : current);
    setSeenState((current) => current.userKey === currentUserKey ? { ...current, ids: current.ids.filter((seenId) => seenId !== id) } : current);
    if (removed) revokeStoryUrls(removed);
    await deleteStory(id);
  }, [currentUserKey, stories]);

  const getUserStories = useCallback((userKey: string) => stories
    .filter((story) => story.expiresAt > Date.now() && getStoryUserKey(story) === canonicalizeUserKey(userKey) && isStoryVisible(story))
    .sort((a, b) => a.createdAt - b.createdAt), [isStoryVisible, stories]);

  const hasActiveStory = useCallback((userKey: string) => getUserStories(userKey).length > 0, [getUserStories]);

  const hasUnseenStory = useCallback((userKey: string) => getUserStories(userKey).some((story) => !seenStoryIds.includes(story.id)), [getUserStories, seenStoryIds]);

  const getFirstUnseenStoryIndex = useCallback((userKey: string) => {
    const userStories = getUserStories(userKey);
    const index = userStories.findIndex((story) => !seenStoryIds.includes(story.id));
    return index < 0 ? 0 : index;
  }, [getUserStories, seenStoryIds]);

  const markStorySeen = useCallback((storyId: string) => {
    if (!stories.some((story) => story.id === storyId && story.expiresAt > Date.now())) return;
    setSeenState((current) => {
      const ids = current.userKey === currentUserKey ? current.ids : loadSeenStoryIds(currentUserKey);
      return ids.includes(storyId) ? { userKey: currentUserKey, ids } : { userKey: currentUserKey, ids: [...ids, storyId] };
    });
  }, [currentUserKey, stories]);

  const openStories = useCallback((userKey: string, startAtFirstUnseen = true, options?: StoryViewerOptions) => {
    setViewerRequest({ userKey: canonicalizeUserKey(userKey), startAtFirstUnseen, ...options, requestId: Date.now() + Math.random() });
  }, []);
  storyStatusStore.openStories = (userKey) => openStories(userKey);

  const closeStories = useCallback(() => setViewerRequest(null), []);

  const applyViewers = useCallback((id: string, viewers: StoryViewerProfile[]) => {
    setStories((current) => current.map((story) => story.id === id ? {
      ...story,
      viewers,
      viewCount: viewers.length,
      likeCount: viewers.filter((viewer) => viewer.liked).length,
    } : story));
  }, []);

  const recordView = useCallback(async (id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>) => {
    const viewers = await serviceRecordView(id, viewer);
    if (viewers.length) applyViewers(id, viewers);
  }, [applyViewers]);

  const toggleLike = useCallback(async (id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>) => {
    const viewers = await serviceToggleLike(id, viewer);
    if (viewers.length) applyViewers(id, viewers);
  }, [applyViewers]);

  const setReaction = useCallback(async (id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>, reaction: StoryReaction) => {
    const viewers = await serviceSetReaction(id, viewer, reaction);
    if (viewers.length) applyViewers(id, viewers);
  }, [applyViewers]);

  const listViewers = useCallback((id: string) => serviceListViewers(id), []);

  const value = useMemo(() => ({ stories, viewerRequest, isStoryVisible, getUserStories, getFirstUnseenStoryIndex, hasActiveStory, hasUnseenStory, markStorySeen, openStories, closeStories, addStory, removeStory, recordView, toggleLike, setReaction, listViewers }), [stories, viewerRequest, isStoryVisible, getUserStories, getFirstUnseenStoryIndex, hasActiveStory, hasUnseenStory, markStorySeen, openStories, closeStories, addStory, removeStory, recordView, toggleLike, setReaction, listViewers]);
  return <StoryStatusContext.Provider value={storyStatusStore}>
    <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>
  </StoryStatusContext.Provider>;
}

function revokeStoryUrls(story: Story) {
  new Set([story.mediaUrl, story.posterUrl].filter((url): url is string => !!url && url.startsWith('blob:')))
    .forEach((url) => URL.revokeObjectURL(url));
}

export function useStories() {
  const context = useContext(StoriesContext);
  if (!context) throw new Error('useStories must be used within StoriesProvider');
  return context;
}

export function useStoryStatus(userKey: string): StoryStatus {
  const store = useContext(StoryStatusContext);
  if (!store) throw new Error('useStoryStatus must be used within StoriesProvider');
  const canonicalKey = canonicalizeUserKey(userKey);
  const subscribe = useCallback((listener: () => void) => store.subscribe(canonicalKey, listener), [store, canonicalKey]);
  const getSnapshot = useCallback(() => store.getSnapshot(canonicalKey), [store, canonicalKey]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useOpenStories(userKey: string): () => void {
  const store = useContext(StoryStatusContext);
  if (!store) throw new Error('useOpenStories must be used within StoriesProvider');
  const canonicalKey = canonicalizeUserKey(userKey);
  return useCallback(() => store.openStories(canonicalKey), [store, canonicalKey]);
}
