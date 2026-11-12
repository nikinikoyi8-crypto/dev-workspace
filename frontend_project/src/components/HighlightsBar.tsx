import { Plus } from 'lucide-react';

interface Highlight {
  id: number;
  title: string;
  coverUrl: string;
}

const HIGHLIGHTS: Highlight[] = [
  { id: 1, title: 'Travel', coverUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=240&h=240&q=80' },
  { id: 2, title: 'Art', coverUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=240&h=240&q=80' },
  { id: 3, title: 'BTS', coverUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=240&h=240&q=80' },
  { id: 4, title: 'Studio', coverUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=240&h=240&q=80' },
  { id: 5, title: 'Inspo', coverUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=240&h=240&q=80' },
];

export default function HighlightsBar() {
  return (
    <div className="flex gap-4 overflow-x-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-6">
      <button
        type="button"
        aria-label="Add highlight"
        className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center sm:w-20"
      >
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 p-1 ring-2 ring-white/[0.16] sm:h-20 sm:w-20">
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-ink-800 text-ink-200">
            <Plus className="h-6 w-6" strokeWidth={1.75} />
          </span>
        </span>
        <span className="w-full truncate text-[11px] leading-tight text-ink-100">New</span>
      </button>

      {HIGHLIGHTS.map((highlight) => (
        <button
          key={highlight.id}
          type="button"
          aria-label={`Open ${highlight.title} highlight`}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center sm:w-20"
        >
          <span className="flex h-16 w-16 rounded-full bg-ink-900 p-1 ring-2 ring-white/[0.15] sm:h-20 sm:w-20">
            <img src={highlight.coverUrl} alt={highlight.title} className="h-full w-full rounded-full object-cover" loading="lazy" />
          </span>
          <span className="w-full truncate text-[11px] leading-tight text-ink-100">{highlight.title}</span>
        </button>
      ))}
    </div>
  );
}
