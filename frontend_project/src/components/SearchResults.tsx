import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Clock3, Eye, Hash, Image, X } from 'lucide-react';
import type { Artwork } from '@/pages/MainApp';
import type { SearchRecent, SearchTab } from '@/hooks/useSearch';
import { cn } from '@/utils/cn';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { canonicalizeUserKey } from '@/services/storyService';

let activePreview: HTMLVideoElement | null = null;

export function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.0', '')}K`;
  return String(value);
}

function ReelPreview({ work }: { work: Artwork }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '0px', threshold: 0.35 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible) {
      if (activePreview && activePreview !== video) activePreview.pause();
      activePreview = video;
      video.play().catch(() => {});
    } else {
      video.pause();
      if (activePreview === video) activePreview = null;
    }
    return () => {
      if (activePreview === video) {
        video.pause();
        activePreview = null;
      }
    };
  }, [visible]);

  return <video ref={videoRef} src={visible ? work.videoUrl : undefined} poster={work.posterUrl ?? work.imageUrl} muted loop playsInline preload={visible ? 'metadata' : 'none'} className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />;
}

export function ArtworkTile({ work, onClick }: { work: Artwork; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={`Open ${work.title}`} className="group relative aspect-[3/4] w-full overflow-hidden bg-ink-800 text-start lg:rounded-sm">{work.videoUrl ? <ReelPreview work={work} /> : work.imageUrl ? <img src={work.imageUrl} alt={work.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className={cn('absolute inset-0 bg-gradient-to-br', work.hue)} />}<div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />{work.videoUrl && <span className="absolute inset-x-2 bottom-2 flex items-center gap-1 text-xs font-bold text-white drop-shadow-md"><Eye className="h-3.5 w-3.5" />{formatCount(work.likes)}</span>}</button>;
}

export function SearchRecentList({ recent, onRemove, onClear, onSelect, labels }: { recent: SearchRecent[]; onRemove: (key: string) => void; onClear: () => void; onSelect: (item: SearchRecent) => void; labels: { title: string; clear: string; remove: string } }) {
  return <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">{labels.title}</h2><button type="button" onClick={onClear} className="text-xs font-medium text-brand-pink hover:text-white">{labels.clear}</button></div><div className="space-y-1">{recent.map((item) => <div key={item.key} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.06]"><button type="button" onClick={() => onSelect(item)} className="flex min-w-0 flex-1 items-center gap-3 text-start"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-ink-300">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Clock3 className="h-4 w-4" />}</span><span className="min-w-0"><span className="block truncate text-sm text-white">{item.title}</span><span className="block truncate text-xs text-ink-400">{item.subtitle}</span></span></button><button type="button" aria-label={`${labels.remove} ${item.title}`} onClick={() => onRemove(item.key)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>)}</div></section>;
}

export function SearchResultRows({ works, tab, onSelect }: { works: Artwork[]; tab: SearchTab; onSelect: (work: Artwork) => void }) {
  return <div className="space-y-2">{works.map((work) => tab === 'accounts' ? <div key={work.handle} onClick={() => onSelect(work)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-start hover:bg-white/[0.06]">
    <StoryAvatar userKey={canonicalizeUserKey(work.handle)} src={work.avatarUrl} name={work.artist} size={48} variant="inline" className="h-12 w-12" onNoStoryClick={() => onSelect(work)} />
    <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(work); }} className="min-w-0 flex-1 text-start"><span className="flex items-center gap-1 text-sm font-medium text-white">{work.artist}{work.verified && <BadgeCheck className="h-4 w-4 text-brand-pink" />}</span><span className="block truncate text-xs text-ink-400">{work.handle}</span></button>
  </div> : tab === 'tags' ? <button key={`${work.medium}-${work.id}`} type="button" onClick={() => onSelect(work)} className="flex w-full items-center gap-3 rounded-xl p-2 text-start hover:bg-white/[0.06]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-purple/15 text-brand-pink"><Hash className="h-5 w-5" /></span><span><span className="block text-sm font-medium text-white">#{work.medium}</span><span className="block text-xs text-ink-400">{work.title}</span></span></button> : <button key={work.id} type="button" onClick={() => onSelect(work)} className="flex w-full items-center gap-3 rounded-xl p-2 text-start hover:bg-white/[0.06]"><span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">{work.imageUrl ? <img src={work.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className={cn('h-full w-full bg-gradient-to-br', work.hue)} />}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-white">{work.title}</span><span className="block truncate text-xs text-ink-400">{work.artist} · {work.medium}</span></span><Image className="ms-auto h-4 w-4 shrink-0 text-ink-500" /></button>)}</div>;
}
