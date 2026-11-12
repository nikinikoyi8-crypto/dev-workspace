import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, SyntheticEvent, TransitionEvent, WheelEvent as ReactWheelEvent } from 'react';
import { BadgeCheck, Bookmark, ChevronDown, ChevronUp, Heart, MessageCircle, Play, Send, Volume2, VolumeX, X } from 'lucide-react';
import { useFollowing } from '@/context/FollowingContext';
import { useEngagement } from '@/context/EngagementContext';
import FollowButton from '@/components/FollowButton';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { PostOptionsMenu, type Artwork } from '@/pages/MainApp';
import { useReelsAudio } from '@/context/ReelsAudioContext';
import { useStories } from '@/context/StoriesContext';
import { useSaved } from '@/context/SavedContext';
import { CommentsSheet, ShareModal } from '@/components/social/SocialInteractions';
import { ResonanceRipple } from '@/components/ResonanceRipple';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { cn } from '@/utils/cn';
import { goToProfile } from '@/utils/navigation';
import { useNavigate } from 'react-router-dom';
import { canonicalizeUserKey } from '@/services/storyService';

type ReelsImmersiveViewerProps = {
  items: Artwork[];
  startId: number | null;
  onClose: () => void;
  hideFollow?: boolean;
  bottomInset?: string;
  desktopLayout?: boolean;
  loop?: boolean;
  desktopDock?: ReactNode;
  mobileOptimized?: boolean;
  minimumIndex?: number;
  mobileCaptionShadow?: boolean;
  mobileCaptionLimit?: number;
  mobileCaptionKeepInside?: boolean;
  mobileCaptionSingleLayer?: boolean;
};

type TouchStart = { y: number; time: number };

type Ripple = { id: number; x: number; y: number };

const SWIPE_RATIO = 0.1;
const SWIPE_DURATION = 220;
const EMPTY_RIPPLES: Ripple[] = [];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

type ReelSlideProps = {
  work: Artwork;
  isCurrent: boolean;
  muted: boolean;
  preload: 'auto' | 'metadata';
  dragOffset: number;
  delta: number;
  progress: number;
  isAnimating: boolean;
  viewportHeight: number;
  isPaused: boolean;
  ripples: Ripple[];
  onTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
  registerSlide: (id: number, node: HTMLDivElement | null) => void;
  registerVideo: (id: number, node: HTMLVideoElement | null) => void;
  onPlay: (isCurrent: boolean) => void;
  onPause: (isCurrent: boolean) => void;
};

