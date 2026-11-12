import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

const ARTWORK_GRADIENTS = [
  'from-brand-orange/15 via-brand-pink/10 to-transparent',
  'from-brand-pink/15 via-brand-purple/10 to-transparent',
  'from-brand-purple/15 via-brand-pink/10 to-transparent',
];

export function VisualPanel({ children }: { children?: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Ambient gradient blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-brand-pink/10 blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-purple/10 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-brand-orange/10 blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating artwork cards */}
      <div className="relative grid grid-cols-2 gap-5 px-12 max-w-lg">
        {ARTWORK_GRADIENTS.map((g, i) => (
          <div
            key={i}
            className={`aspect-[3/4] rounded-2xl bg-gradient-to-br ${g} border border-white/[0.08] backdrop-blur-sm shadow-premium animate-float`}
            style={{ animationDelay: `${i * 1.5}s`, transform: `rotate(${i % 2 === 0 ? -4 : 4}deg)` }}
          >
            <div className="h-full flex flex-col justify-between p-5">
              <Sparkles className="w-5 h-5 text-brand-pink/60" />
              <div className="space-y-2">
                <div className="h-2 w-2/3 rounded-full bg-white/10" />
                <div className="h-2 w-1/2 rounded-full bg-white/5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}
