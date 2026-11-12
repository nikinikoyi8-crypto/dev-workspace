import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, Heart, MessageCircle, UserPlus, Check, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/useLanguage';
import { ARTWORKS, type Artwork } from '@/pages/MainApp';
import BottomNav from '@/components/BottomNav';
import { BottomSheet } from '@/components/ui/BottomSheet';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { ProfileFeedModalDesktop, ProfileFeedOverlay, ProfileReelsModalDesktop } from '@/pages/ProfileFeedViewers';
import ReelsImmersiveViewer from '@/components/ReelsImmersiveViewer';
import { cn } from '@/utils/cn';
import { canonicalizeUserKey } from '@/services/storyService';

type ActivityItem = {
  id: string;
  type: 'like' | 'comment' | 'follow';
  handle: string;
  icon: typeof Heart;
  accent: string;
  avatar?: string;
  title: string;
  body: string;
  time: string;
  work?: Artwork;
};

const ACTIVITY: ActivityItem[] = [
  { id: 'like', type: 'like', handle: ARTWORKS[0].handle, icon: Heart, accent: 'text-brand-pink', avatar: ARTWORKS[0].avatarUrl, title: 'Mara Voss', body: 'liked your latest artwork', time: '2h', work: ARTWORKS[0] },
  { id: 'comment', type: 'comment', handle: ARTWORKS[2].handle, icon: MessageCircle, accent: 'text-brand-purple', avatar: ARTWORKS[2].avatarUrl, title: 'Lina Park', body: 'left a thoughtful comment on your post', time: '5h', work: ARTWORKS[2] },
  { id: 'follow', type: 'follow', handle: ARTWORKS[4].handle, icon: UserPlus, accent: 'text-brand-orange', avatar: ARTWORKS[4].avatarUrl, title: 'Yuki Tanaka', body: 'started following your creative work', time: '1d' },
  { id: 'like-2', type: 'like', handle: ARTWORKS[3].handle, icon: Heart, accent: 'text-brand-pink', avatar: ARTWORKS[3].avatarUrl, title: 'Theo Marchetti', body: 'liked your reel', time: '2d', work: ARTWORKS[3] },
  { id: 'comment-2', type: 'comment', handle: ARTWORKS[5].handle, icon: MessageCircle, accent: 'text-brand-purple', avatar: ARTWORKS[5].avatarUrl, title: 'Aria Solé', body: 'mentioned your work in a discussion', time: '4d', work: ARTWORKS[5] },
];

const TABS = ['all', 'likes', 'comments', 'follows'] as const;
const NOTIFICATION_SETTINGS_KEY = 'artsocial-notification-settings';
const UNREAD_KEY = 'artsocial-notifications-unread';

type NotificationSettings = {
  enabled: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  followingActivity: boolean;
  quietMode: 'off' | '1h' | '8h' | 'tomorrow';
};

const DEFAULT_SETTINGS: NotificationSettings = { enabled: true, likes: true, comments: true, follows: true, messages: true, followingActivity: true, quietMode: 'off' };

function readNotificationSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readUnreadState() {
  try {
    return localStorage.getItem(UNREAD_KEY) !== 'false';
  } catch {
    return true;
  }
}

