import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/AuthLayout';
import { useOnboarding } from '@/context/OnboardingContext';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useLanguage } from '@/context/useLanguage';

export default function Login() {
  const navigate = useNavigate();
  const { authenticateExistingUser, getAuthenticatedDestination } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { lang, t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError(lang === 'fa' ? 'ایمیل و رمز عبور را وارد کنید.' : 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await authenticateExistingUser(identifier.trim(), password);
      setLoading(false);
      navigate(getAuthenticatedDestination(), { replace: true });
    } catch {
      setError(lang === 'fa' ? 'ایمیل یا رمز عبور اشتباه است.' : 'The email or password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      showBack
      onBack={() => navigate('/welcome')}
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-center py-2" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
        <div className="glass relative w-full max-h-[90vh] overflow-y-auto rounded-[30px] border border-white/[0.12] bg-ink-850/70 p-4 shadow-[0_24px_80px_rgba(15,5,20,0.72)] backdrop-blur-2xl ring-1 ring-white/5 sm:p-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,138,61,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(123,69,232,0.14),_transparent_35%)]" />

          <div className="relative">
            <div className="mb-5 animate-fade-up">
              <span className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-200/90">
                <LogIn className="h-3.5 w-3.5 text-brand-pink" />
                {t('auth.welcomeBack')}
              </span>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                {t('common.signIn')}
              </h1>
              <p className="mt-2 text-sm text-ink-200 sm:text-base">{t('welcome.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up animate-delay-100">
              <Input
                label={t('auth.email') || 'Email'}
                placeholder={t('auth.emailPlaceholder') || 'you@example.com'}
                type="email"
                leftIcon={<Mail className="h-4 w-4" />}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="email"
              />
              <Input
                label={t('auth.password') || 'Password'}
                type="password"
                placeholder={t('auth.passwordPlaceholder') || '••••••••'}
                leftIcon={<Lock className="h-4 w-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex items-center justify-between gap-3 text-sm" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
                <label className="flex cursor-pointer select-none items-center gap-2 text-ink-200">
                  <input type="checkbox" className="h-4 w-4 rounded accent-brand-pink" />
                  {t('auth.rememberMe')}
                </label>
                <Link to="/forgot" className="text-brand-pink transition-colors duration-200 hover:text-brand-orange">
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button type="submit" size="lg" fullWidth loading={loading} className="btn-micro-primary">
                {t('common.signIn')}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-200 animate-fade-up animate-delay-400" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
              {t('auth.newToArtistry')}{' '}
              <Link to="/register" className="ml-1 font-medium text-brand-pink transition-colors duration-200 hover:text-brand-orange">
                {t('common.createAccount')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
