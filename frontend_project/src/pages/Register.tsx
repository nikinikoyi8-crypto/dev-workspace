import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/AuthLayout';
import { useOnboarding } from '@/context/OnboardingContext';
import { Mail, Lock, User, AtSign, ShieldCheck, Check, Loader2, UserPlus } from 'lucide-react';
import { useLanguage } from '@/context/useLanguage';
import { ApiError } from '@/lib/api';

export default function Register() {
  const navigate = useNavigate();
  const { state, createNewUser, getAuthenticatedDestination } = useOnboarding();
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [isCheckingHuman, setIsCheckingHuman] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', passwordConfirmation: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: key === 'username' ? e.target.value.toLowerCase() : e.target.value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = t('auth.fullNameRequired') || 'Full name is required';
    if (!form.username) next.username = lang === 'fa' ? 'نام کاربری الزامی است.' : 'Username is required.';
    else if (form.username.length < 3 || form.username.length > 30) {
      next.username = lang === 'fa' ? 'نام کاربری باید ۳ تا ۳۰ کاراکتر باشد.' : 'Username must be 3–30 characters long.';
    } else if (!/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(form.username)) {
      next.username = lang === 'fa'
        ? 'فقط حروف انگلیسی کوچک، عدد، نقطه و زیرخط مجاز است؛ نام کاربری باید با حرف یا عدد شروع و تمام شود.'
        : 'Use lowercase English letters, numbers, periods, and underscores only; start and end with a letter or number.';
    }
    if (!form.email.trim()) next.email = t('auth.emailRequired') || 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t('auth.emailInvalid') || 'Invalid email';
    if (!form.password) next.password = lang === 'fa' ? 'رمز عبور الزامی است.' : 'Password is required.';
    else if (form.password.length < 10 || form.password.length > 64) {
      next.password = lang === 'fa' ? 'رمز عبور باید ۱۰ تا ۶۴ کاراکتر باشد.' : 'Password must be 10–64 characters long.';
    } else if (!/\p{L}/u.test(form.password) || !/\p{N}/u.test(form.password)) {
      next.password = lang === 'fa'
        ? 'رمز عبور باید دست‌کم یک حرف و یک عدد داشته باشد.'
        : 'Password must contain at least one letter and one number.';
    }
    if (!form.passwordConfirmation) next.passwordConfirmation = 'Please confirm your password';
    else if (form.passwordConfirmation !== form.password) next.passwordConfirmation = 'Passwords do not match';
    if (!isHuman) next.human = t('auth.notRobotError') || 'Please confirm that you are not a robot';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await createNewUser({
        full_name: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        role: state.role,
      });
      navigate(getAuthenticatedDestination(), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const fieldMap: Record<string, string> = {
          full_name: 'fullName',
          username: 'username',
          email: 'email',
          password: 'password',
          password_confirmation: 'passwordConfirmation',
        };
        const next: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.errors)) {
          const formField = fieldMap[field];
          if (formField && messages.length) next[formField] = messages[0];
          else if (messages.length) next.form = messages[0];
        }
        if (error.errors.role?.length) next.form = error.errors.role[0];
        setErrors(next);
      } else {
        setErrors({ form: error instanceof Error ? error.message : 'Unable to create your account.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHumanToggle = () => {
    if (isHuman) {
      setIsHuman(false);
      setErrors((prev) => ({ ...prev, human: t('auth.notRobotError') || 'Please confirm that you are not a robot' }));
      return;
    }

    setIsCheckingHuman(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.human;
      return next;
    });

    window.setTimeout(() => {
      setIsHuman(true);
      setIsCheckingHuman(false);
    }, 700);
  };

  return (
    <AuthLayout showBack onBack={() => navigate('/welcome')}>
      <div className="mx-auto flex w-full max-w-md items-center justify-center py-2">
        <div className="glass relative w-full max-h-[90vh] overflow-y-auto rounded-[30px] border border-white/[0.12] bg-ink-850/70 p-3 shadow-[0_24px_80px_rgba(15,5,20,0.72)] backdrop-blur-2xl ring-1 ring-white/5 sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,138,61,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(123,69,232,0.14),_transparent_35%)]" />

          <div className="relative">
            <div className="mb-4 animate-fade-up">
              <span className="mb-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-200/90">
                <UserPlus className="h-3.5 w-3.5 text-brand-pink" />
                {t('auth.joinArtistry') || 'Join Artistry'}
              </span>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                {t('auth.createAccountTitle') || 'Create your account'}
              </h1>
              <p className="mt-2 text-sm text-ink-200 sm:text-base">
                {t('auth.createAccountSubtitle') || 'Join the home for artists on Artistry.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 animate-fade-up animate-delay-100">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={t('auth.fullName') || 'Full Name'}
                  placeholder={t('auth.fullNamePlaceholder') || 'Jane Doe'}
                  leftIcon={<User className="h-4 w-4" />}
                  value={form.fullName}
                  onChange={set('fullName')}
                  error={errors.fullName}
                  autoComplete="name"
                />
                <Input
                  label={t('auth.username') || 'Username'}
                  placeholder={t('auth.usernamePlaceholder') || 'sahar.art'}
                  leftIcon={<AtSign className="h-4 w-4" />}
                  value={form.username}
                  onChange={set('username')}
                  error={errors.username}
                  autoComplete="username"
                />
              </div>

              <Input
                label={t('auth.email') || 'Email'}
                type="email"
                placeholder={t('auth.emailPlaceholder') || 'you@example.com'}
                leftIcon={<Mail className="h-4 w-4" />}
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                autoComplete="email"
              />
              <Input
                label={t('auth.password') || 'Password'}
                type="password"
                placeholder={t('auth.passwordPlaceholder') || 'At least 6 characters'}
                leftIcon={<Lock className="h-4 w-4" />}
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                autoComplete="new-password"
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                value={form.passwordConfirmation}
                onChange={set('passwordConfirmation')}
                error={errors.passwordConfirmation}
                autoComplete="new-password"
              />

              <div className="rounded-2xl border border-white/10 bg-ink-800/40 p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleHumanToggle}
                  className="flex w-full items-center justify-between gap-3 text-left transition-all duration-200 hover:scale-[1.01]"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-300 ${
                        isHuman
                          ? 'border-green-400/60 bg-green-500/15 text-green-300'
                          : 'border-white/10 bg-ink-700/90 text-brand-pink'
                      }`}
                    >
                      {isCheckingHuman ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isHuman ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </span>
                    <span className="text-sm text-ink-100">{t('auth.notRobot') || "I'm not a robot"}</span>
                  </span>

                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300 ${
                      isHuman
                        ? 'border-green-400/70 bg-green-500/20 text-green-300'
                        : 'border-white/10 bg-ink-700/90 text-white/40'
                    }`}
                  >
                    {isHuman ? '✓' : ''}
                  </span>
                </button>

                {errors.human && <p className="mt-2 text-xs text-red-400">{errors.human}</p>}
              </div>

              {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!isHuman || loading}
                className="mt-1 btn-micro-primary"
              >
                {t('auth.continue') || 'Continue'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-200 animate-fade-up animate-delay-300">
              {t('auth.alreadyHaveAccount') || 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="ml-1 font-medium text-brand-pink underline-offset-4 transition-all duration-200 hover:text-brand-orange hover:underline"
              >
                {t('common.signIn') || 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