function NotificationSettingsContent({ settings, update, onMarkRead, t }: { settings: NotificationSettings; update: <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => void; onMarkRead: () => void; t: (key: string) => string }) {
  const rows: { key: keyof Pick<NotificationSettings, 'enabled' | 'likes' | 'comments' | 'follows' | 'messages' | 'followingActivity'>; label: string; description: string }[] = [
    { key: 'enabled', label: t('notifications.settingsItems.enabled'), description: t('notifications.settingsItems.enabledDescription') },
    { key: 'likes', label: t('notifications.settingsItems.likes'), description: t('notifications.settingsItems.likesDescription') },
    { key: 'comments', label: t('notifications.settingsItems.comments'), description: t('notifications.settingsItems.commentsDescription') },
    { key: 'follows', label: t('notifications.settingsItems.follows'), description: t('notifications.settingsItems.followsDescription') },
    { key: 'messages', label: t('notifications.settingsItems.messages'), description: t('notifications.settingsItems.messagesDescription') },
    { key: 'followingActivity', label: t('notifications.settingsItems.followingActivity'), description: t('notifications.settingsItems.followingActivityDescription') },
  ];

  return <div className="space-y-1">
    {rows.map(({ key, label, description }) => <div key={key} className="flex items-center gap-3 border-b border-white/[0.06] py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{label}</p><p className="mt-0.5 text-xs leading-relaxed text-ink-400">{description}</p></div><button type="button" role="switch" aria-checked={settings[key]} aria-label={label} onClick={() => update(key, !settings[key])} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', settings[key] ? 'bg-brand-pink' : 'bg-ink-700')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-transform', settings[key] ? 'start-6' : 'start-1')} /></button></div>)}
    <label className="flex items-center gap-3 border-b border-white/[0.06] py-3"><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-white">{t('notifications.settingsItems.quietMode')}</span><span className="mt-0.5 block text-xs text-ink-400">{t('notifications.settingsItems.quietModeDescription')}</span></span><select value={settings.quietMode} onChange={(event) => update('quietMode', event.target.value as NotificationSettings['quietMode'])} aria-label={t('notifications.settingsItems.quietMode')} className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-xs text-white outline-none"><option value="off">{t('notifications.settingsItems.off')}</option><option value="1h">{t('notifications.settingsItems.oneHour')}</option><option value="8h">{t('notifications.settingsItems.eightHours')}</option><option value="tomorrow">{t('notifications.settingsItems.tomorrow')}</option></select></label>
    <button type="button" onClick={onMarkRead} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-pink/30 text-sm font-medium text-brand-pink transition-colors hover:bg-brand-pink/10"><Check className="h-4 w-4" />{t('notifications.settingsItems.markRead')}</button>
  </div>;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unread, setUnread] = useState(readUnreadState);
  const [desktop, setDesktop] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(readNotificationSettings);
  const [selectedWork, setSelectedWork] = useState<Artwork | null>(null);
  const visibleActivity = useMemo(() => activeTab === 'all' ? ACTIVITY : ACTIVITY.filter((item) => item.type === (activeTab === 'likes' ? 'like' : activeTab === 'follows' ? 'follow' : 'comment')), [activeTab]);
  const reelItems = useMemo(() => ARTWORKS.filter((item) => item.videoUrl), []);
  const closeViewer = () => setSelectedWork(null);

  useEffect(() => {
    try { localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Storage may be unavailable. */ }
  }, [settings]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const settingsContent = <NotificationSettingsContent settings={settings} update={updateSetting} onMarkRead={() => { setUnread(false); try { localStorage.setItem(UNREAD_KEY, 'false'); } catch { /* Storage may be unavailable. */ } window.dispatchEvent(new Event('artsocial-notification-change')); setSettingsOpen(false); }} t={t} />;

  return (
    <main className="min-h-screen bg-ink-950 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-ink-100">
      <div className="mx-auto min-h-screen w-full max-w-3xl px-4 sm:px-8">
        <header className="sticky top-0 z-40 -mx-4 border-b border-white/[0.08] bg-ink-950/95 px-4 backdrop-blur-xl sm:-mx-8 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            <button type="button" aria-label={t('notifications.back')} onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white rtl:rotate-180"><ChevronLeft className="h-5 w-5" /></button>
            <h1 className="text-lg font-semibold text-white">{t('notifications.title')}</h1>
            <div className="relative"><button type="button" aria-label={t('notifications.settings')} aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)} className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white"><Bell className="h-5 w-5" />{unread && <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-brand-pink ring-2 ring-ink-950" />}</button>{desktop && settingsOpen && <div className="absolute end-0 top-12 z-50 max-h-[calc(100dvh-5rem)] w-80 overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-4 shadow-2xl"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><Settings2 className="h-4 w-4 text-brand-pink" />{t('notifications.settings')}</div>{settingsContent}</div>}</div>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none]">
            {TABS.map((tab) => <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={cn('shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors', activeTab === tab ? 'bg-white text-ink-950' : 'bg-ink-800 text-ink-200 hover:bg-ink-750 hover:text-white')}>{t(`notifications.tabs.${tab}`)}</button>)}
          </div>
        </header>

        <section className="pt-6">
          <h2 className="mb-4 text-base font-semibold text-white">{t('notifications.recent')}</h2>
          <div className="space-y-1">
            {visibleActivity.length > 0 ? visibleActivity.map(({ id, type, handle, icon: Icon, accent, avatar, title, body, time, work }) => {
              const openActivity = () => type === 'follow' ? navigate(`/artist/${canonicalizeUserKey(handle)}`) : work && setSelectedWork(work);
              return <div key={id} onClick={openActivity} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2 py-3 text-start transition-colors hover:bg-white/[0.04]">
                <div className="relative shrink-0"><StoryAvatar userKey={canonicalizeUserKey(handle)} src={avatar} name={title} size={48} variant="inline" className="h-12 w-12" onNoStoryClick={openActivity} /><span className={cn('pointer-events-none absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink-950 bg-ink-800', accent)}><Icon className="h-2.5 w-2.5" /></span></div>
                <button type="button" onClick={(event) => { event.stopPropagation(); openActivity(); }} className="flex min-w-0 flex-1 items-center gap-3 text-start"><p className="min-w-0 flex-1 text-sm leading-relaxed text-ink-100"><strong className="font-semibold text-white">{title}</strong>{' '}{body}<span className="ms-1 text-xs text-ink-400">{time}</span></p>
                  {work && <img src={work.imageUrl || work.posterUrl} alt="" className="h-14 w-11 shrink-0 rounded-lg object-cover" />}
                </button>
              </div>;
            }) : <p className="py-12 text-center text-sm text-ink-400">{t('notifications.empty')}</p>}
          </div>
        </section>
      </div>
      <BottomSheet open={!desktop && settingsOpen} onClose={() => setSettingsOpen(false)} title={t('notifications.settings')} closeLabel={t('notifications.close')}>
        {settingsContent}
      </BottomSheet>
      {selectedWork && (desktop ? (selectedWork.videoUrl ? <ProfileReelsModalDesktop items={reelItems} index={Math.max(0, reelItems.findIndex((item) => item.id === selectedWork.id))} onClose={closeViewer} onNext={() => {}} onPrev={() => {}} /> : <ProfileFeedModalDesktop items={ARTWORKS} index={Math.max(0, ARTWORKS.findIndex((item) => item.id === selectedWork.id))} onClose={closeViewer} onNext={() => {}} onPrev={() => {}} isPosts />) : selectedWork.videoUrl ? <ReelsImmersiveViewer items={reelItems} startId={selectedWork.id} onClose={closeViewer} /> : <ProfileFeedOverlay items={ARTWORKS} startId={selectedWork.id} onClose={closeViewer} isReel={false} />)}
      <div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 rtl:lg:left-auto rtl:lg:right-4"><BottomNav className="lg:flex-col" /></div>
    </main>
  );
}
