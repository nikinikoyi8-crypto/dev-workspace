import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Trash2, X } from 'lucide-react';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/useLanguage';
import { useOnboarding } from '@/context/OnboardingContext';
import { useStories } from '@/context/StoriesContext';
import { canonicalizeUserKey, getStoryUserKey } from '@/services/storyService';
import type { Story, StoryViewerProfile } from '@/services/storyService';
import { STORY_MOOD_FILTERS } from '@/components/stories/StoryMoodFilter';
import StoryLayerOverlay from '@/components/stories/StoryLayerOverlay';
import StoryAvatar from '@/components/stories/StoryAvatar';

interface StoryViewerProps {
  stories: Story[];
  storyGroups?: Story[][];
  initialGroupIndex?: number;
  initialIndex?: number;
  ownerView?: boolean;
  sample?: boolean;
  onClose: () => void;
  onStoryGroupChange?: (stories: Story[]) => void;
  onDelete?: (id: string) => Promise<void> | void;
}

const IMAGE_DURATION_MS = 5000;
const STORY_BACKGROUND_STYLES: Record<string, string> = {
  'gradient:sunset-wash': 'linear-gradient(145deg,#ff8a3d 0%,#e84f9b 52%,#7b45e8 100%)',
  'gradient:violet-hour': 'radial-gradient(ellipse at 25% 18%,#7548c8 0%,transparent 48%),linear-gradient(150deg,#251834,#11101c 72%,#301d3c)',
  'gradient:studio-dawn': 'radial-gradient(ellipse at 78% 14%,rgba(255,190,126,.72),transparent 36%),linear-gradient(150deg,#7d4260,#302039 66%,#17121f)',
};

function numberLocale(lang: string): string { return lang === 'fa' ? 'fa-IR' : 'en'; }

function formatRelativeTime(timestamp: number, lang: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  const formatter = new Intl.RelativeTimeFormat(numberLocale(lang), { numeric: 'auto' });
  if (minutes < 1) return formatter.format(0, 'minute');
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, 'hour');
  return formatter.format(-Math.floor(hours / 24), 'day');
}

