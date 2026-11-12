import { AlignCenter, AlignLeft, AlignRight, Bold, Brush, ChevronDown, ChevronUp, Eraser, PaintBucket, Palette, Plus, Redo2, Sticker, Trash2, Type, Undo2 } from 'lucide-react';
import { useState } from 'react';
import type { StoryLayer, StoryTextAlign, StoryFont, StoryBackgroundKind, StoryLayerData } from '@/components/stories/useStoryLayers';

interface StoryToolbarProps {
  layers: StoryLayer[];
  selectedLayer: StoryLayer | null;
  canUndo: boolean;
  canRedo: boolean;
  labels: Record<string, string>;
  language: 'en' | 'fa';
  canChangeBackground: boolean;
  backgroundColor: string;
  onBackgroundColor: (color: string) => void;
  canFilter: boolean;
  moodFilter: string;
  drawMode: boolean;
  brushColor: string;
  brushSize: number;
  eraser: boolean;
  onMoodFilter: (filter: string) => void;
  onDrawMode: (active: boolean) => void;
  onBrushColor: (color: string) => void;
  onBrushSize: (size: number) => void;
  onEraser: (active: boolean) => void;
  onOpenStickers: () => void;
  onAddText: () => void;
  onBackground: (kind: StoryBackgroundKind, value: string) => void;
  onUpdateText: (id: string, patch: { text?: string; font?: StoryFont; color?: string; align?: StoryTextAlign; highlight?: boolean }) => void;
  onUpdateSticker: (id: string, patch: Partial<StoryLayerData>) => void;
  onDelete: () => void;
  onBringFront: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const backgrounds: Array<{ value: string; kind: StoryBackgroundKind; css: string }> = [
  { value: 'sunset-wash', kind: 'gradient', css: 'linear-gradient(135deg,#ff8a3d,#e84f9b 52%,#7b45e8)' },
  { value: 'violet-hour', kind: 'gradient', css: 'radial-gradient(at 25% 18%,#7548c8,#251834 58%,#11101c)' },
  { value: 'studio-dawn', kind: 'gradient', css: 'radial-gradient(at 78% 14%,#ffbe7e,#7d4260 45%,#17121f)' },
  { value: 'ink-black', kind: 'solid', css: '#0d0a10' },
  { value: 'ink-plum', kind: 'solid', css: '#211827' },
  { value: 'ink-mauve', kind: 'solid', css: '#382c44' },
  { value: 'paper-cream', kind: 'paper', css: 'repeating-linear-gradient(0deg,#d7c8ad,#d7c8ad 4px,#cfbea3 5px)' },
  { value: 'paper-rose', kind: 'paper', css: 'repeating-linear-gradient(90deg,#d6aeb8,#d6aeb8 5px,#c89eaa 6px)' },
  { value: 'paper-night', kind: 'paper', css: 'repeating-linear-gradient(0deg,#201823,#201823 4px,#28202c 5px)' },
];

const colors = ['#ffffff', '#fff0d7', '#ff8a3d', '#e84f9b', '#b493ff', '#17121c'];

export default function StoryToolbar({ layers, selectedLayer, canUndo, canRedo, labels, language, canChangeBackground, backgroundColor, onBackgroundColor, canFilter, moodFilter, drawMode, brushColor, brushSize, eraser, onMoodFilter, onDrawMode, onBrushColor, onBrushSize, onEraser, onOpenStickers, onAddText, onBackground, onUpdateText, onUpdateSticker, onDelete, onBringFront, onUndo, onRedo }: StoryToolbarProps) {
  const [activePanel, setActivePanel] = useState<'text' | 'background' | 'draw' | 'filters' | null>(null);
  const activeBackground = layers.find((layer) => layer.type === 'background')?.data.backgroundValue;
  const [customBackground, setCustomBackground] = useState(() => /^#[0-9a-f]{6}$/i.test(activeBackground ?? '') ? activeBackground! : '#211827');
  const selectedText = selectedLayer?.type === 'text' ? selectedLayer : null;
  const selectedSticker = selectedLayer?.type === 'sticker' ? selectedLayer : null;

  const buttonClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-ink-200 transition hover:border-brand-pink/30 hover:bg-white/[.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35';
  const controlClass = 'rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2 text-xs text-ink-100 outline-none focus:border-brand-pink/50';

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden">
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[.2em] text-ink-400 md:block">{labels.tools}</span>
        <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink-500">
          <button type="button" className={buttonClass} onClick={onUndo} disabled={!canUndo} aria-label={labels.undo} title={labels.undo}><Undo2 className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} onClick={onRedo} disabled={!canRedo} aria-label={labels.redo} title={labels.redo}><Redo2 className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} onClick={() => { onDrawMode(false); onAddText(); }} aria-label={labels.addText} title={labels.addText}><Type className="h-4 w-4" /></button>
          <button type="button" className={`${buttonClass} ${drawMode ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : ''}`} onClick={() => { const nextMode = !drawMode; onDrawMode(nextMode); setActivePanel((current) => current === 'draw' ? null : 'draw'); }} aria-pressed={drawMode} aria-label={labels.draw} title={labels.draw}><Brush className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} onClick={() => { onDrawMode(false); onOpenStickers(); }} aria-label={labels.stickers} title={labels.stickers}><Sticker className="h-4 w-4" /></button>
          {canFilter && <button type="button" className={`${buttonClass} ${moodFilter !== 'none' ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : ''}`} onClick={() => { onDrawMode(false); setActivePanel((current) => current === 'filters' ? null : 'filters'); }} aria-label={labels.filters} title={labels.filters}><Palette className="h-4 w-4" /></button>}
          <button type="button" className={buttonClass} onClick={() => setActivePanel((current) => current === 'background' ? null : 'background')} aria-pressed={activePanel === 'background'} aria-label={labels.background} title={labels.background}><PaintBucket className="h-4 w-4" /></button>
          {(selectedText || selectedSticker) && <button type="button" className={buttonClass} onClick={onDelete} aria-label={labels.delete} title={labels.delete}><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>

      <div className="min-h-0 max-h-[calc(min(48dvh,34rem)-4rem)] space-y-3 overflow-y-auto overscroll-contain border-t border-white/10 pt-3 pe-1">
      {activePanel === 'filters' && <section className="rounded-2xl border border-white/[.08] bg-black/15 p-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-ink-400">{labels.moodFilters}</div><div className="grid grid-cols-2 gap-2">{['none', 'warm', 'mono', 'neon', 'faded'].map((filter) => <button key={filter} type="button" onClick={() => onMoodFilter(filter)} aria-pressed={moodFilter === filter} className={`rounded-xl border px-2.5 py-2 text-start text-[10px] transition ${moodFilter === filter ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : 'border-white/10 bg-white/[.03] text-ink-300 hover:text-white'}`}>{labels[`filter_${filter}`]}</button>)}</div></section>}

      {activePanel === 'draw' && <section className="space-y-3 rounded-2xl border border-white/[.08] bg-black/15 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-ink-400">{labels.drawingTools}</span><button type="button" onClick={() => onEraser(!eraser)} aria-pressed={eraser} className={`${buttonClass} h-8 w-8 ${eraser ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : ''}`} aria-label={labels.eraser}><Eraser className="h-4 w-4" /></button></div><div className="flex items-center gap-2">{['#ffffff', '#ff8a3d', '#e84f9b', '#a882ff', '#56d6c2', '#17121c'].map((color) => <button key={color} type="button" onClick={() => { onBrushColor(color); onEraser(false); }} aria-label={`${labels.brushColor} ${color}`} aria-pressed={brushColor === color && !eraser} className={`h-6 w-6 rounded-full border ${brushColor === color && !eraser ? 'border-white ring-2 ring-brand-pink' : 'border-white/25'}`} style={{ backgroundColor: color }} />)}</div><label className="block text-[10px] text-ink-400">{labels.brushSize}<input type="range" min="2" max="36" value={brushSize} onChange={(event) => onBrushSize(Number(event.target.value))} className="mt-2 w-full accent-brand-pink" /></label></section>}

      {activePanel === 'background' && <section className="rounded-2xl border border-white/[.08] bg-black/15 p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-ink-400">{labels.backgrounds}</div>
        {canChangeBackground && <div className="grid grid-cols-5 gap-2">
          {backgrounds.map((background) => <button key={background.value} type="button" onClick={() => onBackground(background.kind, background.value)} aria-label={labels[background.value] ?? background.value} title={labels[background.value] ?? background.value} className="aspect-square rounded-xl border border-white/15 transition hover:scale-105 hover:border-white/50" style={{ background: background.css }} />)}
        </div>}
        <div className={`flex items-center justify-between gap-3 ${canChangeBackground ? 'mt-3 border-t border-white/10 pt-3' : ''}`}>
          <span className="text-xs text-ink-200">{labels.customBackground}</span>
          <label className="relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/[.05] text-[9px] font-medium text-white" title={labels.customBackground ?? 'Custom color'}>
            <input type="color" value={backgroundColor.startsWith('#') ? backgroundColor : customBackground} onChange={(event) => { setCustomBackground(event.currentTarget.value); onBackgroundColor(event.currentTarget.value); }} aria-label={labels.customBackground ?? 'Custom color'} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span className="pointer-events-none absolute inset-0" style={{ backgroundColor: backgroundColor.startsWith('#') ? backgroundColor : customBackground }} />
            <span className="pointer-events-none relative rounded-full bg-black/55 px-2 py-1">{labels.customBackground ?? 'Custom'}</span>
          </label>
        </div>
      </section>}

      {selectedText && <section className="space-y-3 rounded-2xl border border-white/[.08] bg-black/15 p-3">
        <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-ink-400">{labels.textStyle}</span><button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] text-ink-300 hover:bg-white/[.06] hover:text-white" onClick={onBringFront}><ChevronUp className="h-3.5 w-3.5" />{labels.bringFront}</button></div>
        <textarea value={selectedText.data.text ?? ''} onChange={(event) => onUpdateText(selectedText.id, { text: event.target.value })} rows={2} maxLength={160} placeholder={labels.textPlaceholder} aria-label={labels.textPlaceholder} className="w-full resize-none rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-sm text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select value={selectedText.data.font ?? 'editorial'} onChange={(event) => onUpdateText(selectedText.id, { font: event.target.value as StoryFont })} aria-label={labels.font} className={controlClass}>
            <option value="editorial">{labels.editorial}</option><option value="modern">{labels.modern}</option><option value="display">{labels.display}</option><option value="handwritten">{labels.handwritten}</option>{language === 'fa' && <option value="vazirmatn">{labels.vazirmatn}</option>}
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950/70 px-2">
            {colors.map((color) => <button key={color} type="button" onClick={() => onUpdateText(selectedText.id, { color })} aria-label={`${labels.color} ${color}`} className={`h-5 w-5 rounded-full border ${selectedText.data.color === color ? 'border-brand-pink ring-2 ring-brand-pink/40' : 'border-white/25'}`} style={{ backgroundColor: color }} />)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([align, Icon]) => <button key={align} type="button" onClick={() => onUpdateText(selectedText.id, { align })} aria-label={labels[`align_${align}`]} aria-pressed={(selectedText.data.align ?? 'center') === align} className={`${buttonClass} h-9 w-9 ${(selectedText.data.align ?? 'center') === align ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : ''}`}><Icon className="h-4 w-4" /></button>)}
            <button type="button" onClick={() => onUpdateText(selectedText.id, { highlight: !selectedText.data.highlight })} aria-label={labels.highlight} aria-pressed={!!selectedText.data.highlight} className={`${buttonClass} h-9 w-9 ${selectedText.data.highlight ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : ''}`}><Bold className="h-4 w-4" /></button>
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] text-ink-500"><ChevronDown className="h-3 w-3" />{labels.dragHint}</span>
        </div>
      </section>}

      {selectedSticker && <section className="space-y-3 rounded-2xl border border-white/[.08] bg-black/15 p-3">
        <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-ink-400">{labels.titleCard}</span><button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] text-ink-300 hover:bg-white/[.06] hover:text-white" onClick={onBringFront}><ChevronUp className="h-3.5 w-3.5" />{labels.bringFront}</button></div>
        {selectedSticker.data.stickerKind === 'title' && <><input value={selectedSticker.data.title ?? ''} onChange={(event) => onUpdateSticker(selectedSticker.id, { title: event.target.value })} aria-label={labels.artworkTitle} placeholder={labels.artworkTitlePlaceholder} className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" />
        <input value={selectedSticker.data.artist ?? ''} onChange={(event) => onUpdateSticker(selectedSticker.id, { artist: event.target.value })} aria-label={labels.artistName} placeholder={labels.artistName} className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></>}
      </section>}

      {!selectedText && activePanel !== 'background' && <p className="hidden text-xs leading-relaxed text-ink-400 md:block">{layers.some((layer) => layer.type === 'text') ? labels.selectHint : labels.toolHint}</p>}
      </div>
      <span className="sr-only"><Plus aria-hidden />{labels.layerCount}: {layers.filter((layer) => layer.type === 'text').length}</span>
    </div>
  );
}
