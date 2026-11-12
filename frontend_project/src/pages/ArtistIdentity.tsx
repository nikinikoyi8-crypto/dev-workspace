import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '@/context/OnboardingContext';
import { ART_DISCIPLINES, FALLBACK_PRACTICE_QUESTIONS, PRACTICE_QUESTIONS } from '@/data/categories';
import { localizedDisciplineLabel } from '@/data/disciplineTranslations';
import { localizePracticeQuestion } from '@/data/practiceTranslations';
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

const optionSlug = (option: string) => option.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function ArtistIdentity() {
  const navigate = useNavigate();
  const { state, confirmIdentity } = useOnboarding();
  const { lang, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selected = state.disciplines;
  const labels = selected.map((id) => { if (id.startsWith('custom:')) return id.slice(7); const discipline = ART_DISCIPLINES.find((item) => item.id === id); return discipline ? localizedDisciplineLabel(discipline, lang) : id; });
  const allQuestions = [...new Map(Object.values(PRACTICE_QUESTIONS).flat().map((question) => [question.id, question])).values(), ...FALLBACK_PRACTICE_QUESTIONS];
  const answers = Object.entries(state.practiceAnswers).flatMap(([questionId, values]) => {
    const question = allQuestions.find((item) => item.id === questionId);
    if (!question || !values.length) return [];
    const localized = localizePracticeQuestion(question, lang);
    const selected = values.map((value) => {
      const optionIndex = question.options.findIndex((option) => optionSlug(option) === value);
      return localized.options[optionIndex] ?? value;
    });
    return [`${localized.label}: ${selected.join(' · ')}`];
  });
  const name = state.fullName || 'Artist';

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await confirmIdentity();
      navigate(STEP_PATHS[result.step]);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) setError(t('onboarding.errors.forbidden'));
      else if (cause instanceof ApiError && cause.status === 422) setError(t('onboarding.errors.validation'));
      else if (!(cause instanceof ApiError && cause.status === 409)) setError(t('onboarding.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return <AuthLayout step={3} totalSteps={4} showBack onBack={() => navigate('/discover-practice')}><div className="mx-auto w-full max-w-2xl"><div className="mb-8 text-center animate-fade-up"><span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-pink">{t('onboarding.identity.eyebrow')}</span><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t('onboarding.identity.title')}</h1><p className="mt-3 text-ink-200">{t('onboarding.identity.subtitle')}</p><p className="mt-4 text-lg text-white">{name}</p></div><div className="glass-strong space-y-6 rounded-3xl p-6 sm:p-8"><section><p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-ink-300">{t('onboarding.identity.disciplines')}</p><div className="flex flex-wrap gap-2">{labels.map((label) => <span key={label} className="rounded-full border border-brand-pink/30 bg-brand-pink/10 px-3 py-1.5 text-sm text-white">{label}</span>)}</div></section>{answers.length > 0 && <section><p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-ink-300">{t('onboarding.identity.practice')}</p><div className="space-y-2">{answers.map((answer) => <p key={answer} className="text-sm text-ink-100">{answer}</p>)}</div></section>}</div>{error && <p role="alert" className="mt-5 text-sm text-red-400">{error}</p>}<div dir="ltr" className="mt-7 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row"><button disabled={saving} onClick={() => navigate('/discover-art')} className="inline-flex items-center gap-2 text-sm text-ink-200 hover:text-white disabled:opacity-50"><Pencil className="h-4 w-4" />{t('onboarding.identity.edit')}</button><Button size="lg" loading={saving} onClick={() => void handleConfirm()} rightIcon={<ArrowRight className="h-4 w-4" />}>{t('onboarding.identity.looksGood')}</Button></div></div></AuthLayout>;
}
