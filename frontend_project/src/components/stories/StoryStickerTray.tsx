import { useRef, useState } from 'react';
import { Brush, Check, ChevronUp, Palette, Plus, Tag, Trash2, X } from 'lucide-react';
import MediumTag from '@/components/MediumTag';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { StoryLayer, StoryLayerData, StoryStickerKind } from '@/components/stories/useStoryLayers';

interface PracticeStickerGroup {
  name: string;
  options: string[];
}

interface StoryStickerTrayProps {
  open: boolean;
  palette: string[];
  artistName: string;
  artistProfileUrl?: string;
  practiceGroups: PracticeStickerGroup[];
  labels: Record<string, string>;
  mediumLabels: Record<string, string>;
  selectedSticker?: StoryLayer | null;
  onClose: () => void;
  onAdd: (kind: StoryStickerKind, data: StoryLayerData) => void;
  onUpdateSelected: (data: StoryLayerData) => void;
  onBringToFront?: () => void;
  onDelete?: () => void;
}

const PROCESSES = ['workInProgress', 'sketch', 'finished', 'behindScenes'] as const;
export default function StoryStickerTray({ open, palette, artistName, artistProfileUrl, practiceGroups, labels, mediumLabels, selectedSticker, onClose, onAdd, onUpdateSelected, onBringToFront, onDelete }: StoryStickerTrayProps) {
  const selectedData = selectedSticker?.data;
  const selectedKind = selectedData?.stickerKind;
  const [title, setTitle] = useState(() => selectedData?.title ?? '');
  const [artist, setArtist] = useState(() => selectedData?.artist ?? artistName);
  const [customTag, setCustomTag] = useState(() => selectedKind === 'medium' ? selectedData?.medium ?? '' : '');
  const [artworkMedium, setArtworkMedium] = useState(() => selectedKind === 'title' ? selectedData?.medium ?? '' : '');
  const [mediumStyle, setMediumStyle] = useState<'soft' | 'gallery' | 'label'>(() => selectedData?.stickerStyle ?? 'soft');
  const [year, setYear] = useState(() => selectedData?.year ?? String(new Date().getFullYear()));
  const [dimensions, setDimensions] = useState(() => selectedData?.dimensions ?? '');
  const [profileUrl, setProfileUrl] = useState(() => selectedData?.profileUrl ?? artistProfileUrl ?? '');
  const [showProfileLink, setShowProfileLink] = useState(() => selectedData?.showProfileLink ?? Boolean(artistProfileUrl));
  const [titleStyle, setTitleStyle] = useState<'museum' | 'paper' | 'minimal'>(() => selectedData?.titleStyle ?? 'museum');
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10003] flex items-end justify-center bg-black/55 backdrop-blur-sm md:items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="story-sticker-title" tabIndex={-1} className="max-h-[78dvh] w-full overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-white/10 bg-ink-900/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-premium backdrop-blur-2xl md:max-h-[min(85dvh,760px)] md:max-w-xl md:rounded-[1.75rem] md:p-5 md:pb-5">
        <header className="mb-3 flex items-center justify-between">
          <div><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-brand-pink">{labels.stickersEyebrow}</p><h3 id="story-sticker-title" className="font-editorial text-lg text-white">{labels.stickerTray}</h3></div>
          <button type="button" onClick={onClose} aria-label={labels.close} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-ink-200"><X className="h-4 w-4" /></button>
        </header>

        <section className="space-y-2.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-400"><Tag className="h-3.5 w-3.5" />{labels.mediumTag}</div>
          {practiceGroups.length ? practiceGroups.map((group) => <div key={group.name} className="space-y-2"><p className="text-[10px] font-medium text-ink-300">{group.name}</p><div className="flex flex-wrap gap-2">{group.options.map((option) => <button key={`${group.name}-${option}`} type="button" onClick={() => onAdd('medium', { medium: option, stickerStyle: mediumStyle })} className="min-h-11 rounded-lg transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-brand-pink/60"><MediumTag text={mediumLabels[option] ?? option} className="text-[9px]" /></button>)}</div></div>) : <p className="text-xs leading-relaxed text-ink-400">{labels.noDisciplines}</p>}
          <fieldset><legend className="mb-2 text-[10px] text-ink-400">{labels.mediumStyle}</legend><div className="grid grid-cols-3 gap-2">{(['soft', 'gallery', 'label'] as const).map((style) => <button key={style} type="button" onClick={() => setMediumStyle(style)} aria-pressed={mediumStyle === style} className="min-h-10 rounded-xl border border-white/10 px-2 text-[10px] text-ink-100 aria-pressed:border-brand-pink/50 aria-pressed:bg-brand-pink/10">{labels[`mediumStyle_${style}`]}</button>)}</div></fieldset>
          <label className="block text-[10px] text-ink-400">{labels.customPracticeTag}<input value={customTag} onChange={(event) => setCustomTag(event.target.value.slice(0, 60))} placeholder={labels.customPracticeTagHint} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label>
          <button type="button" disabled={!customTag.trim()} onClick={() => { const data = { medium: customTag.trim(), stickerStyle: mediumStyle }; if (selectedKind === 'medium') onUpdateSelected(data); else onAdd('medium', data); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] text-xs text-white disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" />{selectedKind === 'medium' ? labels.updateSticker : labels.addSticker}</button>

          <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-400"><Brush className="h-3.5 w-3.5" />{labels.processBadge}</div>
          <div className="grid grid-cols-2 gap-2">
            {PROCESSES.map((process) => <button key={process} type="button" onClick={() => onAdd('process', { process: labels[process], processType: process })} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-start text-xs text-ink-100 transition hover:border-brand-pink/30 hover:bg-white/[.08]">{labels[process]}</button>)}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-400"><Palette className="h-3.5 w-3.5" />{labels.paletteStrip}</div>
          <button type="button" disabled={!palette.length} onClick={() => onAdd('palette', { palette })} aria-label={labels.paletteStrip} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.04] p-2.5 transition hover:border-brand-pink/30 disabled:cursor-not-allowed disabled:opacity-40">
            <span className="flex flex-1 overflow-hidden rounded-lg">{(palette.length ? palette : ['#382c44', '#211827', '#100c15', '#6b5e7e', '#e84f9b']).map((color, index) => <span key={`${color}-${index}`} className="h-8 flex-1" style={{ backgroundColor: color }} />)}</span><Check className="h-4 w-4 shrink-0 text-brand-pink" />
          </button>
          {!palette.length && <p className="text-[10px] text-ink-500">{labels.paletteUnavailable}</p>}

          <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-400"><Tag className="h-3.5 w-3.5" />{labels.titleCard}</div>
          <label className="block text-[10px] text-ink-400">{labels.artworkTitle}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={labels.artworkTitlePlaceholder} className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label>
          <label className="block text-[10px] text-ink-400">{labels.artistName}<input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder={artistName} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label>
          <label className="block text-[10px] text-ink-400">{labels.artworkTechnique}<input value={artworkMedium} onChange={(event) => setArtworkMedium(event.target.value)} placeholder={labels.artworkTechniqueHint} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label>
          <label className="block text-[10px] text-ink-400">{labels.artworkYear}<input value={year} onChange={(event) => setYear(event.target.value.slice(0, 4))} inputMode="numeric" className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none focus:border-brand-pink/50" /></label>
          <label className="block text-[10px] text-ink-400">{labels.artworkDimensions}<input value={dimensions} onChange={(event) => setDimensions(event.target.value.slice(0, 40))} placeholder={labels.artworkDimensionsHint} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label>
          <label className="block text-[10px] text-ink-400">{labels.artistProfileLink}<input value={profileUrl} onChange={(event) => setProfileUrl(event.target.value.slice(0, 120))} placeholder={labels.artistProfileLinkHint} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label>
          <label className="flex min-h-10 items-center gap-2 text-xs text-ink-200"><input type="checkbox" checked={showProfileLink} onChange={(event) => setShowProfileLink(event.target.checked)} className="h-4 w-4 accent-brand-pink" />{labels.showProfileLink}</label>
          <fieldset><legend className="mb-2 text-[10px] text-ink-400">{labels.labelStyle}</legend><div className="grid grid-cols-3 gap-2">{(['museum', 'paper', 'minimal'] as const).map((style) => <button key={style} type="button" onClick={() => setTitleStyle(style)} aria-pressed={titleStyle === style} className="min-h-11 rounded-xl border border-white/10 px-2 text-[10px] text-ink-100 aria-pressed:border-brand-pink/50 aria-pressed:bg-brand-pink/10">{labels[`labelStyle_${style}`]}</button>)}</div></fieldset>
          <button type="button" onClick={() => { const data = { title: title.trim() || labels.defaultArtworkTitle, artist: artist.trim() || artistName, medium: artworkMedium.trim(), year, dimensions: dimensions.trim(), profileUrl: profileUrl.trim(), showProfileLink: showProfileLink && !!profileUrl.trim(), titleStyle }; if (selectedKind === 'title') onUpdateSelected(data); else onAdd('title', data); }} className="min-h-11 w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-semibold text-white shadow-glow transition hover:brightness-110">{selectedKind === 'title' ? labels.updateSticker : labels.addTitleCard}</button>

          {selectedSticker && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={onBringToFront} className="min-h-11 rounded-xl border border-white/10 text-xs text-white"><ChevronUp className="me-1 inline h-4 w-4" />{labels.bringFront}</button><button type="button" onClick={onDelete} className="min-h-11 rounded-xl border border-rose-400/30 text-xs text-rose-200"><Trash2 className="me-1 inline h-4 w-4" />{labels.removeSticker}</button></div>}
        </section>
        <span className="sr-only">{labels.stickersEyebrow}</span>
      </section>
    </div>
  );
}
