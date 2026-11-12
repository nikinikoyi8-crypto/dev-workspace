import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Users, ShieldCheck, Eye } from 'lucide-react';
import FloatingBlobs from '@/components/ui/FloatingBlobs';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/context/useLanguage';

export default function Welcome() {
  const navigate = useNavigate();
  const features = [
    { icon: Eye, titleKey: 'common.discover', descKey: 'common.discoverDesc' },
    { icon: Users, titleKey: 'common.connect', descKey: 'common.connectDesc' },
    { icon: ShieldCheck, titleKey: 'common.verified', descKey: 'common.verifiedDesc' },
  ];

  const { t, lang } = useLanguage();

  return (
    <div className="min-h-screen relative bg-ink-950">
      {/* Floating background blobs */}
      <FloatingBlobs iconSet="all" />

      {/* Header follows normal page flow */}
      <header className="w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-24 flex items-center justify-between relative">
          <div className="flex items-center" style={{ paddingLeft: 6 }}>
            <Link to="/">
              <img
                src="/assets/images/logo-icon.png"
                alt="Artistry"
                className="h-12 w-auto object-contain"
                style={{ marginLeft: -8 }}
              />
            </Link>
          </div>

          <div className="absolute left-1/2" style={{ top: '60%', transform: 'translateX(-50%) translateY(-50%)' }}>
            <img
              src="/assets/images/logo-text.png"
              alt="Artistry"
              className="object-contain"
              style={{ height: 64 }}
            />
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-20">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-32 w-full">
          <div className="flex flex-col justify-center hero-container animate-hero-enter">
            <div className="relative w-full">
              <h1
                dir={lang === 'fa' ? 'rtl' : 'ltr'}
                className={`font-display display-tight text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text text-gradient-brand leading-[1.03] hero-title-glow relative z-10 whitespace-normal break-words ${lang === 'fa' ? 'text-right' : 'text-left'}`}
              >
                {t('welcome.title')}
              </h1>

              {/* Floating decorative icons around the title */}
              <div className="pointer-events-none absolute -left-6 -top-6 opacity-80 animate-float">
                <Eye className="w-6 h-6 text-brand-pink/90" />
              </div>
              <div className="pointer-events-none absolute -right-8 top-4 opacity-80 animate-float-reverse">
                <Users className="w-6 h-6 text-brand-orange/80" />
              </div>
              <div className="pointer-events-none absolute right-10 -bottom-6 opacity-80 animate-float">
                <ShieldCheck className="w-6 h-6 text-brand-purple/80" />
              </div>
            </div>

            <h2 className="mt-3 text-lg sm:text-xl text-ink-200/80 max-w-[900px]">{t('welcome.subtitle')}</h2>

            <div className="mt-4 text-ink-200/90 max-w-[900px] space-y-4 leading-7">
              {t('welcome.description')
                .split('\n\n')
                .map((p, i) => (
                  <p
                    key={i}
                    dir={lang === 'fa' ? 'rtl' : 'ltr'}
                    className="desc-paragraph opacity-0-init"
                    style={{ animationDelay: `${120 + i * 120}ms`, animationDuration: '520ms' }}
                  >
                    {p}
                  </p>
                ))}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button
                size="lg"
                onClick={(e) => {
                  // create ripple element positioned at click
                    const btn = (e.currentTarget as HTMLButtonElement);
                    // ensure button is positioned relative for absolute ripple to align
                    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
                    const rect = btn.getBoundingClientRect();
                    const ripple = document.createElement('span');
                    ripple.className = 'btn-ripple';
                    const x = Math.round(e.clientX - rect.left);
                    const y = Math.round(e.clientY - rect.top);
                    ripple.style.left = `${x}px`;
                    ripple.style.top = `${y}px`;
                    // small initial size to keep it crisp before scaling
                    ripple.style.width = '12px';
                    ripple.style.height = '12px';
                    btn.appendChild(ripple);
                    // force layout then animate
                    // ensure the ripple is visible by placing it after layout
                    requestAnimationFrame(() => ripple.classList.add('animate'));
                    // cleanup after animation completes
                    const cleanup = () => {
                      ripple.remove();
                      btn.style.position = '';
                    };
                    setTimeout(cleanup, 800);
                    // navigate after slight delay to allow ripple to begin
                    setTimeout(() => navigate('/login'), 90);
                }}
                className="min-w-[180px] shadow-glow-brand rounded-full text-base py-3 px-8 btn-shine btn-primary-interact btn-scale-up btn-micro-primary"
              >
                {t('common.signIn')}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/register')}
                className="min-w-[180px] border-gradient glass rounded-full text-base py-3 px-8 btn-shine btn-secondary-anim btn-micro-secondary"
              >
                {t('common.createAccount')}
              </Button>
            </div>

            {/* Feature row */}
            <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.titleKey} className="glass-card feature-card">
                  <div className="p-3 rounded-lg bg-white/4 text-brand-pink w-14 h-14 flex items-center justify-center">
                    <f.icon className="w-6 h-6 text-brand-pink" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-white">{t(f.titleKey)}</p>
                    <p className="text-sm text-ink-200 leading-relaxed max-w-[260px]">{t(f.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="text-xs text-ink-300 pt-10">
              © 2026 Artistry. Crafted for artists, by artists.
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
