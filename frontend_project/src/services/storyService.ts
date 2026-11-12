import type { StoryLayer } from '@/components/stories/useStoryLayers';

export type StoryMediaType = 'image' | 'video';
export type StoryAudience = 'everyone' | 'followers';
export type StoryFrame = 'none' | 'gallery' | 'paper';
export type StoryMediaBackground = 'solid' | 'blur';
export type StoryMediaFitMode = 'fill' | 'fit';
export type StoryReaction = 'heart' | 'fire' | 'clap' | 'sparkle';

export interface StoryViewerProfile {
  id: string;
  name: string;
  avatarUrl: string;
  viewedAt: number;
  liked: boolean;
  reaction?: StoryReaction;
}

export interface StoryProcess {
  groupId: string;
  step: number;
  label: string;
  total: number;
}

export interface StoryArtworkCard {
  title: string;
  technique: string;
  dimensions: string;
  year: string;
  profileUrl: string;
}

export interface StoryMediaTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Story {
  id: string;
  mediaUrl: string;
  type: StoryMediaType;
  caption: string;
  audience: StoryAudience;
  posterUrl?: string;
  mediaTransform?: StoryMediaTransform;
  overlays?: StoryLayer[];
  moodFilter?: string;
  mediaBackground?: StoryMediaBackground;
  mediaFitMode?: StoryMediaFitMode;
  backgroundColor?: string;
  frame?: StoryFrame;
  ownerId?: string;
  username?: string;
  artistName?: string;
  artistAvatarUrl?: string;
  artistProfileUrl?: string;
  palette?: string[];
  viewers: StoryViewerProfile[];
  likeCount: number;
  viewCount: number;
  process?: StoryProcess;
  artworkCard?: StoryArtworkCard;
  createdAt: number;
  expiresAt: number;
}

export interface CreateStoryInput {
  mediaUrl: string;
  type: StoryMediaType;
  caption?: string;
  audience?: StoryAudience;
  posterUrl?: string;
  mediaTransform?: StoryMediaTransform;
  overlays?: StoryLayer[];
  moodFilter?: string;
  mediaBackground?: StoryMediaBackground;
  mediaFitMode?: StoryMediaFitMode;
  backgroundColor?: string;
  durationHours?: 6 | 12 | 24 | 48;
  frame?: StoryFrame;
  ownerId?: string;
  username?: string;
  artistName?: string;
  artistAvatarUrl?: string;
  artistProfileUrl?: string;
  palette?: string[];
  process?: StoryProcess;
  artworkCard?: StoryArtworkCard;
}

export interface CreateStoryOptions {
  id?: string;
  onOptimisticCreate?: (story: Story) => void;
}

const STORIES_STORAGE_KEY = 'artistry_stories';
const SEEN_STORIES_STORAGE_PREFIX = 'artistry_seen_stories:';
const DEFAULT_DURATION_HOURS = 24;
const DATABASE_NAME = 'artistry-moments';
const DATABASE_VERSION = 1;
const OBJECT_STORE = 'stories';
const DEMO_ENGAGEMENT_ENABLED = import.meta.env.DEV && import.meta.env.VITE_STORY_ENGAGEMENT_DEMO === 'true';
let writeQueue: Promise<unknown> = Promise.resolve();

interface StoredStoryRecord {
  id: string;
  story: Omit<Story, 'mediaUrl' | 'posterUrl'>;
  mediaBlob?: Blob;
  posterBlob?: Blob;
  mediaUrl?: string;
  posterUrl?: string;
}

export type StoryUserIdentity = Pick<Story, 'ownerId' | 'artistProfileUrl' | 'username'>;

