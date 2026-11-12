import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from '@/components/AuthLayout';
import { useOnboarding } from '@/context/OnboardingContext';
import { ShieldCheck, Eye, Heart, MessageCircle, Bookmark, UserPlus, Sparkles, Check } from 'lucide-react';
import { useLanguage } from '@/context/useLanguage';
import { AUTO_APPROVE_VERIFICATION } from '@/lib/verification';

export default function Verification() {
  const navigate = useNavigate();
  const { update, completeOnboarding } = useOnboarding();
  const [requested, setRequested] = useState(false);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  const visitorPerks = [
    { icon: Eye, labelKey: 'verification.browse' },
    { icon: Heart, labelKey: 'verification.like' },
    { icon: MessageCircle, labelKey: 'verification.comment' },
    { icon: UserPlus, labelKey: 'verification.follow' },
    { icon: Bookmark, labelKey: 'verification.save' },
  ];

  const handleRequest = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      update({ verificationRequested: true });
      completeOnboarding();
      if (AUTO_APPROVE_VERIFICATION) setApproved(true);
      else setRequested(true);
    }, 1200);
  };

  const { t } = useLanguage();

  return (
    <AuthLayout step={4} totalSteps={4} showBack onBack={() => navigate('/profile-setup')}>
      <div className="w-full max-w-md mx-auto">
        <div className="mb-8 animate-fade-up text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-6 relative">
            <ShieldCheck className="w-8 h-8 text-brand-pink" />
            <div className="absolute inset-0 rounded-2xl bg-brand-pink/10 blur-xl -z-10 animate-pulse-glow" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
            {t('verification.title')}
          </h1>
          <p className="mt-3 text-ink-200 leading-relaxed">{t('verification.description')}</p>
        </div>

        {/* Visitor capabilities card */}
        <div className="glass rounded-2xl p-5 mb-6 animate-fade-up animate-delay-100">
          <p className="text-xs uppercase tracking-wider text-ink-300 mb-4 font-medium">
            {t('verification.visitorHeader')}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {visitorPerks.map((p) => (
              <div key={p.labelKey} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink-700/60 flex items-center justify-center">
                  <p.icon className="w-4 h-4 text-brand-pink" />
                </span>
                <span className="text-sm text-ink-100">{t(p.labelKey)}</span>
                <Check className="w-4 h-4 text-brand-pink ml-auto" strokeWidth={2.5} />
              </div>
            ))}
          </div>
        </div>

        {/* Artist gate card */}
        <div className="glass-strong rounded-2xl p-5 mb-8 animate-fade-up animate-delay-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand-pink mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">{t('verification.publishHeader')}</p>
              <p className="text-sm text-ink-200 mt-1 leading-relaxed">{t('verification.publishBody')}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="animate-fade-up animate-delay-300">
              {approved ? (
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-pink/15 mb-4"><Check className="w-6 h-6 text-brand-pink" strokeWidth={2.5} /></div>
                  <h3 className="text-lg font-semibold text-white">{t('verification.verifiedTitle')}</h3>
                  <p className="text-sm text-ink-200 mt-2 leading-relaxed">{t('verification.verifiedBody')}</p>
                  <Button variant="secondary" fullWidth className="mt-5" onClick={() => navigate('/app')}>{t('verification.enter') || 'Enter Artistry'}</Button>
                </div>
              ) : requested ? (
            <div className="glass rounded-2xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-pink/15 mb-4">
                <Check className="w-6 h-6 text-brand-pink" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-white">{t('verification.requestSubmittedTitle')}</h3>
              <p className="text-sm text-ink-200 mt-2 leading-relaxed">{t('verification.requestSubmittedBody')}</p>
              <Button
                variant="secondary"
                fullWidth
                className="mt-5"
                onClick={() => navigate('/app')}
              >
                {t('verification.enter') || 'Enter Artistry'}
              </Button>
            </div>
          ) : (
            <>
              <Button size="lg" fullWidth loading={loading} onClick={handleRequest}>
                {loading && AUTO_APPROVE_VERIFICATION ? t('verification.verifying') : t('verification.requestButton')}
              </Button>
              <button
                onClick={() => {
                  completeOnboarding();
                  navigate('/app');
                }}
                className="mt-4 w-full text-sm text-ink-200 hover:text-white transition-colors"
              >
                {t('verification.continueAsVisitor')}
              </button>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
