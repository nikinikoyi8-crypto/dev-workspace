import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';

export const CAPTION_CHAR_LIMIT = 80;

type ExpandableCaptionProps = {
  handle: string;
  text: string;
  variant: 'inline' | 'sheet';
};

function getCaptionParts(text: string) {
  const isLong = text.length > CAPTION_CHAR_LIMIT;
  const truncated = isLong ? `${text.slice(0, CAPTION_CHAR_LIMIT).trimEnd()}...` : text;

  return { isLong, truncated };
}

function ExpandableCaptionInline({ handle, text }: Omit<ExpandableCaptionProps, 'variant'>) {
  const [expanded, setExpanded] = useState(false);
  const { isLong, truncated } = getCaptionParts(text);

  return (
    <div>
      <p className="text-sm text-white">
        <span className="font-semibold">{handle}</span>{' '}
        {!expanded && (
          <>
            <span className="text-white/85">{truncated}</span>
            {isLong && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); setExpanded(true); }}
                className="ml-1 font-medium text-ink-300 hover:text-white"
              >
                See more
              </button>
            )}
          </>
        )}
      </p>
      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="pt-1 text-sm text-white/85">
            {text}{' '}
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); setExpanded(false); }}
              className="ml-1 font-medium text-ink-300 hover:text-white"
            >
              See less
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExpandableCaption({ handle, text, variant }: ExpandableCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const { isLong, truncated } = getCaptionParts(text);

  useCloseOnBackButton(expanded, () => setExpanded(false));

  if (variant === 'inline') {
    return <ExpandableCaptionInline handle={handle} text={text} />;
  }

  return (
    <>
      <p className="text-sm text-white">
        <span className="font-semibold">{handle}</span>{' '}
        <span className="text-white/85">{truncated}</span>
        {isLong && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setExpanded(true); }}
            className="ml-1 font-medium text-white/70 hover:text-white"
          >
            See more
          </button>
        )}
      </p>

      {expanded && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60" onClick={() => setExpanded(false)}>
          <div
            role="dialog"
            aria-label="Caption"
            onClick={(event) => event.stopPropagation()}
            className="animate-slide-up w-full max-w-[420px] rounded-t-2xl border-t border-white/10 bg-ink-900 p-5 pb-8"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Caption</h3>
              <button
                type="button"
                aria-label="Close caption"
                onClick={() => setExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className={cn('text-sm leading-relaxed text-white/90')}>
              <span className="font-semibold text-white">{handle}</span> {text}
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}