export function canonicalizeUserKey(value?: string | null): string {
  let key = value?.trim() ?? '';
  if (!key) return '';

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(key)) {
    try {
      key = new URL(key).pathname;
    } catch {
      return '';
    }
  }

  key = key.split(/[?#]/, 1)[0].trim().replace(/\/+$/, '');
  key = key.replace(/^\/artist\//i, '');
  if (key.startsWith('/')) {
    const segments = key.split('/').filter(Boolean);
    if (segments.length === 1 && ['profile', 'profiles', 'user', 'users'].includes(segments[0].toLowerCase())) return '';
    key = segments.at(-1) ?? '';
  }

  return key.trim().replace(/^@+/, '').replace(/\/+$/, '').toLowerCase();
}

export function getStoryUserKey(user: StoryUserIdentity): string | undefined {
  for (const value of [user.ownerId, user.artistProfileUrl, user.username]) {
    const key = canonicalizeUserKey(value);
    if (key) return key;
  }
  return undefined;
}

export function loadSeenStoryIds(userKey: string): string[] {
  try {
    const canonicalKey = canonicalizeUserKey(userKey);
    if (!canonicalKey) return [];
    const matchingStorageKeys = new Set<string>([`${SEEN_STORIES_STORAGE_PREFIX}${encodeURIComponent(canonicalKey)}`]);
    for (let index = 0; index < localStorage.length; index += 1) {
      const storageKey = localStorage.key(index);
      if (!storageKey?.startsWith(SEEN_STORIES_STORAGE_PREFIX)) continue;
      const encodedUserKey = storageKey.slice(SEEN_STORIES_STORAGE_PREFIX.length);
      let storedUserKey = encodedUserKey;
      try { storedUserKey = decodeURIComponent(encodedUserKey); } catch { /* Keep malformed legacy keys unchanged. */ }
      if (canonicalizeUserKey(storedUserKey) === canonicalKey) matchingStorageKeys.add(storageKey);
    }

    const ids = new Set<string>();
    matchingStorageKeys.forEach((storageKey) => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) parsed.filter((id): id is string => typeof id === 'string').forEach((id) => ids.add(id));
    });
    const canonicalIds = [...ids];
    if (canonicalIds.length) persistSeenStoryIds(canonicalKey, canonicalIds);
    return canonicalIds;
  } catch {
    return [];
  }
}

export function persistSeenStoryIds(userKey: string, storyIds: string[]): void {
  try {
    const canonicalKey = canonicalizeUserKey(userKey);
    if (!canonicalKey) return;
    localStorage.setItem(`${SEEN_STORIES_STORAGE_PREFIX}${encodeURIComponent(canonicalKey)}`, JSON.stringify([...new Set(storyIds)]));
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

function openStoriesDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OBJECT_STORE)) {
        request.result.createObjectStore(OBJECT_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export function listStories(): Story[] {
  try {
    const stored = sessionStorage.getItem(STORIES_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStory)
      .filter((story) => story.expiresAt > Date.now() && !story.mediaUrl.startsWith('blob:') && !story.posterUrl?.startsWith('blob:'))
      .map(normalizeStory);
  } catch {
    return [];
  }
}

function normalizeStory(story: Story): Story {
  const viewers = Array.isArray(story.viewers) ? story.viewers : [];
  const userKey = getStoryUserKey(story);
  return {
    ...story,
    ...(userKey ? { ownerId: userKey } : {}),
    ...(story.username ? { username: canonicalizeUserKey(story.username) || story.username } : {}),
    viewers,
    viewCount: viewers.length,
    likeCount: viewers.filter((viewer) => viewer.liked).length,
  };
}

export function persistStories(stories: Story[]): void {
  const persistentStories = stories.filter((story) => !story.id.startsWith('demo-'));
  writeCompatibilityCache(persistentStories);
  void persistStoriesToDatabase(persistentStories);
}

function writeCompatibilityCache(stories: Story[]): void {
  try {
    // Only keep URL-backed legacy/text stories in sessionStorage; binary media belongs in IndexedDB.
    sessionStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories.filter((story) => !story.mediaUrl.startsWith('blob:') && !story.posterUrl?.startsWith('blob:'))));
  } catch {
    // Session storage may be disabled or full; IndexedDB remains the durable store.
  }
}

function serializeStoredStory(story: Omit<Story, 'mediaUrl' | 'posterUrl'>): string {
  return JSON.stringify(story);
}

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function toBlob(url?: string): Promise<Blob | undefined> {
  if (!url || (!url.startsWith('blob:') && !url.startsWith('data:'))) return undefined;
  try {
    return await (await fetch(url)).blob();
  } catch {
    return undefined;
  }
}

async function readRecord(database: IDBDatabase, id: string): Promise<StoredStoryRecord | undefined> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).get(id);
    request.onsuccess = () => resolve(request.result as StoredStoryRecord | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function writeRecord(database: IDBDatabase, record: StoredStoryRecord): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(OBJECT_STORE, 'readwrite');
    transaction.objectStore(OBJECT_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function makeRecord(story: Story, previous?: StoredStoryRecord): Promise<StoredStoryRecord> {
  const { mediaUrl, posterUrl, ...metadata } = story;
  const mediaBlob = previous?.mediaBlob ?? await toBlob(mediaUrl);
  const posterBlob = previous?.posterBlob ?? await toBlob(posterUrl);
  return {
    id: story.id,
    story: metadata,
    ...(mediaBlob ? { mediaBlob } : { mediaUrl }),
    ...(posterBlob ? { posterBlob } : posterUrl ? { posterUrl } : {}),
  };
}

async function persistOneStory(story: Story): Promise<void> {
  const database = await openStoriesDatabase();
  if (!database) return;
  try {
    const previous = await readRecord(database, story.id);
    const record = await makeRecord(story, previous);
    if (previous && serializeStoredStory(previous.story) === serializeStoredStory(record.story)) return;
    await writeRecord(database, record);
  } finally {
    database.close();
  }
}

async function persistStoriesToDatabase(stories: Story[]): Promise<void> {
  await enqueueWrite(async () => {
    const database = await openStoriesDatabase();
    if (!database) return;
    try {
      const stored = await new Promise<StoredStoryRecord[]>((resolve, reject) => {
        const request = database.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).getAll();
        request.onsuccess = () => resolve(request.result as StoredStoryRecord[]);
        request.onerror = () => reject(request.error);
      });
      const activeIds = new Set(stories.map((story) => story.id));
      await Promise.all(stored.filter((record) => !activeIds.has(record.id)).map((record) => new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE, 'readwrite');
        transaction.objectStore(OBJECT_STORE).delete(record.id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })));
      for (const story of stories) {
        const existing = stored.find((record) => record.id === story.id);
        const record = await makeRecord(story, existing);
        if (!existing || serializeStoredStory(existing.story) !== serializeStoredStory(record.story)) await writeRecord(database, record);
      }
    } catch {
      // Keep stories usable in memory if browser storage is unavailable.
    } finally {
      database.close();
    }
  });
}

