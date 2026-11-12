import { Clock3, Flame, Lightbulb, Pencil, ShoppingBag, Sparkles, Wrench } from 'lucide-react';
import type { StoryLayerData } from '@/components/stories/useStoryLayers';

const PROCESS_STYLE: Record<string, { icon: typeof Pencil; className: string }> = {
  sketch: { icon: Pencil, className: 'border-violet-300/35 bg-violet-950/75 text-violet-100' },
  finished: { icon: Sparkles, className: 'border-emerald-300/35 bg-emerald-950/75 text-emerald-100' },
  behindScenes: { icon: Lightbulb, className: 'border-amber-300/35 bg-amber-950/75 text-amber-100' },
  workInProgress: { icon: Flame, className: 'border-brand-orange/35 bg-ink-950/80 text-white' },
};

export default function StoryStickerVisual({ data, direction = 'ltr', paletteLabel = 'Artwork palette' }: { data: StoryLayerData; direction?: 'ltr' | 'rtl'; paletteLabel?: string }) {
  const kind = data.stickerKind;

  if (kind === 'medium') {
    const style = data.stickerStyle ?? 'soft';
    return (
      <span className={style === 'gallery' ? 'inline-flex items-center border border-white/75 bg-ink-950/40 px-3 py-2 text-[10px] font-medium tracking-[.12em] text-white' : style === 'label' ? 'inline-flex items-center border-s-2 border-brand-orange bg-ink-950/80 px-3 py-2 text-[10px] font-semibold text-white' : 'inline-flex items-center rounded-full border border-white/25 bg-black/55 px-3 py-2 text-[10px] font-semibold text-white shadow-premium backdrop-blur'}>
        <Wrench className="me-1.5 h-3 w-3" />
        {data.medium}
      </span>
    );
  }

  if (kind === 'process') {
    const processKey = data.processType ?? (data.process?.toLowerCase().includes('sketch') ? 'sketch' : data.process?.toLowerCase().includes('finish') ? 'finished' : data.process?.toLowerCase().includes('behind') ? 'behindScenes' : 'workInProgress');
    const style = PROCESS_STYLE[processKey] ?? PROCESS_STYLE.workInProgress;
    const Icon = style.icon;
    const detail = [data.dayCount ? `Day ${data.dayCount}` : '', data.elapsedTime].filter(Boolean).join(' · ');

    return (
      <span className={`inline-flex max-w-64 items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-semibold shadow-premium backdrop-blur ${style.className}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="block">{data.process || 'Process'}</span>
          {detail && <span className="mt-0.5 block text-[9px] opacity-70">{detail}</span>}
        </span>
      </span>
    );
  }

  if (kind === 'palette') {
    return (
      <span aria-label={paletteLabel} className="flex gap-1 rounded-full border border-white/25 bg-ink-950/70 p-1.5 shadow-premium backdrop-blur">
        {(data.palette ?? []).map((color, index) => <span key={`${color}-${index}`} className="h-6 w-6 rounded-full border border-white/25" style={{ backgroundColor: color }} />)}
      </span>
    );
  }

  if (kind === 'title') {
    const paper = data.titleStyle === 'paper';
    const minimal = data.titleStyle === 'minimal';
    const details = [data.medium, data.dimensions, data.year].filter(Boolean);

    return (
      <span dir={direction} className={`block max-w-64 px-4 py-3 text-start shadow-premium ${minimal ? 'border-s border-white/60 bg-black/30' : paper ? 'border border-[#e8dbc5]/80 bg-[#f1e8d9]/95' : 'border-s-2 border-brand-orange bg-ink-950/80'} backdrop-blur`}>
        {data.title && <span className={`block font-editorial text-base leading-tight ${paper ? 'text-ink-950' : 'text-white'}`}>{data.title}</span>}
        {details.length > 0 && <span className={`mt-1 block text-[9px] ${paper ? 'text-ink-700' : 'text-white/70'}`}>{details.join(' · ')}</span>}
        {data.artist && <span className={`mt-1 block text-[10px] font-semibold ${paper ? 'text-ink-800' : 'text-white/80'}`}>{data.artist}</span>}
        {data.showProfileLink && data.profileUrl && <span className={`mt-1 block max-w-56 truncate text-[9px] underline underline-offset-2 ${paper ? 'text-ink-700' : 'text-brand-pink'}`}>{data.profileUrl}</span>}
      </span>
    );
  }

  if (kind === 'price') {
    return <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200/30 bg-amber-950/85 px-3 py-2 text-xs font-semibold text-amber-50 shadow-premium"><ShoppingBag className="h-4 w-4" />{data.priceCurrency || '$'}{data.price}</span>;
  }

  if (kind === 'edition') {
    return <span className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-ink-950/75 px-3 py-2 font-mono text-[10px] tracking-[.1em] text-white"><span>{data.edition || '1'}/{data.editionTotal || '20'}</span></span>;
  }

  if (kind === 'tools') {
    return <span className="inline-flex max-w-60 items-center gap-2 rounded-xl border border-white/20 bg-ink-950/75 px-3 py-2 text-[10px] text-white"><Wrench className="h-3.5 w-3.5 shrink-0 text-brand-orange" />{data.tools}</span>;
  }

  if (kind === 'inspiration') {
    return <span className="inline-flex max-w-60 items-center gap-2 rounded-xl border border-white/20 bg-ink-950/75 px-3 py-2 text-[10px] italic text-white"><Lightbulb className="h-3.5 w-3.5 shrink-0 text-brand-purple" />{data.inspiration}</span>;
  }

  if (kind === 'timer') {
    return <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/65 px-3 py-2 text-[10px] font-semibold text-white"><Clock3 className="h-3.5 w-3.5 text-brand-pink" />{data.elapsedTime || '00:00'}</span>;
  }

  if (kind === 'signature') {
    return <span className="font-editorial text-xl italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.8)]" style={{ fontFamily: data.font === 'vazirmatn' ? 'Vazirmatn, sans-serif' : 'cursive' }}>{data.signature || data.artist}</span>;
  }

  return null;
}
