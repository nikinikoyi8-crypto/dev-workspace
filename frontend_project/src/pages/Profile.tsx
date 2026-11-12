import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  ClipboardList,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Dribbble,
  Globe2,
  Grid3X3,
  Heart,
  Instagram,
  Link2,
  MessageCircle,
  Music2,
  Palette,
  Pencil,
  Play,
  Quote,
  Send,
  Bookmark,
  Share2,
  Twitter,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Youtube,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { useSaved } from '@/context/SavedContext';
import { useFollowing } from '@/context/FollowingContext';
import { useEngagement } from '@/context/EngagementContext';
import FollowButton from '@/components/FollowButton';
import StoryAvatar from '@/components/stories/StoryAvatar';
import MediumTag from '@/components/MediumTag';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/useLanguage';
import { ART_DISCIPLINES } from '@/data/categories';
import { localizedDisciplineLabel } from '@/data/disciplineTranslations';
import { ARTWORKS, ArtworkCard, PostOptionsMenu, REELS } from '@/pages/MainApp';
import HighlightsBar from '@/components/HighlightsBar';
import { cn } from '@/utils/cn';
import { goToProfile } from '@/utils/navigation';
import { ExpandableCaption } from '@/components/ExpandableCaption';
import { CommentItem, ShareModal, useCommentsState } from '@/components/social/SocialInteractions';
import { ShareProfileModal } from '@/components/social/ShareProfileModal';
import ReelsImmersiveViewer from '@/components/ReelsImmersiveViewer';
import { canonicalizeUserKey } from '@/services/storyService';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';
import { usePostFeed } from '@/context/PostFeedContext';

const PROFILE_STATS = {
  posts: 12,
  followers: 12,
  following: 35,
};

const BIO_PREVIEW_LIMIT = 80;

