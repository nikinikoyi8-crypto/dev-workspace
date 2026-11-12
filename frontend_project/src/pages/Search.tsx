import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search as SearchIcon, X } from 'lucide-react';
import { useLanguage } from '@/context/useLanguage';
import { useSearch, type SearchRecent } from '@/hooks/useSearch';
import { ARTWORKS, REELS, type Artwork } from '@/pages/MainApp';
import { ProfileFeedModalDesktop, ProfileFeedOverlay, ProfileReelsModalDesktop } from '@/pages/ProfileFeedViewers';
import ReelsImmersiveViewer from '@/components/ReelsImmersiveViewer';
import BottomNav from '@/components/BottomNav';
import { ArtworkTile, SearchRecentList, SearchResultRows } from '@/components/SearchResults';
import { cn } from '@/utils/cn';

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return desktop;
}

function createExploreItems() {
  return Array.from({ length: 6 }, () => [...ARTWORKS, ...REELS]).flat().map((work, index) => ({ ...work, id: work.id * 100 + index }));
}

const EXPLORE_BATCH_SIZE = 18;

export default function Search() {
  const { t } = useLanguage();
  const desktop = useDesktop();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Artwork | null>(null);
  const [feedIndex, setFeedIndex] = useState<number | null>(null);
  const [reelStartIndex, setReelStartIndex] = useState(0);
  const [postStartIndex, setPostStartIndex] = useState(0);
  const exploreItems = useMemo(createExploreItems, []);
  const searchReelItems = useMemo(() => exploreItems.filter((work) => work.videoUrl), [exploreItems]);
  const searchPostItems = useMemo(() => exploreItems.filter((work) => !work.videoUrl), [exploreItems]);
  const [visibleExploreCount, setVisibleExploreCount] = useState(EXPLORE_BATCH_SIZE);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const exploreLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const exploreLoadTimerRef = useRef<number | null>(null);
  const searchableItems = useMemo(() => [...ARTWORKS, ...REELS.filter((reel) => !ARTWORKS.some((work) => work.id === reel.id))], []);
  const search = useSearch(searchableItems);
  const hasMoreExploreItems = visibleExploreCount < exploreItems.length;
  const showingExplore = !search.hasQuery && !(focused && search.recent.length > 0);
  const isReel = selectedWork?.videoUrl != null;
  const feedItems = isReel ? searchReelItems : searchPostItems;
  const selectedReelIndex = selectedWork ? searchReelItems.findIndex((item) => item.id === selectedWork.id) : -1;
  const mobilePostViewerItems = searchPostItems.slice(postStartIndex);

  const openWork = (work: Artwork) => {
    const canonicalWork = searchableItems.find((candidate) => candidate.handle === work.handle && candidate.title === work.title) ?? work;
    search.addRecent(canonicalWork);
    if (canonicalWork.videoUrl) {
      const reelIndex = Math.max(0, searchReelItems.findIndex((item) => item.title === work.title && item.handle === work.handle));
      setReelStartIndex(reelIndex);
      setSelectedWork(searchReelItems[reelIndex] ?? canonicalWork);
      return;
    }
    const index = Math.max(0, searchPostItems.findIndex((item) => item.title === work.title && item.handle === work.handle));
    setPostStartIndex(index >= 0 ? index : 0);
    setFeedIndex(index >= 0 ? index : 0);
  };

  const selectRecent = (item: SearchRecent) => {
    const work = searchableItems.find((candidate) => candidate.handle === item.handle);
    if (work) openWork(work);
  };

  const closeViewer = () => {
    setSelectedWork(null);
    setFeedIndex(null);
    setReelStartIndex(0);
    setPostStartIndex(0);
  };

  const cancelSearch = () => {
    search.setQuery('');
    inputRef.current?.blur();
    setFocused(false);
  };

  useEffect(() => {
    const sentinel = exploreLoadMoreRef.current;
    if (!showingExplore || !sentinel || !hasMoreExploreItems || isLoadingExplore) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || exploreLoadTimerRef.current) return;
      setIsLoadingExplore(true);
      exploreLoadTimerRef.current = window.setTimeout(() => {
        exploreLoadTimerRef.current = null;
        setVisibleExploreCount((count) => Math.min(count + EXPLORE_BATCH_SIZE, exploreItems.length));
        setIsLoadingExplore(false);
      }, 420);
    }, { rootMargin: '320px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [exploreItems.length, hasMoreExploreItems, isLoadingExplore, showingExplore, visibleExploreCount]);

  useEffect(() => () => {
    if (exploreLoadTimerRef.current) window.clearTimeout(exploreLoadTimerRef.current);
  }, []);

  return (
    <main className="min-h-screen overscroll-y-contain bg-ink-950 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-ink-100">
      <div className="mx-auto min-h-screen w-full max-w-[935px]">
        <header className="sticky top-0 z-40 px-2 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))] sm:px-4 lg:px-0">
          <div className="flex items-center gap-2">
            <label className="relative block min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input ref={inputRef} value={search.query} onChange={(event) => search.setQuery(event.target.value)} onFocus={() => setFocused(true)} placeholder={t('search.placeholder')} aria-label={t('search.title')} className="h-11 w-full rounded-full border border-white/[0.08] bg-ink-800/95 ps-10 pe-10 text-sm text-white outline-none backdrop-blur-xl placeholder:text-ink-400 focus:border-brand-pink/50" />
              {search.query && <button type="button" aria-label={t('search.clearInput')} onClick={() => search.setQuery('')} className="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>}
            </label>
            {focused && <button type="button" onClick={cancelSearch} className="shrink-0 text-sm text-brand-pink hover:text-white">{t('search.cancel')}</button>}
          </div>
        </header>

        {focused && !search.hasQuery && search.recent.length > 0 ? <div className="px-4 pt-2 lg:px-0"><SearchRecentList recent={search.recent} onRemove={search.removeRecent} onClear={search.clearRecent} onSelect={selectRecent} labels={{ title: t('search.recent'), clear: t('search.clearAll'), remove: t('search.remove') }} /></div> : search.hasQuery ? <section className="px-4 pt-1 lg:px-0"><div role="tablist" aria-label={t('search.tabsLabel')} className="mb-3 flex border-b border-white/[0.08]">{(['top', 'accounts', 'tags'] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={search.tab === tab} onClick={() => search.setTab(tab)} className={cn('relative flex-1 py-3 text-xs font-medium', search.tab === tab ? 'text-white' : 'text-ink-400 hover:text-white')}>{t(`search.tabs.${tab}`)}{search.tab === tab && <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-brand-gradient" />}</button>)}</div>{search.matchingWorks.length > 0 ? <SearchResultRows works={search.tab === 'accounts' ? search.accounts : search.tab === 'tags' ? search.tags : search.matchingWorks} tab={search.tab} onSelect={openWork} /> : <p className="flex min-h-48 items-center justify-center text-sm text-ink-400">{t('search.noResults')}</p>}</section> : <section aria-label={t('search.suggested')} className="touch-pan-y grid grid-cols-3 gap-0.5 lg:mx-auto lg:max-w-[760px] lg:grid-cols-4 lg:gap-1">{exploreItems.slice(0, visibleExploreCount).map((work) => <div key={work.id} className="[content-visibility:auto] [contain-intrinsic-size:0_28rem]"><ArtworkTile work={work} onClick={() => openWork(work)} /></div>)}{hasMoreExploreItems && <div ref={exploreLoadMoreRef} className="col-span-full flex min-h-20 items-center justify-center" aria-live="polite" aria-label="Loading more posts and reels">{isLoadingExplore && <div className="flex items-center gap-2 text-xs text-ink-400"><Loader2 className="h-4 w-4 animate-spin text-brand-pink" /><span>Loading more...</span></div>}</div>}</section>}
      </div>

      <div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 rtl:lg:left-auto rtl:lg:right-4"><BottomNav className="lg:flex-col" /></div>

      {selectedWork && isReel && (desktop ? <ProfileReelsModalDesktop
        items={searchReelItems}
        index={selectedReelIndex >= 0 ? selectedReelIndex : 0}
        minimumIndex={reelStartIndex}
        onClose={closeViewer}
        onNext={() => setSelectedWork((current) => {
          if (!current) return current;
          const index = searchReelItems.findIndex((item) => item.id === current.id);
          return searchReelItems[Math.min(index + 1, searchReelItems.length - 1)] ?? current;
        })}
        onPrev={() => setSelectedWork((current) => {
          if (!current) return current;
          const index = searchReelItems.findIndex((item) => item.id === current.id);
          return searchReelItems[Math.max(index - 1, 0)] ?? current;
        })}
      /> : <ReelsImmersiveViewer items={searchReelItems} startId={selectedWork.id} onClose={closeViewer} minimumIndex={reelStartIndex} mobileCaptionSingleLayer />)}
      {feedIndex !== null && feedItems[feedIndex] && (desktop ? <ProfileFeedModalDesktop items={feedItems} index={feedIndex} onClose={closeViewer} onNext={() => setFeedIndex((index) => index !== null && index < feedItems.length - 1 ? index + 1 : index)} onPrev={() => setFeedIndex((index) => index !== null && index > postStartIndex ? index - 1 : index)} minimumIndex={postStartIndex} isPosts /> : <ProfileFeedOverlay items={mobilePostViewerItems} startId={mobilePostViewerItems[0]?.id ?? null} onClose={closeViewer} isReel={false} />)}
    </main>
  );
}
