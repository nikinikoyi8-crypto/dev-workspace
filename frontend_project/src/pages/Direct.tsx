import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Ban, Bell, BellOff, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Eraser, FileText, Flag, MoreHorizontal, Paperclip, Search, Send, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { ARTWORKS } from '@/pages/MainApp';
import StoryAvatar from '@/components/stories/StoryAvatar';
import BottomNav from '@/components/BottomNav';
import ChatTimeline, { formatTehranDateLabel, formatTehranTime, type TimelineItem, type TimelineMessage } from '@/components/ChatTimeline';
import ImageGallery from '@/components/ImageGallery';
import { cn } from '@/utils/cn';
import { canonicalizeUserKey } from '@/services/storyService';

type DirectFilter = 'all' | 'unread' | 'online' | 'unanswered' | 'storyReplies';

type Conversation = {
  id: number;
  artist: string;
  handle: string;
  avatarUrl?: string;
  message: string;
  time: string;
  online: boolean;
  unread: number;
  unanswered?: boolean;
  storyReply?: boolean;
};

type SentFile = { name: string; mimeType: string; dataUrl?: string };
type SentMessage =
  | { kind: 'text'; text: string; timestamp?: number }
  | { kind: 'file'; name: string; mimeType: string; dataUrl?: string; caption?: string; timestamp?: number }
  | { kind: 'gallery'; files: SentFile[]; caption?: string; timestamp?: number };

function getMessagePreview(message: SentMessage | undefined) {
  if (!message) return '';
  if (message.kind === 'text') return message.text;
  if (message.kind === 'file') return `File: ${message.name}`;
  return `${message.files.length} images`;
}

const CONVERSATIONS: Conversation[] = [
  { id: 1, artist: ARTWORKS[1].artist, handle: ARTWORKS[1].handle, avatarUrl: ARTWORKS[1].avatarUrl, message: 'Your color study is beautiful.', time: '2m', online: true, unread: 2 },
  { id: 2, artist: ARTWORKS[0].artist, handle: ARTWORKS[0].handle, avatarUrl: ARTWORKS[0].avatarUrl, message: 'I just shared the new sketches.', time: '18m', online: true, unread: 0, unanswered: true },
  { id: 3, artist: ARTWORKS[3].artist, handle: ARTWORKS[3].handle, avatarUrl: ARTWORKS[3].avatarUrl, message: 'Can we talk about the exhibition?', time: '1h', online: false, unread: 1, storyReply: true },
  { id: 4, artist: ARTWORKS[5].artist, handle: ARTWORKS[5].handle, avatarUrl: ARTWORKS[5].avatarUrl, message: 'Sent an image', time: '3h', online: false, unread: 0 },
  { id: 5, artist: 'Nora Vale', handle: '@noravale', message: 'Would love to collaborate.', time: '1d', online: true, unread: 0, storyReply: true },
  { id: 6, artist: 'Sofia Ren', handle: '@sofiaren', avatarUrl: 'https://i.pravatar.cc/150?u=sofiaren', message: 'The textures in your latest piece are incredible.', time: '4m', online: true, unread: 3 },
  { id: 7, artist: 'Elias Moon', handle: '@eliasmoon', avatarUrl: 'https://i.pravatar.cc/150?u=eliasmoon', message: 'Are you available for a small collaboration?', time: '26m', online: false, unread: 1, unanswered: true },
  { id: 8, artist: 'Mina Okafor', handle: '@minaokafor', avatarUrl: 'https://i.pravatar.cc/150?u=minaokafor', message: 'I saved your color palette for reference.', time: '2h', online: true, unread: 2, storyReply: true },
  { id: 9, artist: 'Jon Bell', handle: '@jonbell', avatarUrl: 'https://i.pravatar.cc/150?u=jonbell', message: 'Could you send me the details for the print?', time: '5h', online: false, unread: 1 },
  { id: 10, artist: 'Aya Nakamura', handle: '@ayanakamura', avatarUrl: 'https://i.pravatar.cc/150?u=ayanakamura', message: 'Your work would fit our next group show.', time: '8h', online: true, unread: 4, storyReply: true },
  { id: 11, artist: 'Leo Hart', handle: '@leohart', avatarUrl: 'https://i.pravatar.cc/150?u=leohart', message: 'Just checking in about the sketches I sent.', time: '1d', online: false, unread: 1, unanswered: true },
  { id: 12, artist: 'Iris Cole', handle: '@iriscole', avatarUrl: 'https://i.pravatar.cc/150?u=iriscole', message: 'Your latest series has such a thoughtful rhythm.', time: '1d', online: true, unread: 2 },
  { id: 13, artist: 'Owen Reed', handle: '@owenreed', avatarUrl: 'https://i.pravatar.cc/150?u=owenreed', message: 'Would you like to join our studio critique?', time: '2d', online: false, unread: 0, unanswered: true },
  { id: 14, artist: 'Zara Kim', handle: '@zarakim', avatarUrl: 'https://i.pravatar.cc/150?u=zarakim', message: 'I loved the piece you shared yesterday.', time: '2d', online: true, unread: 1, storyReply: true },
  { id: 15, artist: 'Mateo Silva', handle: '@mateosilva', avatarUrl: 'https://i.pravatar.cc/150?u=mateosilva', message: 'Can we discuss a commission this week?', time: '3d', online: false, unread: 3 },
  { id: 16, artist: 'June Park', handle: '@junepark', avatarUrl: 'https://i.pravatar.cc/150?u=junepark', message: 'The exhibition photos turned out beautifully.', time: '4d', online: true, unread: 0 },
  { id: 17, artist: 'Samira Noor', handle: '@samiranoor', avatarUrl: 'https://i.pravatar.cc/150?u=samiranoor', message: 'I have a reference board to share with you.', time: '5d', online: false, unread: 2, storyReply: true },
  { id: 18, artist: 'Victor Lane', handle: '@victorlane', avatarUrl: 'https://i.pravatar.cc/150?u=victorlane', message: 'Are the new prints available for purchase?', time: '6d', online: true, unread: 1 },
  { id: 19, artist: 'Nia Brooks', handle: '@niabrooks', avatarUrl: 'https://i.pravatar.cc/150?u=niabrooks', message: 'Let us plan the collaborative piece soon.', time: '1w', online: false, unread: 0, unanswered: true },
];

