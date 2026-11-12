import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/AuthLayout';
import { useOnboarding } from '@/context/OnboardingContext';
import { ART_CATEGORIES } from '@/data/categories';
import { Search, Check, Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/context/useLanguage';

export default function CategorySelect() {
  const navigate = useNavigate();
  const { state, toggleCategory, update } = useOnboarding();
  const [query, setQuery] = useState('');
  const [otherText, setOtherText] = useState('');
  const [showOther, setShowOther] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ART_CATEGORIES;
    return ART_CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  const selectedCount = state.disciplines.length;

  const handleAddOther = () => {
    const text = otherText.trim();
    if (!text) return;
    const id = `custom-${text.toLowerCase().replace(/\s+/g, '-')}`;
    if (!state.disciplines.includes(id)) update({ disciplines: [...state.disciplines, id] });
    setOtherText('');
    setShowOther(false);
  };

  const { t } = useLanguage();

  return (
    <AuthLayout step={1} totalSteps={3} showBack onBack={() => navigate('/register')}>
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">{t('category.title')}</h1>
          <p className="mt-3 text-ink-200 max-w-lg">{t('category.subtitle')}</p>
        </div>
        <div className="mb-6 animate-fade-up animate-delay-100"><Input placeholder={t('category.searchPlaceholder')} leftIcon={<Search className="w-4 h-4" />} value={query} onChange={(e) => setQuery(e.target.value)} containerClassName="max-w-md" /></div>
        <div className="flex items-center justify-between mb-4 animate-fade-up animate-delay-200">
          <p className="text-sm text-ink-200">{selectedCount === 0 ? t('category.noCategories') : `${selectedCount} ${t('category.selected') || 'selected'}`}</p>
          {selectedCount > 0 && <button onClick={() => update({ disciplines: [] })} className="text-xs text-ink-300 hover:text-white transition-colors">{t('category.clearAll')}</button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-up animate-delay-200 max-h-[420px] overflow-y-auto pr-2 pb-2">
          {filtered.map((cat) => {
            const selected = state.disciplines.includes(cat.id);
            return <button key={cat.id} onClick={() => toggleCategory(cat.id)} className={cn('group relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left', selected ? 'border-brand-pink/40 bg-brand-gradient-soft shadow-glow' : 'border-white/[0.06] bg-ink-800/40 hover:border-white/[0.12] hover:bg-ink-800/60')}>
              <span className={cn('flex items-center justify-center w-9 h-9 rounded-lg transition-colors', selected ? 'bg-brand-pink/15 text-brand-pink' : 'bg-ink-700/60 text-ink-200 group-hover:text-ink-100')}><cat.icon className="w-4.5 h-4.5" /></span>
              <span className={cn('text-sm font-medium flex-1', selected ? 'text-white' : 'text-ink-100')}>{cat.label}</span>
              {selected && <span className="w-5 h-5 rounded-full bg-brand-gradient flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-ink-950" strokeWidth={3} /></span>}
            </button>;
          })}
          {!showOther ? <button onClick={() => setShowOther(true)} className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/[0.12] bg-ink-800/30 hover:border-brand-pink/30 hover:bg-brand-gradient-soft transition-all duration-200 text-left"><span className="flex items-center justify-center w-9 h-9 rounded-lg bg-ink-700/60 text-ink-200"><Plus className="w-4.5 h-4.5" /></span><span className="text-sm font-medium text-ink-100">{t('category.other')}</span></button> : <div className="flex items-center gap-2 p-3 rounded-xl border border-brand-pink/30 bg-brand-gradient-soft"><Input autoFocus placeholder={t('category.otherPlaceholder')} value={otherText} onChange={(e) => setOtherText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOther())} className="h-9 text-sm" containerClassName="flex-1" /><button onClick={handleAddOther} className="w-9 h-9 rounded-lg bg-brand-gradient text-white flex items-center justify-center shrink-0 hover:brightness-110 transition"><Plus className="w-4 h-4" strokeWidth={2.5} /></button><button onClick={() => setShowOther(false)} className="w-9 h-9 rounded-lg bg-ink-700 text-ink-200 flex items-center justify-center shrink-0 hover:text-white transition"><X className="w-4 h-4" /></button></div>}
        </div>
        {filtered.length === 0 && !showOther && <p className="text-center text-ink-300 py-8 text-sm">{t('category.noMatches')}</p>}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-up animate-delay-300"><button onClick={() => navigate('/profile-setup')} className="text-sm text-ink-200 hover:text-white transition-colors">{t('category.skipForNow')}</button><Button size="lg" disabled={selectedCount === 0} onClick={() => navigate('/profile-setup')} rightIcon={<span>→</span>}>{t('category.continue')}{selectedCount > 0 ? ` · ${selectedCount}` : ''}</Button></div>
      </div>
    </AuthLayout>
  );
}
