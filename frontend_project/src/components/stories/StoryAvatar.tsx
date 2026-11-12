import { memo, useCallback } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { useOpenStories, useStoryStatus } from '@/context/StoriesContext';
import { useLanguage } from '@/context/useLanguage';
import { canonicalizeUserKey } from '@/services/storyService';

export type StoryAvatarSize = number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface StoryAvatarProps {
  userKey: string;
  src?: string;
  name: string;
  size: StoryAvatarSize;
  interactive?: boolean;
  variant?: 'default' | 'inline';
  onNoStoryClick?: () => void;
  className?: string;
}

const SIZE_PIXELS: Record<Exclude<StoryAvatarSize, number>, number> = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
};

function getSizePixels(size: StoryAvatarSize): number {
  return typeof size === 'number' ? size : SIZE_PIXELS[size];
}

function StoryAvatar({ userKey, src, name, size, interactive = true, variant = 'default', onNoStoryClick, className = '' }: StoryAvatarProps) {
  const { lang } = useLanguage();
  const canonicalKey = canonicalizeUserKey(userKey);
  const openStories = useOpenStories(canonicalKey);
  const { hasActiveStory, hasUnseenStory } = useStoryStatus(canonicalKey);
  const sizePixels = getSizePixels(size);
  const isInteractive = interactive && hasActiveStory;
  const hasAction = isInteractive || !!onNoStoryClick;

  const activate = useCallback((event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    if (!hasAction) return;
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    if (isInteractive) openStories();
    else onNoStoryClick?.();
  }, [hasAction, isInteractive, onNoStoryClick, openStories]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    activate(event);
  }, [activate]);

  const statusClasses = !hasActiveStory
    ? ''
    : hasUnseenStory
      ? 'bg-brand-gradient p-[2px]'
      : 'border border-white/25 p-px';
  const rootClasses = [
    'relative box-border inline-flex h-[var(--story-avatar-size)] w-[var(--story-avatar-size)] shrink-0 items-center justify-center rounded-full',
    hasAction && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 after:pointer-events-auto after:absolute after:start-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
    isInteractive && 'motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:scale-105 transition-transform motion-reduce:transition-none',
    className,
  ].filter(Boolean).join(' ');
  const image = src
    ? <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
    : <span aria-hidden="true" className="flex h-full w-full items-center justify-center rounded-full bg-ink-800 font-semibold uppercase text-white" style={{ fontSize: Math.max(12, Math.round(sizePixels * 0.38)) }}>{name.trim().charAt(0) || '?'}</span>;
  const avatar = hasActiveStory ? <span
    className={`box-border flex h-full w-full shrink-0 items-center justify-center rounded-full ${statusClasses}`}
  >
    <span className="box-border flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-ink-950 p-[2px]">
      {image}
    </span>
  </span> : image;

  if (hasAction) {
    const label = isInteractive
      ? lang === 'fa' ? `مشاهده استوری ${name}` : `View ${name}'s story`
      : lang === 'fa' ? `باز کردن ${name}` : `Open ${name}`;
    const commonProps = {
      'aria-label': label,
      onClick: activate,
      className: rootClasses,
      style: { '--story-avatar-size': `${sizePixels}px` } as CSSProperties,
    };
    return variant === 'inline'
      ? <span {...commonProps} role="button" tabIndex={0} onKeyDown={handleKeyDown}>{avatar}</span>
      : <button type="button" {...commonProps}>{avatar}</button>;
  }

  return <span
    className={rootClasses}
    style={{ '--story-avatar-size': `${sizePixels}px` } as CSSProperties}
  >{avatar}</span>;
}

export default memo(StoryAvatar);