const ReelSlide = memo(function ReelSlide({
  work,
  isCurrent,
  muted,
  preload,
  dragOffset,
  delta,
  progress,
  isAnimating,
  viewportHeight,
  isPaused,
  ripples,
  onTransitionEnd,
  registerSlide,
  registerVideo,
  onPlay,
  onPause,
}: ReelSlideProps) {
  const slideDistance = delta * 100;
  const scale = delta === 0 ? 1 - progress * 0.06 : 0.94 + progress * 0.06;
  const opacity = delta === 0 ? 1 : 0.55 + progress * 0.45;
  const slideRef = useCallback((node: HTMLDivElement | null) => registerSlide(work.id, node), [registerSlide, work.id]);
  const videoRef = useCallback((node: HTMLVideoElement | null) => registerVideo(work.id, node), [registerVideo, work.id]);

  return (
    <div
      ref={slideRef}
      className="absolute inset-0 overflow-hidden"
      onTransitionEnd={onTransitionEnd}
      data-slide-delta={delta}
      style={{
        transform: `translate3d(0, calc(${slideDistance}% + ${dragOffset}px), 0) scale(${scale}) rotateX(${delta === 0 ? dragOffset / Math.max(viewportHeight, 1) * 3 : 0}deg)`,
        opacity,
        zIndex: isCurrent ? 2 : 1,
        transition: isAnimating ? `transform ${SWIPE_DURATION}ms cubic-bezier(0.22, 0.8, 0.24, 1), opacity ${SWIPE_DURATION}ms ease-out` : 'none',
        contain: 'layout paint',
      }}
    >
      {work.videoUrl ? (
        <video
          ref={videoRef}
          src={work.videoUrl}
          poster={work.posterUrl}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: work.reelFilter }}
          autoPlay={isCurrent}
          preload={preload}
          loop
          muted={muted}
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          onPlay={() => onPlay(isCurrent)}
          onPause={() => onPause(isCurrent)}
          onLoadedMetadata={(event) => { if (work.reelStartSeconds) event.currentTarget.currentTime = work.reelStartSeconds; event.currentTarget.playbackRate = work.reelPlaybackRate ?? 1; }}
          onTimeUpdate={(event) => { if (work.reelEndSeconds && event.currentTarget.currentTime >= work.reelEndSeconds) { event.currentTarget.currentTime = work.reelStartSeconds ?? 0; void event.currentTarget.play(); } }}
        />
      ) : work.imageUrl ? (
        <img src={work.imageUrl} alt={work.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : <div className={cn('absolute inset-0 bg-gradient-to-br', work.hue)} />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35" />
      {work.reelSticker && <div className="pointer-events-none absolute z-[1] whitespace-nowrap rounded-full bg-black/45 px-3 py-1.5 text-base font-semibold text-white [text-shadow:0_2px_8px_rgba(0,0,0,.9)]" style={{ left: `${work.reelStickerPosition?.x ?? 50}%`, top: `${work.reelStickerPosition?.y ?? 42}%`, transform: `translate(-50%, -50%) scale(${work.reelStickerScale ?? 1})` }}>{work.reelSticker}</div>}
      {work.reelOverlayText && <div className="pointer-events-none absolute z-[1] max-w-[85%] whitespace-pre-wrap break-words [text-shadow:0_2px_12px_rgba(0,0,0,.95)]" style={{ left: `${work.reelTextPosition?.x ?? 50}%`, top: `${work.reelTextPosition?.y ?? 50}%`, transform: `translate(-50%, -50%) scale(${work.reelTextScale ?? 1})`, color: work.reelTextColor ?? '#ffffff', fontFamily: work.reelTextFont === 'serif' ? 'Georgia, serif' : work.reelTextFont === 'mono' ? 'ui-monospace, monospace' : work.reelTextFont === 'editorial' ? 'cursive' : 'ui-sans-serif, sans-serif', fontWeight: work.reelTextBold === false ? 400 : 700, fontStyle: work.reelTextItalic ? 'italic' : 'normal', textAlign: work.reelTextAlign ?? 'center' }}>{work.reelOverlayText}</div>}
      {isCurrent && isPaused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
            <Play className="h-7 w-7 translate-x-[2px] text-white fill-white" />
          </div>
        </div>
      )}
      {isCurrent && ripples.map((ripple) => <ResonanceRipple key={ripple.id} {...ripple} />)}
    </div>
  );
});

