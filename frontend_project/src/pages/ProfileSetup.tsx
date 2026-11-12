import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { AuthLayout } from '@/components/AuthLayout';
import { useOnboarding } from '@/context/OnboardingContext';
import { ART_DISCIPLINES } from '@/data/categories';
import { localizedDisciplineLabel } from '@/data/disciplineTranslations';
import { Camera, AtSign, Link2, Plus, X, Upload, Pencil } from 'lucide-react';
import { useLanguage } from '@/context/useLanguage';
import { normalizeSocialLinks, SOCIAL_PLATFORMS, validateSocialLinks } from '@/utils/socialLinks';
import { ApiError } from '@/lib/api';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { state, update, saveOnboardingProfile } = useOnboarding();
  const { lang, t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [socials, setSocials] = useState(() => {
    const supported = normalizeSocialLinks(state.socials);
    return supported.length ? supported : [{ label: '', url: '' }];
  });

  const setSocial = (i: number, key: 'label' | 'url', val: string) => {
    setSocials((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));
  };

  const addSocial = () => setSocials((prev) => prev.length < SOCIAL_PLATFORMS.length ? [...prev, { label: '', url: '' }] : prev);
  const removeSocial = (i: number) => setSocials((prev) => prev.filter((_, idx) => idx !== i));

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // TODO: Upload the avatar through a dedicated API when the backend supports it.
    update({ avatarUrl: url });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!state.fullName.trim()) next.fullName = t('onboarding.profile.fullNameRequired');
    if (!state.username.trim()) next.username = t('onboarding.profile.usernameRequired');
    Object.entries(validateSocialLinks(socials)).forEach(([index, message]) => { next[`social-${index}`] = message; });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setFormError('');
    setErrors({});
    const cleanSocials = normalizeSocialLinks(socials.filter((s) => s.label.trim() && s.url.trim()));
    try {
      await saveOnboardingProfile({ bio: state.bio, country: 'Iran', socials: cleanSocials });
      navigate('/app', { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) setFormError(t('onboarding.errors.forbidden'));
      else if (cause instanceof ApiError && cause.status === 422) {
        const next: Record<string, string> = {};
        const fieldMap: Record<string, string> = { bio: 'bio', country: 'country', socials: 'socials' };
        for (const [field, messages] of Object.entries(cause.errors)) {
          const mapped = fieldMap[field] || (field.startsWith('socials.') ? `social-${field.split('.')[1]}` : undefined);
          if (mapped && messages.length) next[mapped] = messages[0];
        }
        if (next.socials) {
          setFormError(t('onboarding.errors.validation'));
          delete next.socials;
        }
        if (Object.keys(next).length) setErrors(next);
        else setFormError(cause.message || t('onboarding.errors.validation'));
      } else if (!(cause instanceof ApiError && cause.status === 409)) {
        setFormError(t('onboarding.errors.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout step={4} totalSteps={4} showBack onBack={() => navigate('/artist-identity')}>
      <div className="w-full max-w-xl mx-auto">
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
            {t('onboarding.profile.title')}
          </h1>
          <p className="mt-2 text-ink-200">{t('onboarding.profile.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up animate-delay-100">
          <section className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">{t('onboarding.profile.yourArt')}</p>
              <button type="button" onClick={() => navigate('/discover-art')} className="inline-flex items-center gap-1 text-xs text-brand-pink hover:text-brand-orange"><Pencil className="h-3.5 w-3.5" />{t('onboarding.profile.edit')}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.disciplines.map((id) => { if (id.startsWith('custom:')) return <span key={id} className="rounded-full border border-brand-pink/25 bg-brand-pink/10 px-3 py-1.5 text-xs text-ink-100">{id.slice(7)}</span>; const discipline = ART_DISCIPLINES.find((item) => item.id === id); return <span key={id} className="rounded-full border border-brand-pink/25 bg-brand-pink/10 px-3 py-1.5 text-xs text-ink-100">{discipline ? localizedDisciplineLabel(discipline, lang) : id}</span>; })}
            </div>
          </section>
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-white/[0.1] bg-ink-800 flex items-center justify-center transition-all hover:border-brand-pink/40"
            >
              {state.avatarUrl ? (
                <img src={state.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-7 h-7 text-ink-300 group-hover:text-brand-pink transition-colors" />
              )}
              <div className="absolute inset-0 bg-ink-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
            </button>
            <div>
              <p className="text-sm font-medium text-white">{t('onboarding.profile.profilePicture')}</p>
              <p className="text-xs text-ink-300 mt-1">{t('onboarding.profile.uploadHint')}</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
          </div>

          {/* Display name + username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('onboarding.profile.fullName')}
              value={state.fullName}
              readOnly
              error={errors.fullName}
            />
            <Input
              label={t('onboarding.profile.username')}
              leftIcon={<AtSign className="w-4 h-4" />}
              value={state.username}
              readOnly
              error={errors.username}
            />
          </div>

          {/* Bio */}
          <Textarea
            label={t('onboarding.profile.bio')}
            placeholder={t('onboarding.profile.bioPlaceholder')}
            rows={3}
            maxLength={200}
            value={state.bio}
            onChange={(e) => update({ bio: e.target.value })}
            error={errors.bio}
            hint={`${state.bio.length}/200`}
          />

          {/* Country */}
          <Select
            label={t('onboarding.profile.country')}
            value="Iran"
            onChange={() => update({ country: 'Iran' })}
            error={errors.country}
          >
            <option value="Iran" className="bg-ink-800">{t('onboarding.profile.iran')}</option>
          </Select>

          {/* Social links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ink-100">{t('onboarding.profile.socialLinks')} <span className="text-ink-300 font-normal">{t('onboarding.profile.optional')}</span></label>
              <button type="button" onClick={addSocial} disabled={socials.length >= SOCIAL_PLATFORMS.length} className="text-xs text-brand-pink hover:text-brand-orange transition-colors inline-flex items-center gap-1 disabled:pointer-events-none disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" /> {t('onboarding.profile.addLink')}
              </button>
            </div>
            <div className="space-y-3">
              {socials.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <select
                    value={s.label}
                    onChange={(e) => setSocial(i, 'label', e.target.value)}
                    className="h-12 rounded-xl bg-ink-800/60 border border-white/[0.08] text-white px-3 text-sm focus:outline-none focus:border-brand-pink/40 cursor-pointer min-w-[140px]"
                  >
                    <option value="" className="bg-ink-800">{t('onboarding.profile.platform')}</option>
                    {SOCIAL_PLATFORMS.filter((platform) => platform === s.label || !socials.some((item, index) => index !== i && item.label === platform)).map((p) => (
                      <option key={p} value={p} className="bg-ink-800">{p}</option>
                    ))}
                  </select>
                  <div className="flex-1">
                    <Input
                      placeholder={t('onboarding.profile.socialUrl')}
                      leftIcon={<Link2 className="w-4 h-4" />}
                      value={s.url}
                      onChange={(e) => setSocial(i, 'url', e.target.value)}
                      error={errors[`social-${i}`]}
                    />
                  </div>
                  {socials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSocial(i)}
                      className="h-12 w-11 rounded-xl bg-ink-800/60 border border-white/[0.08] text-ink-200 hover:text-white flex items-center justify-center transition shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
          <Button type="submit" size="lg" fullWidth loading={saving} className="mt-2" rightIcon={<span>→</span>}>
            {t('onboarding.profile.continue')}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