export const POSTS_GRID_DATA = [
  ...ARTWORKS,
  ...ARTWORKS.map((work) => ({ ...work, id: work.id + ARTWORKS.length })),
];
export function ProfileGridItem({
  work,
  isReel,
  onOpen,
}: {
  work: typeof ARTWORKS[number];
  isReel: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Open ${work.title}`}
      onClick={onOpen}
      className={cn('group relative block w-full overflow-hidden', !work.imageUrl && `bg-gradient-to-br ${work.hue}`, isReel ? 'aspect-[4/5]' : 'aspect-square')}
    >
      {work.imageUrl ? (
        <img src={work.imageUrl} alt={work.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className={cn('absolute inset-0 bg-gradient-to-br', work.hue)} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <span className="flex items-center gap-1 text-xs font-semibold">
          <Heart className="h-4 w-4 fill-white" />
          {work.likes.toLocaleString()}
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold">
          <MessageCircle className="h-4 w-4 fill-white" />
          {work.comments}
        </span>
      </div>
      {isReel && <Play className="absolute bottom-2 start-2 h-4 w-4 fill-white text-white drop-shadow" />}
    </button>
  );
}

export function useIsDesktop() {
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

export function ProfileFeedOverlay({
  items,
  startId,
  onClose,
  isReel,
  isReelForItem,
  hideFollow = false,
  mobileCaptionSingleLayer = false,
}: {
  items: typeof ARTWORKS;
  startId: number | null;
  onClose: () => void;
  isReel: boolean;
  isReelForItem?: (work: typeof ARTWORKS[number]) => boolean;
  hideFollow?: boolean;
  mobileCaptionSingleLayer?: boolean;
}) {
  const startItemRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const renderMixedItems = Boolean(isReelForItem);

  const grid = (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((work) => (
        <div key={work.id} ref={work.id === startId ? startItemRef : undefined} className="scroll-mt-4">
          <ArtworkCard work={work} scrollContainerRef={scrollContainerRef} hideFollow isReel={isReelForItem ? isReelForItem(work) : isReel} />
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      startItemRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [startId]);

  return createPortal(
    <div ref={scrollContainerRef} className="fixed inset-0 z-[9999] bg-ink-950 overflow-y-auto overscroll-contain text-ink-50">
      {!(isReel && !renderMixedItems) && (
        <button
          type="button"
          aria-label="Back to profile grid"
          onClick={onClose}
          className="fixed start-4 top-4 z-[10000] flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div className="w-full px-5 pb-10 pt-20 sm:px-8">
        {isReel || renderMixedItems ? (
          isReel && !renderMixedItems ? <ReelsImmersiveViewer items={items} startId={startId} onClose={onClose} hideFollow={hideFollow} mobileCaptionSingleLayer={mobileCaptionSingleLayer} /> : grid
        ) : grid}
      </div>
    </div>,
    document.body,
  );
}

export function ProfileFeedModalDesktop({
  items,
  index,
  onClose,
  onNext,
  onPrev,
  isPosts,
  minimumIndex = 0,
  showFollow = false,
}: {
  items: typeof ARTWORKS;
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  isPosts: boolean;
  minimumIndex?: number;
  showFollow?: boolean;
}) {
  const currentWork = items[index];
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const { isSaved, toggleSaved } = useSaved();
  const { isFollowing, toggleFollowing } = useFollowing();
  const { likedById, likeCountById, shareCountById, commentCountById, toggleLike, addShare, bumpComment } = useEngagement();
  const saved = isSaved(currentWork.id, isPosts ? 'post' : 'reel');
  const liked = Boolean(likedById[currentWork.id]);
  const likeCount = likeCountById[currentWork.id] ?? currentWork.likes;
  const shareCount = shareCountById[currentWork.id] ?? currentWork.shares;
  const commentCount = commentCountById[currentWork.id] ?? currentWork.comments;
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const { comments, toggleCommentLike, addComment, addReply } = useCommentsState(currentWork.id, currentWork.comments);
  const slides = isPosts
    ? currentWork.mediaItems?.length
      ? currentWork.mediaItems
      : (currentWork.images ?? []).map((url) => ({ url, type: 'image' as const }))
    : [];
  const totalSlides = slides.length;
  const activeSlide = slides[slideIndex];

  useEffect(() => {
    setSlideIndex(0);
    setNewComment('');
    setShareOpen(false);
  }, [currentWork.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (isPosts && event.key === 'ArrowDown') onNext();
      if (isPosts && event.key === 'ArrowUp') onPrev();
      if (!isPosts && event.key === 'ArrowRight') onNext();
      if (!isPosts && event.key === 'ArrowLeft') onPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPosts, onClose, onNext, onPrev]);

  const handleAddComment = (text: string) => {
    if (!text.trim()) return;
    addComment(text);
    bumpComment(currentWork.id);
  };

  const handleAddReply = (commentId: number, text: string) => {
    if (!text.trim()) return;
    addReply(commentId, text);
    bumpComment(currentWork.id);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6" onClick={onClose}>
      {/* Keep the post-modal close control at the physical top-right in both directions. */}
      <button
        type="button"
        aria-label="Close post"
        onClick={onClose}
        className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>
      {!isPosts && (
        <>
          <button
            type="button"
            aria-label="Previous post"
            disabled={index <= minimumIndex}
            onClick={(event) => { event.stopPropagation(); onPrev(); }}
            className="absolute start-6 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next post"
            disabled={index === items.length - 1}
            onClick={(event) => { event.stopPropagation(); onNext(); }}
            className="absolute end-6 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="relative w-full max-w-5xl">
        {isPosts && (
          <div className="absolute -end-14 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
            <button type="button" aria-label="Previous post" onClick={(event) => { event.stopPropagation(); onPrev(); }} disabled={index <= minimumIndex} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronUp className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Next post" onClick={(event) => { event.stopPropagation(); onNext(); }} disabled={index === items.length - 1} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}
        <div
          role="dialog"
          aria-label={currentWork.title}
          onClick={(event) => event.stopPropagation()}
          className="relative flex aspect-[20/9] w-full overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-premium"
        >
        <div className={cn('relative flex basis-[60%] items-center justify-center overflow-hidden bg-black bg-gradient-to-br', currentWork.hue)}>
          <div className="group relative aspect-[4/3] w-full max-w-full flex-none overflow-hidden">
          {!currentWork.imageUrl && <div className={`absolute inset-0 bg-gradient-to-br ${currentWork.hue}`} />}
          {activeSlide?.type === 'video' ? (
            <video src={activeSlide.url} poster={activeSlide.posterUrl} controls playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (activeSlide?.url || currentWork.imageUrl) ? (
            <img src={activeSlide?.url || currentWork.imageUrl} alt={currentWork.title} onError={(event) => { event.currentTarget.style.display = 'none'; }} onLoad={(event) => { event.currentTarget.style.display = ''; }} className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          {isPosts && totalSlides > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation();
                  setSlideIndex((current) => (current > 0 ? current - 1 : totalSlides - 1));
                }}
                className="absolute start-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation();
                  setSlideIndex((current) => (current < totalSlides - 1 ? current + 1 : 0));
                }}
                className="absolute end-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          {isPosts && totalSlides > 1 && (
            <div className="absolute bottom-4 start-1/2 flex -translate-x-1/2 gap-1.5">
              {Array.from({ length: totalSlides }).map((_, slide) => (
                <span key={slide} className={cn('h-1.5 w-1.5 rounded-full transition-colors', slide === slideIndex ? 'bg-white' : 'bg-white/30')} />
              ))}
            </div>
          )}
          </div>
        </div>
        <div className="flex basis-[40%] flex-col border-s border-white/10">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <StoryAvatar userKey={canonicalizeUserKey(currentWork.handle)} src={currentWork.avatarUrl} name={currentWork.artist} size={36} className="h-9 w-9 shrink-0" onNoStoryClick={() => goToProfile(navigate, currentWork.handle)} />
              <div className="min-w-0">
                <button type="button" onClick={() => goToProfile(navigate, currentWork.handle)} className="flex items-center gap-1 truncate text-left text-sm font-semibold text-white">
                  {currentWork.artist}
                  {currentWork.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-pink" />}
                </button>
                <button type="button" onClick={() => goToProfile(navigate, currentWork.handle)} className="block max-w-full truncate text-left text-xs text-ink-300">
                  {currentWork.handle}
                </button>
              </div>
            </div>
            {showFollow ? (
              <FollowButton
                isFollowing={isFollowing(currentWork.handle)}
                onClick={(event) => { event.stopPropagation(); toggleFollowing(currentWork.handle); }}
                aria-label={isFollowing(currentWork.handle) ? `Unfollow ${currentWork.artist}` : `Follow ${currentWork.artist}`}
                aria-pressed={isFollowing(currentWork.handle)}
              >
                {isFollowing(currentWork.handle) ? 'Following' : 'Follow'}
              </FollowButton>
            ) : <PostOptionsMenu work={currentWork} />}
          </div>
          <div className={cn('flex-1 overflow-y-auto px-4 py-3', isPosts && 'space-y-4')}>
            <ExpandableCaption handle={currentWork.handle} text={currentWork.caption} variant="inline" />
            <MediumTag text={currentWork.medium} className="mt-2 block" />
            {isPosts && comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onToggleLike={toggleCommentLike}
                onAddReply={handleAddReply}
              />
            ))}
          </div>
          {isPosts && (
            <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
              <div className="h-7 w-7 shrink-0 rounded-full bg-brand-gradient-soft" />
              <input
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && newComment.trim()) { handleAddComment(newComment); setNewComment(''); } }}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={!newComment.trim()}
                onClick={() => { handleAddComment(newComment); setNewComment(''); }}
                className="text-sm font-semibold text-brand-pink disabled:opacity-40"
              >
                Post
              </button>
            </div>
          )}
          <div className="border-t border-white/10 px-4 py-3">
            {isPosts ? <div className="flex items-center gap-2">
              <button type="button" aria-label={liked ? 'Unlike post' : 'Like post'} aria-pressed={liked} onClick={() => toggleLike(currentWork.id)} className="group/action flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-ink-950/50 py-1.5 ps-1.5 pe-2.5 transition-colors hover:border-brand-pink/40 hover:bg-brand-pink/10 hover:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06]"><Heart className={cn('h-3.5 w-3.5', liked ? 'fill-brand-pink text-brand-pink' : 'text-ink-100')} /></span>
                <span className="font-medium tabular-nums text-ink-100">{likeCount.toLocaleString()}</span>
              </button>
              <button type="button" aria-label="View comments" onClick={() => commentInputRef.current?.focus()} className="group/action flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-ink-950/50 py-1.5 ps-1.5 pe-2.5 transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/10 hover:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06]"><MessageCircle className="h-3.5 w-3.5 text-ink-100" /></span>
                <span className="font-medium tabular-nums text-ink-100">{commentCount.toLocaleString()}</span>
              </button>
              <div className="relative">
              <button type="button" aria-label="Share post" onClick={() => setShareOpen(true)} className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/[0.1] bg-ink-950/50 px-2.5 text-ink-100 transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/10 hover:text-white">
                <Send className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{shareCount.toLocaleString()}</span>
              </button>
              </div>
              <button type="button" aria-label={saved ? 'Remove bookmark' : 'Save post'} aria-pressed={saved} onClick={() => toggleSaved(currentWork.id, isPosts ? 'post' : 'reel')} className="ms-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-ink-950/50 text-ink-100 transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/10 hover:text-white">
                <Bookmark className={cn('h-3.5 w-3.5', saved ? 'fill-brand-orange text-brand-orange' : 'text-ink-100')} />
              </button>
            </div> : <div className="flex items-center gap-4 text-ink-100">
              <Heart className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
              <Send className="h-5 w-5" />
              <Bookmark className="ms-auto h-5 w-5" />
            </div>}
          </div>
        </div>
        </div>
      </div>
      {shareOpen && <ShareModal work={currentWork} onClose={() => setShareOpen(false)} onShared={() => addShare(currentWork.id)} />}
    </div>,
    document.body,
  );
}

export function ProfileReelsModalDesktop({
  items,
  index,
  onClose,
  onNext,
  onPrev,
  minimumIndex = 0,
  showFollow = false,
}: {
  items: typeof ARTWORKS;
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  minimumIndex?: number;
  showFollow?: boolean;
}) {
  const currentWork = items[index];
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const { isSaved, toggleSaved } = useSaved();
  const saved = isSaved(currentWork.id, 'reel');
  const [shareOpen, setShareOpen] = useState(false);
  const { isFollowing, toggleFollowing } = useFollowing();
  const { likedById, likeCountById, shareCountById, commentCountById, toggleLike, addShare, bumpComment } = useEngagement();
  const liked = Boolean(likedById[currentWork.id]);
  const likeCount = likeCountById[currentWork.id] ?? currentWork.likes;
  const shareCount = shareCountById[currentWork.id] ?? currentWork.shares;
  const commentCount = commentCountById[currentWork.id] ?? currentWork.comments;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const { comments, toggleCommentLike, addComment, addReply } = useCommentsState(currentWork.id, currentWork.comments);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
    setShareOpen(false);
    setCommentsOpen(false);
    setNewComment('');
  }, [currentWork.id]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowUp') onPrev();
      if (event.key === 'ArrowDown') onNext();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNext, onPrev]);

  const handleAddComment = (text: string) => {
    if (!text.trim()) return;
    addComment(text);
    bumpComment(currentWork.id);
  };

  const handleAddReply = (commentId: number, text: string) => {
    if (!text.trim()) return;
    addReply(commentId, text);
    bumpComment(currentWork.id);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-950/90 p-6" onClick={onClose}>
      {/* Keep the feed-viewer close control at the physical top-right in both directions. */}
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex items-center gap-5" onClick={(event) => event.stopPropagation()}>
        <div className="h-[88vh] w-[420px] overflow-hidden rounded-tl-[2rem] rounded-tr-lg rounded-br-[2rem] rounded-bl-lg border border-white/[0.1] bg-ink-900 shadow-premium">
          <div
            className={cn('relative h-full w-full cursor-pointer overflow-hidden bg-gradient-to-br', currentWork.hue)}
            onClick={() => {
              if (!videoRef.current) return;
              if (videoRef.current.paused) {
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              } else {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }}
          >
            {currentWork.videoUrl ? (
              <video
                ref={videoRef}
                src={currentWork.videoUrl}
                poster={currentWork.posterUrl}
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                onLoadedData={(event) => { event.currentTarget.style.display = ''; }}
                onLoadedMetadata={(event) => { if (currentWork.reelStartSeconds) event.currentTarget.currentTime = currentWork.reelStartSeconds; event.currentTarget.playbackRate = currentWork.reelPlaybackRate ?? 1; }}
                onTimeUpdate={(event) => { if (currentWork.reelEndSeconds && event.currentTarget.currentTime >= currentWork.reelEndSeconds) { event.currentTarget.currentTime = currentWork.reelStartSeconds ?? 0; void event.currentTarget.play(); } }}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: currentWork.reelFilter }}
                autoPlay
                loop
                muted={muted}
                playsInline
              />
            ) : (
              <div className={cn('absolute inset-0 bg-gradient-to-br', currentWork.hue)} />
            )}
            {currentWork.reelSticker && <div className="pointer-events-none absolute z-[1] whitespace-nowrap rounded-full bg-black/45 px-3 py-1.5 text-base font-semibold text-white [text-shadow:0_2px_8px_rgba(0,0,0,.9)]" style={{ left: `${currentWork.reelStickerPosition?.x ?? 50}%`, top: `${currentWork.reelStickerPosition?.y ?? 42}%`, transform: `translate(-50%, -50%) scale(${currentWork.reelStickerScale ?? 1})` }}>{currentWork.reelSticker}</div>}
            {currentWork.reelOverlayText && <div className="pointer-events-none absolute z-[1] max-w-[85%] whitespace-pre-wrap break-words [text-shadow:0_2px_12px_rgba(0,0,0,.95)]" style={{ left: `${currentWork.reelTextPosition?.x ?? 50}%`, top: `${currentWork.reelTextPosition?.y ?? 50}%`, transform: `translate(-50%, -50%) scale(${currentWork.reelTextScale ?? 1})`, color: currentWork.reelTextColor ?? '#ffffff', fontFamily: currentWork.reelTextFont === 'serif' ? 'Georgia, serif' : currentWork.reelTextFont === 'mono' ? 'ui-monospace, monospace' : currentWork.reelTextFont === 'editorial' ? 'cursive' : 'ui-sans-serif, sans-serif', fontWeight: currentWork.reelTextBold === false ? 400 : 700, fontStyle: currentWork.reelTextItalic ? 'italic' : 'normal', textAlign: currentWork.reelTextAlign ?? 'center' }}>{currentWork.reelOverlayText}</div>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2.5 bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-4" onClick={(event) => event.stopPropagation()}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn('rounded-full bg-gradient-to-br p-[2px]', currentWork.hue)}>
                  <StoryAvatar userKey={canonicalizeUserKey(currentWork.handle)} src={currentWork.avatarUrl} name={currentWork.artist} size={56} variant="inline" className="h-14 w-14" onNoStoryClick={() => goToProfile(navigate, currentWork.handle)} />
                </span>
                <div>
                  <button type="button" onClick={() => goToProfile(navigate, currentWork.handle)} className="flex items-center gap-1 text-left text-sm font-semibold text-white">
                    {currentWork.artist}
                    {currentWork.verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-pink" />}
                  </button>
                  <button type="button" onClick={() => goToProfile(navigate, currentWork.handle)} className="mt-0.5 text-left text-[11px] text-white/70">
                    {currentWork.handle}
                  </button>
                </div>
              </div>
              {showFollow ? (
                <FollowButton
                  isFollowing={isFollowing(currentWork.handle)}
                  onClick={(event) => { event.stopPropagation(); toggleFollowing(currentWork.handle); }}
                  aria-label={isFollowing(currentWork.handle) ? `Unfollow ${currentWork.artist}` : `Follow ${currentWork.artist}`}
                  aria-pressed={isFollowing(currentWork.handle)}
                >
                  {isFollowing(currentWork.handle) ? 'Following' : 'Follow'}
                </FollowButton>
              ) : <PostOptionsMenu work={currentWork} />}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10" onClick={(event) => event.stopPropagation()}>
              <MediumTag text={currentWork.medium} className="mb-2 block w-fit" />
              <ExpandableCaption handle={currentWork.handle} text={currentWork.caption} variant="sheet" />
            </div>
            {!isPlaying && currentWork.videoUrl && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                  <Play className="h-7 w-7 fill-white text-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center rounded-2xl border border-white/[0.1] bg-ink-950/60 p-2.5 text-ink-100 transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/10"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button type="button" aria-label="Like reel" onClick={() => toggleLike(currentWork.id)} className="group/action flex flex-col items-center gap-1 rounded-2xl border border-white/[0.1] bg-ink-950/60 px-3 py-2.5 text-ink-100 transition-colors hover:border-brand-pink/40 hover:bg-brand-pink/10">
            <Heart className={cn('h-4 w-4', liked ? 'fill-brand-pink text-brand-pink' : 'text-ink-100')} />
            <span className="text-[10px] font-medium tabular-nums">{likeCount.toLocaleString()}</span>
          </button>
          <button type="button" aria-label="View comments" aria-pressed={commentsOpen} onClick={() => setCommentsOpen((value) => !value)} className="flex flex-col items-center gap-1 rounded-2xl border border-white/[0.1] bg-ink-950/60 px-3 py-2.5 text-ink-100 transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/10">
            <MessageCircle className="h-4 w-4" />
            <span className="text-[10px] font-medium tabular-nums">{commentCount.toLocaleString()}</span>
          </button>
          <button type="button" aria-label="Share reel" onClick={() => setShareOpen(true)} className="flex flex-col items-center gap-1 rounded-2xl border border-white/[0.1] bg-ink-950/60 px-3 py-2.5 text-ink-100 transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/10">
            <Send className="h-4 w-4" />
            <span className="text-[10px] font-medium tabular-nums">{shareCount.toLocaleString()}</span>
          </button>
          <button type="button" aria-label={saved ? 'Remove bookmark' : 'Save reel'} aria-pressed={saved} onClick={() => toggleSaved(currentWork.id, 'reel')} className="flex items-center justify-center rounded-2xl border border-white/[0.1] bg-ink-950/60 p-2.5 text-ink-100 transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/10">
            <Bookmark className={cn('h-4 w-4', saved ? 'fill-brand-orange text-brand-orange' : 'text-ink-100')} />
          </button>

          <div className="mt-4 flex flex-col gap-2.5">
            <button type="button" aria-label="Previous reel" onClick={onPrev} disabled={index <= minimumIndex} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronUp className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Next reel" onClick={onNext} disabled={index === items.length - 1} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>
        {commentsOpen && (
          <div className="flex h-[88vh] w-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-premium">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Comments</h3>
              <button type="button" aria-label="Close comments" onClick={() => setCommentsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} onToggleLike={toggleCommentLike} onAddReply={handleAddReply} />
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
              <div className="h-7 w-7 shrink-0 rounded-full bg-brand-gradient-soft" />
              <input
                type="text"
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && newComment.trim()) { handleAddComment(newComment); setNewComment(''); } }}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
              />
              <button type="button" disabled={!newComment.trim()} onClick={() => { handleAddComment(newComment); setNewComment(''); }} className="text-sm font-semibold text-brand-pink disabled:opacity-40">
                Post
              </button>
            </div>
          </div>
        )}
      </div>
      {shareOpen && <ShareModal work={currentWork} onClose={() => setShareOpen(false)} onShared={() => addShare(currentWork.id)} />}
    </div>,
    document.body,
  );
}

function formatSocialUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function socialHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const SOCIAL_PLATFORM_STYLES: Record<string, { icon: LucideIcon; iconClass: string; backgroundClass: string }> = {
  instagram: { icon: Instagram, iconClass: 'text-white', backgroundClass: 'bg-brand-gradient' },
  'twitter / x': { icon: Twitter, iconClass: 'text-white', backgroundClass: 'bg-ink-800' },
  twitter: { icon: Twitter, iconClass: 'text-white', backgroundClass: 'bg-ink-800' },
  x: { icon: Twitter, iconClass: 'text-white', backgroundClass: 'bg-ink-800' },
  behance: { icon: Link2, iconClass: 'text-white', backgroundClass: 'bg-brand-purple' },
  dribbble: { icon: Dribbble, iconClass: 'text-white', backgroundClass: 'bg-brand-pink' },
  website: { icon: Globe2, iconClass: 'text-white', backgroundClass: 'bg-ink-700' },
  youtube: { icon: Youtube, iconClass: 'text-white', backgroundClass: 'bg-brand-pink' },
  tiktok: { icon: Music2, iconClass: 'text-white', backgroundClass: 'bg-ink-800' },
  artstation: { icon: Palette, iconClass: 'text-white', backgroundClass: 'bg-brand-purple' },
};

function getSocialStyle(label: string) {
  return SOCIAL_PLATFORM_STYLES[label.trim().toLowerCase()] || { icon: Link2, iconClass: 'text-ink-100', backgroundClass: 'bg-ink-700' };
}

export default function Profile() {
  const navigate = useNavigate();
  const { state, update } = useOnboarding();
  const { posts: createdPosts } = usePostFeed();
  const { followingCount } = useFollowing();
  const { lang } = useLanguage();
  const [bioOpen, setBioOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);
  const [confirmLink, setConfirmLink] = useState<{ label: string; url: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [feedIndex, setFeedIndex] = useState<number | null>(null);
  const [showAllDisciplines, setShowAllDisciplines] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const isDesktop = useIsDesktop();
  const authoredPosts = createdPosts.filter((work) => canonicalizeUserKey(work.handle) === canonicalizeUserKey(state.username || 'artist'));
  const items = activeTab === 'posts' ? [...authoredPosts, ...POSTS_GRID_DATA] : [...authoredPosts.filter((work) => work.isReel), ...REELS];

  useCloseOnBackButton(feedIndex !== null, () => setFeedIndex(null));
  useCloseOnBackButton(shareProfileOpen, () => setShareProfileOpen(false));
  useCloseOnBackButton(Boolean(confirmLink), () => setConfirmLink(null));

  useEffect(() => {
    document.body.style.overflow = feedIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [feedIndex]);

  useEffect(() => {
    if (!bioOpen && !linksOpen && !practiceOpen && !confirmLink) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBioOpen(false);
        setLinksOpen(false);
        setPracticeOpen(false);
        setConfirmLink(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bioOpen, linksOpen, practiceOpen, confirmLink]);

  const displayName = state.displayName || state.fullName || state.username || 'Artist';
  const username = state.username || 'artist';
  const disciplines = state.disciplines.length
    ? state.disciplines.map((discipline) => {
        if (discipline.startsWith('custom:')) {
          return { id: discipline, label: discipline.slice(7) };
        }

        const matchedDiscipline = ART_DISCIPLINES.find((item) => item.id === discipline);
        return {
          id: discipline,
          label: matchedDiscipline ? localizedDisciplineLabel(matchedDiscipline, lang) : discipline,
        };
      })
    : [{ id: 'artist', label: lang === 'fa' ? 'هنرمند' : 'Artist' }];

  const visibleDisciplines = showAllDisciplines ? disciplines : disciplines.slice(0, 2);
  const hiddenCount = Math.max(disciplines.length - 2, 0);
  const practiceAnswers = Object.entries(state.practiceAnswers).filter(([, answers]) => answers.length > 0);
  const profileBio = state.bio?.trim();
  const shouldShowBioToggle = profileBio.length > BIO_PREVIEW_LIMIT;
  const bioPreview = profileBio.slice(0, BIO_PREVIEW_LIMIT);
  const displaySocials = state.socials;
  const profileLinks = displaySocials.slice(0, 4);
  const visibleSocials = linksOpen ? profileLinks : profileLinks.slice(0, 2);
  const shouldShowLinksToggle = profileLinks.length > 2;

  const handleCoverUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    update({ coverUrl: URL.createObjectURL(file) });
    event.target.value = '';
  };

  const handleConfirmLink = () => {
    if (!confirmLink) return;

    window.open(socialHref(confirmLink.url), '_blank', 'noopener,noreferrer');
    setConfirmLink(null);
  };

  const goNext = () => setFeedIndex((index) => (index !== null && index < items.length - 1 ? index + 1 : index));
  const goPrev = () => setFeedIndex((index) => (index !== null && index > 0 ? index - 1 : index));

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 px-4 pb-12 pt-3 text-ink-100 sm:px-8 sm:pt-6">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(232,79,155,0.12),transparent_65%)]" />
      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <header className="flex h-12 items-center justify-between border-b border-white/[0.06] sm:border-0">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate('/app', { replace: true })}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white rtl:rotate-180"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span aria-hidden="true" className="w-10" />
          <button
            type="button"
            aria-label="Profile options"
            onClick={() => navigate('/profile/options')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <span aria-hidden="true" className="flex w-5 flex-col items-center gap-1">
              <span className="h-0.5 w-5 rounded-full bg-current" />
              <span className="h-0.5 w-5 rounded-full bg-current" />
              <span className="h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
        </header>

        <section className="relative z-30 mt-3 isolate overflow-visible rounded-3xl sm:mt-5">
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-3xl border border-white/10 bg-ink-750/80 shadow-card backdrop-blur-2xl" />
          <div className="relative h-28 overflow-hidden rounded-t-3xl bg-ink-800 sm:h-32">
            {state.coverUrl ? (
              state.coverUrl.toLowerCase().endsWith('.mp4') || state.coverUrl.toLowerCase().includes('video') ? (
                <video src={state.coverUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={state.coverUrl} alt="Profile cover" className="h-full w-full object-cover" />
              )
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-ink-800 via-ink-700 to-ink-900" />
            )}
            <input ref={coverInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleCoverUpload} />
          </div>

          <div className="pb-4">
            <div className="relative -mt-8 flex flex-wrap items-end gap-6 px-5 sm:flex-nowrap sm:px-6">
              <div className="relative -translate-y-2 shrink-0 sm:z-10 sm:-translate-y-2">
                <div aria-hidden="true" className="pointer-events-none absolute -inset-1 hidden rounded-full bg-ink-750 sm:block sm:bg-[#1C1523]" />
                <StoryAvatar userKey={canonicalizeUserKey(state.username || state.email || 'current-artist')} src={state.avatarUrl} name={displayName} size={80} className="relative z-10 h-20 w-20 border-4 border-ink-750 sm:h-24 sm:w-24 sm:border-[#1C1523]" />
              </div>

              <div className="mt-9 min-w-0 flex-1 text-start rtl:text-right sm:mt-0 sm:hidden">
                <div className="flex items-center gap-1.5">
                  <h2 className="min-w-0 whitespace-normal break-words text-xl font-bold leading-tight text-white">{displayName}</h2>
                  <BadgeCheck className="h-5 w-5 shrink-0 text-brand-pink" />
                </div>
                <p className="mt-1 text-sm text-ink-300">@{username}</p>
              </div>

              <div dir="ltr" className="static flex basis-full -translate-x-0 translate-y-0 justify-center gap-6 pt-2 pb-1 sm:absolute sm:bottom-1 sm:start-1/2 sm:basis-auto sm:-translate-x-1/2 sm:translate-y-20 sm:gap-8 sm:pt-0">
                <div className="flex min-w-0 flex-col items-center text-center">
                  <Grid3X3 className="h-5 w-5 text-brand-pink" />
                  <strong className="mt-1.5 text-xl font-bold leading-none text-white sm:text-3xl">{PROFILE_STATS.posts}</strong>
                  <span className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-300 sm:text-[11px]">Posts</span>
                </div>
                <div className="flex min-w-0 flex-col items-center text-center">
                  <Users className="h-5 w-5 text-brand-pink" />
                  <strong className="mt-1.5 text-xl font-bold leading-none text-white sm:text-3xl">{PROFILE_STATS.followers}</strong>
                  <span className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-300 sm:text-[11px]">Followers</span>
                </div>
                <div className="flex min-w-0 flex-col items-center text-center">
                  <UserCheck className="h-5 w-5 text-brand-purple" />
                  <strong className="mt-1.5 text-xl font-bold leading-none text-white sm:text-3xl">{(PROFILE_STATS.following + followingCount).toLocaleString()}</strong>
                  <span className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-300 sm:text-[11px]">Following</span>
                </div>
              </div>
            </div>

            <div className="mt-4 hidden px-5 text-start rtl:text-right sm:block sm:px-6">
              <div className="flex items-center gap-1.5">
                <h2 className="min-w-0 whitespace-normal break-words text-xl font-bold leading-tight text-white sm:text-2xl">{displayName}</h2>
                <BadgeCheck className="h-5 w-5 shrink-0 text-brand-pink" />
              </div>
              <p className="mt-1 text-sm text-ink-300">@{username}</p>
            </div>
          </div>

          {(profileBio || displaySocials.length > 0) && (
            <div className="px-5 pb-4 sm:px-6">
              {profileBio && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-300">
                    <Quote className="h-3.5 w-3.5 text-brand-pink" />
                    <span>{lang === 'fa' ? 'بیو' : 'Bio'}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-100">
                    {bioOpen || !shouldShowBioToggle ? profileBio : `${bioPreview}...`}
                    {shouldShowBioToggle && (
                      <button
                        type="button"
                        aria-expanded={bioOpen}
                        aria-label={lang === 'fa' ? (bioOpen ? 'بستن بایو' : 'بیشتر ببینید') : (bioOpen ? 'Show less' : 'See more')}
                        onClick={() => setBioOpen((isOpen) => !isOpen)}
                        className="ms-1 inline text-xs font-medium text-brand-pink transition-colors hover:text-brand-pink/80"
                      >
                        {lang === 'fa' ? (bioOpen ? 'بستن' : 'بیشتر ببینید') : (bioOpen ? 'Show less' : 'See more')}
                      </button>
                    )}
                  </p>
                </div>
              )}

              {displaySocials.length > 0 && (
                <div className={profileBio ? 'mt-4' : ''}>
                  <div className="text-xs text-ink-300">{lang === 'fa' ? 'لینک‌ها' : 'Links'}</div>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {visibleSocials.map((social) => {
                      const socialStyle = getSocialStyle(social.label);
                      const SocialIcon = socialStyle.icon;

                      return (
                        <button
                          key={`${social.label}-${social.url}`}
                          type="button"
                          onClick={() => setConfirmLink({ label: social.label, url: social.url })}
                          aria-label={`${social.label}: ${formatSocialUrl(social.url)}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] py-1.5 ps-1.5 pe-3 text-xs font-medium text-white transition-colors hover:border-brand-pink/30 hover:bg-white/[0.08]"
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${socialStyle.backgroundClass}`}>
                            <SocialIcon className={`h-3.5 w-3.5 ${socialStyle.iconClass}`} />
                          </span>
                          <span>{social.label}</span>
                        </button>
                      );
                    })}
                    {shouldShowLinksToggle && (
                      <button
                        type="button"
                        aria-expanded={linksOpen}
                        aria-label={lang === 'fa' ? (linksOpen ? 'بستن لینک‌ها' : 'نمایش لینک‌های بیشتر') : (linksOpen ? 'Show fewer links' : 'See more links')}
                        onClick={() => setLinksOpen((isOpen) => !isOpen)}
                        className="self-start text-xs font-medium text-brand-pink transition-colors hover:text-brand-pink/80"
                      >
                        {lang === 'fa' ? (linksOpen ? 'بستن لینک‌ها' : 'نمایش لینک‌های بیشتر') : (linksOpen ? 'Show fewer links' : 'See more links')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {disciplines.length > 0 && (
            <div className="relative px-5 pb-4 sm:px-6">
              <div dir="ltr" className="flex items-center gap-1.5 text-start">
                <span className="text-xs text-ink-300">{lang === 'fa' ? 'رشته‌های هنری' : 'Art disciplines'}</span>
                <span className="relative flex-1 sm:contents">
                  <button
                    type="button"
                    aria-expanded={practiceOpen}
                    aria-label={lang === 'fa' ? 'نمایش پاسخ‌های تمرین' : 'Show practice answers'}
                    onClick={() => setPracticeOpen((isOpen) => !isOpen)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-pink transition-colors hover:bg-brand-pink/10"
                  >
                    <ClipboardList className="h-4 w-4" />
                  </button>

                  {practiceOpen && (
                <div className="absolute bottom-full -end-4 z-50 mb-2 w-[min(28rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] sm:absolute sm:inset-x-auto sm:end-72 sm:top-0 sm:mb-0 sm:w-auto sm:max-w-none sm:translate-x-0 sm:translate-y-0" onClick={() => setPracticeOpen(false)}>
                  <div role="dialog" aria-label={lang === 'fa' ? 'تمرین هنری' : 'Art Practice'} onClick={(event) => event.stopPropagation()} className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-ink-750 p-4 shadow-card sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">Art Practice</h3>
                      <button type="button" aria-label={lang === 'fa' ? 'بستن پاسخ‌ها' : 'Close answers'} onClick={() => setPracticeOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-white/[0.08] hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 space-y-3 text-start rtl:text-right">
                      {practiceAnswers.length > 0 ? practiceAnswers.map(([question, answers]) => (
                        <div key={question} className="text-xs leading-relaxed"><span className="font-medium text-white">{question}:</span>{' '}<span className="text-ink-200">{answers.join(' · ')}</span></div>
                      )) : <span className="text-xs text-ink-400">{lang === 'fa' ? 'هنوز پاسخی ثبت نشده است.' : 'No answers have been selected yet.'}</span>}
                    </div>
                  </div>
                </div>
                  )}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 sm:gap-1.5">
                {visibleDisciplines.map((discipline) => {
                  return (
                    <span key={discipline.id} className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] leading-none text-ink-100 sm:text-xs">
                      {discipline.label}
                    </span>
                  );

                })}
                {!showAllDisciplines && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDisciplines(true)}
                    aria-label={lang === 'fa' ? 'نمایش همه رشته‌ها' : 'Show all disciplines'}
                    className="rounded-full border border-white/10 bg-transparent px-2 py-1 text-[10px] leading-none text-ink-300 transition-colors hover:border-brand-pink/40 hover:text-white sm:text-xs"
                  >
                    +{hiddenCount}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {confirmLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmLink(null)}>
            <div
              role="dialog"
              aria-label={lang === 'fa' ? 'تأیید باز کردن لینک' : 'Confirm external link'}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-750 p-5 shadow-card"
            >
              <h3 className="text-base font-semibold text-white">{lang === 'fa' ? 'باز کردن لینک' : 'Open link'}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-200">
                {lang === 'fa' ? 'آیا مطمئن هستید که می‌خواهید وارد این لینک شوید؟' : 'Are you sure you want to open this link?'}
              </p>
              <p className="mt-2 truncate text-xs text-ink-300">{confirmLink.label}: {formatSocialUrl(confirmLink.url)}</p>
              <div className="mt-5 flex justify-end gap-2 rtl:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setConfirmLink(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {lang === 'fa' ? 'خیر' : 'No'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  className="rounded-xl bg-brand-pink px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-pink/80"
                >
                  {lang === 'fa' ? 'بله' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button type="button" variant="flat" onClick={() => navigate('/profile/edit-profile')} className="rounded-full border border-white/15 bg-transparent px-3 text-xs transition-colors hover:border-brand-purple/60 hover:bg-white/[0.04] sm:px-4 sm:text-sm" fullWidth leftIcon={<Pencil className="h-4 w-4" />}>Edit Profile</Button>
          <Button type="button" variant="flat" onClick={() => setShareProfileOpen(true)} className="rounded-full border border-white/15 bg-transparent px-3 text-xs transition-colors hover:border-brand-purple/60 hover:bg-white/[0.04] sm:px-4 sm:text-sm" fullWidth leftIcon={<Share2 className="h-4 w-4" />}>Share Profile</Button>
        </div>

        <div className="mt-5 sm:mt-6">
          <HighlightsBar />
        </div>

        <nav aria-label="Profile content" className="mt-0 grid grid-cols-2 border-b border-white/[0.1] sm:mt-1">
          <button
            type="button"
            aria-label="Posts"
            aria-pressed={activeTab === 'posts'}
            onClick={() => setActiveTab('posts')}
            className={`group relative flex h-14 items-center justify-center transition-colors ${activeTab === 'posts' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-ink-300 hover:text-white'}`}
          >
            {activeTab === 'posts' && <span className="absolute bottom-0 h-9 w-16 rounded-full bg-brand-gradient-soft blur-xl" />}
            <Grid3X3 className="relative h-5 w-5 transition-transform group-hover:scale-110" />
          </button>
          <button
            type="button"
            aria-label="Reels"
            aria-pressed={activeTab === 'reels'}
            onClick={() => setActiveTab('reels')}
            className={`group relative flex h-14 items-center justify-center transition-colors ${activeTab === 'reels' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-ink-300 hover:text-white'}`}
          >
            {activeTab === 'reels' && <span className="absolute bottom-0 h-9 w-16 rounded-full bg-brand-gradient-soft blur-xl" />}
            <Clapperboard className="relative h-5 w-5 transition-transform group-hover:scale-110" />
          </button>
        </nav>

        <section className={cn('grid gap-1 pt-4 sm:pt-5', activeTab === 'posts' ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-3')}>
          {items.map((work) => (
            <ProfileGridItem
              key={`${activeTab}-${work.id}`}
              work={work}
              isReel={activeTab === 'reels'}
              onOpen={() => setFeedIndex(items.findIndex((item) => item.id === work.id))}
            />
          ))}
        </section>

        {feedIndex !== null && (
          isDesktop ? (
            activeTab === 'posts' ? (
              <ProfileFeedModalDesktop
                items={items}
                index={feedIndex}
                onClose={() => setFeedIndex(null)}
                onNext={goNext}
                onPrev={goPrev}
                isPosts
              />
            ) : (
              <ProfileReelsModalDesktop
                items={items}
                index={feedIndex}
                onClose={() => setFeedIndex(null)}
                onNext={goNext}
                onPrev={goPrev}
              />
            )
          ) : (
            <ProfileFeedOverlay
              items={items}
              startId={items[feedIndex].id}
              onClose={() => setFeedIndex(null)}
              isReel={activeTab === 'reels'}
              hideFollow={true}
            />
          )
        )}

        {shareProfileOpen && <ShareProfileModal username={username} lang={lang} onClose={() => setShareProfileOpen(false)} />}

      </div>
    </main>
  );
}