export default function ReelsImmersiveViewer({ items, startId, onClose, hideFollow = false, bottomInset = '0px', desktopLayout = false, loop = false, desktopDock, mobileOptimized = false, minimumIndex = 0, mobileCaptionShadow = true, mobileCaptionLimit, mobileCaptionKeepInside = false, mobileCaptionSingleLayer = false }: ReelsImmersiveViewerProps) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { muted, setMuted } = useReelsAudio();
  const { viewerRequest } = useStories();
  const storyViewerOpen = viewerRequest !== null;
  const { isSaved: checkSaved, toggleSaved } = useSaved();
  const { isFollowing, toggleFollowing } = useFollowing();
  const startIndex = items.findIndex((item) => item.id === startId);
  const [index, setIndex] = useState(startIndex >= 0 ? startIndex : 0);
  const [activeArtworkId, setActiveArtworkId] = useState<number | null>(() => (startId ?? items[0]?.id ?? null));
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (startId === null) return;
    const nextIndex = items.findIndex((item) => item.id === startId);
    if (nextIndex >= 0) {
      indexRef.current = nextIndex;
      setIndex(nextIndex);
      setActiveArtworkId(startId);
    }
  }, [items, startId]);
  const { likedById, likeCountById, shareCountById, commentCountById, toggleLike, addShare, bumpComment } = useEngagement();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartRef = useRef<TouchStart | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const videoMapRef = useRef(new Map<number, HTMLVideoElement>());
  const slideMapRef = useRef(new Map<number, HTMLDivElement>());
  const indexRef = useRef(index);
  const pendingIndexRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const finishedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const latestTouchYRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const rippleIdRef = useRef(0);
  const storyWasPlayingRef = useRef(false);
  const wasStoryViewerOpenRef = useRef(false);
  const doubleTapRef = useRef<{ onTouchStart: (event: unknown) => void; onTouchEnd: (event: unknown) => void } | null>(null);
  const touchHandlersRef = useRef<{
    start: (event: globalThis.TouchEvent) => void;
    move: (event: globalThis.TouchEvent) => void;
    end: (event: globalThis.TouchEvent) => void;
  } | null>(null);
  const handlePlay = useCallback((isCurrent: boolean) => {
    if (isCurrent && !storyViewerOpen) setIsPaused(false);
  }, [storyViewerOpen]);
  const handlePause = useCallback((isCurrent: boolean) => {
    if (isCurrent && !storyViewerOpen) setIsPaused(true);
  }, [storyViewerOpen]);
  const registerSlide = useCallback((id: number, node: HTMLDivElement | null) => {
    if (node) slideMapRef.current.set(id, node);
    else slideMapRef.current.delete(id);
  }, []);
  const registerVideo = useCallback((id: number, node: HTMLVideoElement | null) => {
    if (node) videoMapRef.current.set(id, node);
    else videoMapRef.current.delete(id);
  }, []);
  const applyDragOffset = useCallback((offset: number) => {
    slideMapRef.current.forEach((slide) => {
      const delta = Number(slide.dataset.slideDelta ?? 0);
      slide.style.transform = `translate3d(0, calc(${delta * 100}% + ${offset}px), 0)`;
    });
  }, []);
  useEffect(() => {
    const nextId = items[index]?.id ?? startId ?? items[0]?.id ?? null;
    if (nextId !== null) setActiveArtworkId(nextId);
  }, [items, index, startId]);
  const currentWork = items.find((item) => item.id === activeArtworkId)
    ?? items.find((item) => item.id === startId)
    ?? items[index]
    ?? items[0]
    ?? null;

  useEffect(() => {
    if (storyViewerOpen && !wasStoryViewerOpenRef.current) {
      const currentVideo = videoMapRef.current.get(currentWork?.id ?? -1);
      storyWasPlayingRef.current = !!currentVideo && !currentVideo.paused && !isPaused;
      videoMapRef.current.forEach((video) => video.pause());
    } else if (!storyViewerOpen && wasStoryViewerOpenRef.current) {
      if (storyWasPlayingRef.current) {
        videoMapRef.current.get(currentWork?.id ?? -1)?.play().catch(() => {});
      }
      storyWasPlayingRef.current = false;
    }
    wasStoryViewerOpenRef.current = storyViewerOpen;
  }, [currentWork?.id, isPaused, storyViewerOpen]);

  const verified = Boolean(currentWork?.verified);
  const saved = currentWork ? checkSaved(currentWork.id, 'reel') : false;
  const liked = currentWork ? Boolean(likedById[currentWork.id]) : false;
  const likeCount = currentWork ? (likeCountById[currentWork.id] ?? currentWork.likes) : 0;
  const shareCount = currentWork ? (shareCountById[currentWork.id] ?? currentWork.shares) : 0;

  const displayCount = currentWork ? (commentCountById[currentWork.id] ?? currentWork.comments) : 0;
  const bumpCount = () => {
    if (!currentWork) return;
    bumpComment(currentWork.id);
  };

  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    setCommentsOpen(false);
    setShareOpen(false);
    setCaptionExpanded(false);
    setIsPaused(false);
  }, [index, currentWork?.id]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (wheelUnlockTimerRef.current) window.clearTimeout(wheelUnlockTimerRef.current);
    if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
  }, []);

  const finishAnimation = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = null;
    const nextIndex = pendingIndexRef.current;
    if (nextIndex !== null) {
      const previousVideo = videoMapRef.current.get(items[indexRef.current]?.id);
      previousVideo?.pause();
      indexRef.current = nextIndex;
      setIndex(nextIndex);
      setActiveArtworkId(items[nextIndex]?.id ?? null);
    }
    pendingIndexRef.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    isAnimatingRef.current = false;
    setIsAnimating(false);
  }, [items]);

  const moveTo = useCallback((direction: 1 | -1) => {
    const currentIndex = indexRef.current;
    if (storyViewerOpen || isAnimatingRef.current || items.length < 2) return;
    const nextIndex = loop
      ? (currentIndex + direction + items.length) % items.length
      : Math.min(items.length - 1, Math.max(0, currentIndex + direction));
    if (nextIndex === currentIndex || nextIndex < minimumIndex) return;

    const nextVideo = videoMapRef.current.get(items[nextIndex]?.id);
    nextVideo?.play().catch(() => {});
    pendingIndexRef.current = nextIndex;
    finishedRef.current = false;
    isAnimatingRef.current = true;
    setIsAnimating(true);
    const offset = direction > 0 ? -viewportHeight : viewportHeight;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
    if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = window.setTimeout(finishAnimation, SWIPE_DURATION + 40);
  }, [finishAnimation, items, loop, minimumIndex, storyViewerOpen, viewportHeight]);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (storyViewerOpen || Math.abs(event.deltaY) < 12 || commentsOpen || shareOpen) return;
    if (wheelLockRef.current || isAnimatingRef.current) {
      if (wheelUnlockTimerRef.current) window.clearTimeout(wheelUnlockTimerRef.current);
      wheelUnlockTimerRef.current = window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 120);
      return;
    }
    wheelLockRef.current = true;
    moveTo(event.deltaY > 0 ? 1 : -1);
    if (wheelUnlockTimerRef.current) window.clearTimeout(wheelUnlockTimerRef.current);
    wheelUnlockTimerRef.current = window.setTimeout(() => {
      wheelLockRef.current = false;
    }, SWIPE_DURATION + 120);
  }, [commentsOpen, moveTo, shareOpen, storyViewerOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (storyViewerOpen) return;
      if (event.key === 'Escape' && (commentsOpen || shareOpen)) {
        event.preventDefault();
        setCommentsOpen(false);
        setShareOpen(false);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveTo(event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [commentsOpen, moveTo, onClose, shareOpen, storyViewerOpen]);

  const triggerResonance = (x: number, y: number) => {
    const id = rippleIdRef.current++;
    setRipples((active) => [...active, { id, x, y }]);
    window.setTimeout(() => setRipples((active) => active.filter((ripple) => ripple.id !== id)), 400);
    if (!currentWork) return;
    toggleLike(currentWork.id);
  };

  const togglePlayback = () => {
    const video = videoMapRef.current.get(currentWork?.id ?? -1);
    if (!video) return;
    if (video.paused) {
      setIsPaused(false);
      video.play().catch(() => {});
    } else {
      setIsPaused(true);
      video.pause();
    }
  };

  const doubleTap = useDoubleTap(triggerResonance, togglePlayback);
  doubleTapRef.current = doubleTap as unknown as { onTouchStart: (event: unknown) => void; onTouchEnd: (event: unknown) => void };

  const beginTouch = (event: globalThis.TouchEvent) => {
    if (storyViewerOpen || isAnimating || event.target instanceof Element && event.target.closest('button, a, [role="button"], input, textarea, select')) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { y: touch.clientY, time: Date.now() };
    latestTouchYRef.current = touch.clientY;
    doubleTapRef.current?.onTouchStart(event);
  };

  const moveTouch = (event: globalThis.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start || isAnimating) return;
    const touchY = event.touches[0]?.clientY;
    if (touchY === undefined) return;
    const offset = touchY - start.y;
    const direction = offset < 0 ? 1 : -1;
    const atBoundary = !loop && ((direction === 1 && indexRef.current >= items.length - 1) || (direction === -1 && indexRef.current <= 0));
    if (atBoundary) {
      latestTouchYRef.current = start.y;
      if (!rafRef.current) applyDragOffset(0);
      return;
    }

    event.preventDefault();
    latestTouchYRef.current = touchY;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const latestTouchY = latestTouchYRef.current;
      if (latestTouchY === null) return;
      const offset = latestTouchY - start.y;
      dragOffsetRef.current = offset;
      applyDragOffset(offset);
    });
  };

  const finishTouch = (event: globalThis.TouchEvent) => {
    doubleTapRef.current?.onTouchEnd(event);
    const start = touchStartRef.current;
    touchStartRef.current = null;
    latestTouchYRef.current = null;
    if (!start || isAnimating) return;
    const delta = event.changedTouches[0]?.clientY - start.y;
    const threshold = Math.max(72, viewportHeight * SWIPE_RATIO);
    if (Math.abs(delta) < threshold) {
      dragOffsetRef.current = 0;
      applyDragOffset(0);
      setDragOffset(0);
      setIsAnimating(false);
      return;
    }
    const direction = delta < 0 ? 1 : -1;
    if (!loop && ((direction === 1 && indexRef.current >= items.length - 1) || (direction === -1 && indexRef.current <= 0))) {
      applyDragOffset(0);
      dragOffsetRef.current = 0;
      return;
    }
    moveTo(direction);
  };

  const stopAvatarEvent = useCallback((event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation();
  }, []);

  const handleTransitionEnd = useCallback((event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    finishAnimation();
  }, [finishAnimation]);

  touchHandlersRef.current = { start: beginTouch, move: moveTouch, end: finishTouch };
  useEffect(() => {
    const node = viewerRef.current;
    if (!node) return;
    const onStart = (event: globalThis.TouchEvent) => touchHandlersRef.current?.start(event);
    const onMove = (event: globalThis.TouchEvent) => {
      touchHandlersRef.current?.move(event);
      if (touchStartRef.current && !isAnimatingRef.current) event.preventDefault();
    };
    const onEnd = (event: globalThis.TouchEvent) => touchHandlersRef.current?.end(event);
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
    };
  }, []);

  if (!currentWork) return null;

  return (
    <div ref={viewerRef} onWheel={handleWheel} className="fixed inset-0 z-[9999] h-[100dvh] overflow-hidden bg-ink-950 text-white">
      {desktopLayout && isDesktop && currentWork.posterUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-3xl"
          style={{ backgroundImage: `url(${currentWork.posterUrl})` }}
        />
      )}
      <div
        className={cn('absolute inset-0 [perspective:1000px]', desktopLayout && 'lg:start-1/2 lg:w-[min(100vw,420px)] lg:-translate-x-1/2')}
        style={{ touchAction: 'none' }}
      >
        {(items.length < 3 ? [0, 1].filter((slot) => slot < items.length) : [-1, 0, 1]).map((slot) => {
          const slideIndex = loop
            ? (items.length < 3 ? slot : (index + slot + items.length) % items.length)
            : index + slot;
          if (slideIndex < 0 || slideIndex >= items.length) return null;
          const delta = slot;
          const work = items[slideIndex];
          return (
            <ReelSlide
              key={work.id}
              work={work}
              isCurrent={slideIndex === index}
              muted={muted}
              preload={mobileOptimized && !isDesktop ? (slideIndex === index ? 'auto' : 'metadata') : slideIndex === index || slideIndex === (index + 1) % items.length || slideIndex === (index - 1 + items.length) % items.length ? 'auto' : 'metadata'}
              dragOffset={dragOffset}
              delta={delta}
              progress={Math.min(1, Math.abs(dragOffset) / Math.max(viewportHeight, 1))}
              isAnimating={isAnimating}
              viewportHeight={viewportHeight}
              isPaused={slideIndex === index && isPaused}
              ripples={slideIndex === index ? ripples : EMPTY_RIPPLES}
              onTransitionEnd={handleTransitionEnd}
              registerSlide={registerSlide}
              registerVideo={registerVideo}
              onPlay={handlePlay}
              onPause={handlePause}
            />
          );
        })}
      </div>

      {/* The close control intentionally stays at the physical top-left in both directions. */}
      <button type="button" aria-label="Close reels" onClick={onClose} className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55">
        <X className="h-5 w-5" />
      </button>
      <div className="absolute start-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 flex-col gap-3 lg:hidden">
        <button type="button" aria-label="Previous reel" onClick={() => moveTo(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55">
          <ChevronUp className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Next reel" onClick={() => moveTo(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55">
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
      <div className={cn('absolute end-1 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-3.5', desktopLayout && 'lg:hidden')}>
        <button type="button" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)} className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55">
          {muted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
        </button>
        <button
          type="button"
          aria-label={liked ? 'Unlike reel' : 'Like reel'}
          aria-pressed={liked}
          onClick={() => {
            if (!currentWork) return;
            toggleLike(currentWork.id);
          }}
          className="flex h-[3.25rem] w-[3.25rem] flex-col items-center justify-center gap-1 text-white"
        >
          <Heart className={cn('h-7 w-7', liked ? 'fill-brand-pink text-brand-pink' : 'text-white')} />
          <span className="text-[11px] tabular-nums">{likeCount.toLocaleString()}</span>
        </button>
        <button type="button" aria-label="View comments" onClick={() => setCommentsOpen(true)} className="flex h-[3.25rem] w-[3.25rem] flex-col items-center justify-center gap-1 text-white">
          <MessageCircle className="h-7 w-7" />
          <span className="text-[11px] tabular-nums">{displayCount}</span>
        </button>
        <button type="button" aria-label="Share reel" onClick={() => setShareOpen(true)} className="flex h-[3.25rem] w-[3.25rem] flex-col items-center justify-center gap-1 text-white">
          <Send className="h-7 w-7" />
          <span className="text-[11px] tabular-nums">{shareCount.toLocaleString()}</span>
        </button>
        <button type="button" aria-label={saved ? 'Remove bookmark' : 'Save reel'} aria-pressed={saved} onClick={() => toggleSaved(currentWork.id, 'reel')} className="flex h-[3.25rem] w-[3.25rem] items-center justify-center text-white">
          <Bookmark className={cn('h-7 w-7', saved ? 'fill-brand-orange text-brand-orange' : 'text-white')} />
        </button>
      </div>

      <div className={cn('absolute inset-x-0 z-20 flex justify-start px-4', desktopLayout && 'lg:hidden')} style={{ bottom: `max(calc(8.8rem + ${bottomInset}), calc(9.2rem + env(safe-area-inset-bottom) + ${bottomInset}))` }}>
        <span className="inline-flex items-center rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white/75 backdrop-blur-sm shadow-lg shadow-black/20">
          {currentWork.medium}
        </span>
      </div>

      <div className={cn('absolute inset-x-0 bottom-0 z-20 w-full rounded-t-[2rem] px-0', !mobileCaptionSingleLayer && 'bg-white/[0.04] backdrop-blur-xl', desktopLayout && 'lg:hidden')} style={{ paddingBottom: bottomInset }}>
        <div className={cn(
          cn('relative w-full px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 transition-all duration-300 ease-out', captionExpanded ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'),
          mobileCaptionSingleLayer ? 'bg-white/[0.04] backdrop-blur-2xl' : 'bg-transparent',
          'rounded-t-[2rem]',
          mobileCaptionShadow && 'shadow-[0_-18px_40px_rgba(0,0,0,0.42)]',
          captionExpanded ? cn('max-h-[min(65dvh,32rem)]', mobileCaptionKeepInside ? 'translate-y-0' : '-translate-y-5') : 'max-h-[8.5rem] translate-y-0'
        )}>

          <div className="flex items-start justify-between gap-3">
            <div onClick={() => goToProfile(navigate, currentWork.handle)} className="flex min-w-0 cursor-pointer items-center gap-2.5">
              <span className="inline-flex shrink-0" onPointerDownCapture={stopAvatarEvent} onPointerUpCapture={stopAvatarEvent} onPointerCancelCapture={stopAvatarEvent} onTouchStartCapture={stopAvatarEvent} onTouchMoveCapture={stopAvatarEvent} onTouchEndCapture={stopAvatarEvent}>
                <StoryAvatar userKey={canonicalizeUserKey(currentWork.handle)} src={currentWork.avatarUrl} name={currentWork.artist} size={40} variant="inline" className="h-10 w-10 ring-2 ring-white/70 ring-offset-2 ring-offset-black/70 shadow-lg shadow-black/50" onNoStoryClick={() => goToProfile(navigate, currentWork.handle)} />
              </span>
              <button type="button" onClick={(event) => { event.stopPropagation(); goToProfile(navigate, currentWork.handle); }} className="min-w-0 text-left">
                <span className="flex items-center gap-1 text-sm font-semibold text-white">
                  {currentWork.artist}
                  {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-pink" />}
                </span>
                <span className="text-xs text-white/70">{currentWork.handle}</span>
              </button>
            </div>

            {hideFollow ? (
              <div className="shrink-0">
                <PostOptionsMenu work={currentWork} openUpward />
              </div>
            ) : (
              <FollowButton
                isFollowing={isFollowing(currentWork.handle)}
                aria-label={isFollowing(currentWork.handle) ? `Unfollow ${currentWork.artist}` : `Follow ${currentWork.artist}`}
                aria-pressed={isFollowing(currentWork.handle)}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFollowing(currentWork.handle);
                }}
              >
                {isFollowing(currentWork.handle) ? 'Following' : 'Follow'}
              </FollowButton>
            )}
          </div>

          <div className="mt-2 overflow-hidden transition-all duration-300 ease-out">
            <p className={cn('text-sm leading-relaxed text-white/90', !captionExpanded && !mobileCaptionLimit && 'line-clamp-3')}>
              {captionExpanded ? (
                <>
                  {currentWork.caption}{' '}
                  {currentWork.caption.length > 100 && (
                    <button
                      type="button"
                      onClick={() => setCaptionExpanded(false)}
                      className="ms-1 inline-flex items-center rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-white/90 transition-colors hover:bg-white/12"
                    >
                      See less
                    </button>
                  )}
                </>
              ) : (
                <>
                  {`${currentWork.caption.slice(0, mobileCaptionLimit ?? 100).trimEnd()}${currentWork.caption.length > (mobileCaptionLimit ?? 100) ? '...' : ''}`}{' '}
                  {currentWork.caption.length > (mobileCaptionLimit ?? 100) && (
                    <button
                      type="button"
                      onClick={() => setCaptionExpanded(true)}
                      className="ms-1 inline-flex items-center rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-white/90 transition-colors hover:bg-white/12"
                    >
                      See more
                    </button>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {desktopLayout && isDesktop && (
        <div
          dir="ltr"
          className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-center gap-6 lg:flex"
          style={{ transform: 'translateX(calc(-50% - 144px))', left: '50%', top: '24px', right: 'auto', bottom: 'auto', height: 'calc(100dvh - 48px)' }}
        >
          <aside className="pointer-events-auto flex w-[360px] items-start gap-6">
            <div className="shrink-0">{desktopDock}</div>
            <div className="relative start-16 -top-32 flex w-[280px] flex-col items-stretch gap-3">
              <div className="flex max-h-[280px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-xl">
                <div className="relative">
                  <div onClick={() => goToProfile(navigate, currentWork.handle)} className="relative top-4 flex min-w-0 w-full cursor-pointer items-center gap-2.5">
                    <span className="inline-flex shrink-0" onPointerDownCapture={stopAvatarEvent} onPointerUpCapture={stopAvatarEvent} onPointerCancelCapture={stopAvatarEvent} onTouchStartCapture={stopAvatarEvent} onTouchMoveCapture={stopAvatarEvent} onTouchEndCapture={stopAvatarEvent}>
                      <StoryAvatar userKey={canonicalizeUserKey(currentWork.handle)} src={currentWork.avatarUrl} name={currentWork.artist} size={40} variant="inline" className="h-10 w-10 ring-2 ring-white/70 ring-offset-2 ring-offset-black/70 shadow-lg shadow-black/50" onNoStoryClick={() => goToProfile(navigate, currentWork.handle)} />
                    </span>
                    <button type="button" onClick={(event) => { event.stopPropagation(); goToProfile(navigate, currentWork.handle); }} className="flex min-w-0 flex-1 items-center gap-2.5 pe-24 text-start">
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex max-w-full items-center whitespace-nowrap text-sm font-semibold leading-tight text-white">
                        {currentWork.artist}{verified && <BadgeCheck className="ms-1 h-4 w-4 shrink-0 text-brand-pink" />}
                      </span>
                      <span className="-mt-0.5 block text-xs leading-tight text-white/70">{currentWork.handle}</span>
                    </span>
                    </button>
                  </div>
                  <FollowButton
                    className="absolute end-0 top-0"
                    isFollowing={isFollowing(currentWork.handle)}
                    aria-label={isFollowing(currentWork.handle) ? `Unfollow ${currentWork.artist}` : `Follow ${currentWork.artist}`}
                    aria-pressed={isFollowing(currentWork.handle)}
                    onClick={(event) => { event.stopPropagation(); toggleFollowing(currentWork.handle); }}
                  >
                    {isFollowing(currentWork.handle) ? 'Following' : 'Follow'}
                  </FollowButton>
                </div>
                <p className={cn(
                  'mt-5 text-sm leading-relaxed text-white/90',
                  captionExpanded ? 'max-h-[170px] overflow-y-auto' : 'overflow-hidden',
                )}>
                  {captionExpanded ? currentWork.caption : `${currentWork.caption.slice(0, 70).trimEnd()}${currentWork.caption.length > 70 ? '...' : ''}`}{' '}
                  {currentWork.caption.length > 70 && (
                    <button type="button" onClick={() => setCaptionExpanded((expanded) => !expanded)} className="ms-1 inline-flex rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[9px] font-semibold text-white/90">
                      {captionExpanded ? 'See less' : 'See more'}
                    </button>
                  )}
                </p>
              </div>
              <span className="self-start rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white/75 backdrop-blur-sm">{currentWork.medium}</span>
            </div>
          </aside>

          <div className="w-[420px] shrink-0" aria-hidden="true" />

          <div className="pointer-events-auto w-[72px] shrink-0 self-center" aria-label="Reel actions">
            <div className="flex flex-col items-center gap-3">
              <button type="button" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60">{muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}</button>
              <button type="button" aria-label={liked ? 'Unlike reel' : 'Like reel'} aria-pressed={liked} onClick={() => toggleLike(currentWork.id)} className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><Heart className={cn('h-6 w-6', liked ? 'fill-brand-pink text-brand-pink' : 'text-white')} /><span className="text-[10px] tabular-nums">{likeCount.toLocaleString()}</span></button>
              <button type="button" aria-label="View comments" onClick={() => setCommentsOpen(true)} className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><MessageCircle className="h-6 w-6" /><span className="text-[10px] tabular-nums">{displayCount}</span></button>
              <button type="button" aria-label="Share reel" onClick={() => setShareOpen(true)} className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><Send className="h-6 w-6" /><span className="text-[10px] tabular-nums">{shareCount.toLocaleString()}</span></button>
              <button type="button" aria-label={saved ? 'Remove bookmark' : 'Save reel'} aria-pressed={saved} onClick={() => toggleSaved(currentWork.id, 'reel')} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><Bookmark className={cn('h-6 w-6', saved ? 'fill-brand-orange text-brand-orange' : 'text-white')} /></button>
              <div className="my-1 h-px w-8 bg-white/20" />
              <button type="button" aria-label="Previous reel" onClick={() => moveTo(-1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><ChevronUp className="h-6 w-6" /></button>
              <button type="button" aria-label="Next reel" onClick={() => moveTo(1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><ChevronDown className="h-6 w-6" /></button>
            </div>
          </div>
        </div>
      )}

      {commentsOpen && <CommentsSheet work={currentWork} onClose={() => setCommentsOpen(false)} onCommentAdded={bumpCount} />}
      {shareOpen && <ShareModal work={currentWork} onClose={() => setShareOpen(false)} onShared={() => addShare(currentWork.id)} />}

    </div>
  );
}


