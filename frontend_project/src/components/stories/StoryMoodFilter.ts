export type StoryMoodFilter = 'none' | 'warm' | 'mono' | 'neon' | 'faded';

export const STORY_MOOD_FILTERS: Record<StoryMoodFilter, string> = {
  none: 'none',
  warm: 'sepia(.24) saturate(1.28) hue-rotate(-8deg)',
  mono: 'grayscale(1) contrast(1.08)',
  neon: 'saturate(1.8) hue-rotate(28deg) contrast(1.08)',
  faded: 'sepia(.16) saturate(.78) brightness(1.08) contrast(.84)',
};
