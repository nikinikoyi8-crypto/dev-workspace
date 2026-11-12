import { Check, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface StoryVerificationDialogProps {
  open: boolean;
  requested: boolean;
  isVerifying: boolean;
  approved: boolean;
  labels: Record<string, string>;
  onRequest: () => void;
  onClose: () => void;
}

export default function StoryVerificationDialog({ open, requested, isVerifying, approved, labels, onRequest, onClose }: StoryVerificationDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  if (!open) return null;

  return <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="story-verification-title" tabIndex={-1} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-ink-850 p-6 shadow-premium">
      <button type="button" onClick={onClose} aria-label={labels.close} className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-soft text-brand-pink">{requested || approved ? <Check className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}</div>
      <h3 id="story-verification-title" className="font-editorial text-2xl text-white">{approved ? labels.verified : requested ? labels.requestSubmitted : labels.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-200">{approved ? labels.verifiedBody : requested ? labels.requestedBody : labels.body}</p>
      {approved ? null : requested ? <button type="button" onClick={onClose} className="mt-6 w-full rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/[.06]">{labels.close}</button> : <button type="button" disabled={isVerifying} onClick={onRequest} className="mt-6 w-full rounded-full bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow-brand hover:brightness-110 disabled:cursor-wait disabled:opacity-70">{isVerifying ? labels.verifying : labels.request}</button>}
    </section>
  </div>;
}
