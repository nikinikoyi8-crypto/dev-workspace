import { cn } from '@/utils/cn';

type MediumTagProps = {
  text: string;
  className?: string;
};

export default function MediumTag({ text, className }: MediumTagProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm border border-white/15 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm',
        className,
      )}
    >
      {text}
    </span>
  );
}