const FILTERS: { id: DirectFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'online', label: 'Online' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'storyReplies', label: 'Story replies' },
];

const REPORT_REASONS = ['Spam or unwanted content', 'Harassment or bullying', 'Inappropriate content', 'Scam or fraud', 'Something else'];

const STORAGE_KEYS = {
  conversations: 'artsocial-direct-conversations',
  historyCleared: 'artsocial-direct-history-cleared',
  muted: 'artsocial-direct-muted',
  blocked: 'artsocial-direct-blocked',
  reported: 'artsocial-direct-reported',
  sentMessages: 'artsocial-direct-sent-messages',
  videoGroups: 'artsocial-direct-video-groups',
  lastAction: 'artsocial-direct-last-action',
  timeline: 'artsocial-direct-timeline',
} as const;

function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function persistStored<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures so chat remains usable in restricted browsers.
  }
}

function getMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return (extension && mimeTypes[extension]) || 'application/octet-stream';
}

function readSentMessages(): Record<number, SentMessage[]> {
  const stored = readStored<Record<number, (SentMessage | string)[]>>(STORAGE_KEYS.sentMessages, {});
  return Object.fromEntries(Object.entries(stored).map(([id, messages]) => [
    id,
    messages.map((message) => {
      if (typeof message !== 'string') return message;
      if (!message.startsWith('Attached file: ')) return { kind: 'text', text: message };
      const fileName = message.replace(/^Attached file: /, '').split(' - ')[0];
      return { kind: 'file', name: fileName, mimeType: getMimeType(fileName) };
    }),
  ]));
}