export async function loadStories(): Promise<Story[]> {
  const database = await openStoriesDatabase();
  if (!database) return listStories();
  try {
    const records = await new Promise<StoredStoryRecord[]>((resolve, reject) => {
      const request = database.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).getAll();
      request.onsuccess = () => resolve(request.result as StoredStoryRecord[]);
      request.onerror = () => reject(request.error);
    });
    const stories = records
      // A blob URL is only valid in the document that created it; without its saved Blob it is stale.
      .filter((record) => !(record.mediaUrl?.startsWith('blob:') && !record.mediaBlob))
      .map((record): Story => normalizeStory({
      ...record.story,
      mediaUrl: record.mediaBlob ? URL.createObjectURL(record.mediaBlob) : record.mediaUrl ?? '',
      ...(record.posterBlob ? { posterUrl: URL.createObjectURL(record.posterBlob) } : record.posterUrl ? { posterUrl: record.posterUrl } : {}),
      })).filter((story) => !!story.mediaUrl && story.expiresAt > Date.now());
    const legacy = listStories().filter((story) => !stories.some((saved) => saved.id === story.id));
    return [...stories, ...legacy];
  } catch {
    return listStories();
  } finally {
    database.close();
  }
}

export function createStoryId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function createStory(input: CreateStoryInput, options: CreateStoryOptions = {}): Promise<Story> {
  const createdAt = Date.now();
  const story: Story = {
    id: options.id ?? createStoryId(),
    mediaUrl: input.mediaUrl,
    type: input.type,
    caption: input.caption?.trim() ?? '',
    audience: input.audience ?? 'everyone',
    posterUrl: input.posterUrl,
    mediaTransform: input.mediaTransform ?? { x: 0, y: 0, scale: 1, rotation: 0 },
    overlays: input.overlays,
    moodFilter: input.moodFilter ?? 'none',
    mediaBackground: input.mediaBackground ?? 'blur',
    mediaFitMode: input.mediaFitMode ?? 'fill',
    backgroundColor: input.backgroundColor ?? '#000000',
    frame: input.frame ?? 'none',
    ownerId: canonicalizeUserKey(input.ownerId) || undefined,
    username: canonicalizeUserKey(input.username) || undefined,
    artistName: input.artistName,
    artistAvatarUrl: input.artistAvatarUrl,
    artistProfileUrl: input.artistProfileUrl,
    palette: input.palette,
    process: input.process,
    artworkCard: input.artworkCard,
    viewers: [],
    likeCount: 0,
    viewCount: 0,
    createdAt,
    expiresAt: createdAt + (input.durationHours ?? DEFAULT_DURATION_HOURS) * 60 * 60 * 1000,
  };
  options.onOptimisticCreate?.(story);
  writeCompatibilityCache([...listStories(), story]);
  await enqueueWrite(() => persistOneStory(story));
  if (DEMO_ENGAGEMENT_ENABLED) scheduleDemoEngagement(story.id);
  return story;
}

export async function deleteStory(id: string): Promise<void> {
  writeCompatibilityCache(listStories().filter((story) => story.id !== id));
  await enqueueWrite(async () => {
    const database = await openStoriesDatabase();
    if (!database) return;
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE, 'readwrite');
        transaction.objectStore(OBJECT_STORE).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  });
}

