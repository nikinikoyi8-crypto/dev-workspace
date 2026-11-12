import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '@/context/OnboardingContext';
import { ART_DISCIPLINES, FALLBACK_PRACTICE_QUESTIONS, PRACTICE_QUESTIONS, type PracticeQuestion } from '@/data/categories';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/context/useLanguage';
import { localizePracticeQuestion } from '@/data/practiceTranslations';
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

interface DisplayPracticeQuestion extends PracticeQuestion {
  optionQuestionIds: Record<string, string[]>;
}

export default function DefinePractice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, setPracticeAnswer, savePractice } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { lang, t } = useLanguage();
  const requestedDiscipline = searchParams.get('discipline');
  const baseDisciplines = state.disciplines;
  const disciplines = requestedDiscipline ? [requestedDiscipline] : baseDisciplines;
  const rawQuestions = useMemo(() => {
    const map = new Map<string, DisplayPracticeQuestion>();
    disciplines.forEach((id) => {
      const group = ART_DISCIPLINES.find((discipline) => discipline.id === id)?.group;
      const questionsForDiscipline = PRACTICE_QUESTIONS[id] || (group === 'Music & Sound' ? PRACTICE_QUESTIONS.musician : group === 'Visual Arts' ? PRACTICE_QUESTIONS.painter : FALLBACK_PRACTICE_QUESTIONS);
      questionsForDiscipline.forEach((question) => {
        const existing = map.get(question.label) ?? { ...question, options: [], optionQuestionIds: {} };
        for (const option of question.options) {
          if (!existing.options.includes(option)) existing.options.push(option);
          const questionIds = existing.optionQuestionIds[option] ?? [];
          if (!questionIds.includes(question.id)) existing.optionQuestionIds[option] = [...questionIds, question.id];
        }
        map.set(question.label, existing);
      });
    });
    return [...map.values()];
  }, [disciplines]);
  const questions = useMemo(() => rawQuestions.map((question) => localizePracticeQuestion(question, lang)), [lang, rawQuestions]);

  useEffect(() => {
    if (disciplines.length === 0) navigate('/discover-art', { replace: true });
  }, [disciplines.length, navigate]);

  if (disciplines.length === 0) return <Navigate to="/discover-art" replace />;

  const submitPractice = async (skip = false) => {
    setSaving(true);
    setError('');
    const activeQuestionIds = new Set(rawQuestions.flatMap((question) => Object.values(question.optionQuestionIds).flat()));
    const answers = skip
      ? {}
      : Object.fromEntries(Object.entries(state.practiceAnswers).filter(([id, values]) => activeQuestionIds.has(id) && values.length > 0));
    try {
      const result = await savePractice(answers);
      navigate(STEP_PATHS[result.step]);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        setError(cause.errors.practice_answers?.[0] || t('onboarding.errors.validation'));
      } else if (!(cause instanceof ApiError && cause.status === 409)) {
        setError(t('onboarding.errors.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return <AuthLayout step={2} totalSteps={4} showBack onBack={() => navigate('/discover-art')}>
    <div className="mx-auto w-full max-w-3xl"><div className="mb-8 animate-fade-up"><span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-pink">{t('onboarding.definePractice.eyebrow')}</span><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t('onboarding.definePractice.title')}</h1><p className="mt-3 text-ink-200">{t('onboarding.definePractice.subtitle')}</p></div><div className="space-y-7">{questions.map((question) => { const rawQuestion = rawQuestions.find((item) => item.label === question.label)!; return <section key={question.label}><h2 className="mb-3 text-lg font-medium text-white">{question.label}</h2><div className="flex flex-wrap gap-2.5">{question.options.map((option, optionIndex) => { const rawOption = rawQuestion.options[optionIndex]; const value = optionSlug(rawOption); const sourceIds = rawQuestion.optionQuestionIds[rawOption] ?? [rawQuestion.id]; const active = sourceIds.some((id) => state.practiceAnswers[id]?.includes(value)); return <button key={`${question.label}-${option}`} disabled={saving} onClick={() => { if (active) sourceIds.forEach((id) => { if (state.practiceAnswers[id]?.includes(value)) setPracticeAnswer(id, state.practiceAnswers[id].filter((item) => item !== value)); }); else { const id = sourceIds[0]; setPracticeAnswer(id, [...(state.practiceAnswers[id] || []), value]); } }} className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all', active ? 'border-brand-pink/50 bg-brand-pink/15 text-white' : 'border-white/10 bg-ink-800/50 text-ink-200 hover:border-white/25 hover:text-white')}>{active && <Check className="h-3.5 w-3.5 text-brand-pink" />}{option}</button>; })}</div></section>; })}</div>{error && <p role="alert" className="mt-5 text-sm text-red-400">{error}</p>}<div dir="ltr" className="mt-9 flex items-center justify-between"><button disabled={saving} onClick={() => void submitPractice(true)} className="inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('onboarding.definePractice.skip')}</button><Button size="lg" loading={saving} onClick={() => void submitPractice()} rightIcon={<span>→</span>}>{t('onboarding.definePractice.continue')}</Button></div></div>
  </AuthLayout>;
}

