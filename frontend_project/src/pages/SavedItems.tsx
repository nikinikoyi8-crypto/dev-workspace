import { useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/context/useLanguage';
import { useSaved } from '@/context/SavedContext';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { REELS } from '@/pages/MainApp';
import { POSTS_GRID_DATA, ProfileFeedModalDesktop, ProfileFeedOverlay, ProfileGridItem, ProfileReelsModalDesktop, useIsDesktop } from '@/pages/Profile';

export default function SavedItems() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { isSaved } = useSaved();
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const savedPosts = POSTS_GRID_DATA.filter((work) => isSaved(work.id, 'post'));
  const savedReels = REELS.filter((work) => isSaved(work.id, 'reel'));
  const items = activeTab === 'posts' ? savedPosts : savedReels;
  const [feedIndex, setFeedIndex] = useState<number | null>(null);
  const [modalItems, setModalItems] = useState<typeof items | null>(null);
  const isDesktop = useIsDesktop();
  const isTouchDevice = useIsTouchDevice();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  const goNext = () => setFeedIndex((index) => (index !== null && index < items.length - 1 ? index + 1 : index));
  const goPrev = () => setFeedIndex((index) => (index !== null && index > 0 ? index - 1 : index));
  const selectTab = (tab: 'posts' | 'reels') => {
    setActiveTab(tab);
    setFeedIndex(null);
  };

  const activeModalItems = modalItems ?? items;

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!isTouchDevice || feedIndex !== null || event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (!isTouchDevice || feedIndex !== null || !touchStartRef.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!isTouchDevice || feedIndex !== null || !touchStartRef.current || !touchEndRef.current) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const isHorizontalSwipe = Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY);

    if (isHorizontalSwipe) {
      event.preventDefault();
      if (deltaX < 0 && activeTab !== 'reels') selectTab('reels');
      if (deltaX > 0 && activeTab !== 'posts') selectTab('posts');
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return (
    <main onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="min-h-screen bg-ink-950 px-4 pb-10 text-ink-100 sm:px-8">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between">
          <button type="button" aria-label={lang === 'fa' ? 'بازگشت' : 'Go back'} onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white rtl:rotate-180">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-white">{lang === 'fa' ? 'ذخیره‌شده‌ها' : 'Saved'}</h1>
          <span aria-hidden="true" className="w-10" />
        </div>
      </header>

      <nav aria-label="Saved content" className="mx-auto mt-3 grid max-w-4xl grid-cols-2 border-b border-white/[0.1]">
        <button
          type="button"
          aria-label={lang === 'fa' ? 'پست‌ها' : 'Posts'}
          aria-pressed={activeTab === 'posts'}
          onClick={() => selectTab('posts')}
          className={`group relative flex h-14 items-center justify-center transition-colors ${activeTab === 'posts' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-ink-300 hover:text-white'}`}
        >
          {activeTab === 'posts' && <span className="absolute bottom-0 h-9 w-16 rounded-full bg-brand-gradient-soft blur-xl" />}
          <span className="relative text-sm font-medium">{lang === 'fa' ? 'پست‌ها' : 'Posts'}</span>
        </button>
        <button
          type="button"
          aria-label={lang === 'fa' ? 'ریلز' : 'Reels'}
          aria-pressed={activeTab === 'reels'}
          onClick={() => selectTab('reels')}
          className={`group relative flex h-14 items-center justify-center transition-colors ${activeTab === 'reels' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-ink-300 hover:text-white'}`}
        >
          {activeTab === 'reels' && <span className="absolute bottom-0 h-9 w-16 rounded-full bg-brand-gradient-soft blur-xl" />}
          <span className="relative text-sm font-medium">{lang === 'fa' ? 'ریلز' : 'Reels'}</span>
        </button>
      </nav>

      <section className="mx-auto min-h-[50vh] w-full max-w-4xl pt-5">
        {items.length > 0 ? (
          <div className={`grid gap-1 ${activeTab === 'posts' ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-3'}`}>
            {items.map((work, index) => (
              <ProfileGridItem key={work.id} work={work} isReel={activeTab === 'reels'} onOpen={() => {
                setModalItems([...items]);
                setFeedIndex(index);
              }} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <Bookmark className="h-16 w-16 text-ink-600" />
            <p className="mt-4 text-sm text-ink-400">{activeTab === 'reels' ? (lang === 'fa' ? 'هنوز ریلی سیو نکردی' : 'No saved reels yet') : (lang === 'fa' ? 'هنوز چیزی سیو نکردی' : 'No saved posts yet')}</p>
          </div>
        )}
      </section>

      {feedIndex !== null && activeModalItems[feedIndex] && (
        isDesktop ? (
          activeTab === 'reels' ? (
            <ProfileReelsModalDesktop
              items={activeModalItems}
              index={feedIndex}
              onClose={() => {
                setFeedIndex(null);
                setModalItems(null);
              }}
              onNext={goNext}
              onPrev={goPrev}
            />
          ) : (
            <ProfileFeedModalDesktop
              items={activeModalItems}
              index={feedIndex}
              onClose={() => {
                setFeedIndex(null);
                setModalItems(null);
              }}
              onNext={goNext}
              onPrev={goPrev}
              isPosts
            />
          )
        ) : (
          <ProfileFeedOverlay
            items={activeModalItems}
            startId={activeModalItems[feedIndex].id}
            onClose={() => {
              setFeedIndex(null);
              setModalItems(null);
            }}
            isReel={activeTab === 'reels'}
          />
        )
      )}
    </main>
  );
}
