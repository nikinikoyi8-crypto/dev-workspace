import { lazy, memo, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import FollowButton from '@/components/FollowButton';
import MediumTag from '@/components/MediumTag';
import StoriesBar from '@/components/StoriesBar';
import StoryAvatar from '@/components/stories/StoryAvatar';
import StoryComposer from '@/components/stories/StoryComposer';
import StoryCamera from '@/components/stories/StoryCamera';
import ReelComposer, { type ReelPublishDetails } from '@/components/ReelComposer';
import { useOnboarding } from '@/context/OnboardingContext';
import { useLanguage } from '@/context/useLanguage';
import { useSaved } from '@/context/SavedContext';
import { useFollowing } from '@/context/FollowingContext';
import { useReelsAudio } from '@/context/ReelsAudioContext';
import { useEngagement } from '@/context/EngagementContext';
import { usePostFeed } from '@/context/PostFeedContext';
import {
  Search, Heart, Bookmark, MessageCircle, Send, Home, Compass, Check, X,
  BadgeCheck, ChevronLeft, ChevronRight, Plus, MoreHorizontal, Pencil, Archive, Trash2, Volume2, VolumeX, Play,
  Image as ImageIcon, Video, Sparkles, ArrowLeft, Camera,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { goToProfile } from '@/utils/navigation';
import { ExpandableCaption } from '@/components/ExpandableCaption';
import { CommentsSheet, ShareModal } from '@/components/social/SocialInteractions';
import { ResonanceRipple } from '@/components/ResonanceRipple';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';
import { canonicalizeUserKey } from '@/services/storyService';
import { FALLBACK_PRACTICE_QUESTIONS, PRACTICE_QUESTIONS } from '@/data/categories';
import { localizePracticeQuestion } from '@/data/practiceTranslations';
const ProfileFeedModalDesktop = lazy(() => import('@/pages/ProfileFeedViewers').then((module) => ({ default: module.ProfileFeedModalDesktop })));
const ProfileFeedOverlay = lazy(() => import('@/pages/ProfileFeedViewers').then((module) => ({ default: module.ProfileFeedOverlay })));
const ProfileReelsModalDesktop = lazy(() => import('@/pages/ProfileFeedViewers').then((module) => ({ default: module.ProfileReelsModalDesktop })));

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

export type Artwork = {
  id: number;
  title: string;
  caption: string;
  artist: string;
  handle: string;
  verified: boolean;
  medium: string;
  hue: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  imageUrl?: string;
  images?: string[];
  avatarUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  reelFilter?: string;
  reelStartSeconds?: number;
  reelEndSeconds?: number;
  reelOverlayText?: string;
  reelSticker?: string;
  reelTextPosition?: { x: number; y: number };
  reelStickerPosition?: { x: number; y: number };
  reelTextScale?: number;
  reelStickerScale?: number;
  reelTextFont?: string;
  reelTextColor?: string;
  reelTextBold?: boolean;
  reelTextItalic?: boolean;
  reelTextAlign?: 'left' | 'center' | 'right';
  reelPlaybackRate?: number;
  reelAudience?: 'everyone' | 'followers';
  reelAllowComments?: boolean;
  reelAllowDownloads?: boolean;
  artworkTag?: string;
  mediaItems?: Array<{ url: string; type: 'image' | 'video'; posterUrl?: string }>;
  isReel?: boolean;
};

export const ARTWORKS: Artwork[] = [
  { id: 1, title: 'Liminal Spaces', caption: 'Liminal Spaces is a study of the quiet threshold between memory and imagination, built from layered fragments, warm light, and the feeling of arriving somewhere familiar but changed.', artist: 'Mara Voss', handle: '@maravoss', verified: true, medium: 'Digital collage', hue: 'from-brand-orange/25 via-brand-pink/15 to-transparent', likes: 1240, comments: 86, shares: 74, saves: 342, imageUrl: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=800&h=1000&q=85', images: ['https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=800&h=1000&q=85', 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=800&h=1000&q=85', 'https://images.unsplash.com/photo-1577083288073-40892c0860a4?auto=format&fit=crop&w=800&h=1000&q=85'], avatarUrl: 'https://i.pravatar.cc/150?u=maravoss' },
  { id: 2, title: 'Chromatic Drift', caption: 'Chromatic Drift follows color as it moves through a restless landscape of pigment, gesture, and atmosphere. Each layer is an invitation to slow down and notice what changes at the edges.', artist: 'Kenji Arai', handle: '@kenji.arai', verified: true, medium: 'Abstract painting', hue: 'from-brand-pink/25 via-brand-purple/15 to-transparent', likes: 980, comments: 54, shares: 61, saves: 211, imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&h=1000&q=85', avatarUrl: 'https://i.pravatar.cc/150?u=kenjiarai', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=720&h=1280&q=85' },
  { id: 3, title: 'Quiet Geometry', caption: 'Quiet Geometry', artist: 'Lina Park', handle: '@linapaints', verified: false, medium: 'Mixed media', hue: 'from-brand-purple/25 via-brand-orange/15 to-transparent', likes: 642, comments: 31, shares: 38, saves: 98, imageUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=800&h=1000&q=85', avatarUrl: 'https://i.pravatar.cc/150?u=linapaints' },
  { id: 4, title: 'After the Rain', caption: 'After the Rain', artist: 'Theo Marchetti', handle: '@theom', verified: true, medium: 'Fine art photography', hue: 'from-brand-orange/20 via-brand-pink/15 to-transparent', likes: 1520, comments: 112, shares: 96, saves: 430, imageUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&h=1000&q=85', images: ['https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&h=1000&q=85', 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&h=1000&q=85'], avatarUrl: 'https://i.pravatar.cc/150?u=theom', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', posterUrl: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=720&h=1280&q=85' },
  { id: 5, title: 'Soft Static', caption: 'Soft Static', artist: 'Yuki Tanaka', handle: '@yukitanaka', verified: true, medium: 'Generative art', hue: 'from-brand-pink/20 via-brand-purple/15 to-transparent', likes: 870, comments: 47, shares: 52, saves: 188, imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&h=1000&q=85', avatarUrl: 'https://i.pravatar.cc/150?u=yukitanaka' },
  { id: 6, title: 'Inner Garden', caption: 'Inner Garden', artist: 'Aria Solé', handle: '@ariasole', verified: true, medium: 'Oil on canvas', hue: 'from-brand-purple/20 via-brand-orange/15 to-transparent', likes: 510, comments: 22, shares: 29, saves: 76, imageUrl: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&h=1000&q=85', avatarUrl: 'https://i.pravatar.cc/150?u=ariasole', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', posterUrl: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=720&h=1280&q=85' },
];

export const REELS = [ARTWORKS[1], ARTWORKS[3], ARTWORKS[5]];

export const PostOptionsMenu = memo(function PostOptionsMenu({ work, openUpward = false }: { work: typeof ARTWORKS[number]; openUpward?: boolean }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuSize, setMenuSize] = useState({ width: 160, height: 150 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasPointerFineRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(pointer: fine)');
    const updatePointerMode = () => {
      hasPointerFineRef.current = mediaQuery.matches;
    };

    updatePointerMode();
    mediaQuery.addEventListener?.('change', updatePointerMode);
    return () => mediaQuery.removeEventListener?.('change', updatePointerMode);
  }, []);

  const computeMenuPosition = useCallback((buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    const menuWidth = menuSize.width;
    const gap = 8;
    const menuHeight = menuSize.height;
    const left = Math.min(Math.max(rect.right - menuWidth, 8), window.innerWidth - menuWidth - 8);
    const top = openUpward
      ? Math.max(rect.top - menuHeight - gap, 8)
      : Math.min(rect.bottom + gap, window.innerHeight - menuHeight - 8);

    return { top, left };
  }, [menuSize.height, menuSize.width, openUpward]);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;

    const nextSize = {
      width: menuRef.current.offsetWidth || menuSize.width,
      height: menuRef.current.offsetHeight || menuSize.height,
    };

    setMenuSize(nextSize);
    setMenuPosition(computeMenuPosition(buttonRef.current!));
  }, [computeMenuPosition, menuSize.height, menuSize.width, open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setMenuPosition(computeMenuPosition(buttonRef.current!));
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [computeMenuPosition, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      const clickedInsideButton = buttonRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);

      if (!clickedInsideButton && !clickedInsideMenu) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside as EventListener);
    document.addEventListener('touchstart', handleClickOutside as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMenuPosition(computeMenuPosition(buttonRef.current!));
  }, [computeMenuPosition, open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Options for ${work.title}`}
        onClick={(event) => {
          event.stopPropagation();
          const button = buttonRef.current;
          if (!button) return;

          const nextOpen = !open;
          setMenuPosition(computeMenuPosition(button));
          setOpen(nextOpen);
        }}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-full text-ink-200 transition-colors hover:text-white',
          hasPointerFineRef.current ? 'hover:bg-white/10' : ''
        )}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[10000] w-40 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-premium"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]">
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]">
            <Archive className="h-4 w-4" />
            Archive
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-brand-pink hover:bg-brand-pink/10">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>,
        document.body,
      )}
    </>
  );
});

export const ArtworkCard = memo(function ArtworkCard({
  work,
  onOpen,
  compact,
  scrollContainerRef,
  hideFollow,
  isReel,
}: {
  work: typeof ARTWORKS[number];
  onOpen?: () => void;
  compact?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement>;
  hideFollow?: boolean;
  isReel?: boolean;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { muted, setMuted } = useReelsAudio();
  const [isPlaying, setIsPlaying] = useState(true);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleIdRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const isTouchDevice = useIsTouchDevice();
  const { likedById, likeCountById, shareCountById, commentCountById, toggleLike, addShare, bumpComment } = useEngagement();
  const { isSaved, toggleSaved } = useSaved();
  const { isFollowing, toggleFollowing } = useFollowing();
  const saved = isSaved(work.id, isReel ? 'reel' : 'post');
  const following = isFollowing(work.handle);
  const liked = Boolean(likedById[work.id]);
  const likeCount = likeCountById[work.id] ?? work.likes;
  const shareCount = shareCountById[work.id] ?? work.shares;
  const displayCount = commentCountById[work.id] ?? work.comments;
  const slides = work.mediaItems?.length
    ? work.mediaItems
    : (work.images && work.images.length > 0 ? work.images : work.imageUrl ? [work.imageUrl] : []).map((url) => ({ url, type: 'image' as const }));

  const triggerResonance = (x: number, y: number) => {
    const id = rippleIdRef.current++;
    setRipples((activeRipples) => [...activeRipples, { id, x, y }]);
    window.setTimeout(() => {
      setRipples((activeRipples) => activeRipples.filter((ripple) => ripple.id !== id));
    }, 400);
    toggleLike(work.id);
  };

  const reelTap = useDoubleTap(triggerResonance);
  const artworkTap = useDoubleTap(triggerResonance);

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      if (scrollRef.current?.clientWidth) {
        setSlideIndex(Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth));
      }
      rafRef.current = null;
    });
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!isReel || !videoRef.current) return;
    const videoElement = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoElement.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoElement.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(videoElement);
    return () => observer.disconnect();
  }, [isReel]);

  return (
    <article onClick={isReel || !isTouchDevice ? onOpen : undefined} className="group relative overflow-hidden rounded-tl-[2rem] rounded-tr-lg rounded-br-[2rem] rounded-bl-lg border border-white/[0.1] bg-ink-900 p-1.5 shadow-card transition-transform duration-200 sm:p-2 lg:hover:-translate-y-1 lg:hover:border-brand-pink/30 lg:hover:shadow-premium">
      {isReel ? (
        <div
          className={cn('relative aspect-[9/16] lg:aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-tl-[1.7rem] rounded-tr-md rounded-br-[1.7rem] rounded-bl-md bg-gradient-to-br', work.hue)}
          onClick={(event) => { event.stopPropagation(); onOpen?.(); }}
          {...(isTouchDevice ? reelTap : {})}
        >
          {work.videoUrl ? (
            <video ref={videoRef} src={work.videoUrl} poster={work.posterUrl} onError={(event) => { event.currentTarget.style.display = 'none'; }} onLoadedData={(event) => { event.currentTarget.style.display = ''; }} onLoadedMetadata={(event) => { if (work.reelStartSeconds) event.currentTarget.currentTime = work.reelStartSeconds; event.currentTarget.playbackRate = work.reelPlaybackRate ?? 1; }} onTimeUpdate={(event) => { if (work.reelEndSeconds && event.currentTarget.currentTime >= work.reelEndSeconds) { event.currentTarget.currentTime = work.reelStartSeconds ?? 0; void event.currentTarget.play(); } }} className="absolute inset-0 h-full w-full object-cover" style={{ filter: work.reelFilter }} autoPlay loop muted={muted} playsInline />
          ) : work.imageUrl ? (
            <img src={work.imageUrl} alt={work.title} onError={(event) => { event.currentTarget.style.display = 'none'; }} onLoad={(event) => { event.currentTarget.style.display = ''; }} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className={cn('absolute inset-0 bg-gradient-to-br', work.hue)} />
          )}
          {work.reelSticker && <div className="pointer-events-none absolute z-[1] whitespace-nowrap rounded-full bg-black/45 px-3 py-1.5 text-base font-semibold text-white [text-shadow:0_2px_8px_rgba(0,0,0,.9)]" style={{ left: `${work.reelStickerPosition?.x ?? 50}%`, top: `${work.reelStickerPosition?.y ?? 42}%`, transform: `translate(-50%, -50%) scale(${work.reelStickerScale ?? 1})` }}>{work.reelSticker}</div>}
          {work.reelOverlayText && <div className="pointer-events-none absolute z-[1] max-w-[85%] whitespace-pre-wrap break-words [text-shadow:0_2px_12px_rgba(0,0,0,.95)]" style={{ left: `${work.reelTextPosition?.x ?? 50}%`, top: `${work.reelTextPosition?.y ?? 50}%`, transform: `translate(-50%, -50%) scale(${work.reelTextScale ?? 1})`, color: work.reelTextColor ?? '#ffffff', fontFamily: work.reelTextFont === 'serif' ? 'Georgia, serif' : work.reelTextFont === 'mono' ? 'ui-monospace, monospace' : work.reelTextFont === 'editorial' ? 'cursive' : 'ui-sans-serif, sans-serif', fontWeight: work.reelTextBold === false ? 400 : 700, fontStyle: work.reelTextItalic ? 'italic' : 'normal', textAlign: work.reelTextAlign ?? 'center' }}>{work.reelOverlayText}</div>}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <StoryAvatar userKey={canonicalizeUserKey(work.handle)} src={work.avatarUrl} name={work.artist} size={44} variant="inline" className="h-11 w-11 sm:h-14 sm:w-14 lg:h-12 lg:w-12 lg:-translate-y-2" onNoStoryClick={() => goToProfile(navigate, work.handle)} />
              <button type="button" onClick={(event) => { event.stopPropagation(); goToProfile(navigate, work.handle); }} className="min-w-0 text-left lg:-translate-y-2">
                <p className="flex items-center gap-1 truncate text-sm font-semibold text-white sm:text-[15px]">
                  {work.artist}
                  {work.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-pink" />}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/70">{work.handle}</p>
              </button>
            </div>
            {hideFollow ? <PostOptionsMenu work={work} /> : (
              <FollowButton
                isFollowing={following}
                onClick={(event) => { event.stopPropagation(); toggleFollowing(work.handle); }}
                aria-label={following ? `Unfollow ${work.artist}` : `Follow ${work.artist}`}
                aria-pressed={following}
              >
                {following ? 'Following' : 'Follow'}
              </FollowButton>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-8">
            <MediumTag text={work.medium} />
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); setMuted(!muted); }}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.15] bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                <Play className="h-6 w-6 fill-white text-white" />
              </div>
            </div>
          )}
          {ripples.map((ripple) => <ResonanceRipple key={ripple.id} {...ripple} />)}
        </div>
      ) : (
        <>
      {/* Card header */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3 pt-1 sm:gap-2.5 sm:px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <StoryAvatar userKey={canonicalizeUserKey(work.handle)} src={work.avatarUrl} name={work.artist} size={32} variant="inline" className="h-8 w-8" onNoStoryClick={() => goToProfile(navigate, work.handle)} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); goToProfile(navigate, work.handle); }}
              className="flex max-w-full items-center gap-1 truncate text-left text-[13px] font-semibold leading-tight text-white sm:text-sm"
            >
              {work.artist}
              {work.verified && <BadgeCheck className="w-3.5 h-3.5 text-brand-pink shrink-0" />}
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); goToProfile(navigate, work.handle); }}
              className="mt-0.5 block max-w-full truncate text-left text-[10px] text-ink-300 sm:text-[11px]"
            >
              {work.handle}
            </button>
          </div>
        </div>
        {hideFollow ? (
          <PostOptionsMenu work={work} />
        ) : (
          <FollowButton
            isFollowing={following}
            onClick={(event) => { event.stopPropagation(); toggleFollowing(work.handle); }}
            aria-label={following ? `Unfollow ${work.artist}` : `Follow ${work.artist}`}
            aria-pressed={following}
          >
            {following ? 'Following' : 'Follow'}
          </FollowButton>
        )}
      </div>

      {/* Artwork surface */}
      <div className={cn('relative overflow-hidden rounded-tl-xl rounded-tr-sm rounded-br-xl rounded-bl-sm', !slides.length && `bg-gradient-to-br ${work.hue}`, work.artworkTag ? 'aspect-[4/3]' : compact ? 'aspect-[4/3] lg:aspect-[16/10]' : 'aspect-[4/5] lg:aspect-[4/3]')}>
        {slides.length ? (
          <div ref={scrollRef} onScroll={handleScroll} {...(isTouchDevice ? artworkTap : {})} className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {slides.map((slide, index) => <div key={`${slide.url}-${index}`} className={cn('relative h-full w-full flex-shrink-0 snap-start bg-gradient-to-br', work.hue)}>{slide.type === 'video' ? <video src={slide.url} poster={slide.posterUrl} muted loop playsInline controls className="h-full w-full object-cover" /> : <img src={slide.url} alt={`${work.title} ${index + 1}`} onError={(event) => { event.currentTarget.style.display = 'none'; }} onLoad={(event) => { event.currentTarget.style.display = ''; }} className="h-full w-full object-cover" loading="lazy" />}</div>)}
          </div>
        ) : <div className={cn('absolute inset-0 bg-gradient-to-br', work.hue)} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        {ripples.map((ripple) => <ResonanceRipple key={ripple.id} {...ripple} />)}
        <MediumTag text={work.medium} className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate" />
        {slides.length > 1 && <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">{slides.map((slide, index) => <span key={`${slide.url}-dot-${index}`} className={cn('h-1.5 w-1.5 rounded-full transition-colors', index === slideIndex ? 'bg-white' : 'bg-white/40')} />)}</div>}
        {slides.length > 1 && slideIndex > 0 && <button type="button" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); scrollRef.current?.scrollTo({ left: (slideIndex - 1) * scrollRef.current.clientWidth, behavior: 'smooth' }); }} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 sm:flex"><ChevronLeft className="h-4 w-4" /></button>}
        {slides.length > 1 && slideIndex < slides.length - 1 && <button type="button" aria-label="Next image" onClick={(event) => { event.stopPropagation(); scrollRef.current?.scrollTo({ left: (slideIndex + 1) * scrollRef.current.clientWidth, behavior: 'smooth' }); }} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 sm:flex"><ChevronRight className="h-4 w-4" /></button>}
      </div>
        </>
      )}

      <div className="mx-1 mt-3 grid grid-cols-[auto_auto_auto_1fr] items-center gap-1.5 text-[10px] text-ink-300 sm:gap-2">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); toggleLike(work.id); }}
          aria-label={liked ? 'Unlike artwork' : 'Like artwork'}
          aria-pressed={liked}
          className="group/action flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-ink-950/50 py-1.5 pl-1.5 pr-2.5 transition-colors [@media(hover:hover)]:hover:border-brand-pink/40 [@media(hover:hover)]:hover:bg-brand-pink/10 [@media(hover:hover)]:hover:text-white sm:gap-2 sm:pr-3"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] transition-colors">
            <Heart className={cn('h-3.5 w-3.5', liked ? 'fill-brand-pink text-brand-pink' : 'text-ink-100')} />
          </span>
          <span className="font-medium tabular-nums text-ink-100">{likeCount.toLocaleString()}</span>
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setCommentsOpen(true); }}
          aria-label="View comments"
          className="group/action flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-ink-950/50 py-1.5 pl-1.5 pr-2.5 transition-colors [@media(hover:hover)]:hover:border-brand-purple/40 [@media(hover:hover)]:hover:bg-brand-purple/10 [@media(hover:hover)]:hover:text-white sm:gap-2 sm:pr-3"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] transition-colors">
            <MessageCircle className="h-3.5 w-3.5 text-ink-100" />
          </span>
          <span className="font-medium tabular-nums text-ink-100">{displayCount}</span>
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setShareOpen(true); }}
          aria-label="Share artwork"
          className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/[0.1] bg-ink-950/50 px-2.5 text-ink-100 transition-colors [@media(hover:hover)]:hover:border-brand-orange/40 [@media(hover:hover)]:hover:bg-brand-orange/10 [@media(hover:hover)]:hover:text-white sm:px-3"
        >
          <Send className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">{shareCount.toLocaleString()}</span>
        </button>
        <button
          type="button"
          aria-label={saved ? 'Remove bookmark' : 'Save artwork'}
          onClick={(event) => { event.stopPropagation(); toggleSaved(work.id, isReel ? 'reel' : 'post'); }}
          aria-pressed={saved}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-ink-950/50 text-ink-100 transition-colors [@media(hover:hover)]:hover:border-brand-orange/40 [@media(hover:hover)]:hover:bg-brand-orange/10 [@media(hover:hover)]:hover:text-white"
        >
          <Bookmark className={cn('h-3.5 w-3.5', saved ? 'fill-brand-orange text-brand-orange' : 'text-ink-100')} />
        </button>
      </div>

      <div className="px-2 pb-2 pt-3 leading-relaxed">
        <ExpandableCaption handle={work.handle} text={work.caption} variant="inline" />
      </div>
      {commentsOpen && <CommentsSheet work={work} onClose={() => setCommentsOpen(false)} onCommentAdded={() => bumpComment(work.id)} scrollContainerRef={scrollContainerRef} />}
      {shareOpen && <ShareModal work={work} onClose={() => setShareOpen(false)} onShared={() => addShare(work.id)} />}
    </article>
  );
});

export default function MainApp() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { auth, state } = useOnboarding();
  const [activeNav, setActiveNav] = useState('Home');
  const [feedIndex, setFeedIndex] = useState<number | null>(null);
  const [feedIsReel, setFeedIsReel] = useState(false);
  const isDesktop = useIsDesktop();
  const { posts: createdPosts, addPost } = usePostFeed();
  const feedPosts = [...createdPosts, ...ARTWORKS];
  const reelItems = [...createdPosts.filter((work) => work.isReel), ...REELS];
  const reelArtworkTagOptions = [...new Set(state.disciplines.flatMap((disciplineId) => {
    const questions = PRACTICE_QUESTIONS[disciplineId] ?? (disciplineId.startsWith('custom:') ? [] : FALLBACK_PRACTICE_QUESTIONS);
    return questions.flatMap((question) => {
      const answers = state.practiceAnswers[question.id] ?? [];
      const localizedOptions = localizePracticeQuestion(question, lang).options;
      return answers.map((answer) => localizedOptions[question.options.indexOf(answer)] ?? answer);
    });
  }))];
  const [createFlow, setCreateFlow] = useState({
    open: false,
    stage: 'picker' as 'picker' | 'post-mode' | 'reel-mode' | 'select' | 'editor',
    type: null as 'reel' | 'post' | 'story' | null,
    mediaUrl: '',
    caption: '',
  });
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [composerOpenCamera, setComposerOpenCamera] = useState(false);
  const [composerVariant, setComposerVariant] = useState<'story' | 'post' | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const reelGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const [reelCameraOpen, setReelCameraOpen] = useState(false);

  useCloseOnBackButton(feedIndex !== null, () => setFeedIndex(null));
  useCloseOnBackButton(createFlow.open, () => setCreateFlow({ open: false, stage: 'picker', type: null, mediaUrl: '', caption: '' }));

  useEffect(() => {
    document.body.style.overflow = feedIndex !== null || createFlow.open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [createFlow.open, feedIndex]);

  const openFeed = (work: Artwork) => {
    const isReel = Boolean(work.isReel || REELS.some((reel) => reel.id === work.id));
    const items = isReel ? reelItems : feedPosts;
    setFeedIsReel(isReel);
    setFeedIndex(items.findIndex((item) => item.id === work.id));
  };
  const feedItems = feedIsReel ? reelItems : feedPosts;
  const goNext = () => setFeedIndex((index) => (
    index !== null && index < feedItems.length - 1 ? index + 1 : index
  ));
  const goPrev = () => setFeedIndex((index) => (
    index !== null && index > 0 ? index - 1 : index
  ));

  const createOptions = [
    { id: 'reel', label: 'Reels', description: 'Motion story', icon: Video },
    { id: 'post', label: 'Post', description: 'Photos or video', icon: ImageIcon },
    { id: 'story', label: 'Story', description: 'Moment update', icon: Sparkles },
  ] as const;

  const mediaSuggestions = Array.from(new Set(
    ARTWORKS.flatMap((work) => (work.images && work.images.length > 0 ? work.images : work.imageUrl ? [work.imageUrl] : []))
  )).slice(0, 8);

  const startPostComposer = (files: File[], openCamera = false) => {
    if (!files.length && !openCamera) return;
    setComposerFiles(files);
    setComposerOpenCamera(openCamera);
    setComposerVariant('post');
    setCreateFlow({ open: false, stage: 'picker', type: null, mediaUrl: '', caption: '' });
  };

  const publishPost = (post: { caption: string; artworkTag: string; media: Array<{ url: string; type: 'image' | 'video'; posterUrl?: string }> }) => {
    if (!post.media.length) return;
    const firstImage = post.media.find((item) => item.type === 'image');
    const firstVideo = post.media.find((item) => item.type === 'video');
    const newArtwork: Artwork = {
      id: Date.now(),
      title: post.artworkTag,
      caption: post.caption.trim() || 'New work from the studio.',
      artist: state.displayName || state.username || 'Artist',
      handle: state.username ? `@${state.username}` : '@artist',
      verified: Boolean(state.verificationRequested || auth.userRole === 'artist'),
      medium: post.artworkTag,
      artworkTag: post.artworkTag,
      hue: 'from-brand-pink/25 via-brand-purple/15 to-transparent',
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      imageUrl: firstImage?.url,
      videoUrl: post.media.length === 1 && firstVideo ? firstVideo.url : undefined,
      posterUrl: firstVideo?.posterUrl,
      images: post.media.map((item) => item.posterUrl || item.url),
      mediaItems: post.media,
      avatarUrl: state.avatarUrl || 'https://i.pravatar.cc/150?u=artist',
    };
    addPost(newArtwork);
  };

  const publishCreation = (reelDetails?: ReelPublishDetails) => {
    if (!createFlow.mediaUrl) return;

    const typeLabel = createFlow.type === 'reel' ? 'reel' : createFlow.type === 'story' ? 'story' : 'post';
    const newArtwork: Artwork = {
      id: Date.now(),
      title: typeLabel === 'reel' ? reelDetails?.artworkTag ?? 'Fresh reel' : typeLabel === 'story' ? 'Studio moment' : 'Fresh post',
      caption: reelDetails?.caption.trim() || createFlow.caption.trim() || 'New work from the studio.',
      artist: state.displayName || state.username || 'Artist',
      handle: state.username ? `@${state.username}` : '@artist',
      verified: Boolean(state.verificationRequested || auth.userRole === 'artist'),
      medium: typeLabel === 'reel' ? reelDetails?.artworkTag ?? 'Motion study' : 'Original work',
      artworkTag: typeLabel === 'reel' ? reelDetails?.artworkTag : undefined,
      hue: 'from-brand-pink/25 via-brand-purple/15 to-transparent',
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      imageUrl: reelDetails?.posterUrl || createFlow.mediaUrl,
      videoUrl: typeLabel === 'reel' ? createFlow.mediaUrl : undefined,
      isReel: typeLabel === 'reel',
      posterUrl: reelDetails?.posterUrl,
      reelFilter: reelDetails?.filter,
      reelStartSeconds: reelDetails?.startSeconds,
      reelEndSeconds: reelDetails?.endSeconds,
      reelOverlayText: reelDetails?.overlayText,
      reelSticker: reelDetails?.sticker,
      reelTextPosition: reelDetails?.textPosition,
      reelStickerPosition: reelDetails?.stickerPosition,
      reelTextScale: reelDetails?.textScale,
      reelStickerScale: reelDetails?.stickerScale,
      reelTextFont: reelDetails?.textFont,
      reelTextColor: reelDetails?.textColor,
      reelTextBold: reelDetails?.textBold,
      reelTextItalic: reelDetails?.textItalic,
      reelTextAlign: reelDetails?.textAlign,
      reelPlaybackRate: reelDetails?.playbackRate,
      reelAudience: reelDetails?.audience,
      reelAllowComments: reelDetails?.allowComments,
      reelAllowDownloads: reelDetails?.allowDownloads,
      avatarUrl: state.avatarUrl || 'https://i.pravatar.cc/150?u=artist',
    };

    addPost(newArtwork);
    setCreateFlow({ open: false, stage: 'picker', type: null, mediaUrl: '', caption: '' });
  };

  const dockNav = (
    <div className="fixed inset-x-0 bottom-6 z-[9999] flex justify-center pointer-events-none">
      <div aria-hidden="true" className="absolute -z-10 h-16 w-56 rounded-full bg-brand-gradient-soft opacity-40 blur-2xl" />
      <nav
        aria-label="Primary navigation"
        className="pointer-events-auto z-[9999] flex items-center gap-1 rounded-full bg-ink-900 border border-white/10 px-2 py-2 shadow-2xl backdrop-blur-xl"
      >
        {[
          { icon: Home, label: 'Home' },
          { icon: Compass, label: 'Explore' },
          { icon: Search, label: 'Search' },
          { icon: Heart, label: 'Heart' },
          { icon: MessageCircle, label: 'Direct' },
        ].map(({ icon: Icon, label }) => {
        const isActive = activeNav === label;
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => {
                setActiveNav(label);
                if (label === 'Explore') {
                  navigate('/explore');
                } else if (label === 'Search') {
                  navigate('/search');
                } else if (label === 'Heart') {
                  navigate('/notifications');
                } else if (label === 'Direct') {
                  navigate('/direct');
                }
              }}
              className={cn(
                'relative flex w-12 h-12 items-center justify-center rounded-xl text-ink-200 transition-all duration-200 hover:text-white',
                isActive && 'text-white',
              )}
            >
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200',
                isActive && 'bg-brand-gradient-soft border border-white/10 scale-110',
              )}>
                <Icon className="h-5 w-5" />
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Main feed */}
      <main className="min-w-0 w-full">
        {/* Top bar */}
        <header className="bg-ink-950/90 border-b border-white/[0.06]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 py-4">
            <div className="flex items-center justify-start">
              <button
                type="button"
                aria-label="Create"
                onClick={() => setCreateFlow({ open: true, stage: 'picker', type: null, mediaUrl: '', caption: '' })}
                className="w-11 h-11 rounded-xl hover:bg-white/[0.04] flex items-center justify-center text-ink-200 hover:text-white transition-colors"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center justify-center">
              <img
                src="/assets/images/app_title.png"
                alt="Artistry"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-end">
              <StoryAvatar userKey={canonicalizeUserKey(state.username || state.email || 'current-artist')} src={state.avatarUrl} name={state.displayName || state.username || 'Artist'} size={40} className="h-10 w-10 border border-white/10 bg-brand-gradient-soft transition-transform hover:scale-105" onNoStoryClick={() => navigate('/profile')} />
            </div>
          </div>
        </header>

        <StoriesBar />

        {/* Feed */}
        <section className="px-5 sm:px-8 pt-10 pb-32">
          <div className="flex flex-col gap-5 sm:hidden">
            {feedPosts.map((work) => (
              <ArtworkCard key={work.id} work={work} isReel={Boolean(work.isReel || REELS.some((reel) => reel.id === work.id))} onOpen={() => openFeed(work)} />
            ))}
          </div>
          <div className="hidden gap-5 sm:grid sm:grid-cols-2 lg:hidden">
            {[0, 1].map((column) => (
              <div key={column} className="flex min-w-0 flex-col gap-5">
                {feedPosts.filter((_, index) => index % 2 === column).map((work) => (
                  <ArtworkCard key={work.id} work={work} isReel={Boolean(work.isReel || REELS.some((reel) => reel.id === work.id))} onOpen={() => openFeed(work)} />
                ))}
              </div>
            ))}
          </div>
          <div className="hidden gap-5 lg:grid lg:grid-cols-3">
            {[0, 1, 2].map((column) => (
              <div key={column} className="flex min-w-0 flex-col gap-5">
                {feedPosts.filter((_, index) => index % 3 === column).map((work) => (
                  <ArtworkCard key={work.id} work={work} isReel={Boolean(work.isReel || REELS.some((reel) => reel.id === work.id))} onOpen={() => openFeed(work)} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>

      {feedIndex !== null && feedItems[feedIndex] && (
        <Suspense fallback={null}>
          {isDesktop ? (
            feedIsReel ? (
              <ProfileReelsModalDesktop
                items={feedItems}
                index={feedIndex}
                onClose={() => setFeedIndex(null)}
                onNext={goNext}
                onPrev={goPrev}
                showFollow
              />
            ) : (
              <ProfileFeedModalDesktop
                items={feedItems}
                index={feedIndex}
                onClose={() => setFeedIndex(null)}
                onNext={goNext}
                onPrev={goPrev}
                isPosts
                showFollow
              />
            )
          ) : (
            <ProfileFeedOverlay
              items={feedItems}
              startId={feedItems[feedIndex].id}
              onClose={() => setFeedIndex(null)}
              isReel={feedIsReel}
              mobileCaptionSingleLayer
            />
          )}
        </Suspense>
      )}

      {!(createFlow.open && createFlow.type === 'reel' && createFlow.stage === 'editor') && createPortal(dockNav, document.body)}

      {createFlow.open && !(createFlow.type === 'reel' && createFlow.stage === 'editor' && createFlow.mediaUrl) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6" onClick={() => setCreateFlow({ open: false, stage: 'picker', type: null, mediaUrl: '', caption: '' })}>
          <div className={cn(
            'relative w-full overflow-hidden rounded-[30px] border border-white/10 bg-ink-900/95 shadow-premium ring-1 ring-white/5',
            isDesktop ? 'max-w-5xl' : 'max-w-md'
          )} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-3">
                {createFlow.stage !== 'picker' && (
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => setCreateFlow((current) => ({
                      ...current,
                      stage: current.stage === 'editor' ? current.type === 'reel' ? 'reel-mode' : 'select' : 'picker',
                      mediaUrl: current.stage === 'editor' ? current.mediaUrl : '',
                    }))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-ink-200 transition-colors hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-pink/80">Create</p>
                  <h3 className="text-base font-semibold text-white sm:text-lg">
                    {createFlow.stage === 'picker' ? 'Share your next moment' : createFlow.type === 'post' ? 'Create post' : createFlow.type === 'reel' ? 'Create reel' : 'Create story'}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close creator"
                onClick={() => setCreateFlow({ open: false, stage: 'picker', type: null, mediaUrl: '', caption: '' })}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-ink-200 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createFlow.stage === 'picker' && (
              <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6 lg:grid-cols-3">
                {createOptions.map(({ id, label, description, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCreateFlow({ open: true, stage: id === 'post' ? 'post-mode' : id === 'reel' ? 'reel-mode' : 'select', type: id, mediaUrl: '', caption: '' })}
                    className={cn(
                      'group relative flex min-h-[5.75rem] flex-row items-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.045] to-transparent p-4 text-left transition-all duration-200 hover:border-brand-pink/50 hover:bg-brand-pink/10 sm:min-h-48 sm:flex-col sm:items-start sm:gap-0 sm:p-5',
                      id === 'story' && 'sm:min-h-28 lg:min-h-48'
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-brand-pink shadow-lg shadow-brand-pink/10 transition-transform duration-200 group-hover:scale-105 sm:mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.24em] text-ink-300 sm:text-[11px]">{label}</p>
                      <h4 className="mt-1 text-lg font-semibold text-white sm:mt-2 sm:text-xl">{label}</h4>
                      <p className="mt-1 text-xs text-ink-200 sm:mt-2 sm:text-sm">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {createFlow.stage === 'post-mode' && createFlow.type === 'post' && (
              <div className="p-4 sm:p-6">
                <p className="mb-4 text-sm text-ink-200">Choose how you want to add media to your post.</p>
                <div className={cn('grid gap-3', isDesktop ? 'grid-cols-2' : 'grid-cols-1')}>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="group flex min-h-36 flex-col items-center justify-center gap-3 rounded-[26px] border border-white/10 bg-gradient-to-br from-brand-pink/15 to-white/[0.02] p-5 text-white transition hover:border-brand-pink/60 hover:bg-brand-pink/10"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-brand-pink"><ImageIcon className="h-6 w-6" /></span>
                    <span className="text-center"><span className="block text-[10px] uppercase tracking-[.28em] text-brand-pink">Gallery</span><span className="mt-1 block text-lg font-semibold">Choose photos or videos</span><span className="mt-1 block text-xs text-ink-300">Select up to 10 slides</span></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startPostComposer([], true)}
                    className="group flex min-h-36 flex-col items-center justify-center gap-3 rounded-[26px] border border-white/10 bg-gradient-to-br from-brand-orange/15 to-white/[0.02] p-5 text-white transition hover:border-brand-orange/60 hover:bg-brand-orange/10"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-brand-orange"><Camera className="h-6 w-6" /></span>
                    <span className="text-center"><span className="block text-[10px] uppercase tracking-[.28em] text-brand-orange">Camera</span><span className="mt-1 block text-lg font-semibold">Take a photo or video</span></span>
                  </button>
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []);
                    event.currentTarget.value = '';
                    startPostComposer(files);
                  }}
                />
              </div>
            )}

            {createFlow.stage === 'reel-mode' && createFlow.type === 'reel' && (
              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">
                <button
                  type="button"
                  onClick={() => reelGalleryInputRef.current?.click()}
                  className="group flex min-h-40 flex-col items-center justify-center gap-3 rounded-[26px] border border-white/10 bg-gradient-to-br from-brand-pink/15 to-white/[0.02] p-5 text-white transition hover:border-brand-pink/60 hover:bg-brand-pink/10 sm:min-h-52"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-brand-pink"><Video className="h-6 w-6" /></span>
                  <span className="text-center"><span className="block text-lg font-semibold">{lang === 'fa' ? 'انتخاب ویدیو' : 'Choose a video'}</span><span className="mt-1 block text-xs text-ink-300">{lang === 'fa' ? 'فقط فایل‌های ویدیویی نمایش داده می‌شوند' : 'Browse video files only'}</span></span>
                </button>
                <button
                  type="button"
                  onClick={() => setReelCameraOpen(true)}
                  className="group flex min-h-40 flex-col items-center justify-center gap-3 rounded-[26px] border border-white/10 bg-gradient-to-br from-brand-orange/15 to-white/[0.02] p-5 text-white transition hover:border-brand-orange/60 hover:bg-brand-orange/10 sm:min-h-52"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-brand-orange"><Camera className="h-6 w-6" /></span>
                  <span className="text-center"><span className="block text-lg font-semibold">{lang === 'fa' ? 'ضبط ویدیو' : 'Take a video'}</span><span className="mt-1 block text-xs text-ink-300">{lang === 'fa' ? 'با دوربین دستگاه خود ویدیو بگیرید' : 'Record a video with your camera'}</span></span>
                </button>
                <input
                  ref={reelGalleryInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (!file || (file.type && !file.type.startsWith('video/'))) return;
                    setCreateFlow((current) => ({ ...current, stage: 'editor', mediaUrl: URL.createObjectURL(file) }));
                  }}
                />
              </div>
            )}

            {createFlow.stage === 'select' && (
              <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-brand-pink/80">Choose media</p>
                    <h4 className="mt-1 text-lg font-semibold text-white">Pick a visual for your {createFlow.type}</h4>
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-brand-pink/40 bg-brand-pink/10 px-3 py-2 text-sm font-medium text-brand-pink transition-colors hover:bg-brand-pink/15">
                    Upload
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const url = URL.createObjectURL(file);
                        setCreateFlow((current) => ({ ...current, stage: 'editor', mediaUrl: url }));
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div className={cn('grid gap-3', isDesktop ? 'grid-cols-4' : 'grid-cols-2')}>
                  {mediaSuggestions.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setCreateFlow((current) => ({ ...current, stage: 'editor', mediaUrl: url }))}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-all duration-200 hover:border-brand-pink/50 hover:scale-[1.01]"
                    >
                      <img src={url} alt="Post suggestion" className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {createFlow.stage === 'editor' && createFlow.mediaUrl && createFlow.type !== 'reel' && (
              <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-ink-950/70">
                  <img src={createFlow.mediaUrl} alt="Selected media preview" className="h-full max-h-[58vh] w-full object-cover" />
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-brand-pink/80">Caption</p>
                    <textarea
                      value={createFlow.caption}
                      onChange={(event) => setCreateFlow((current) => ({ ...current, caption: event.target.value }))}
                      rows={6}
                      placeholder="Tell the story behind the work..."
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white placeholder:text-ink-300 focus:border-brand-pink/60 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-ink-300">Audience</p>
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-ink-950/60 px-3 py-2 text-sm text-white">
                      <span>Visible to followers</span>
                      <span className="rounded-full border border-brand-pink/40 bg-brand-pink/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-brand-pink">On</span>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-3">
                    <Button variant="secondary" fullWidth onClick={() => setCreateFlow((current) => ({ ...current, stage: current.type === 'reel' ? 'reel-mode' : 'select', mediaUrl: '' }))}>
                      Back
                    </Button>
                    <Button fullWidth onClick={() => publishCreation()}>
                      Publish {createFlow.type === 'story' ? 'story' : 'post'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {composerVariant && (
        <StoryComposer
          variant={composerVariant}
          initialFiles={composerFiles}
          initialCamera={composerOpenCamera}
          onPostPublish={publishPost}
          onClose={() => {
            setComposerVariant(null);
            setComposerFiles([]);
            setComposerOpenCamera(false);
          }}
        />
      )}

      {reelCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-ink-950">
          <StoryCamera
            labels={{
              cameraUnsupported: t('stories.composer.cameraUnsupported'), cameraInsecure: t('stories.composer.cameraInsecure'),
              cameraUnavailable: t('stories.composer.cameraUnavailable'), cameraDenied: t('stories.composer.cameraDenied'),
              cameraNotFound: t('stories.composer.cameraNotFound'), cameraBusy: t('stories.composer.cameraBusy'),
              cameraConstraints: t('stories.composer.cameraConstraints'), cameraTimeout: t('stories.composer.cameraTimeout'),
              cameraError: t('stories.composer.cameraError'), cameraStarting: t('stories.composer.cameraStarting'),
              takePhoto: t('stories.composer.takePhoto'), recordVideo: t('stories.composer.recordVideo'),
              stopRecording: t('stories.composer.stopRecording'), cancelCamera: t('stories.composer.closeCamera'),
              switchCamera: t('stories.composer.switchCamera'), torch: t('stories.composer.torch'),
              chooseLibrary: t('stories.composer.chooseLibrary'), audioUnavailable: t('stories.composer.audioUnavailable'),
              recordingUnsupported: t('stories.composer.recordingUnsupported'), grid: t('stories.composer.grid'),
              safeZone: t('stories.composer.safeZone'), fallbackTitle: t('stories.composer.cameraFallbackTitle'),
              fallbackHint: t('stories.composer.cameraFallbackHint'),
            }}
            maxDurationSeconds={60}
            videoOnly
            onCapture={(file) => {
              if (!file.type.startsWith('video/')) return;
              setReelCameraOpen(false);
              setCreateFlow((current) => ({ ...current, stage: 'editor', mediaUrl: URL.createObjectURL(file) }));
            }}
            onCancel={() => setReelCameraOpen(false)}
          />
        </div>
      )}

      {createFlow.open && createFlow.type === 'reel' && createFlow.stage === 'editor' && createFlow.mediaUrl && (
        <ReelComposer
          mediaUrl={createFlow.mediaUrl}
          isPersian={lang === 'fa'}
          artworkTagOptions={reelArtworkTagOptions}
          onBack={() => setCreateFlow((current) => ({ ...current, stage: 'reel-mode', mediaUrl: '' }))}
          onPublish={(details) => publishCreation(details)}
        />
      )}

    </div>
  );
}
