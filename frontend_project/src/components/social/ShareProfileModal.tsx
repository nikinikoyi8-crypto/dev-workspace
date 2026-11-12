import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Facebook, Link2, Mail, MessageCircle, Send, Share2, Smartphone, Twitter, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';

type ShareProfileModalProps = {
  username: string;
  lang: 'fa' | 'en';
  onClose: () => void;
};

const FRIENDS = [
  { id: 1, name: 'Aria Solé', handle: '@ariasole' },
  { id: 2, name: 'Theo Marchetti', handle: '@theom' },
  { id: 3, name: 'Yuki Tanaka', handle: '@yukitanaka' },
  { id: 4, name: 'Lina Park', handle: '@linapaints' },
  { id: 5, name: 'Kenji Arai', handle: '@kenji.arai' },
];

function copyWithFallback(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ShareProfileModal({ username, lang, onClose }: ShareProfileModalProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [sentTo, setSentTo] = useState<number[]>([]);
  useCloseOnBackButton(true, onClose);
  const profileUrl = `${window.location.origin}/artist/${username}`;
  const shareText = lang === 'fa' ? 'پروفایل من در Artistry رو ببین' : 'Check out my profile on Artistry';
  const subjectText = lang === 'fa' ? 'پروفایل من در Artistry' : 'My profile on Artistry';
  const isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  let canShare = typeof navigator.share === 'function';

  if (canShare && navigator.canShare) {
    try {
      canShare = navigator.canShare({ url: profileUrl });
    } catch {
      canShare = false;
    }
  }

  useEffect(() => {
    if (!linkCopied) return;

    const timeoutId = window.setTimeout(() => setLinkCopied(false), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [linkCopied]);

  const copyText = async (text: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return copyWithFallback(text);
      }
    }

    return copyWithFallback(text);
  };

  const handleCopyLink = async () => {
    setLinkCopied(await copyText(profileUrl));
  };

  const handleShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({ title: subjectText, text: shareText, url: profileUrl });
    } catch {
      return;
    }
  };

  const externalOptions: Array<{ label: string; href?: string; icon: LucideIcon; onClick?: () => void }> = [
    { label: lang === 'fa' ? 'واتساپ' : 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${profileUrl}`)}`, icon: MessageCircle },
    { label: lang === 'fa' ? 'تلگرام' : 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`, icon: Send },
    { label: lang === 'fa' ? 'توییتر / X' : 'Twitter / X', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`, icon: Twitter },
    { label: lang === 'fa' ? 'فیسبوک' : 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, icon: Facebook },
    { label: lang === 'fa' ? 'پیامک' : 'SMS', href: `sms:${isIos ? '&' : '?'}body=${encodeURIComponent(`${shareText} ${profileUrl}`)}`, icon: Smartphone },
    { label: lang === 'fa' ? 'ایمیل' : 'Email', href: `mailto:?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(`${shareText}\n\n${profileUrl}`)}`, icon: Mail },
  ];
  const filteredFriends = FRIENDS.filter((friend) => friend.name.toLowerCase().includes(search.toLowerCase()) || friend.handle.toLowerCase().includes(search.toLowerCase()));

  const toggleSend = (id: number) => {
    if (sentTo.includes(id)) return;
    setSentTo((previous) => [...previous, id]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={lang === 'fa' ? 'اشتراک‌گذاری پروفایل' : 'Share profile'} onClick={(event) => event.stopPropagation()} className="flex max-h-[85vh] max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-premium">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">{lang === 'fa' ? 'اشتراک‌گذاری پروفایل' : 'Share Profile'}</h3>
          <button type="button" aria-label={lang === 'fa' ? 'بستن' : 'Close share'} onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="shrink-0 px-4 pt-3">
          <button type="button" onClick={handleCopyLink} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-white hover:bg-white/[0.04]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700"><Link2 className="h-4 w-4" /></span>
            {linkCopied ? (lang === 'fa' ? 'لینک کپی شد!' : 'Link copied!') : (lang === 'fa' ? 'کپی لینک' : 'Copy Link')}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-4">
          {canShare && (
            <button type="button" onClick={handleShare} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-white hover:bg-white/[0.04]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700"><Share2 className="h-4 w-4" /></span>
              {lang === 'fa' ? 'اشتراک‌گذاری' : 'Share'}
            </button>
          )}
          <div className="border-t border-white/10 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {externalOptions.map(({ label, href, icon: Icon, onClick }) => onClick ? (
                <button key={label} type="button" onClick={onClick} className="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center text-xs text-ink-100 hover:bg-white/[0.04]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-700"><Icon className="h-4 w-4" /></span>
                  <span className="w-full truncate">{label}</span>
                </button>
              ) : (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center text-xs text-ink-100 hover:bg-white/[0.04]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-700"><Icon className="h-4 w-4" /></span>
                  <span className="w-full truncate">{label}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <h4 className="px-2 text-sm font-semibold text-white">{lang === 'fa' ? 'ارسال به داخل ارتیستری' : 'Send in Artistry'}</h4>
            <div className="max-h-48 overflow-y-auto px-2 py-3">
              <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lang === 'fa' ? 'جستجو...' : 'Search...'} className="w-full rounded-full border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-white placeholder:text-ink-500 focus:border-brand-pink/40 focus:outline-none" />
              <div className="mt-2 space-y-1">
              {filteredFriends.map((friend) => {
                const sent = sentTo.includes(friend.id);
                return <div key={friend.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                  <div className="flex min-w-0 items-center gap-2.5"><div className="h-9 w-9 shrink-0 rounded-full bg-brand-gradient-soft" /><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{friend.name}</p><p className="text-xs text-ink-400">{friend.handle}</p></div></div>
                  <button type="button" onClick={() => toggleSend(friend.id)} disabled={sent} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${sent ? 'bg-ink-700 text-ink-300' : 'bg-brand-gradient text-white'}`}>{sent ? (lang === 'fa' ? 'ارسال شد' : 'Sent') : (lang === 'fa' ? 'ارسال' : 'Send')}</button>
                </div>;
              })}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
