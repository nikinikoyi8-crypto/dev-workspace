import { AlignCenter, AlignLeft, AlignRight, Bold, Check } from 'lucide-react';
import type { StoryFont, StoryLayer, StoryTextAlign } from '@/components/stories/useStoryLayers';

interface Labels {
  font: string;
  editorial: string;
  modern: string;
  display: string;
  handwritten: string;
  vazirmatn: string;
  color: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  highlight: string;
  size: string;
  done: string;
}

interface StoryTextToolbarProps {
  layer: StoryLayer;
  labels: Labels;
  isPersian: boolean;
  keyboardInset: number;
  inline?: boolean;
  onUpdate: (patch: Partial<StoryLayer['data']>) => void;
  onDone: () => void;
}

const COLORS = ['#ffffff', '#fff0d7', '#ff8a3d', '#e84f9b', '#b493ff', '#56d6c2', '#17121c'];

export default function StoryTextToolbar({ layer, labels, isPersian, keyboardInset, inline = false, onUpdate, onDone }: StoryTextToolbarProps) {
  const align = layer.data.align ?? 'center';
  const toolbarBottom = keyboardInset > 0 ? `calc(var(--story-keyboard-inset) + env(safe-area-inset-bottom) + 5.5rem)` : '1rem';
  return <section data-story-text-toolbar aria-label={labels.font} className={`${inline ? 'relative mx-0 w-full' : 'fixed inset-x-2 z-[10040] mx-auto max-w-2xl sm:inset-x-6'} rounded-2xl border border-white/15 bg-ink-900/95 p-2 shadow-premium backdrop-blur-2xl`} style={inline ? undefined : { bottom: toolbarBottom }}>
    <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <label className="sr-only" htmlFor="story-text-font">{labels.font}</label>
      <select id="story-text-font" value={layer.data.font ?? (isPersian ? 'vazirmatn' : 'editorial')} onChange={(event) => onUpdate({ font: event.target.value as StoryFont })} className="min-h-11 min-w-24 flex-1 rounded-xl border border-white/10 bg-ink-950 px-2 text-xs text-white">
        <option value="editorial">{labels.editorial}</option><option value="modern">{labels.modern}</option><option value="display">{labels.display}</option><option value="handwritten">{labels.handwritten}</option>{isPersian && <option value="vazirmatn">{labels.vazirmatn}</option>}
      </select>
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={labels.color}>{COLORS.map((color) => <button key={color} type="button" onClick={() => onUpdate({ color })} aria-label={`${labels.color} ${color}`} aria-pressed={(layer.data.color ?? '#ffffff') === color} className="h-7 w-7 rounded-full border border-white/25 aria-pressed:ring-2 aria-pressed:ring-brand-pink" style={{ backgroundColor: color }} />)}</div>
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={labels.alignCenter}>{([['left', AlignLeft, labels.alignLeft], ['center', AlignCenter, labels.alignCenter], ['right', AlignRight, labels.alignRight]] as const).map(([value, Icon, label]) => <button key={value} type="button" onClick={() => onUpdate({ align: value as StoryTextAlign })} aria-label={label} aria-pressed={align === value} className="flex h-10 w-10 items-center justify-center rounded-xl text-white aria-pressed:bg-brand-pink/20"><Icon className="h-4 w-4" /></button>)}</div>
      <button type="button" onClick={() => onUpdate({ highlight: !layer.data.highlight })} aria-label={labels.highlight} aria-pressed={!!layer.data.highlight} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white aria-pressed:bg-brand-pink/20"><Bold className="h-4 w-4" /></button>
      <label className="flex min-w-28 flex-1 items-center gap-2 text-[10px] text-ink-300"><span className="sr-only">{labels.size}</span><input type="range" min="16" max="72" value={layer.data.fontSize ?? 28} onChange={(event) => onUpdate({ fontSize: Number(event.target.value) })} aria-label={labels.size} className="w-full accent-brand-pink" /></label>
      <button type="button" onClick={onDone} aria-label={labels.done} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white"><Check className="h-4 w-4" /></button>
    </div>
  </section>;
}
