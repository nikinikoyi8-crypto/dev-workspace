import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type FollowButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isFollowing: boolean;
};

export default function FollowButton({
  isFollowing,
  className,
  children,
  ...props
}: FollowButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors hover:opacity-90 lg:-translate-y-2',
        isFollowing ? 'border-white/20 bg-white/10 text-white/90' : 'border-brand-pink/40 bg-brand-pink/25 text-white',
        className,
      )}
    >
      {children ?? (isFollowing ? 'Following' : 'Follow')}
    </button>
  );
}
