import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MAX_DISCIPLINES, useOnboarding } from '@/context/OnboardingContext';
import { ART_DISCIPLINES } from '@/data/categories';
import { localizedDisciplineLabel, localizedGroupLabel } from '@/data/disciplineTranslations';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/context/useLanguage';
import { ApiError } from '@/lib/api';
import type { OnboardingStep } from '@/services/onboardingService';

const STEP_PATHS: Record<OnboardingStep, string> = {
  discover_art: '/discover-art',
  define_practice: '/discover-practice',
  artist_identity: '/artist-identity',
  profile_setup: '/profile-setup',
  completed: '/app',
};

interface DisciplineButtonProps {
  discipline: (typeof ART_DISCIPLINES)[number];
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
  lang: 'en' | 'fa';
}

function DisciplineButton({ discipline, active, disabled, onToggle, lang }: DisciplineButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'no-tap-highlight flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
        active
          ? 'border-brand-pink/50 bg-brand-gradient-soft text-white shadow-glow max-[639px]:bg-ink-800/90 max-[639px]:shadow-[0_0_18px_-8px_rgba(232,79,155,0.35)]'
          : disabled
            ? 'cursor-not-allowed border-white/[0.07] bg-ink-800/40 text-ink-100 opacity-40'
            : 'border-white/[0.07] bg-ink-800/40 text-ink-100 hover:border-white/20',
      )}
    >
      <span className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        active ? 'bg-brand-pink/20 text-brand-pink' : 'bg-ink-700/60 text-ink-300',
      )}>
        <discipline.icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-medium">{localizedDisciplineLabel(discipline, lang)}</span>
    </button>
  );
}

export default function DiscoverYourArt() {
  const navigate = useNavigate();
  const { state, toggleCategory, addCustomDiscipline, update, saveDisciplines } = useOnboarding();
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selected = state.disciplines;
  const groups = useMemo(() => {
    const search = query.trim().toLowerCase();
    return Object.entries(ART_DISCIPLINES.reduce<Record<string, typeof ART_DISCIPLINES>>((result, discipline) => {
      const localizedLabel = localizedDisciplineLabel(discipline, lang);
      if (!search || discipline.label.toLowerCase().includes(search) || localizedLabel.toLowerCase().includes(search)) {
        (result[discipline.group || 'Other'] ||= []).push(discipline);
      }
      return result;
    }, {})).filter(([, disciplines]) => disciplines.length > 0);
  }, [lang, query]);

  const addCustom = () => {
    const existing = ART_DISCIPLINES.find((discipline) => discipline.label.toLowerCase() === customText.trim().toLowerCase());
    if (existing) {
      if (!selected.includes(existing.id)) toggleCategory(existing.id);
      setCustomText('');
      setShowCustom(false);
      return;
    }
    if (!customText.trim()) return;
    addCustomDiscipline(customText);
    setCustomText('');
    setShowCustom(false);
  };

  const clearAll = () => update({ disciplines: [], customDisciplines: [] });

  const handleContinue = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await saveDisciplines({
        disciplines: state.disciplines.filter((id) => !id.startsWith('custom:')),
        custom_disciplines: state.customDisciplines,
      });
      navigate(STEP_PATHS[result.step]);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) setError(t('onboarding.errors.forbidden'));
      else if (cause instanceof ApiError && cause.status === 422) {
        setError(cause.errors.disciplines?.[0] || cause.errors.custom_disciplines?.[0] || t('onboarding.errors.validation'));
      } else if (!(cause instanceof ApiError && cause.status === 409)) {
        setError(t('onboarding.errors.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout step={1} totalSteps={4} showBack onBack={() => navigate('/register')}>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-7 animate-fade-up">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-pink">{t('onboarding.discoverArt.eyebrow')}</span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t('onboarding.discoverArt.title')}</h1>
          <p className="mt-3 max-w-2xl text-ink-200">{t('onboarding.discoverArt.subtitle')}</p>
        </div>

        <Input placeholder={t('onboarding.discoverArt.search')} leftIcon={<Search className="h-4 w-4" />} value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="my-5 flex items-center justify-between text-sm text-ink-200"><span>{selected.length ? `${selected.length} / ${MAX_DISCIPLINES} selected` : t('onboarding.discoverArt.selectAll')}</span>{selected.length > 0 && <button onClick={clearAll} className="text-ink-300 hover:text-white">{t('onboarding.discoverArt.clearAll')}</button>}</div>
        {selected.length === MAX_DISCIPLINES && <p className="-mt-3 mb-4 text-xs text-brand-pink">{t('onboarding.discoverArt.maxReached')}</p>}

        <div className="max-h-[48vh] space-y-6 overflow-y-auto pr-2">
          {groups.map(([group, disciplines]) => (
            <section key={group}>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.16em] text-ink-300">
                {localizedGroupLabel(group, lang)}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3">
                {disciplines.map((discipline) => {
                  const active = selected.includes(discipline.id);
                  const disabled = !active && selected.length >= MAX_DISCIPLINES;

                  return (
                    <DisciplineButton
                      key={discipline.id}
                      discipline={discipline}
                      active={active}
                      disabled={disabled}
                      onToggle={() => toggleCategory(discipline.id)}
                      lang={lang}
                    />
                  );
                })}
              </div>
            </section>
          ))}
          {groups.length === 0 && <p className="py-8 text-center text-sm text-ink-300">{t('onboarding.discoverArt.noMatches')}</p>}
        </div>

        <div dir="ltr" className="mt-5 flex flex-wrap gap-2">{state.customDisciplines.map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-full border border-brand-pink/30 bg-brand-pink/10 px-3 py-1.5 text-xs text-white">{item}<button onClick={() => { const disciplines = state.disciplines.filter((id) => id !== `custom:${item}`); update({ disciplines, categories: disciplines, customDisciplines: state.customDisciplines.filter((value) => value !== item) }); }}><X className="h-3 w-3" /></button></span>)}{!showCustom ? <button onClick={() => setShowCustom(true)} className="inline-flex items-center gap-2 rounded-full border border-dashed border-white/20 px-3 py-1.5 text-xs text-ink-200 hover:border-brand-pink/40 hover:text-white"><Plus className="h-3.5 w-3.5" />{t('onboarding.discoverArt.custom')}</button> : <div className="flex w-full max-w-md gap-2"><Input autoFocus placeholder={t('onboarding.discoverArt.customPlaceholder')} value={customText} onChange={(event) => setCustomText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addCustom())} /><Button size="sm" onClick={addCustom} leftIcon={<Plus className="h-4 w-4" />}>+</Button><button onClick={() => setShowCustom(false)}><X className="h-4 w-4 text-ink-300" /></button></div>}</div>
        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
        <div dir="ltr" className="mt-7 flex justify-end"><Button size="lg" loading={saving} disabled={selected.length === 0} onClick={() => void handleContinue()} rightIcon={<span>→</span>}>{t('onboarding.discoverArt.continue')}</Button></div>
      </div>
    </AuthLayout>
  );
}