export default function StoryViewer({ stories: initialStories, storyGroups, initialGroupIndex = 0, initialIndex = 0, ownerView = false, sample = false, onClose, onStoryGroupChange, onDelete }: StoryViewerProps) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { state: profile, auth } = useOnboarding();
  const { recordView, toggleLike, listViewers, markStorySeen } = useStories();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [index, setIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [imageElapsed, setImageElapsed] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [viewerPanelOpen, setViewerPanelOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [filterLikes, setFilterLikes] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [quickReply, setQuickReply] = useState('');
  const [sentReply, setSentReply] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerProfile[]>([]);
  const dialogRef = useRef<HTMLElement>(null);
  const viewerPanelRef = useRef<HTMLElement>(null);
  const deleteDialogRef = useRef<HTMLElement>(null);
  const elapsedRef = useRef(0);
  const tickRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef<number | null>(null);
  const viewedStoryIds = useRef(new Set<string>());
  const stories = storyGroups?.[groupIndex] ?? initialStories;
  const story = stories[index];
  const ownerIdentity = canonicalizeUserKey(profile.username || profile.email || 'current-artist');
  const owner = !!story && !!auth.isAuthenticated && (
    (ownerView && getStoryUserKey(story) === ownerIdentity) || canonicalizeUserKey(story.ownerId) === ownerIdentity
  );
  const viewerIdentity = useMemo(() => ({
    id: canonicalizeUserKey(profile.username || profile.email || 'current-artist'),
    name: profile.displayName || profile.fullName || profile.username || t('stories.viewer.you'),
    avatarUrl: profile.avatarUrl || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#7b45e8"/><text x="48" y="59" fill="white" font-size="40" text-anchor="middle">${(profile.displayName || profile.username || 'A').slice(0, 1)}</text></svg>`)}`,
  }), [profile.avatarUrl, profile.displayName, profile.email, profile.fullName, profile.username, t]);

  const move = useCallback((step: number) => {
    const target = index + step;
    if (target >= 0 && target < stories.length) {
      setIndex(target);
      return;
    }
    if (storyGroups) {
      for (let nextGroup = groupIndex + Math.sign(step); nextGroup >= 0 && nextGroup < storyGroups.length; nextGroup += Math.sign(step)) {
        const nextStories = storyGroups[nextGroup];
        if (!nextStories?.length) continue;
        setGroupIndex(nextGroup);
        setIndex(step > 0 ? 0 : nextStories.length - 1);
        onStoryGroupChange?.(nextStories);
        return;
      }
    }
    onClose();
  }, [groupIndex, index, onClose, onStoryGroupChange, stories.length, storyGroups]);
  const moveForward = useCallback(() => move(1), [move]);
  const moveBackward = useCallback(() => move(-1), [move]);
  const currentProcessStories = useMemo(() => story?.process ? stories.filter((item) => item.process?.groupId === story.process?.groupId).sort((a, b) => (a.process?.step ?? 0) - (b.process?.step ?? 0)) : [], [stories, story]);

  useCloseOnBackButton(true, onClose);
  useFocusTrap(dialogRef, !viewerPanelOpen && !deletePrompt, onClose);
  useFocusTrap(viewerPanelRef, viewerPanelOpen, () => setViewerPanelOpen(false));
  useFocusTrap(deleteDialogRef, deletePrompt, () => setDeletePrompt(false));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (!stories.length) {
      if (storyGroups) moveForward();
      else onClose();
      return;
    }
    if (index >= stories.length) setIndex(stories.length - 1);
  }, [index, moveForward, onClose, stories.length, storyGroups]);

  useEffect(() => {
    elapsedRef.current = 0;
    setImageElapsed(0);
    setVideoProgress(0);
    setPaused(false);
    setSentReply(false);
    setQuickReply('');
    setLiked(false);
    if (!story) return;
    markStorySeen(story.id);
    if (owner || sample || viewedStoryIds.current.has(story.id)) return;
    viewedStoryIds.current.add(story.id);
    void recordView(story.id, viewerIdentity);
  }, [index, markStorySeen, owner, recordView, sample, story, viewerIdentity]);

  useEffect(() => {
    if (!story) return;
    if (sample) { setViewers(story.viewers ?? []); return; }
    if (owner && viewerPanelOpen) void listViewers(story.id).then(setViewers);
    else setViewers(story.viewers ?? []);
    const ownRecord = story.viewers?.find((item) => item.id === viewerIdentity.id);
    setLiked(!!ownRecord?.liked);
  }, [index, listViewers, owner, sample, story, viewerIdentity.id, viewerPanelOpen]);

  useEffect(() => {
    if (!story || story.type === 'video' || paused || viewerPanelOpen) return;
    tickRef.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      elapsedRef.current += now - tickRef.current;
      tickRef.current = now;
      setImageElapsed(elapsedRef.current);
      if (elapsedRef.current >= IMAGE_DURATION_MS) moveForward();
    }, 40);
    return () => window.clearInterval(interval);
  }, [moveForward, paused, story, viewerPanelOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || story?.type !== 'video') return;
    if (paused || viewerPanelOpen) video.pause();
    else void video.play().catch(() => undefined);
  }, [paused, story, viewerPanelOpen]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); move(lang === 'fa' ? -1 : 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(lang === 'fa' ? 1 : -1); }
    };
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, [lang, move]);

  useEffect(() => {
    const resume = () => setPaused(false);
    window.addEventListener('pointerup', resume);
    window.addEventListener('pointercancel', resume);
    window.addEventListener('blur', resume);
    return () => {
      window.removeEventListener('pointerup', resume);
      window.removeEventListener('pointercancel', resume);
      window.removeEventListener('blur', resume);
    };
  }, []);

  const showHeart = useCallback(() => {
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 750);
  }, []);
  const likeStory = useCallback(() => {
    if (!story || owner) return;
    const next = !liked;
    setLiked(next);
    if (next) showHeart();
    void toggleLike(story.id, viewerIdentity);
  }, [liked, owner, showHeart, story, toggleLike, viewerIdentity]);
  const doubleTap = useDoubleTap(() => likeStory());

  const handleTap = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const isPhysicalLeft = event.clientX < bounds.left + bounds.width / 2;
    if (lang === 'fa') {
      if (isPhysicalLeft) moveForward(); else moveBackward();
    } else if (isPhysicalLeft) moveBackward(); else moveForward();
  };
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => { touchStartY.current = event.touches[0]?.clientY ?? null; };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartY.current;
    const endY = event.changedTouches[0]?.clientY;
    if (startY !== null && endY !== undefined && startY - endY > 60 && owner) setViewerPanelOpen(true);
    touchStartY.current = null;
    setPaused(false);
    doubleTap.onTouchEnd(event);
  };

  const handleTouchStartAndDoubleTap = (event: React.TouchEvent<HTMLDivElement>) => {
    handleTouchStart(event);
    doubleTap.onTouchStart(event);
  };

  const removeCurrent = async () => {
    if (!story) return;
    setDeletePrompt(false);
    const deletion = onDelete?.(story.id);
    if (stories.length <= 1) moveForward();
    else if (index === stories.length - 1) setIndex(index - 1);
    void Promise.resolve(deletion).catch(() => undefined);
  };

  const sendQuickReply = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickReply.trim()) return;
    setSentReply(true);
    setQuickReply('');
  };

  if (!story) return null;
  const filteredViewers = filterLikes ? viewers.filter((viewer) => viewer.liked || viewer.reaction) : viewers;
  const processIndex = currentProcessStories.findIndex((item) => item.id === story.id);
  const displayViewers = owner && viewerPanelOpen ? viewers : story.viewers ?? [];
  const displayViewCount = Math.max(story.viewCount ?? 0, story.viewers?.length ?? 0);
  const displayLikeCount = Math.max(story.likeCount ?? 0, story.viewers?.filter((viewer) => viewer.liked).length ?? 0);
  const frameOverlay = story.frame && story.frame !== 'none' ? <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-20 ${story.frame === 'gallery' ? 'border-[10px] border-[#f7efe0]/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,.28)]' : 'border-[18px] border-[#e8dbc5]/95 shadow-[inset_0_0_0_1px_rgba(110,86,71,.18)]'}`} /> : null;
  const palettes = story.palette ?? [];
  const storyAvatarUrl = story.artistAvatarUrl || (owner ? profile.avatarUrl : undefined);
  const storyAvatarInitial = (story.artistName || t('stories.viewer.yourMoment')).trim().slice(0, 1).toUpperCase();
  const previousStoryIndex = index - 1;
  const nextStoryIndex = index + 1;
  const previousStory = stories[previousStoryIndex] ?? null;
  const nextStory = stories[nextStoryIndex] ?? null;
  const desktopStoryPeek = (peekStory: Story | null, peekIndex: number, side: 'previous' | 'next') => peekStory ? <button type="button" aria-label={t(side === 'previous' ? 'stories.viewer.previous' : 'stories.viewer.next')} onClick={() => setIndex(peekIndex)} className={`group hidden w-[clamp(6rem,10vw,8rem)] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 text-start shadow-xl transition duration-300 hover:-translate-y-1 hover:border-brand-pink/40 hover:shadow-[0_18px_60px_rgba(0,0,0,.45)] lg:flex lg:flex-col ${side === 'previous' ? '-rotate-2' : 'rotate-2'}`}>
    <span className="relative aspect-[9/16] w-full overflow-hidden bg-ink-800" style={{ background: STORY_BACKGROUND_STYLES[peekStory.backgroundColor ?? ''] ?? peekStory.backgroundColor ?? '#211827' }}>
      {peekStory.type === 'image' ? <img src={peekStory.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : peekStory.posterUrl && <img src={peekStory.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/15" />
      <span className="absolute inset-x-2 bottom-2"><span className="block truncate text-[10px] font-semibold text-white">{peekStory.artistName || t('stories.viewer.yourMoment')}</span><span className="mt-0.5 block text-[8px] uppercase tracking-[.16em] text-white/65">{peekStory.type === 'video' ? 'Motion' : 'Studio note'}</span></span>
    </span>
  </button> : null;

  return createPortal(
    <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/95 p-0 backdrop-blur-2xl sm:p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={t('stories.viewer.title')} tabIndex={-1} className="relative flex h-[100dvh] w-full max-w-[26rem] flex-col overflow-hidden bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:h-[min(92dvh,52rem)] sm:max-w-[27rem] sm:rounded-[1.75rem] sm:border sm:border-white/10 sm:shadow-premium lg:grid lg:h-[min(92dvh,900px)] lg:max-h-[900px] lg:max-w-[1280px] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1 lg:rounded-[1.75rem] lg:border lg:border-white/10 lg:shadow-premium lg:pt-0 lg:pb-0">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black lg:h-full" style={{ background: STORY_BACKGROUND_STYLES[story.backgroundColor ?? ''] ?? story.backgroundColor ?? '#000000' }}>
        <div className="absolute inset-x-3 top-[max(.75rem,env(safe-area-inset-top))] z-40 flex gap-1.5" aria-label={t('stories.viewer.progress')}>
          {(story.process ? currentProcessStories : stories).map((item, segmentIndex) => <button key={item.id} type="button" onClick={() => story.process ? setIndex(stories.findIndex((entry) => entry.id === item.id)) : undefined} aria-label={story.process ? `${t('stories.viewer.processStep')} ${segmentIndex + 1}` : undefined} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full origin-start rounded-full bg-white transition-none" style={{ width: segmentIndex < (story.process ? processIndex : index) ? '100%' : segmentIndex > (story.process ? processIndex : index) ? '0%' : item.type === 'video' ? `${videoProgress}%` : `${Math.min(100, imageElapsed / IMAGE_DURATION_MS * 100)}%` }} /></button>)}
        </div>
        <div className="absolute inset-x-0 top-5 z-30 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-ink-700 text-xs font-semibold text-white">{storyAvatarUrl ? <img src={storyAvatarUrl} alt="" className="h-full w-full object-cover" /> : storyAvatarInitial}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{story.artistName || t('stories.viewer.yourMoment')}</p><p className="text-[10px] text-white/65">{new Intl.DateTimeFormat(numberLocale(lang), { hour: 'numeric', minute: '2-digit' }).format(story.createdAt)}</p></div><div className="ms-1 flex items-center gap-1">{palettes.slice(0, 5).map((color, colorIndex) => <span key={`${color}-${colorIndex}`} aria-label={`${t('stories.viewer.paletteColor')} ${color}`} className="h-2.5 w-2.5 rounded-full border border-white/40" style={{ backgroundColor: color }} />)}</div></div>
          <div className="flex items-center gap-1">{owner && <button type="button" onClick={() => setDeletePrompt(true)} aria-label={t('stories.viewer.deleteStory')} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white"><MoreHorizontal className="h-5 w-5" /></button>}<button type="button" onClick={onClose} aria-label={t('stories.viewer.close')} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"><X className="h-5 w-5" /></button></div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-stretch justify-center gap-3 px-2 lg:items-center lg:gap-4 lg:px-3 lg:pb-1 lg:pt-8">
        {desktopStoryPeek(previousStory, previousStoryIndex, 'previous')}
        <button type="button" aria-label={t(lang === 'fa' ? 'stories.viewer.next' : 'stories.viewer.previous')} onClick={(event) => { event.stopPropagation(); lang === 'fa' ? moveForward() : moveBackward(); }} className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[.06] text-white shadow-xl transition hover:scale-105 hover:bg-white/15 lg:flex">{lang === 'fa' ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}</button>
        <div className="absolute inset-0 mx-auto h-full min-h-0 w-full max-w-[26rem] overflow-hidden sm:max-w-[27rem] lg:relative lg:inset-auto lg:mx-0 lg:aspect-[9/16] lg:h-full lg:w-auto lg:max-w-[min(100%,34rem)] lg:flex-none lg:rounded-xl lg:ring-1 lg:ring-white/10 lg:shadow-[0_24px_100px_rgba(0,0,0,.55)]" onClick={(event) => { if (window.matchMedia('(pointer: fine)').matches) handleTap(event); }} onDoubleClick={() => likeStory()} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)} onTouchStart={handleTouchStartAndDoubleTap} onTouchEnd={handleTouchEnd}>
          {story.type === 'video' && story.mediaBackground === 'blur' && <video src={story.mediaUrl} aria-hidden="true" tabIndex={-1} autoPlay playsInline muted loop preload="metadata" className="pointer-events-none absolute inset-[-8%] h-[116%] w-[116%] scale-110 object-cover opacity-60 blur-2xl" style={{ filter: STORY_MOOD_FILTERS[(story.moodFilter ?? 'none') as keyof typeof STORY_MOOD_FILTERS] ?? 'none' }} />}
          {story.type === 'video' ? <video ref={videoRef} key={story.id} src={story.mediaUrl} poster={story.posterUrl} autoPlay playsInline preload="metadata" onTimeUpdate={(event) => { const video = event.currentTarget; setVideoProgress(video.duration ? video.currentTime / video.duration * 100 : 0); }} onEnded={moveForward} muted className={`absolute inset-0 h-full w-full ${story.mediaFitMode === 'fit' ? 'object-contain' : 'object-cover'}`} style={{ filter: STORY_MOOD_FILTERS[(story.moodFilter ?? 'none') as keyof typeof STORY_MOOD_FILTERS] ?? 'none', objectFit: story.mediaFitMode === 'fit' ? 'contain' : 'cover', transform: `translate(${story.mediaTransform?.x ?? 0}px, ${story.mediaTransform?.y ?? 0}px) rotate(${story.mediaTransform?.rotation ?? 0}deg) scale(${story.mediaTransform?.scale ?? 1})` }} /> : <img key={story.id} src={story.mediaUrl} alt={story.caption || t('stories.viewer.yourMoment')} decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ filter: STORY_MOOD_FILTERS[(story.moodFilter ?? 'none') as keyof typeof STORY_MOOD_FILTERS] ?? 'none' }} />}
          {story.type === 'video' && <StoryLayerOverlay layers={story.overlays ?? []} />}
          {frameOverlay}
          {story.artworkCard && <div className="absolute start-5 top-1/2 z-30 max-w-[78%] -translate-y-1/2 rounded-e-xl border-s-2 border-brand-orange bg-ink-950/75 px-4 py-3 text-start text-white shadow-premium backdrop-blur"><p className="font-editorial text-lg">{story.artworkCard.title}</p><p className="mt-1 text-[10px] text-white/70">{[story.artworkCard.technique, story.artworkCard.dimensions, story.artworkCard.year].filter(Boolean).join(' · ')}</p><button type="button" onClick={(event) => { event.stopPropagation(); navigate(story.artworkCard?.profileUrl || story.artistProfileUrl || '/profile'); }} className="mt-2 min-h-9 text-[10px] font-semibold text-brand-pink underline underline-offset-4">{story.artistName}</button></div>}
          {heartBurst && <Heart aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-40 h-24 w-24 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-ping motion-reduce:animate-none fill-brand-pink text-brand-pink" />}
          {story.process && <div className="absolute inset-x-6 bottom-4 z-30 flex items-center justify-between rounded-full border border-white/20 bg-black/55 px-3 py-2 text-[10px] text-white backdrop-blur"><span>{story.process.label}</span><span>{new Intl.NumberFormat(numberLocale(lang)).format(story.process.step)} / {new Intl.NumberFormat(numberLocale(lang)).format(story.process.total)}</span><div className="absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/20"><span className="block h-full bg-brand-pink" style={{ width: `${story.process.total ? story.process.step / story.process.total * 100 : 0}%` }} /></div></div>}
          <button type="button" aria-label={t(lang === 'fa' ? 'stories.viewer.next' : 'stories.viewer.previous')} onClick={(event) => { event.stopPropagation(); lang === 'fa' ? moveForward() : moveBackward(); }} className="pointer-events-auto absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer lg:hidden" />
          <button type="button" aria-label={t(lang === 'fa' ? 'stories.viewer.previous' : 'stories.viewer.next')} onClick={(event) => { event.stopPropagation(); lang === 'fa' ? moveBackward() : moveForward(); }} className="pointer-events-auto absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer lg:hidden" />
          {story.process && <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-2"><button type="button" aria-label={t('stories.viewer.beforeAfter')} onClick={(event) => { event.stopPropagation(); lang === 'fa' ? moveForward() : moveBackward(); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">{lang === 'fa' ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}</button><button type="button" aria-label={t('stories.viewer.beforeAfter')} onClick={(event) => { event.stopPropagation(); lang === 'fa' ? moveBackward() : moveForward(); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">{lang === 'fa' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button></div>}
        </div>
        <button type="button" aria-label={t(lang === 'fa' ? 'stories.viewer.previous' : 'stories.viewer.next')} onClick={(event) => { event.stopPropagation(); lang === 'fa' ? moveBackward() : moveForward(); }} className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[.06] text-white shadow-xl transition hover:scale-105 hover:bg-white/15 lg:flex">{lang === 'fa' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button>
        {desktopStoryPeek(nextStory, nextStoryIndex, 'next')}
        </div>

        </div>
        <aside className="hidden min-h-0 flex-col justify-center border-s border-white/10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(123,69,232,.09),transparent_48%),#0d0a10] px-7 py-8 lg:flex">
          <div className="mx-auto flex h-full w-full max-w-[22rem] flex-col justify-between gap-8 py-5">
            <div className="space-y-7">
              {story.caption && <div className="border-s-2 border-brand-orange/70 ps-5 py-2"><p className="whitespace-pre-wrap text-lg leading-relaxed text-white" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: captionExpanded ? 'unset' : 8, overflow: 'hidden' }}>{story.caption}</p>{story.caption.length > 120 && <button type="button" onClick={() => setCaptionExpanded((value) => !value)} className="mt-3 min-h-9 text-xs font-semibold text-brand-pink">{t(captionExpanded ? 'stories.viewer.readLess' : 'stories.viewer.readMore')}</button>}</div>}
            </div>
            {owner ? <button type="button" onClick={() => setViewerPanelOpen(true)} className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs text-white"><span className="flex items-center gap-2"><span className="font-semibold">{t('stories.viewer.viewers')}</span><span className="text-ink-300">{new Intl.NumberFormat(numberLocale(lang)).format(displayViewCount)}</span><Heart className="h-3.5 w-3.5 fill-brand-pink text-brand-pink" /><span>{new Intl.NumberFormat(numberLocale(lang)).format(displayLikeCount)}</span></span><span className="flex -space-x-2 rtl:space-x-reverse">{displayViewers.slice(0, 5).map((viewer) => <img key={viewer.id} src={viewer.avatarUrl} alt={viewer.name} className="h-7 w-7 rounded-full border-2 border-ink-900 object-cover" />)}</span></button> : <div className="space-y-3 border-t border-white/10 pt-4"><div className="flex items-center"><button type="button" onClick={likeStory} aria-label={liked ? t('stories.viewer.unlike') : t('stories.viewer.like')} aria-pressed={liked} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-brand-pink/40 hover:bg-brand-pink/10"><Heart className={`h-5 w-5 ${liked ? 'fill-brand-pink text-brand-pink' : ''}`} /></button></div><form onSubmit={sendQuickReply} className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] p-1.5 focus-within:border-brand-pink/50"><input value={quickReply} onChange={(event) => setQuickReply(event.target.value)} placeholder={sentReply ? t('stories.viewer.replySent') : t('stories.viewer.quickReply')} aria-label={t('stories.viewer.quickReply')} className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-ink-400" /><button type="submit" disabled={!quickReply.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white disabled:opacity-40" aria-label={t('stories.viewer.sendReply')}><MessageCircle className="h-4 w-4" /></button></form></div>}
          </div>
        </aside>

        <footer className="z-30 border-t border-white/10 bg-ink-950/95 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] lg:hidden">
          {story.caption && <div className="mb-3 text-start"><p className="whitespace-pre-wrap text-xs leading-relaxed text-white" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: captionExpanded ? 'unset' : 2, overflow: 'hidden' }}>{story.caption}</p>{story.caption.length > 80 && <button type="button" onClick={() => setCaptionExpanded((value) => !value)} className="mt-1 min-h-11 text-[11px] font-semibold text-brand-pink">{t(captionExpanded ? 'stories.viewer.readLess' : 'stories.viewer.readMore')}</button>}</div>}
          {owner ? <button type="button" onClick={() => setViewerPanelOpen(true)} className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3 text-xs text-white"><span className="flex items-center gap-2"><span className="font-semibold">{t('stories.viewer.viewers')}</span><span className="text-ink-300">{new Intl.NumberFormat(numberLocale(lang)).format(displayViewCount)}</span><Heart className="h-3.5 w-3.5 fill-brand-pink text-brand-pink" /><span>{new Intl.NumberFormat(numberLocale(lang)).format(displayLikeCount)}</span></span><span className="flex -space-x-2 rtl:space-x-reverse">{displayViewers.slice(0, 5).map((viewer) => <img key={viewer.id} src={viewer.avatarUrl} alt={viewer.name} className="h-7 w-7 rounded-full border-2 border-ink-950 object-cover" />)}<span className="sr-only">{t('stories.viewer.openViewers')}</span></span></button> : <div className="flex items-center gap-2"><button type="button" onClick={likeStory} aria-label={liked ? t('stories.viewer.unlike') : t('stories.viewer.like')} aria-pressed={liked} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white"><Heart className={`h-5 w-5 ${liked ? 'fill-brand-pink text-brand-pink' : ''}`} /></button><form onSubmit={sendQuickReply} className="flex min-w-0 flex-1 items-center gap-2"><input value={quickReply} onChange={(event) => setQuickReply(event.target.value)} placeholder={sentReply ? t('stories.viewer.replySent') : t('stories.viewer.quickReply')} aria-label={t('stories.viewer.quickReply')} className="min-h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 text-xs text-white outline-none placeholder:text-ink-400 focus:border-brand-pink/50" /><button type="submit" disabled={!quickReply.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white disabled:opacity-40" aria-label={t('stories.viewer.sendReply')}><MessageCircle className="h-4 w-4" /></button></form></div>}
        </footer>

        {owner && viewerPanelOpen && <div className="fixed inset-0 z-[10010] flex items-end justify-center bg-black/65 lg:items-stretch lg:justify-end" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewerPanelOpen(false); }}><section ref={viewerPanelRef} role="dialog" aria-modal="true" aria-labelledby="story-viewers-title" tabIndex={-1} className="max-h-[78dvh] w-full overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:max-h-none lg:h-full lg:w-[min(28rem,40vw)] lg:rounded-none lg:rounded-s-3xl lg:p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="story-viewers-title" className="font-editorial text-xl text-white">{t('stories.viewer.viewers')}</h2>
              <p className="mt-1 text-xs text-ink-400">{new Intl.NumberFormat(numberLocale(lang)).format(displayViewCount)} · {new Intl.NumberFormat(numberLocale(lang)).format(displayLikeCount)} {t('stories.viewer.likes')}</p>
            </div>
            <button type="button" onClick={() => setViewerPanelOpen(false)} aria-label={t('stories.viewer.close')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
              <X className="h-5 w-5 text-white" />
            </button>
          </header>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setFilterLikes(false)} aria-pressed={!filterLikes} className="min-h-11 rounded-full border border-white/10 text-xs text-white aria-pressed:bg-brand-pink/15">{t('stories.viewer.allViewers')}</button>
            <button type="button" onClick={() => setFilterLikes(true)} aria-pressed={filterLikes} className="min-h-11 rounded-full border border-white/10 text-xs text-white aria-pressed:bg-brand-pink/15">{t('stories.viewer.likers')}</button>
          </div>
          <div className="max-h-[calc(78dvh-10rem)] space-y-2 overflow-y-auto lg:max-h-[calc(100dvh-13rem)]">
            {filteredViewers.length ? filteredViewers.map((viewer) => <div key={viewer.id} className="flex min-h-14 items-center gap-3 rounded-xl px-2">
              <StoryAvatar userKey={viewer.id} src={viewer.avatarUrl} name={viewer.name} size={40} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{viewer.name}</p>
                <p className="text-[10px] text-ink-400">{formatRelativeTime(viewer.viewedAt, lang)}</p>
              </div>
              {viewer.liked && <Heart aria-label={t('stories.viewer.liked')} className="h-4 w-4 fill-brand-pink text-brand-pink" />}
              {viewer.reaction && <span aria-label={t(`stories.viewer.reaction_${viewer.reaction}`)}>{viewer.reaction === 'fire' ? '🔥' : viewer.reaction === 'clap' ? '👏' : viewer.reaction === 'sparkle' ? '✨' : '❤️'}</span>}
            </div>) : <p className="py-8 text-center text-xs text-ink-400">{t('stories.viewer.noViewers')}</p>}
          </div>
        </section></div>}
        {deletePrompt && <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/75 p-4"><section ref={deleteDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="story-delete-title" tabIndex={-1} className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-5">
          <h2 id="story-delete-title" className="font-editorial text-xl text-white">{t('stories.viewer.deleteConfirm')}</h2>
          <p className="mt-2 text-xs text-ink-300">{t('stories.viewer.deleteHint')}</p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setDeletePrompt(false)} className="min-h-11 flex-1 rounded-full border border-white/10 text-xs text-white">{t('stories.editor.keepEditing')}</button>
            <button type="button" onClick={() => void removeCurrent()} className="min-h-11 flex-1 rounded-full bg-rose-500 text-xs font-semibold text-white">
              <Trash2 className="me-2 inline h-4 w-4" />{t('stories.viewer.deleteStory')}
            </button>
          </div>
        </section></div>}
      </section>
    </div>,
    document.body,
  );
}

export function StoryViewerHost() {
  const { stories, viewerRequest, isStoryVisible, getUserStories, getFirstUnseenStoryIndex, closeStories, removeStory } = useStories();
  const { state: profile, auth } = useOnboarding();

  const storyGroups = useMemo(() => {
    if (viewerRequest?.storyGroups) return viewerRequest.storyGroups;
    const groups = new Map<string, Story[]>();
    stories.filter((item) => item.expiresAt > Date.now() && isStoryVisible(item)).forEach((item) => {
      const userKey = getStoryUserKey(item);
      if (!userKey) return;
      groups.set(userKey, [...(groups.get(userKey) ?? []), item]);
    });
    return [...groups.values()]
      .map((group) => group.sort((a, b) => a.createdAt - b.createdAt))
      .sort((a, b) => a[0].createdAt - b[0].createdAt);
  }, [isStoryVisible, stories, viewerRequest?.storyGroups]);

  const requestedGroupIndex = viewerRequest?.initialGroupIndex;
  const groupIndex = !viewerRequest
    ? -1
    : requestedGroupIndex !== undefined
      ? requestedGroupIndex
      : storyGroups.findIndex((group) => group.some((item) => getStoryUserKey(item) === viewerRequest.userKey));
  const currentStories = storyGroups[groupIndex] ?? [];
  const userStories = viewerRequest ? getUserStories(viewerRequest.userKey) : [];
  const firstUnseen = viewerRequest ? userStories[getFirstUnseenStoryIndex(viewerRequest.userKey)] : undefined;
  const initialIndex = viewerRequest?.startAtFirstUnseen && firstUnseen
    ? Math.max(0, currentStories.findIndex((item) => item.id === firstUnseen.id))
    : 0;
  const ownerIdentity = canonicalizeUserKey(profile.username || profile.email || 'current-artist');
  const ownerView = !!viewerRequest && !!auth.isAuthenticated && (
    viewerRequest.userKey === ownerIdentity || currentStories.some((item) => getStoryUserKey(item) === ownerIdentity)
  );

  useEffect(() => {
    if (viewerRequest && groupIndex < 0) closeStories();
  }, [closeStories, groupIndex, viewerRequest]);

  if (!viewerRequest || groupIndex < 0) return null;

  return <StoryViewer
    key={viewerRequest.requestId}
    stories={currentStories}
    storyGroups={storyGroups}
    initialGroupIndex={groupIndex}
    initialIndex={initialIndex}
    ownerView={ownerView}
    onStoryGroupChange={viewerRequest.onStoryGroupChange}
    onDelete={removeStory}
    onClose={closeStories}
  />;
}