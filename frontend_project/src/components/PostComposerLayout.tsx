import { useRef } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowRight, ArrowUp, Crop, ImagePlus, Tag, Trash2, X } from 'lucide-react';

export interface PostComposerSlide {
  url: string;
  type: 'image' | 'video';
  name: string;
}

export interface PostCropSettings {
  zoom: number;
  x: number;
  y: number;
}

interface PostComposerLayoutProps {
  header: ReactNode;
  preview: ReactNode;
  caption: string;
  captionLabel: string;
  captionHint: string;
  mediaLabel: string;
  mediaCount: number;
  slides: PostComposerSlide[];
  activeSlideIndex: number;
  maxSlidesWarning?: string;
  cropOpen: boolean;
  cropSettings: PostCropSettings;
  cropLabel: string;
  applyCropLabel: string;
  cancelLabel: string;
  zoomLabel: string;
  horizontalLabel: string;
  verticalLabel: string;
  cropGestureHint: string;
  removeSlideLabel: string;
  closedPreviewLabel: string;
  openPreviewLabel: string;
  addMediaLabel: string;
  publishLabel: string;
  publishingLabel: string;
  artworkTag: string;
  artworkTagOptions: string[];
  artworkTagLabel: string;
  requiredLabel: string;
  overlays?: ReactNode;
  error?: string;
  publishing: boolean;
  onCaptionChange: (caption: string) => void;
  onCaptionCommit: () => void;
  onArtworkTagChange: (tag: string) => void;
  onSelectSlide: (index: number) => void;
  onRemoveSlide: (index: number) => void;
  onMoveSlide: (index: number, direction: -1 | 1) => void;
  onOpenCrop: () => void;
  onCropSettingsChange: (settings: PostCropSettings) => void;
  onApplyCrop: () => void;
  onCloseCrop: () => void;
  onAddMedia: () => void;
  onPublish: () => void;
}

