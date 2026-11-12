import { ReactNode } from 'react';
import FloatingBlobs from '@/components/ui/FloatingBlobs';
import { useLanguage } from '@/context/useLanguage';

interface AuthLayoutProps {
  children: ReactNode;
  side?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  step?: number;
  totalSteps?: number;
}

const AUTH_GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='8' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='table' tableValues='0 0.18'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E";

export function AuthLayout({ children, side, showBack, onBack, step, totalSteps }: AuthLayoutProps) {
  const hasSide = Boolean(side);
  const { lang, t } = useLanguage();

  return (
    <div
      className={
        hasSide
          ? 'auth-shell relative isolate min-h-screen flex bg-ink-950'
          : 'auth-shell relative isolate min-h-screen flex items-center justify-center bg-ink-950 px-3 py-4'
      }
    >
      <div className="auth-scene pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("${AUTH_GRAIN_SVG}")`,
            backgroundSize: '180px 180px',
            mixBlendMode: 'screen',
          }}
        />
      </div>
      <FloatingBlobs iconSet="all" />

      <div
        className={
          hasSide
            ? 'relative z-20 flex-1 flex flex-col px-4 sm:px-8 lg:px-12 py-4 max-w-xl mx-auto w-full'
            : 'relative z-20 w-full max-w-xl mx-auto my-auto flex flex-col px-4 sm:px-8 lg:px-12 py-4'
        }
      >
        <div className="flex items-center justify-end min-h-8">
          {step && totalSteps && (
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i + 1 <= step ? 'w-6 bg-brand-pink' : 'w-1.5 bg-ink-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center pt-7 pb-3 relative">
          {showBack && (
            <button
              onClick={onBack}
              className="text-sm text-ink-200 hover:text-white transition-colors inline-flex items-center gap-1.5"
              dir="ltr"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 'auto',
                flexDirection: 'row',
              }}
            >
              <span aria-hidden="true">←</span>
              <span>{t('common.back') || 'Back'}</span>
            </button>
          )}
          {children}
        </div>

        <footer className="text-xs text-ink-300 text-center pb-2">
          By continuing you agree to Artistry's Terms & Privacy Policy.
        </footer>
      </div>

      {hasSide && side && (
        <div className="relative z-20 hidden lg:flex flex-1 overflow-hidden border-l border-white/[0.06]">
          {side}
        </div>
      )}
    </div>
  );
}