async function updateViewers(id: string, update: (viewers: StoryViewerProfile[], record: StoredStoryRecord) => StoryViewerProfile[]): Promise<StoryViewerProfile[]> {
  return enqueueWrite(async () => {
    const database = await openStoriesDatabase();
    if (!database) return [];
    try {
      const record = await readRecord(database, id);
      if (!record) return [];
      const viewers = update(record.story.viewers ?? [], record);
      const nextStory = { ...record.story, viewers, viewCount: viewers.length, likeCount: viewers.filter((viewer) => viewer.liked).length };
      await writeRecord(database, { ...record, story: nextStory });
      updateCompatibilityViewers(id, nextStory);
      return viewers;
    } finally {
      database.close();
    }
  });
}

function updateCompatibilityViewers(id: string, story: Omit<Story, 'mediaUrl' | 'posterUrl'>): void {
  try {
    const stored = sessionStorage.getItem(STORIES_STORAGE_KEY);
    if (!stored) return;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return;
    const next = parsed.map((item) => item && typeof item === 'object' && (item as Partial<Story>).id === id ? { ...item, ...story } : item);
    sessionStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Session cache is only a compatibility layer; IndexedDB is authoritative.
  }
}

export async function recordView(id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>): Promise<StoryViewerProfile[]> {
  return updateViewers(id, (viewers, record) => {
    if (record.story.ownerId === viewer.id || viewers.some((item) => item.id === viewer.id)) return viewers;
    return [...viewers, { ...viewer, viewedAt: Date.now(), liked: false }];
  });
}

export async function toggleLike(id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>): Promise<StoryViewerProfile[]> {
  const now = Date.now();
  return updateViewers(id, (viewers) => {
    const existing = viewers.find((item) => item.id === viewer.id);
    if (existing) return viewers.map((item) => item.id === viewer.id ? { ...item, liked: !item.liked } : item);
    return [...viewers, { ...viewer, viewedAt: now, liked: true }];
  });
}

export async function setReaction(id: string, viewer: Omit<StoryViewerProfile, 'viewedAt' | 'liked' | 'reaction'>, reaction: StoryReaction): Promise<StoryViewerProfile[]> {
  return updateViewers(id, (viewers) => {
    const existing = viewers.find((item) => item.id === viewer.id);
    if (existing) return viewers.map((item) => item.id === viewer.id ? { ...item, reaction: item.reaction === reaction ? undefined : reaction } : item);
    return [...viewers, { ...viewer, viewedAt: Date.now(), liked: false, reaction }];
  });
}

export async function listViewers(id: string): Promise<StoryViewerProfile[]> {
  const database = await openStoriesDatabase();
  if (!database) return [];
  try {
    const record = await readRecord(database, id);
    return record?.story.viewers ?? [];
  } finally {
    database.close();
  }
}

const DEMO_VIEWERS: Array<Omit<StoryViewerProfile, 'viewedAt' | 'liked'>> = [
  { id: 'demo-viewer-1', name: 'Mara Voss', avatarUrl: demoAvatar('#d16c8b', 'MV') },
  { id: 'demo-viewer-2', name: 'Kenji Arai', avatarUrl: demoAvatar('#6c83c8', 'KA') },
  { id: 'demo-viewer-3', name: 'Lina Park', avatarUrl: demoAvatar('#61aa97', 'LP') },
  { id: 'demo-viewer-4', name: 'Theo Martin', avatarUrl: demoAvatar('#d3995b', 'TM') },
];

function demoAvatar(color: string, initials: string): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#211827"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><text x="48" y="57" fill="white" font-family="sans-serif" font-size="28" font-weight="700" text-anchor="middle">${initials}</text></svg>`)}`;
}

function scheduleDemoEngagement(storyId: string): void {
  DEMO_VIEWERS.forEach((viewer, index) => {
    window.setTimeout(() => {
      void recordView(storyId, viewer);
      if (index % 2 === 0) window.setTimeout(() => void toggleLike(storyId, viewer), 250);
    }, 900 + Math.random() * 7_000);
  });
}

function isStory(value: unknown): value is Story {
  if (!value || typeof value !== 'object') return false;
  const story = value as Partial<Story>;
  return typeof story.id === 'string' &&
    typeof story.mediaUrl === 'string' &&
    (story.type === 'image' || story.type === 'video') &&
    typeof story.caption === 'string' &&
    (story.audience === 'everyone' || story.audience === 'followers') &&
    (story.posterUrl === undefined || typeof story.posterUrl === 'string') &&
    (story.mediaTransform === undefined || (
      typeof story.mediaTransform.x === 'number' &&
      typeof story.mediaTransform.y === 'number' &&
      typeof story.mediaTransform.scale === 'number' &&
      typeof story.mediaTransform.rotation === 'number')) &&
    (story.overlays === undefined || Array.isArray(story.overlays)) &&
    (story.frame === undefined || story.frame === 'none' || story.frame === 'gallery' || story.frame === 'paper') &&
    (story.viewers === undefined || Array.isArray(story.viewers)) &&
    typeof story.createdAt === 'number' &&
    typeof story.expiresAt === 'number';
}
