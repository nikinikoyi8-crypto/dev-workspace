import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, Heart, Home, Menu, MessageCircle, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { REELS } from '@/pages/MainApp';
import { usePostFeed } from '@/context/PostFeedContext';
import ReelsImmersiveViewer from '@/components/ReelsImmersiveViewer';

const EXPLORE_NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/app' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Heart, label: 'Heart', path: '/notifications' },
  { icon: MessageCircle, label: 'Direct', path: '/direct' },
] as const;

function shuffleExploreItems(userReels: typeof REELS) {
  const demoItems = Array.from({ length: 4 }, () => REELS).flat().map((work, index) => ({
    ...work,
    id: work.id * 1000 + index,
  }));
  const baseItems = [...userReels, ...demoItems];

  for (let i = baseItems.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [baseItems[i], baseItems[j]] = [baseItems[j], baseItems[i]];
  }

  const remaining = [...baseItems];
  const ordered: typeof baseItems = [];
  while (remaining.length > 0) {
    const previous = ordered[ordered.length - 1];
    const candidateIndex = previous
      ? Math.max(0, remaining.findIndex((work) => work.title !== previous.title))
      : 0;
    ordered.push(remaining.splice(candidateIndex, 1)[0]);
  }
  return ordered;
}

export default function Explore() {
  const navigate = useNavigate();
  const location = useLocation();
  const { posts } = usePostFeed();
  const userReels = useMemo(() => posts.filter((work) => work.isReel && Boolean(work.videoUrl)), [posts]);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);
  const exploreReels = useMemo(() => shuffleExploreItems(userReels), [location.key, refreshSeed, userReels]);
  const [mobileDockOpen, setMobileDockOpen] = useState(true);
  const handleClose = useCallback(() => navigate('/app'), [navigate]);
  const refreshExplore = useCallback(() => {
    setIsRefreshing(true);
    setRefreshSeed((seed) => seed + 1);
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      setIsRefreshing(false);
    }, 720);
  }, []);
  useEffect(() => () => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
  }, []);
  const renderDockNav = useCallback((className: string, navClassName = '', compact = false, items = EXPLORE_NAV_ITEMS) => (
    <div className={cn(className, 'flex justify-center pointer-events-none')}>
      <div aria-hidden="true" className="absolute -z-10 h-16 w-56 rounded-full bg-brand-gradient-soft opacity-40 blur-2xl" />
      <nav
        aria-label="Primary navigation"
        className={cn(
          cn('pointer-events-auto z-[10001] flex items-center rounded-full border border-white/10 bg-ink-900 shadow-2xl lg:flex-col', !compact && 'backdrop-blur-xl'),
          compact ? 'gap-0 px-1 py-1' : 'gap-1 px-2 py-2',
          navClassName,
        )}
      >
        {items.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || (label === 'Explore' && location.pathname === '/explore');

          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => {
                if (label === 'Explore') {
                  navigate('/explore');
                  return;
                }
                if (label === 'Search') {
                  navigate('/search');
                  return;
                }
                if (label === 'Heart') {
                  navigate('/notifications');
                  return;
                }
                if (path === '/app') {
                  navigate('/app');
                }
              }}
              className={cn(
                'relative flex h-12 w-12 items-center justify-center rounded-xl text-ink-200 transition-all duration-200 hover:text-white',
                isActive && 'text-white',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200',
                  isActive && 'bg-brand-gradient-soft border border-white/10 scale-110',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  ), [location.pathname, navigate]);

  const mobileDock = useMemo(() => createPortal(
    <div className="fixed inset-x-0 bottom-3 z-[10001] flex items-center justify-center gap-1 lg:hidden">
      <div className="relative">
        <div className={cn(
          'transition-[transform,opacity] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          mobileDockOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-90 opacity-0',
        )}>
          {renderDockNav('relative', '', true)}
        </div>
        <button
          type="button"
          aria-label={mobileDockOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileDockOpen}
          onClick={() => setMobileDockOpen((open) => !open)}
          className={cn(
            'pointer-events-auto absolute z-[10002] flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ink-900 text-white shadow-xl transition-[left,right,top,transform,box-shadow] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
            mobileDockOpen
              ? 'right-0 top-1/2 translate-x-full -translate-y-1/2'
              : 'fixed left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2',
          )}
        >
          <span className={cn('transition-transform duration-300 ease-out', mobileDockOpen ? 'rotate-0' : 'rotate-90')}>
            {mobileDockOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </span>
        </button>
      </div>
    </div>,
    document.body,
  ), [mobileDockOpen, renderDockNav]);
  const desktopDock = useMemo(() => createPortal(
    <div className="hidden lg:block">
      {renderDockNav('fixed left-4 top-1/2 z-[10002] -translate-y-1/2')}
    </div>,
    document.body,
  ), [renderDockNav]);
  const refreshButton = useMemo(() => createPortal(
    <button
      key={refreshSeed}
      type="button"
      aria-label="Refresh Explore reels"
      title="Refresh Explore reels"
      aria-busy={isRefreshing}
      onClick={refreshExplore}
      className={cn(
        'group fixed right-4 top-4 z-[10003] flex h-10 w-10 items-center justify-center rounded-full border bg-black/40 text-white shadow-xl backdrop-blur-sm transition-[background-color,border-color,box-shadow] duration-300 hover:bg-black/60',
        isRefreshing ? 'animate-explore-refresh-button border-brand-pink/70 shadow-[0_0_24px_rgba(232,79,155,0.35)]' : 'border-white/10',
      )}
    >
      <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0 rounded-full border border-brand-pink/60 opacity-0', isRefreshing && 'animate-explore-refresh-ring')} />
      <RefreshCw className={cn('relative h-5 w-5 transition-transform duration-300 group-hover:rotate-180', isRefreshing && 'animate-explore-refresh-icon')} />
    </button>,
    document.body,
  ), [refreshExplore, refreshSeed]);

  return (
    <main className="min-h-screen bg-ink-950 text-ink-100">
      <ReelsImmersiveViewer
        key={`${location.key}-${refreshSeed}`}
        items={exploreReels}
        startId={exploreReels[0]?.id ?? null}
        onClose={handleClose}
        hideFollow={false}
        bottomInset="3rem"
        desktopLayout
        desktopDock={desktopDock}
        mobileOptimized
        mobileCaptionShadow={false}
        mobileCaptionLimit={70}
        mobileCaptionKeepInside
      />

      {refreshButton}
      {mobileDock}
    </main>
  );
}