export default function PostComposerLayout({
  header, preview, caption, captionLabel, captionHint, mediaLabel,
  mediaCount, slides, activeSlideIndex, maxSlidesWarning, cropOpen, cropSettings, cropLabel,
  applyCropLabel, cancelLabel, zoomLabel, horizontalLabel, verticalLabel, cropGestureHint, removeSlideLabel,
  addMediaLabel,
  publishLabel, publishingLabel, artworkTag, artworkTagOptions, artworkTagLabel, requiredLabel,
  overlays, error, publishing, onCaptionChange, onCaptionCommit, onArtworkTagChange, onSelectSlide,
  onMoveSlide, onRemoveSlide, onOpenCrop, onCropSettingsChange, onApplyCrop, onCloseCrop, onAddMedia, onPublish,
}: PostComposerLayoutProps) {
  const cropDragRef = useRef<{ mode: 'pan' | 'resize'; x: number; y: number; cropX: number; cropY: number; zoom: number } | null>(null);
  const publishButton = (
    <button type="button" onClick={onPublish} disabled={publishing} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-5 text-sm font-semibold text-white shadow-glow-brand transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
      {publishing ? publishingLabel : publishLabel}
      {!publishing && <ArrowRight className="h-4 w-4" />}
    </button>
  );

  const beginCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const cropViewport = event.currentTarget.closest<HTMLDivElement>('[data-crop-viewport]') ?? event.currentTarget;
    cropViewport.setPointerCapture(event.pointerId);
    const resizeHandle = (event.target as HTMLElement).closest<HTMLElement>('[data-crop-resize]');
    cropDragRef.current = { mode: resizeHandle ? 'resize' : 'pan', x: event.clientX, y: event.clientY, cropX: cropSettings.x, cropY: cropSettings.y, zoom: cropSettings.zoom };
  };
  const moveCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    const origin = cropDragRef.current;
    if (!origin) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (origin.mode === 'resize') {
      const zoom = Math.max(1, Math.min(3, origin.zoom + (origin.y - event.clientY) / Math.max(1, rect.height) * 2));
      onCropSettingsChange({ ...cropSettings, zoom });
      return;
    }
    const movementRange = Math.max(0, (cropSettings.zoom - 1) * 100);
    onCropSettingsChange({
      ...cropSettings,
      x: Math.max(0, Math.min(100, origin.cropX - (event.clientX - origin.x) / Math.max(1, rect.width) * movementRange)),
      y: Math.max(0, Math.min(100, origin.cropY - (event.clientY - origin.y) / Math.max(1, rect.height) * movementRange)),
    });
  };
  const endCropDrag = () => { cropDragRef.current = null; };

  return (
    <section className="flex h-[100dvh] w-full flex-col overflow-hidden bg-ink-950 lg:h-[min(90dvh,820px)] lg:max-w-6xl lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-ink-900 lg:shadow-premium">
      {header}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.78fr)] lg:grid-rows-1 lg:overflow-hidden">
        <div className="grid shrink-0 grid-rows-[auto_auto_auto_auto] items-center justify-items-center gap-2 bg-[radial-gradient(ellipse_at_50%_45%,rgba(232,79,155,.12),transparent_52%),#0d0a10] p-3 sm:p-5 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto_auto_auto] lg:overflow-hidden lg:p-5">
          <div className="relative flex w-full min-w-0 items-center justify-center overflow-hidden lg:h-full lg:min-h-0">
            <div className="relative aspect-[4/3] w-full max-w-[34rem] shrink-0 overflow-hidden bg-black/30 lg:w-full lg:max-w-[400px] lg:h-auto lg:max-h-full">
              {preview}
              <span className="pointer-events-none absolute start-3 top-3 z-30 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white shadow">{activeSlideIndex + 1} / {mediaCount}</span>
            </div>
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {slides.map((slide, index) => <div key={`${slide.url}-${index}`} className="relative z-0 shrink-0">
              <button type="button" onClick={() => onSelectSlide(index)} aria-label={`${slide.name} ${index + 1}`} aria-current={activeSlideIndex === index ? 'true' : undefined} className={`relative h-16 w-14 overflow-hidden rounded-lg border bg-black/30 transition sm:h-20 sm:w-16 ${activeSlideIndex === index ? 'border-brand-pink ring-2 ring-brand-pink/40' : 'border-white/10 opacity-75'}`}>
                {slide.type === 'video' ? <video src={slide.url} className="h-full w-full object-cover" muted /> : <img src={slide.url} alt="" className="h-full w-full object-cover" />}
                <span className="absolute bottom-1 end-1 rounded bg-black/70 px-1 text-[9px] text-white">{index + 1}</span>
              </button>
              <button type="button" onClick={() => onRemoveSlide(index)} aria-label={`${removeSlideLabel} ${index + 1}`} title={removeSlideLabel} className="absolute start-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-rose-200/80 bg-rose-600 text-white shadow-[0_2px_10px_rgba(0,0,0,.8)] ring-1 ring-black/60 transition hover:bg-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
              <span className="absolute -top-1 -end-1 flex flex-col overflow-hidden rounded-md border border-white/20 bg-ink-950 shadow-lg">
                <button type="button" disabled={index === 0} onClick={() => onMoveSlide(index, -1)} aria-label={`Move slide ${index + 1} earlier`} className="p-0.5 text-white disabled:opacity-25"><ArrowUp className="h-3 w-3" /></button>
                <button type="button" disabled={index === slides.length - 1} onClick={() => onMoveSlide(index, 1)} aria-label={`Move slide ${index + 1} later`} className="p-0.5 text-white disabled:opacity-25"><ArrowDown className="h-3 w-3" /></button>
              </span>
            </div>)}
            <button type="button" onClick={onAddMedia} disabled={slides.length >= 10} aria-label={addMediaLabel} className="flex h-16 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 text-ink-300 hover:border-brand-pink/50 hover:text-white disabled:opacity-40 sm:h-20 sm:w-16"><ImagePlus className="h-5 w-5" /></button>
          </div>

          <div className="min-h-4 w-full">{maxSlidesWarning && <p role="alert" className="text-[11px] text-brand-orange">{maxSlidesWarning}</p>}</div>
        </div>

        <aside className="flex shrink-0 flex-col gap-3 border-t border-white/[.07] bg-ink-950/90 p-4 pb-6 sm:p-5 lg:min-h-0 lg:shrink lg:gap-2 lg:overflow-hidden lg:border-s lg:border-t-0 lg:bg-ink-900/90 lg:p-4">
          <div>
            <div className="mb-3"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand-pink">Post tools</p><h3 className="mt-1 text-sm font-semibold text-white">{mediaLabel}</h3></div>
            <button type="button" onClick={onOpenCrop} disabled={slides[activeSlideIndex]?.type !== 'image'} className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-ink-950/70 px-3 text-xs text-white transition hover:border-brand-pink/40 hover:bg-brand-pink/10 disabled:cursor-not-allowed disabled:opacity-40"><Crop className="h-4 w-4 text-brand-pink" />{cropLabel}</button>
            <label className="block text-xs font-semibold text-ink-200">{captionLabel}<textarea value={caption} onChange={(event) => onCaptionChange(event.currentTarget.value)} onBlur={onCaptionCommit} rows={3} maxLength={500} placeholder={captionHint} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-normal leading-relaxed text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50 lg:h-20 lg:min-h-0 lg:resize-none" /></label>
            <div className="mt-1 text-end text-[10px] text-ink-500">{caption.length}/500</div>
          </div>
          <section className="rounded-2xl border border-white/[.08] bg-white/[.025] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-ink-400">{artworkTagLabel}</div>
            <label className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-ink-950/85 px-3 text-xs font-medium text-white"><Tag className="h-4 w-4 shrink-0 text-brand-pink" /><select required value={artworkTag} onChange={(event) => onArtworkTagChange(event.currentTarget.value)} className="min-w-0 flex-1 bg-transparent text-white outline-none"><option value="" className="bg-ink-950">{requiredLabel}</option>{artworkTagOptions.map((tag) => <option key={tag} value={tag} className="bg-ink-950">{tag}</option>)}</select></label>
          </section>
          {error && <p role="alert" className="rounded-xl border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-xs leading-relaxed text-brand-orange">{error}</p>}
          <div className="mt-auto hidden lg:block">{publishButton}</div>
        </aside>
      </main>
      <div className="shrink-0 border-t border-white/[.08] bg-ink-950/95 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] lg:hidden">{publishButton}</div>
      {overlays && createPortal(overlays, document.body)}
      {cropOpen && createPortal(<div className="fixed inset-0 z-[10040] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="post-crop-title" className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 p-5 shadow-premium">
        <header className="mb-4 flex items-center justify-between"><h3 id="post-crop-title" className="font-editorial text-xl text-white">{cropLabel}</h3><button type="button" onClick={onCloseCrop} aria-label={cancelLabel} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 hover:bg-white/10"><X className="h-5 w-5" /></button></header>
        <div data-crop-viewport onPointerDown={beginCropDrag} onPointerMove={moveCropDrag} onPointerUp={endCropDrag} onPointerCancel={endCropDrag} className="relative mx-auto mb-5 aspect-[4/3] w-full max-w-72 touch-none cursor-grab overflow-hidden rounded-xl border border-white/10 bg-black active:cursor-grabbing">
          <img src={slides[activeSlideIndex]?.url} alt="Crop preview" draggable={false} className="h-full w-full select-none object-cover" style={{ objectPosition: `${cropSettings.x}% ${cropSettings.y}%`, transform: `scale(${cropSettings.zoom})` }} />
          <span className="pointer-events-none absolute inset-0 border-2 border-white/90" />
          <span className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/45" /><span className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/45" />
          <span className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/45" /><span className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/45" />
          {['left-1 top-1', 'right-1 top-1', 'left-1 bottom-1', 'right-1 bottom-1'].map((position) => <button key={position} type="button" data-crop-resize aria-label={zoomLabel} className={`absolute ${position} z-10 h-5 w-5 touch-none rounded-sm border-2 border-white bg-brand-pink shadow-md`} />)}
          <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[9px] font-semibold text-white drop-shadow">{cropGestureHint}</span>
        </div>
        <div className="space-y-4"><label className="block text-xs text-ink-200">{zoomLabel}<input type="range" min="1" max="3" step="0.05" value={cropSettings.zoom} onChange={(event) => onCropSettingsChange({ ...cropSettings, zoom: Number(event.currentTarget.value) })} className="mt-2 w-full accent-brand-pink" /></label><label className="block text-xs text-ink-200">{horizontalLabel}<input type="range" min="0" max="100" value={cropSettings.x} onChange={(event) => onCropSettingsChange({ ...cropSettings, x: Number(event.currentTarget.value) })} className="mt-2 w-full accent-brand-pink" /></label><label className="block text-xs text-ink-200">{verticalLabel}<input type="range" min="0" max="100" value={cropSettings.y} onChange={(event) => onCropSettingsChange({ ...cropSettings, y: Number(event.currentTarget.value) })} className="mt-2 w-full accent-brand-pink" /></label></div>
        <div className="mt-6 flex gap-3"><button type="button" onClick={onCloseCrop} className="min-h-11 flex-1 rounded-full border border-white/10 text-sm text-white">{cancelLabel}</button><button type="button" onClick={onApplyCrop} className="min-h-11 flex-1 rounded-full bg-brand-gradient text-sm font-semibold text-white">{applyCropLabel}</button></div>
      </section></div>, document.body)}
    </section>
  );
}
