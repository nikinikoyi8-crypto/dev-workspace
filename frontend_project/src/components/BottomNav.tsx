import { useEffect, useState } from 'react';
import { Compass, Heart, Home, MessageCircle, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

const ITEMS = [
  { icon: Home, label: 'Home', path: '/app' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Heart, label: 'Heart', path: '/notifications' },
  { icon: MessageCircle, label: 'Direct', path: '/direct' },
] as const;
const UNREAD_KEY = 'artsocial-notifications-unread';

function readUnreadState() {
  try {
    return localStorage.getItem(UNREAD_KEY) !== 'false';
  } catch {
    return true;
  }
}

export default function BottomNav({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(readUnreadState);

  useEffect(() => {
    const refresh = () => setHasUnread(readUnreadState());
    window.addEventListener('storage', refresh);
    window.addEventListener('artsocial-notification-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('artsocial-notification-change', refresh);
    };
  }, []);

  return (
    <nav aria-label="Primary navigation" className={cn('pointer-events-auto z-[10001] flex items-center gap-1 rounded-full border border-white/10 bg-ink-900 px-2 py-2 shadow-2xl backdrop-blur-xl', className)}>
      {ITEMS.map(({ icon: Icon, label, path }) => {
        const active = location.pathname === path || (label === 'Search' && location.pathname === '/search') || (label === 'Explore' && location.pathname === '/explore');
        return <button key={label} type="button" aria-label={label} aria-current={active ? 'page' : undefined} onClick={() => navigate(path)} className={cn('relative flex h-12 w-12 items-center justify-center rounded-xl text-ink-200 transition-all duration-200 hover:text-white', active && 'text-white')}><span className="relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200"><span className={cn('absolute inset-0 rounded-full', active && 'scale-110 border border-white/10 bg-brand-gradient-soft')} /><Icon className={cn('relative z-10 h-5 w-5', active && 'stroke-[2.5]')} />{label === 'Heart' && hasUnread && <span aria-label="Unread notifications" className="absolute -end-0.5 -top-0.5 z-20 h-2.5 w-2.5 rounded-full bg-brand-pink ring-2 ring-ink-900" />}</span></button>;
      })}
    </nav>
  );
}
