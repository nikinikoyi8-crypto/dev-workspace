import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, BadgeCheck, Ban, Bell, BellOff, ChevronLeft, Clapperboard, Copy, Flag, Grid3X3, Link2, MessageCircle, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import HighlightsBar from '@/components/HighlightsBar';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { ARTWORKS } from '@/pages/MainApp';
import { cn } from '@/utils/cn';
import {
  ProfileFeedModalDesktop,
  ProfileFeedOverlay,
  ProfileGridItem,
  ProfileReelsModalDesktop,
  useIsDesktop,
} from '@/pages/Profile';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';
import { canonicalizeUserKey } from '@/services/storyService';
import { usePostFeed } from '@/context/PostFeedContext';

const BIO_PREVIEW_LIMIT = 80;

export default function ArtistProfile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [feedIndex, setFeedIndex] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const { posts: createdPosts } = usePostFeed();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useIsDesktop();
  const normalizedHandle = canonicalizeUserKey(handle);

  useCloseOnBackButton(feedIndex !== null, () => setFeedIndex(null));
  useCloseOnBackButton(menuOpen, () => setMenuOpen(false));
  const artistWorks = [...ARTWORKS, ...createdPosts].filter((work) => canonicalizeUserKey(work.handle) === normalizedHandle);
  const artist = artistWorks[0];
  const artistId = artist?.id;
  const [followersCount, setFollowersCount] = useState(() => (
    artist ? (artist.id * 137) % 5000 + 500 : 0
  ));

  useEffect(() => {
    document.body.style.overflow = feedIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [feedIndex]);

  useEffect(() => {
    if (artistId === undefined) return;
    setIsFollowing(false);
    setFollowersCount((artistId * 137) % 5000 + 500);
  }, [artistId]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  if (!artist) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-950 px-5 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">Artist not found.</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sm text-brand-pink hover:text-white">Go back</button>
        </div>
      </main>
    );
  }

  const displayName = artist.artist;
  const username = canonicalizeUserKey(artist.handle);
  const following = (artist.id * 53) % 400 + 20;
  const profileBio = `Exploring the edges of ${artist.medium.toLowerCase()}. Based in a studio somewhere between dream and detail.`;
  const posts = artistWorks;
  const reels = artistWorks.filter((work) => Boolean(work.videoUrl));
  const items = activeTab === 'posts' ? posts : reels;
  const bioPreview = profileBio.slice(0, BIO_PREVIEW_LIMIT);
  const goNext = () => setFeedIndex((index) => (
    index !== null && index < items.length - 1 ? index + 1 : index
  ));
  const goPrev = () => setFeedIndex((index) => (
    index !== null && index > 0 ? index - 1 : index
  ));
  const toggleFollowing = () => {
    setIsFollowing((value) => !value);
    setFollowersCount((count) => count + (isFollowing ? -1 : 1));
  };
  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/artist/${username}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
    setMenuOpen(false);
  };
  const toggleMute = () => {
    setIsMuted((value) => !value);
    setMenuOpen(false);
  };
  const selectTab = (tab: 'posts' | 'reels') => {
    setActiveTab(tab);
    setFeedIndex(null);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 px-4 pb-12 pt-3 text-ink-100 sm:px-8 sm:pt-6">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(232,79,155,0.12),transparent_65%)]" />
      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <header className="flex h-12 items-center justify-between border-b border-white/[0.06] sm:border-0">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white rtl:rotate-180">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div ref={menuRef} className="relative z-50">
            <button type="button" aria-label="Profile actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white">
              <AlertCircle className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <button type="button" aria-label="Close profile actions" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/40 sm:hidden" />
                <div className="fixed inset-x-4 bottom-4 z-50 overflow-hidden rounded-2xl border border-white/10 bg-ink-750 p-2 shadow-card sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-11 sm:w-64">
                  <button type="button" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-200 transition-colors hover:bg-rose-500/10">
                    <Flag className="h-4 w-4" />
                    <span>Report</span>
                  </button>
                  <button type="button" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10">
                    <Ban className="h-4 w-4" />
                    <span>Block</span>
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button type="button" onClick={copyProfileUrl} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-ink-100 transition-colors hover:bg-white/[0.06]">
                    {copied ? <Copy className="h-4 w-4 text-brand-pink" /> : <Link2 className="h-4 w-4" />}
                    <span>{copied ? 'Copied!' : 'Copy profile URL'}</span>
                  </button>
                  <button type="button" onClick={toggleMute} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-ink-100 transition-colors hover:bg-white/[0.06]">
                    {isMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    <span>{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <section className="relative z-30 mt-3 isolate overflow-visible rounded-3xl sm:mt-5">
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-3xl border border-white/10 bg-ink-750/80 shadow-card backdrop-blur-2xl" />
          <div className="relative h-28 overflow-hidden rounded-t-3xl bg-ink-800 sm:h-32">
            {artist.imageUrl ? (
              <img src={artist.imageUrl} alt={`${displayName} cover`} className="h-full w-full object-cover" />
            ) : (
              <div className={cn('h-full w-full bg-gradient-to-br', artist.hue)} />
            )}
          </div>
          <div className="pb-4">
            <div className="relative -mt-8 flex flex-wrap items-end gap-6 px-5 sm:flex-nowrap sm:px-6">
              <div className="relative -translate-y-2 shrink-0 sm:z-10 sm:-translate-y-2">
                <div aria-hidden="true" className="pointer-events-none absolute -inset-1 hidden rounded-full bg-ink-750 sm:block sm:bg-[#1C1523]" />
                <StoryAvatar userKey={canonicalizeUserKey(username)} src={artist.avatarUrl} name={displayName} size={80} className="relative z-10 h-20 w-20 border-4 border-ink-750 sm:h-24 sm:w-24 sm:border-[#1C1523]" />
              </div>
              <div className="mt-9 min-w-0 flex-1 text-start sm:mt-0 sm:hidden">
                <div className="flex items-center gap-1.5">
                  <h2 className="min-w-0 whitespace-normal break-words text-xl font-bold leading-tight text-white">{displayName}</h2>
                  {artist.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-brand-pink" />}
                </div>
                <p className="mt-1 text-sm text-ink-300">@{username}</p>
              </div>
              <div dir="ltr" className="static flex basis-full -translate-x-0 translate-y-0 justify-center gap-6 pt-2 pb-1 sm:absolute sm:bottom-1 sm:left-1/2 sm:basis-auto sm:-translate-x-1/2 sm:translate-y-20 sm:gap-8 sm:pt-0">
                <div className="flex min-w-0 flex-col items-center text-center">
                  <Grid3X3 className="h-5 w-5 text-brand-pink" />
                  <strong className="mt-1.5 text-xl font-bold leading-none text-white sm:text-3xl">{posts.length}</strong>
                  <span className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-300 sm:text-[11px]">Posts</span>
                </div>
                <div className="flex min-w-0 flex-col items-center text-center">
                  <Users className="h-5 w-5 text-brand-pink" />
                  <strong className="mt-1.5 text-xl font-bold leading-none text-white sm:text-3xl">{followersCount.toLocaleString()}</strong>
                  <span className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-300 sm:text-[11px]">Followers</span>
                </div>
                <div className="flex min-w-0 flex-col items-center text-center">
                  <UserCheck className="h-5 w-5 text-brand-purple" />
                  <strong className="mt-1.5 text-xl font-bold leading-none text-white sm:text-3xl">{following.toLocaleString()}</strong>
                  <span className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-300 sm:text-[11px]">Following</span>
                </div>
              </div>
            </div>
            <div className="mt-4 hidden px-5 text-start sm:block sm:px-6">
              <div className="flex items-center gap-1.5">
                <h2 className="min-w-0 whitespace-normal break-words text-xl font-bold leading-tight text-white sm:text-2xl">{displayName}</h2>
                {artist.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-brand-pink" />}
              </div>
              <p className="mt-1 text-sm text-ink-300">@{username}</p>
            </div>
          </div>
          <div className="px-5 pb-4 sm:px-6">
            <p className="text-sm leading-relaxed text-ink-100">
              {bioOpen ? profileBio : `${bioPreview}...`}
              <button type="button" onClick={() => setBioOpen((value) => !value)} className="ms-1 inline text-xs font-medium text-brand-pink">
                {bioOpen ? 'Show less' : 'See more'}
              </button>
            </p>
          </div>
          <div className="relative px-5 pb-4 sm:px-6">
            <span className="text-xs text-ink-300">Art disciplines</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] leading-none text-ink-100 sm:text-xs">{artist.medium}</span>
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button type="button" variant="flat" onClick={toggleFollowing} className={cn('rounded-full px-3 text-xs transition-colors sm:px-4 sm:text-sm', isFollowing ? 'border border-white/20 bg-transparent text-ink-200 hover:bg-white/5' : 'border border-transparent bg-brand-gradient text-white hover:opacity-90')} fullWidth leftIcon={isFollowing ? <UserCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}>{isFollowing ? 'Following' : 'Follow'}</Button>
          <Button type="button" variant="flat" onClick={() => navigate(`/messages/${username}`)} className="rounded-full border border-white/15 bg-transparent px-3 text-xs transition-colors hover:border-brand-purple/60 hover:bg-white/[0.04] sm:px-4 sm:text-sm" fullWidth leftIcon={<MessageCircle className="h-4 w-4" />}>Message</Button>
        </div>
        <div className="mt-5 sm:mt-6"><HighlightsBar /></div>

        <nav aria-label="Profile content" className="mt-0 grid grid-cols-2 border-b border-white/[0.1] sm:mt-1">
          <button type="button" aria-label="Posts" aria-pressed={activeTab === 'posts'} onClick={() => selectTab('posts')} className={`group relative flex h-14 items-center justify-center transition-colors ${activeTab === 'posts' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-ink-300 hover:text-white'}`}>{activeTab === 'posts' && <span className="absolute bottom-0 h-9 w-16 rounded-full bg-brand-gradient-soft blur-xl" />}<Grid3X3 className="relative h-5 w-5 transition-transform group-hover:scale-110" /></button>
          <button type="button" aria-label="Reels" aria-pressed={activeTab === 'reels'} onClick={() => selectTab('reels')} className={`group relative flex h-14 items-center justify-center transition-colors ${activeTab === 'reels' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-ink-300 hover:text-white'}`}>{activeTab === 'reels' && <span className="absolute bottom-0 h-9 w-16 rounded-full bg-brand-gradient-soft blur-xl" />}<Clapperboard className="relative h-5 w-5 transition-transform group-hover:scale-110" /></button>
        </nav>
        <section className="min-h-[24rem] pt-4 transition-opacity duration-200 sm:pt-5">
          {items.length > 0 ? (
            <div className={cn('grid gap-1', activeTab === 'posts' ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-3')}>
              {items.map((work) => <ProfileGridItem key={`${activeTab}-${work.id}`} work={work} isReel={activeTab === 'reels'} onOpen={() => setFeedIndex(items.findIndex((item) => item.id === work.id))} />)}
            </div>
          ) : (
            <div className="flex min-h-[23rem] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 text-center text-sm text-ink-400">
              {activeTab === 'reels' ? 'No reels yet.' : 'No posts yet.'}
            </div>
          )}
        </section>
        {feedIndex !== null && items[feedIndex] && (isDesktop ? (activeTab === 'posts' ? <ProfileFeedModalDesktop items={items} index={feedIndex} onClose={() => setFeedIndex(null)} onNext={goNext} onPrev={goPrev} isPosts /> : <ProfileReelsModalDesktop items={items} index={feedIndex} onClose={() => setFeedIndex(null)} onNext={goNext} onPrev={goPrev} />) : <ProfileFeedOverlay items={items} startId={items[feedIndex].id} onClose={() => setFeedIndex(null)} isReel={activeTab === 'reels'} />)}
      </div>
    </main>
  );
}
