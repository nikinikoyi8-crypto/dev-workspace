import { useNavigate } from 'react-router-dom';
import { Activity, Archive, Bell, Bookmark, ChevronLeft, ChevronRight, Globe, Lock, LogOut, Moon } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { useLanguage } from '@/context/useLanguage';

type OptionItem = {
  id: string;
  label: string;
  persianLabel: string;
  icon: typeof Bookmark;
};

const OPTION_ITEMS: OptionItem[] = [
  { id: 'saved', label: 'Saved', persianLabel: 'ذخیره‌شده‌ها', icon: Bookmark },
  { id: 'notifications', label: 'Notifications', persianLabel: 'نوتیفیکیشن‌ها', icon: Bell },
  { id: 'activity', label: 'Activity', persianLabel: 'فعالیت‌ها', icon: Activity },
  { id: 'archive', label: 'Archive', persianLabel: 'آرشیو', icon: Archive },
  { id: 'privacy', label: 'Account privacy', persianLabel: 'حریم خصوصی حساب', icon: Lock },
  { id: 'language', label: 'Language', persianLabel: 'زبان', icon: Globe },
  { id: 'theme', label: 'App theme', persianLabel: 'تم اپ', icon: Moon },
];

export default function ProfileOptions() {
  const navigate = useNavigate();
  const { signOut } = useOnboarding();
  const { lang } = useLanguage();

  return (
    <main className="min-h-screen bg-ink-950 px-4 pb-10 text-ink-100 sm:px-8">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between">
          <button type="button" aria-label={lang === 'fa' ? 'بازگشت' : 'Go back'} onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white rtl:rotate-180">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-white">{lang === 'fa' ? 'تنظیمات و گزینه‌ها' : 'Options'}</h1>
          <span aria-hidden="true" className="w-10" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl pt-6">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-750/80 shadow-card">
          {OPTION_ITEMS.map(({ id, label, persianLabel, icon: Icon }, index) => (
            <button
              key={id}
              type="button"
              onClick={() => { if (id === 'saved') navigate('/profile/saved'); }}
              className={`flex h-14 w-full items-center gap-3 px-4 text-start text-sm text-white transition-colors hover:bg-white/[0.04] sm:px-5 ${index < OPTION_ITEMS.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
            >
              <Icon className="h-5 w-5 shrink-0 text-ink-200" />
              <span className="flex-1">{lang === 'fa' ? persianLabel : label}</span>
              {id === 'language' ? (
                <span className="text-xs text-ink-300">{lang === 'fa' ? 'فارسی' : 'English'}</span>
              ) : id === 'theme' ? (
                <span className="text-xs text-ink-300">{lang === 'fa' ? 'پیش‌فرض' : 'Default'}</span>
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-180" />
              )}
            </button>
          ))}
        </section>

        <button type="button" onClick={() => { void signOut(); }} className="mt-8 flex h-14 w-full items-center gap-3 rounded-2xl border border-red-400/20 px-4 text-sm font-medium text-red-400 transition-colors hover:border-red-400/40 hover:bg-red-400/10 sm:px-5">
          <LogOut className="h-5 w-5" />
          {lang === 'fa' ? 'خروج از حساب' : 'Sign out'}
        </button>
      </div>
    </main>
  );
}