export default function Direct() {
  const [conversations, setConversations] = useState(() => {
    const stored = readStored<Conversation[] | null>(STORAGE_KEYS.conversations, null);
    if (!stored) return CONVERSATIONS;
    const storedIds = new Set(stored.map((conversation) => conversation.id));
    return [...stored, ...CONVERSATIONS.filter((conversation) => !storedIds.has(conversation.id))];
  });
  const [filter, setFilter] = useState<DirectFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPreviewUrls, setAttachedPreviewUrls] = useState<string[]>([]);
  const [attachmentTrayOpen, setAttachmentTrayOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyClearedIds, setHistoryClearedIds] = useState<number[]>(() => readStored(STORAGE_KEYS.historyCleared, []));
  const [mutedIds, setMutedIds] = useState<number[]>(() => readStored(STORAGE_KEYS.muted, []));
  const [blockedIds, setBlockedIds] = useState<number[]>(() => readStored(STORAGE_KEYS.blocked, []));
  const [reportedIds, setReportedIds] = useState<number[]>(() => readStored(STORAGE_KEYS.reported, []));
  const [sentMessages, setSentMessages] = useState<Record<number, SentMessage[]>>(readSentMessages);
  const [videoGroups, setVideoGroups] = useState<Record<number, SentFile[][]>>(() => readStored(STORAGE_KEYS.videoGroups, {}));
  const [lastAction, setLastAction] = useState<Record<number, 'text' | 'video'>>(() => readStored(STORAGE_KEYS.lastAction, {}));
  const [timeline, setTimeline] = useState<Record<number, TimelineItem[]>>(() => readStored(STORAGE_KEYS.timeline, {}));
  const [imageViewer, setImageViewer] = useState<{ images: string[]; index: number } | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const [dialog, setDialog] = useState<'block' | 'report' | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const chatOpen = selectedId !== null;
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];
  const historyCleared = selected ? historyClearedIds.includes(selected.id) : false;
  const muted = selected ? mutedIds.includes(selected.id) : false;
  const blocked = selected ? blockedIds.includes(selected.id) : false;
  const selectedAllMessages = selected ? sentMessages[selected.id] ?? [] : [];
  const hasTimeline = Boolean(selected && timeline[selected.id]?.length);
  const selectedSentMessages = hasTimeline ? [] : selectedAllMessages.filter((message) => message.kind !== 'gallery');
  const selectedGalleries = hasTimeline ? [] : selectedAllMessages.filter((message): message is Extract<SentMessage, { kind: 'gallery' }> => message.kind === 'gallery');
  const timelineMessages: TimelineMessage[] = selected ? [
    ...(!historyCleared ? [{ kind: 'text' as const, text: selected.message, timestamp: Date.now() - 3600000 }, { kind: 'text' as const, text: 'I love it. Let&apos;s make something together.', timestamp: Date.now() - 1800000 }] : []),
    ...selectedAllMessages,
  ] : [];
  const initialMessageTime = Date.now() - 3600000;
  const initialReplyTime = Date.now() - 1800000;
  const selectedTimeline = selected ? timeline[selected.id] ?? [] : [];
  const timelineWithConversationStart = !historyCleared && selectedTimeline.length > 0
    ? [
        ...(selectedTimeline.some((item) => item.kind === 'message' && item.index === 0) ? [] : [{ kind: 'message' as const, index: 0, side: 'outgoing' as const }]),
        ...(selectedTimeline.some((item) => item.kind === 'message' && item.index === 1) ? [] : [{ kind: 'message' as const, index: 1, side: 'incoming' as const }]),
        ...selectedTimeline,
      ]
    : selectedTimeline;

  useEffect(() => {
    const previewUrls = attachedFiles.map((file) => URL.createObjectURL(file));
    setAttachedPreviewUrls(previewUrls);
    return () => previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, [attachedFiles]);

  useEffect(() => persistStored(STORAGE_KEYS.conversations, conversations), [conversations]);
  useEffect(() => persistStored(STORAGE_KEYS.historyCleared, historyClearedIds), [historyClearedIds]);
  useEffect(() => persistStored(STORAGE_KEYS.muted, mutedIds), [mutedIds]);
  useEffect(() => persistStored(STORAGE_KEYS.blocked, blockedIds), [blockedIds]);
  useEffect(() => persistStored(STORAGE_KEYS.reported, reportedIds), [reportedIds]);
  useEffect(() => persistStored(STORAGE_KEYS.sentMessages, sentMessages), [sentMessages]);
  useEffect(() => persistStored(STORAGE_KEYS.videoGroups, videoGroups), [videoGroups]);
  useEffect(() => persistStored(STORAGE_KEYS.lastAction, lastAction), [lastAction]);
  useEffect(() => persistStored(STORAGE_KEYS.timeline, timeline), [timeline]);
  useEffect(() => {
    const scrollToLatestMessage = () => {
      const messageList = messageListRef.current;
      if (messageList) messageList.scrollTop = messageList.scrollHeight;
    };
    scrollToLatestMessage();
    const firstFrame = window.requestAnimationFrame(scrollToLatestMessage);
    const secondFrame = window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToLatestMessage));
    const delayedScrolls = [50, 250, 750].map((delay) => window.setTimeout(scrollToLatestMessage, delay));
    const mediaElements = messageListRef.current?.querySelectorAll('img, video');
    mediaElements?.forEach((media) => media.addEventListener('load', scrollToLatestMessage));
    const handleImageClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!messageListRef.current?.contains(target)) return;
      if (target.closest('button') || target.tagName !== 'IMG') return;
      const image = target as HTMLImageElement;
      if (image.src) setImageViewer({ images: [image.src], index: 0 });
    };
    document.addEventListener('click', handleImageClick, true);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      delayedScrolls.forEach((timer) => window.clearTimeout(timer));
      mediaElements?.forEach((media) => media.removeEventListener('load', scrollToLatestMessage));
      document.removeEventListener('click', handleImageClick, true);
    };
  }, [selected?.id, selectedAllMessages.length, timeline[selected?.id ?? -1]?.length, videoGroups[selected?.id ?? -1]?.length, historyCleared, blocked, actionNotice]);

  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const matchesQuery = `${conversation.artist} ${conversation.handle} ${conversation.message}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'unread' && conversation.unread > 0) || (filter === 'online' && conversation.online) || (filter === 'unanswered' && conversation.unanswered) || (filter === 'storyReplies' && conversation.storyReply);
    return matchesQuery && matchesFilter;
  }), [conversations, filter, query]);

  const openConversation = (id: number) => {
    setSelectedId(id);
    setMobileChatOpen(true);
    setMenuOpen(false);
    setActionNotice('');
    setConversations((items) => items.map((conversation) => conversation.id === id ? { ...conversation, unread: 0 } : conversation));
  };

  useEffect(() => {
    if (!menuOpen && !dialog) return;
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setDialog(null);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [dialog, menuOpen]);

  const clearHistory = () => {
    if (!selected) return;
    setHistoryClearedIds((ids) => ids.includes(selected.id) ? ids : [...ids, selected.id]);
    setVideoGroups((groups) => ({ ...groups, [selected.id]: [] }));
    setTimeline((items) => ({ ...items, [selected.id]: [] }));
    setSentMessages((messages) => {
      const nextMessages = { ...messages };
      delete nextMessages[selected.id];
      return nextMessages;
    });
    setActionNotice('Chat history cleared.');
    setMenuOpen(false);
  };

  const deleteConversation = () => {
    if (!selected) return;
    setConversations((items) => items.filter((conversation) => conversation.id !== selected.id));
    setSelectedId(null);
    setMobileChatOpen(false);
    setActionNotice('Conversation deleted.');
    setMenuOpen(false);
  };

  const openBlockDialog = () => {
    setMenuOpen(false);
    setDialog('block');
  };

  const openReportDialog = () => {
    setMenuOpen(false);
    setReportReason('');
    setReportDetails('');
    setDialog('report');
  };

  const toggleMute = () => {
    if (!selected) return;
    setMutedIds((ids) => ids.includes(selected.id) ? ids.filter((id) => id !== selected.id) : [...ids, selected.id]);
    setActionNotice(muted ? 'Notifications unmuted.' : 'Notifications muted.');
    setMenuOpen(false);
  };

  const blockUser = () => {
    if (!selected) return;
    setBlockedIds((ids) => ids.includes(selected.id) ? ids : [...ids, selected.id]);
    setActionNotice('User blocked.');
    setDialog(null);
    setMenuOpen(false);
  };

  const unblockUser = () => {
    if (!selected) return;
    setBlockedIds((ids) => ids.filter((id) => id !== selected.id));
    setActionNotice('User unblocked. You can chat again.');
  };

  const reportConversation = () => {
    if (!selected) return;
    setReportedIds((ids) => ids.includes(selected.id) ? ids : [...ids, selected.id]);
    setActionNotice('Report submitted.');
    setDialog(null);
  };

  const selectFiles = (files: File[]) => {
    const imageCount = files.filter((file) => file.type.startsWith('image/')).length;
    const videoCount = files.filter((file) => file.type.startsWith('video/')).length;
    const otherCount = files.length - imageCount - videoCount;
    if (imageCount > 4 || videoCount > 1 || otherCount > 1) {
      setActionNotice('You can attach up to 4 images, 1 video, and 1 other file.');
      return;
    }
    setAttachedFiles(files);
    setAttachmentTrayOpen(false);
    setActionNotice('');
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (isSending || !selected || blocked || (!message && attachedFiles.length === 0)) return;
    setIsSending(true);
    const fileMessages: SentFile[] = await Promise.all(attachedFiles.map(async (file) => ({
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataUrl: await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      }),
    })));
    const imageFiles = fileMessages.filter((file) => file.mimeType.startsWith('image/'));
    const videoFiles = fileMessages.filter((file) => file.mimeType.startsWith('video/'));
    const sentAt = Date.now();
    const messageContents: SentMessage[] = attachedFiles.length === 0
      ? [{ kind: 'text', text: message, timestamp: sentAt }]
      : imageFiles.length > 1 && imageFiles.length === fileMessages.length
        ? [{ kind: 'gallery', files: imageFiles, caption: message || undefined, timestamp: sentAt }]
        : videoFiles.length > 1 && videoFiles.length === fileMessages.length
          ? []
          : fileMessages.map((file) => ({ kind: 'file', ...file, caption: message || undefined, timestamp: sentAt }));
    const currentTimeline = timeline[selected.id] ?? [];
    const initialTimeline = currentTimeline.length === 0 && !historyCleared ? [{ kind: 'message' as const, index: 0, side: 'outgoing' as const }, { kind: 'message' as const, index: 1, side: 'incoming' as const }] : [];
    const messageOffset = (!historyCleared ? 2 : 0) + (sentMessages[selected.id] ?? []).length;
    const nextTimeline = videoFiles.length > 1 && videoFiles.length === fileMessages.length
      ? [...currentTimeline, ...initialTimeline, { kind: 'video-group' as const, index: (videoGroups[selected.id] ?? []).length }]
      : [...currentTimeline, ...initialTimeline, ...messageContents.map((_, index) => ({ kind: 'message' as const, index: messageOffset + index, side: 'outgoing' as const }))];
    setTimeline((items) => ({ ...items, [selected.id]: nextTimeline }));
    if (videoFiles.length > 1 && videoFiles.length === fileMessages.length) {
      setVideoGroups((groups) => ({ ...groups, [selected.id]: [...(groups[selected.id] ?? []), videoFiles] }));
    }
    setLastAction((actions) => ({ ...actions, [selected.id]: videoFiles.length > 1 && videoFiles.length === fileMessages.length ? 'video' : 'text' }));
    setSentMessages((messages) => ({
      ...messages,
      [selected.id]: [...(messages[selected.id] ?? []), ...messageContents],
    }));
    setConversations((items) => items.map((conversation) => conversation.id === selected.id ? { ...conversation, unread: 0 } : conversation));
    setDraft('');
    if (composerRef.current) composerRef.current.style.height = '44px';
    setAttachedFiles([]);
    setAttachmentTrayOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsSending(false);
  };

  return (
    <main className={cn('bg-ink-950 text-ink-100 lg:h-[100dvh] lg:overflow-hidden', chatOpen ? 'h-[100dvh] overflow-hidden pb-0' : 'min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))]')}>
      <div className={cn('mx-auto flex w-full max-w-[1440px] flex-col px-4 pt-5 sm:px-6 lg:h-[calc(100dvh-2rem)] lg:min-h-0 lg:overflow-hidden lg:ps-28 lg:pe-10 lg:pt-8 lg:pb-0', chatOpen ? 'h-full min-h-0 overflow-hidden pb-24' : 'min-h-screen pb-24')}>
        <header className={cn('mb-3 flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3 lg:mb-0 lg:pb-4', mobileChatOpen && 'hidden lg:flex')}>
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Messages</h1>
            <p className="truncate text-xs text-ink-400 sm:text-sm">Start a conversation</p>
          </div>
          <button type="button" aria-label="Message settings" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition-colors hover:bg-white/10 hover:text-white"><SlidersHorizontal className="h-4 w-4" /></button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(280px,360px)_1fr] lg:grid-rows-[minmax(0,1fr)]">
          <section className={cn('flex min-h-0 flex-col border-white/[0.08] lg:h-full lg:min-h-0 lg:border-e lg:pe-5', mobileChatOpen && 'hidden lg:flex')}>
            <div className="border-b border-white/[0.08] py-4 lg:pe-1">
              <label className="relative block">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" aria-label="Search messages" className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 ps-9 pe-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" />
              </label>
              <div className="mt-3 flex touch-pan-x gap-1 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1 lg:pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                {FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors', filter === item.id ? 'bg-white text-ink-900' : 'bg-white/[0.05] text-ink-400 hover:bg-white/10 hover:text-white')}>{item.label}</button>)}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-scroll py-2 lg:h-full lg:max-h-full">
              {filteredConversations.map((conversation) => <div key={conversation.id} onClick={() => openConversation(conversation.id)} className={cn('flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-start transition-colors hover:bg-white/[0.06]', selectedId === conversation.id && 'bg-white/[0.08]')}>
                <span className="relative h-11 w-11 shrink-0">
                  <StoryAvatar userKey={canonicalizeUserKey(conversation.handle)} src={conversation.avatarUrl} name={conversation.artist} size={44} variant="inline" className="h-full w-full" onNoStoryClick={() => openConversation(conversation.id)} />
                  {conversation.online && <span className="pointer-events-none absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />}
                </span>
                <button type="button" onClick={(event) => { event.stopPropagation(); openConversation(conversation.id); }} className="flex min-w-0 flex-1 items-center gap-3 text-start"><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-white">{conversation.artist}</span><span className="shrink-0 text-[11px] text-ink-500">{conversation.time}</span></span><span className={cn('mt-1 block truncate text-xs', blockedIds.includes(conversation.id) ? 'text-rose-300' : historyClearedIds.includes(conversation.id) && !(sentMessages[conversation.id]?.length) ? 'text-ink-300' : conversation.unread ? 'font-medium text-white' : 'text-ink-400')}>{blockedIds.includes(conversation.id) ? 'User blocked' : historyClearedIds.includes(conversation.id) && !(sentMessages[conversation.id]?.length) ? 'Chat cleared' : getMessagePreview(sentMessages[conversation.id]?.at(-1)) || conversation.message}</span></span>
                  {conversation.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-pink px-1.5 text-[10px] font-bold text-white">{conversation.unread}</span>}
                </button>
              </div>)}
              {filteredConversations.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-500">No conversations found.</p>}
            </div>
          </section>

          <section className={cn('h-full min-w-0 min-h-0 overflow-hidden flex-col lg:ps-8', !mobileChatOpen && 'hidden lg:flex', mobileChatOpen && 'flex')}>
            {selectedId === null ? (
              <div className="hidden h-full flex-col items-center justify-center text-center lg:flex">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70"><Send className="h-5 w-5" /></div>
                <h2 className="text-lg font-semibold text-white">Select a conversation</h2>
                <p className="mt-1 max-w-xs text-sm text-ink-500">Choose a message from your inbox to start chatting.</p>
              </div>
            ) : (
              <>
            <header className="flex items-center gap-3 border-b border-white/[0.08] py-3">
              <button type="button" aria-label="Back to conversations" onClick={() => setMobileChatOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white lg:hidden"><ArrowLeft className="h-4 w-4" /></button>
              <span className="relative h-10 w-10 shrink-0"><StoryAvatar userKey={canonicalizeUserKey(selected.handle)} src={selected.avatarUrl} name={selected.artist} size={40} className="h-full w-full" />{selected.online && <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{selected.artist}</strong><span className="text-xs text-ink-400">{selected.online ? 'Active now' : 'Active recently'}</span></span>
              <button type="button" aria-label="Close chat" onClick={() => { setSelectedId(null); setMobileChatOpen(false); setMenuOpen(false); }} className="hidden h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white lg:flex"><X className="h-4 w-4" /></button>
              <div ref={menuRef} className="relative">
                <button type="button" aria-label="More options" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
                {menuOpen && <div role="menu" aria-label="Conversation options" className="absolute end-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-1.5 shadow-2xl">
                  <button type="button" role="menuitem" onClick={clearHistory} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-ink-100 transition-colors hover:bg-white/[0.07]"><Eraser className="h-4 w-4 text-ink-400" />Clear chat history</button>
                  <button type="button" role="menuitem" onClick={deleteConversation} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-rose-300 transition-colors hover:bg-rose-500/10"><Trash2 className="h-4 w-4" />Delete conversation</button>
                  <div className="my-1 border-t border-white/[0.08]" />
                  <button type="button" role="menuitem" onClick={toggleMute} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-ink-100 transition-colors hover:bg-white/[0.07]">{muted ? <Bell className="h-4 w-4 text-ink-400" /> : <BellOff className="h-4 w-4 text-ink-400" />}{muted ? 'Unmute notifications' : 'Mute notifications'}</button>
                  <button type="button" role="menuitem" onClick={openBlockDialog} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-ink-100 transition-colors hover:bg-white/[0.07]"><Ban className="h-4 w-4 text-ink-400" />Block user</button>
                  <button type="button" role="menuitem" onClick={openReportDialog} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-rose-300 transition-colors hover:bg-rose-500/10"><Flag className="h-4 w-4" />{reportedIds.includes(selected.id) ? 'Report again' : 'Report conversation'}</button>
                </div>}
              </div>
            </header>
            <div ref={messageListRef} className="h-[calc(100dvh-12rem)] min-h-0 flex-1 touch-pan-y overflow-y-scroll overscroll-y-contain py-6 sm:px-4 lg:h-auto lg:max-h-[calc(100dvh-13rem)] lg:min-h-0 lg:px-8 lg:max-w-3xl [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
              <div className="flex min-h-full flex-col justify-end">
                {actionNotice && <p role="status" className="mb-4 text-center text-xs text-emerald-300">{actionNotice}</p>}
                {hasTimeline && <ChatTimeline items={timelineWithConversationStart} messages={timelineMessages} videoGroups={videoGroups[selected.id] ?? []} onOpenImage={(images, index) => setImageViewer({ images, index })} />}
                {!hasTimeline && selectedGalleries.map((gallery, galleryIndex) => <div key={`gallery-view-${galleryIndex}`} className="flex justify-end"><ImageGallery files={gallery.files} caption={gallery.caption} onOpen={(index) => setImageViewer({ images: gallery.files.flatMap((item) => item.dataUrl ? [item.dataUrl] : []), index })} /></div>)}
                {!hasTimeline && videoGroups[selected.id]?.map((group, groupIndex) => <div key={`${selected.id}-video-group-${groupIndex}`} className="flex w-full justify-end"><div className="grid max-w-[80%] grid-cols-2 gap-1 rounded-2xl rounded-ee-md bg-brand-pink/75 p-1">{group.map((video) => video.dataUrl ? <video key={video.name} src={video.dataUrl} controls className="max-h-64 w-full min-w-0 rounded-xl object-cover" /> : null)}</div></div>)}
                {blocked ? <div className="mx-auto flex max-w-sm flex-col items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-5 py-6 text-center"><Ban className="h-6 w-6 text-rose-300" /><p className="mt-3 text-sm font-medium text-white">You blocked this user</p><p className="mt-1 text-xs text-ink-400">Unblock them to send and receive messages again.</p><button type="button" onClick={unblockUser} className="mt-4 h-10 rounded-xl bg-white px-5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100">Unblock</button></div> : !hasTimeline && historyCleared && selectedSentMessages.length === 0 ? <p className="py-8 text-center text-sm text-ink-500">No messages in this conversation.</p> : !hasTimeline && <div className="space-y-2">{!historyCleared && <><div className="flex justify-end"><p dir="auto" className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-brand-pink px-4 py-2.5 text-start text-sm text-white">{selected.message}</p></div><div className="flex items-center gap-2"><p dir="auto" className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-es-md bg-white/[0.07] px-4 py-2.5 text-start text-sm text-ink-200">I love it. Let&apos;s make something together.</p><CheckCheck className="h-3.5 w-3.5 text-ink-500" /></div></>}{selectedSentMessages.map((message, index) => <div key={`${selected.id}-${index}`} className="flex justify-end"><div dir="auto" className={cn('max-w-[80%] rounded-2xl text-sm text-white', message.kind === 'file' ? 'bg-brand-pink/75 p-1' : 'rounded-ee-md bg-brand-pink px-3 py-2.5')} >{message.kind === 'text' ? <span className="block whitespace-pre-wrap text-start">{message.text}</span> : <>{message.mimeType.startsWith('image/') && message.dataUrl ? <img src={message.dataUrl} alt={message.name} className="max-h-64 max-w-full rounded-xl object-contain" /> : message.mimeType.startsWith('video/') && message.dataUrl ? <video src={message.dataUrl} controls className="max-h-64 max-w-full rounded-xl" /> : message.mimeType.startsWith('audio/') && message.dataUrl ? <audio src={message.dataUrl} controls className="max-w-full" /> : <a href={message.dataUrl} download={message.name} className="flex items-center gap-2 px-2 py-1.5 text-start hover:underline"><FileText className="h-5 w-5 shrink-0" /><span className="min-w-0 truncate">{message.name}</span><Download className="h-4 w-4 shrink-0" /></a>}{message.caption && <p dir="auto" className="mt-1 border-t border-white/20 px-2 pt-1.5 text-start text-xs">{message.caption}</p>}</>}</div></div>)}</div>}
              </div>
            </div>
            <form onSubmit={sendMessage} className="relative mb-[env(safe-area-inset-bottom)] flex w-full min-w-0 max-w-3xl items-center gap-2 border-t border-white/[0.08] py-4 lg:mb-0">
              {attachedFiles.length > 1 && attachmentTrayOpen && <div className="absolute inset-x-0 bottom-full z-10 mb-2 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-ink-900 p-2 shadow-2xl lg:hidden">
                {attachedFiles.map((file, index) => <span key={`tray-${file.name}-${file.lastModified}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/[0.08]" title={file.name}>
                  {file.type.startsWith('image/') && attachedPreviewUrls[index] ? <img src={attachedPreviewUrls[index]} alt={file.name} className="h-full w-full object-cover" /> : file.type.startsWith('video/') && attachedPreviewUrls[index] ? <video src={attachedPreviewUrls[index]} muted playsInline className="h-full w-full object-cover" /> : <FileText className="m-auto h-6 w-6 text-ink-300" />}
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => { selectFiles(attachedFiles.filter((_, fileIndex) => fileIndex !== index)); }} className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-3 w-3" /></button>
                </span>)}
              </div>}
              <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.04] focus-within:border-brand-pink/50">
                <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} className="hidden" />
                <button type="button" aria-label="Attach file" onClick={() => fileInputRef.current?.click()} disabled={blocked} className="ms-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><Paperclip className="h-5 w-5" /></button>
                {attachedFiles.length > 1 && <button type="button" onClick={() => setAttachmentTrayOpen((open) => !open)} className="ms-1 flex h-9 min-w-0 shrink-0 items-center gap-1 rounded-lg bg-white/[0.08] px-2 text-xs text-ink-200 lg:hidden"><span>{attachedFiles.length} files</span>{attachmentTrayOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</button>}
                <div className="hidden min-w-0 items-center lg:flex">{attachedFiles.map((file, index) => <span key={`${file.name}-${file.lastModified}`} className="ms-1 flex h-9 max-w-[18%] min-w-0 shrink items-center gap-1 rounded-lg bg-white/[0.08] p-1" title={file.name}>{file.type.startsWith('image/') && attachedPreviewUrls[index] ? <img src={attachedPreviewUrls[index]} alt={file.name} className="h-7 w-7 shrink-0 rounded-md object-cover" /> : file.type.startsWith('video/') && attachedPreviewUrls[index] ? <video src={attachedPreviewUrls[index]} muted playsInline className="h-7 w-7 shrink-0 rounded-md object-cover" /> : <><FileText className="ms-1 h-5 w-5 shrink-0 text-ink-300" /><span className="min-w-0 truncate px-1 text-xs text-ink-200">{file.name}</span></>}<button type="button" aria-label={`Remove ${file.name}`} onClick={() => { selectFiles(attachedFiles.filter((_, fileIndex) => fileIndex !== index)); }} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-white/10 hover:text-white"><X className="h-3 w-3" /></button></span>)}</div>
                <textarea ref={composerRef} value={draft} onChange={(event) => { setDraft(event.target.value); const textarea = event.currentTarget; textarea.style.height = 'auto'; textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`; }} onKeyDown={(event) => { if (event.key !== 'Enter' || event.shiftKey || window.matchMedia('(max-width: 1023px)').matches) return; event.preventDefault(); event.currentTarget.form?.requestSubmit(); }} rows={1} placeholder={blocked ? 'Unblock this user to send a message' : attachedFiles.length > 0 ? 'Add a message...' : 'Write a message...'} aria-label="Write a message" disabled={blocked} className="min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-ink-500 disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              <button type="submit" aria-label="Send message" disabled={isSending || blocked || (!draft.trim() && attachedFiles.length === 0)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-pink text-white transition-opacity disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </form>
              </>
            )}
          </section>
        </div>
      </div>
      {imageViewer && <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/90 p-4" onTouchStart={(event) => { (event.currentTarget as HTMLDivElement).dataset.touchStartX = String(event.touches[0].clientX); }} onTouchEnd={(event) => { const startX = Number((event.currentTarget as HTMLDivElement).dataset.touchStartX); const delta = event.changedTouches[0].clientX - startX; if (Math.abs(delta) < 50) return; setImageViewer((viewer) => viewer ? { ...viewer, index: Math.max(0, Math.min(viewer.images.length - 1, viewer.index + (delta < 0 ? 1 : -1))) } : null); }}>
        <button type="button" aria-label="Close image viewer" onClick={() => setImageViewer(null)} className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"><X className="h-6 w-6" /></button>
        {imageViewer.images.length > 1 && <button type="button" aria-label="Previous image" onClick={() => setImageViewer((viewer) => viewer ? { ...viewer, index: Math.max(0, viewer.index - 1) } : null)} className="absolute start-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white lg:flex"><ChevronLeft className="h-6 w-6" /></button>}
        <img src={imageViewer.images[imageViewer.index]} alt="Expanded attachment" className="max-h-[90dvh] max-w-[90vw] object-contain" />
        {imageViewer.images.length > 1 && <button type="button" aria-label="Next image" onClick={() => setImageViewer((viewer) => viewer ? { ...viewer, index: Math.min(viewer.images.length - 1, viewer.index + 1) } : null)} className="absolute end-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white lg:flex"><ChevronRight className="h-6 w-6" /></button>}
      </div>}
      {dialog && selected && <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="conversation-dialog-title" className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-ink-900 p-5 shadow-2xl sm:rounded-2xl sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 id="conversation-dialog-title" className="text-lg font-semibold text-white">{dialog === 'block' ? 'Block user?' : 'Report conversation'}</h2>
              <p className="mt-1 text-sm text-ink-400">{dialog === 'block' ? `Are you sure you want to block ${selected.artist}?` : `Tell us why you are reporting ${selected.artist}.`}</p>
            </div>
            <button type="button" aria-label="Close dialog" onClick={() => setDialog(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-white/[0.08] hover:text-white"><X className="h-5 w-5" /></button>
          </header>
          {dialog === 'block' ? <div className="mt-6 flex gap-3 sm:justify-end">
            <button type="button" onClick={() => setDialog(null)} className="h-11 flex-1 rounded-xl border border-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] sm:flex-none">No</button>
            <button type="button" onClick={blockUser} className="h-11 flex-1 rounded-xl bg-rose-500 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-400 sm:flex-none">Yes, block</button>
          </div> : <form onSubmit={(event) => { event.preventDefault(); if (reportReason) reportConversation(); }} className="mt-5 space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-white">Reason for reporting</legend>
              <div className="space-y-2">{REPORT_REASONS.map((reason) => <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm text-ink-200 transition-colors has-[:checked]:border-brand-pink/60 has-[:checked]:bg-brand-pink/10"><input type="radio" name="report-reason" value={reason} checked={reportReason === reason} onChange={(event) => setReportReason(event.target.value)} className="accent-brand-pink" />{reason}</label>)}</div>
            </fieldset>
            <label className="block text-sm font-medium text-white">Additional details <span className="font-normal text-ink-500">(optional)</span><textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} rows={3} placeholder="Add more details..." className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label>
            <button type="submit" disabled={!reportReason} className="h-11 w-full rounded-xl bg-brand-pink px-4 text-sm font-medium text-white transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Submit report</button>
          </form>}
        </section>
      </div>}
      <div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 rtl:lg:left-auto rtl:lg:right-4"><BottomNav className="lg:flex-col" /></div>
    </main>
  );
}
