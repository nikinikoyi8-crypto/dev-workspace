import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, Camera, Check, ChevronLeft, Link2, Plus, Upload, X } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { useLanguage } from '@/context/useLanguage';
import { ART_DISCIPLINES, FALLBACK_PRACTICE_QUESTIONS, PRACTICE_QUESTIONS, type PracticeQuestion } from '@/data/categories';
import { localizedDisciplineLabel } from '@/data/disciplineTranslations';
import { localizePracticeQuestion } from '@/data/practiceTranslations';
import type { OnboardingState } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { cn } from '@/utils/cn';
import { normalizeSocialLinks, SOCIAL_PLATFORMS, validateSocialLinks } from '@/utils/socialLinks';

type Social = OnboardingState['socials'][number];
type Draft = Pick<OnboardingState, 'username' | 'displayName' | 'avatarUrl' | 'coverUrl' | 'bio' | 'socials' | 'disciplines' | 'practiceAnswers'>;

export default function EditProfile() {
  const navigate = useNavigate();
  const { state, update, setPracticeAnswer } = useOnboarding();
  const { lang, t } = useLanguage();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft>(() => getDraft(state));
  const [practiceSheetOpen, setPracticeSheetOpen] = useState(false);

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setSocial = (index: number, key: keyof Social, value: string) => setField('socials', draft.socials.map((social, itemIndex) => itemIndex === index ? { ...social, [key]: value } : social));
  const questions = getQuestions(draft.disciplines, lang);
  const practiceSelections = Object.entries(draft.practiceAnswers).flatMap(([questionId, values]) => values.map((option) => ({ questionId, option })));

  const handleImage = (event: ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'coverUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setField(field, URL.createObjectURL(file));
    event.target.value = '';
  };

  const handlePractice = (questionId: string, option: string) => {
    const selected = draft.practiceAnswers[questionId] || [];
    const values = selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option];
    setField('practiceAnswers', { ...draft.practiceAnswers, [questionId]: values });
  };

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    const usernameChanged = draft.username !== state.username;
    const trimmedUsername = draft.username.trim();
    if (usernameChanged && !trimmedUsername) nextErrors.username = t('profile.edit.usernameRequired');
    else if (usernameChanged && trimmedUsername.length < 3) nextErrors.username = t('auth.usernameMin');
    Object.entries(validateSocialLinks(draft.socials)).forEach(([index, message]) => { nextErrors[`social-${index}`] = message; });
    if (Object.keys(nextErrors).length > 0) { setErrors(nextErrors); return; }

    Object.entries(draft.practiceAnswers).forEach(([questionId, values]) => setPracticeAnswer(questionId, values));
    update({ username: draft.username.trim(), displayName: draft.displayName.trim(), avatarUrl: draft.avatarUrl, coverUrl: draft.coverUrl, bio: draft.bio, socials: normalizeSocialLinks(draft.socials.filter((social) => social.url.trim())) });
    navigate('/profile', { replace: true });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSave();
  };

  return (
    <main className="min-h-screen bg-ink-950 text-ink-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <button type="button" aria-label={t('common.back')} onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white rtl:rotate-180"><ChevronLeft className="h-5 w-5" /></button>
          <h1 className="text-base font-semibold text-white">{t('profile.edit.title')}</h1>
          <Button type="button" size="sm" onClick={handleSave}>{t('profile.edit.save')}</Button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
        <div className="space-y-6 sm:space-y-8">
          <section className="relative mb-12 h-28 overflow-visible rounded-2xl border border-white/10 bg-ink-800 sm:h-32">
            <div className="h-full overflow-hidden rounded-2xl">
              {draft.coverUrl ? <img src={draft.coverUrl} alt={t('profile.edit.cover')} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-ink-800 via-ink-700 to-ink-900" />}
            </div>
            <button type="button" onClick={() => coverRef.current?.click()} aria-label={t('profile.edit.uploadCover')} className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink-950/70 text-white hover:text-brand-pink"><Camera className="h-4 w-4" /></button>
            <input ref={coverRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleImage(event, 'coverUrl')} />
            <button type="button" onClick={() => avatarRef.current?.click()} className="group absolute -bottom-8 left-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-ink-750 bg-ink-800 sm:bottom-[-2.5rem] sm:left-6 sm:h-24 sm:w-24 sm:border-[#1C1523]" aria-label={t('profile.edit.uploadAvatar')}>
              {draft.avatarUrl ? <img src={draft.avatarUrl} alt={t('profile.edit.avatar')} className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-ink-300" />}
              <span className="absolute inset-0 flex items-center justify-center bg-ink-950/60 opacity-0 transition-opacity group-hover:opacity-100"><Upload className="h-5 w-5 text-white" /></span>
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImage(event, 'avatarUrl')} />
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={t('profile.edit.username')} leftIcon={<AtSign className="h-4 w-4" />} value={draft.username} onChange={(event) => setField('username', event.target.value)} error={errors.username} placeholder="sahar.art" />
            <Input label={t('profile.edit.displayName')} value={draft.displayName} onChange={(event) => setField('displayName', event.target.value)} hint={t('profile.edit.displayNameHint')} />
          </div>

          <Textarea label={t('profile.edit.bio')} placeholder={t('onboarding.profile.bioPlaceholder')} rows={4} maxLength={200} value={draft.bio} onChange={(event) => setField('bio', event.target.value)} hint={`${draft.bio.length}/200`} />

          <section>
            <div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium text-ink-100">{t('onboarding.profile.socialLinks')} <span className="font-normal text-ink-300">{t('onboarding.profile.optional')}</span></label><button type="button" disabled={draft.socials.length >= SOCIAL_PLATFORMS.length} onClick={() => setField('socials', [...draft.socials, { label: '', url: '' }])} className="inline-flex items-center gap-1 text-xs text-brand-pink hover:text-brand-orange disabled:pointer-events-none disabled:opacity-40"><Plus className="h-3.5 w-3.5" />{t('onboarding.profile.addLink')}</button></div>
            <div className="space-y-3">{draft.socials.map((social, index) => <div key={`${index}-${social.label}`} className="flex items-start gap-3"><select value={social.label} onChange={(event) => setSocial(index, 'label', event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-ink-800/60 px-3 text-sm text-white focus:border-brand-pink/40 focus:outline-none sm:min-w-[140px] sm:flex-none"><option value="" className="bg-ink-800">{t('onboarding.profile.platform')}</option>{SOCIAL_PLATFORMS.filter((platform) => platform === social.label || !draft.socials.some((item, itemIndex) => itemIndex !== index && item.label === platform)).map((platform) => <option key={platform} value={platform} className="bg-ink-800">{platform}</option>)}</select><div className="min-w-0 flex-1"><Input placeholder={t('onboarding.profile.socialUrl')} leftIcon={<Link2 className="h-4 w-4" />} value={social.url} onChange={(event) => setSocial(index, 'url', event.target.value)} error={errors[`social-${index}`]} /></div>{draft.socials.length > 1 && <button type="button" onClick={() => setField('socials', draft.socials.filter((_, itemIndex) => itemIndex !== index))} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-ink-800/60 text-ink-200 hover:text-white"><X className="h-4 w-4" /></button>}</div>)}</div>
          </section>

          <section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-medium text-white">{t('profile.edit.disciplines')}</h2><button type="button" onClick={() => setPracticeSheetOpen(true)} className="inline-flex items-center gap-1 text-xs text-brand-pink hover:text-brand-orange"><Plus className="h-3.5 w-3.5" />{t('profile.edit.addDiscipline')}</button></div><div className="flex flex-wrap gap-2">{draft.disciplines.map((id) => <span key={id} className="rounded-full border border-brand-pink/25 bg-brand-pink/10 px-3 py-1.5 text-xs text-ink-100">{getDisciplineLabel(id, lang)}</span>)}{practiceSelections.map(({ questionId, option }) => <span key={`${questionId}-${option}`} className="inline-flex items-center gap-1 rounded-full border border-brand-pink/25 bg-brand-pink/10 px-3 py-1.5 text-xs text-ink-100">{option}<button type="button" aria-label={`${t('profile.edit.remove')} ${option}`} onClick={() => handlePractice(questionId, option)} className="text-ink-300 hover:text-white"><X className="h-3 w-3" /></button></span>)}{draft.disciplines.length === 0 && practiceSelections.length === 0 && <span className="text-xs text-ink-300">{t('profile.edit.noPractice')}</span>}</div></section>
        </div>
      </form>

      <BottomSheet open={practiceSheetOpen} onClose={() => setPracticeSheetOpen(false)} title={t('profile.edit.practice')} closeLabel={t('profile.edit.close')}>
        <div className="space-y-5">{questions.map((question) => <div key={question.id}><h3 className="mb-3 text-sm font-medium text-white">{question.label}</h3><div className="flex flex-wrap gap-2">{question.options.map((option) => { const active = draft.practiceAnswers[question.id]?.includes(option) ?? false; return <button type="button" key={option} onClick={() => handlePractice(question.id, option)} className={cn('inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs transition-all', active ? 'border-brand-pink/50 bg-brand-pink/15 text-white' : 'border-white/10 bg-ink-800/50 text-ink-200 hover:border-white/25 hover:text-white')}>{active && <Check className="h-3.5 w-3.5 text-brand-pink" />}{option}</button>; })}</div></div>)}</div>
        <Button type="button" fullWidth className="mt-6" onClick={() => setPracticeSheetOpen(false)}>{t('profile.edit.done')}</Button>
      </BottomSheet>
    </main>
  );
}

function getDraft(state: OnboardingState): Draft {
  const socials = normalizeSocialLinks(state.socials);
  return { username: state.username, displayName: state.displayName, avatarUrl: state.avatarUrl, coverUrl: state.coverUrl, bio: state.bio, socials: socials.length ? socials.map((social) => ({ ...social })) : [{ label: '', url: '' }], disciplines: [...state.disciplines], practiceAnswers: Object.fromEntries(Object.entries(state.practiceAnswers).map(([id, values]) => [id, [...values]])) };
}

function getDisciplineLabel(id: string, lang: 'en' | 'fa'): string {
  if (id.startsWith('custom:')) return id.slice(7);
  const discipline = ART_DISCIPLINES.find((item) => item.id === id);
  return discipline ? localizedDisciplineLabel(discipline, lang) : id;
}

function getQuestions(disciplines: string[], lang: 'en' | 'fa'): PracticeQuestion[] {
  const map = new Map<string, PracticeQuestion>();
  disciplines.forEach((id) => { const group = ART_DISCIPLINES.find((discipline) => discipline.id === id)?.group; const questions = PRACTICE_QUESTIONS[id] || (group === 'Music & Sound' ? PRACTICE_QUESTIONS.musician : group === 'Visual Arts' ? PRACTICE_QUESTIONS.painter : FALLBACK_PRACTICE_QUESTIONS); questions.forEach((question) => { const existing = map.get(question.label); map.set(question.label, existing ? { ...existing, options: [...new Set([...existing.options, ...question.options])] } : question); }); });
  return [...map.values()].map((question) => localizePracticeQuestion(question, lang));
}
