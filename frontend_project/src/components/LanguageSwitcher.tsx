import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/useLanguage';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const options = [
    { code: 'fa', label: 'فارسی', short: 'FA' },
    { code: 'en', label: 'English', short: 'EN' },
  ] as const;

  const handleSelect = (value: 'en' | 'fa') => {
    setLang(value);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-flex items-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>
      <button
        type="button"
        aria-label="Select language"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="lang-switcher-button group"
      >
        <span className="lang-switcher-button__glow" />
        <img
          src="/assets/images/language_icon.png"
          alt="Language"
          className="h-6 w-6 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
        />
      </button>

      <div
        className={[
          'lang-switcher-menu',
          open ? 'lang-switcher-menu--open' : 'lang-switcher-menu--closed',
        ].join(' ')}
        style={{
          left: lang === 'fa' ? 0 : 'auto',
          right: lang === 'fa' ? 'auto' : 0,
          width: '10rem',
          maxWidth: 'calc(100vw - 2rem)',
        }}
        role="menu"
        aria-label="Language menu"
      >
        {options.map((option) => {
          const isActive = lang === option.code;

          return (
            <button
              key={option.code}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onClick={() => handleSelect(option.code)}
              className={[
                'lang-switcher-item',
                isActive ? 'lang-switcher-item--active' : '',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span className="lang-switcher-checkmark" aria-hidden="true">
                  {isActive ? '✓' : '•'}
                </span>
                <span>{option.label}</span>
              </span>

              <span className="lang-switcher-code">{option.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
