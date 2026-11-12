import { useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { useLanguage } from '@/context/useLanguage';
import { useStories } from '@/context/StoriesContext';
import StoryComposer from '@/components/stories/StoryComposer';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { canonicalizeUserKey } from '@/services/storyService';
import { artistAvatar, DEMO_ARTISTS } from '@/data/demoStories';

export default function StoriesBar() {
  const [composerOpen, setComposerOpen] = useState(false);
  const { state } = useOnboarding();
  const { getUserStories, hasUnseenStory, openStories } = useStories();
  const { t, lang } = useLanguage();
  const username = state.username || state.displayName || 'Artist';
  const ownUserKey = canonicalizeUserKey(state.username || state.email || 'current-artist') || 'current-artist';
  const createMomentLabel = t('stories.createMoment');
  const locale = lang === 'fa' ? 'fa-IR' : 'en';
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const formatLabel = (template: string, values: Record<string, string>) => Object.entries(values).reduce((label, [key, value]) => label.replace(`{${key}}`, value), template);
  const activeStories = getUserStories(ownUserKey);
  const latestStory = activeStories[activeStories.length - 1];
  const ownViews = Math.max(latestStory?.viewCount ?? 0, latestStory?.viewers?.length ?? 0);
  const demoStoryGroups = useMemo(() => DEMO_ARTISTS.map((artist) => ({
    artist,
    stories: getUserStories(canonicalizeUserKey(artist.ownerId)),
  })).filter((group) => group.stories.length > 0), [getUserStories]);
  const orderedDemoStoryGroups = [...demoStoryGroups].sort((left, right) => (
    Number(!hasUnseenStory(canonicalizeUserKey(left.artist.ownerId))) - Number(!hasUnseenStory(canonicalizeUserKey(right.artist.ownerId)))
  ));

  return <div className="flex gap-4 overflow-x-auto border-b border-white/[0.06] bg-ink-950/80 px-5 py-4 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-8">
    <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center sm:w-20">
      <span className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-ink-900">
        <button type="button" aria-label={latestStory ? t('stories.viewer.openOwn') : formatLabel(t('stories.createAria'), { username })} onClick={() => latestStory ? openStories(ownUserKey) : setComposerOpen(true)} className="flex h-full w-full items-center justify-center rounded-full">
          <StoryAvatar userKey={ownUserKey} src={state.avatarUrl} name={username} size={60} interactive={false} variant="inline" className="sm:h-[76px] sm:w-[76px]" />
        </button>
        </span>
        {latestStory && <span aria-label={formatLabel(t('stories.viewer.viewCountLabel'), { count: number(ownViews) })} className="absolute -top-1 -end-1 inline-flex min-h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border border-ink-950 bg-brand-pink px-1 text-[8px] font-bold text-white"><Eye className="h-2.5 w-2.5" />{number(ownViews)}</span>}
        <button type="button" aria-label={formatLabel(t('stories.createAria'), { username })} onClick={() => setComposerOpen(true)} className="absolute bottom-0 end-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-900 bg-ink-100 text-ink-950 transition hover:scale-110"><Plus className="h-3.5 w-3.5" strokeWidth={3} /></button>
      </span>
      <span className="w-full whitespace-nowrap text-[10px] leading-tight text-ink-100">{createMomentLabel}</span>
    </div>

    {orderedDemoStoryGroups.map(({ artist }) => <button key={artist.id} type="button" aria-label={formatLabel(t('stories.viewWork'), { username: artist.username, discipline: t('stories.disciplines.painting') })} onClick={() => openStories(canonicalizeUserKey(artist.ownerId))} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center sm:w-20">
      <StoryAvatar userKey={canonicalizeUserKey(artist.ownerId)} src={artistAvatar(artist)} name={artist.displayName} size={60} interactive={false} variant="inline" className="sm:h-[76px] sm:w-[76px]" />
      <span className="w-full truncate text-[11px] leading-tight text-ink-100">{artist.username}</span>
    </button>)}
    {composerOpen && <StoryComposer onClose={() => setComposerOpen(false)} />}
  </div>;
}