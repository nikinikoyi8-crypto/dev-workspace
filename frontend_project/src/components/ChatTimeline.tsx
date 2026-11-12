import { Download, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';

export type TimelineMessage =
  | { kind: 'text'; text: string; timestamp?: number }
  | { kind: 'file'; name: string; mimeType: string; dataUrl?: string; caption?: string; timestamp?: number }
  | { kind: 'gallery'; files: VideoFile[]; caption?: string; timestamp?: number };

export type TimelineItem =
  | { kind: 'message'; index: number; side?: 'incoming' | 'outgoing' }
  | { kind: 'video-group'; index: number };

type VideoFile = { name: string; mimeType: string; dataUrl?: string };

interface ChatTimelineProps {
  items: TimelineItem[];
  messages: TimelineMessage[];
  videoGroups: VideoFile[][];
  onOpenImage?: (images: string[], index: number) => void;
}

const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', hour: 'numeric', minute: '2-digit', hour12: true });
const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

function getTehranDateKey(timestamp: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
}

function formatDateLabel(timestamp: number) {
  const today = getTehranDateKey(Date.now());
  const messageDate = getTehranDateKey(timestamp);
  if (messageDate === today) return 'Today';
  const yesterday = new Date(Date.now() - 86400000);
  if (messageDate === getTehranDateKey(yesterday.getTime())) return 'Yesterday';
  return dateFormatter.format(new Date(timestamp));
}

function FileContent({ message }: { message: Extract<TimelineMessage, { kind: 'file' }> }) {
  if (message.mimeType.startsWith('image/') && message.dataUrl) return <img src={message.dataUrl} alt={message.name} className="max-h-64 max-w-full rounded-xl object-contain" />;
  if (message.mimeType.startsWith('video/') && message.dataUrl) return <video src={message.dataUrl} controls className="max-h-64 max-w-full rounded-xl" />;
  if (message.mimeType.startsWith('audio/') && message.dataUrl) return <audio src={message.dataUrl} controls className="max-w-full" />;
  return <a href={message.dataUrl} download={message.name} className="flex items-center gap-2 px-2 py-1.5 text-start hover:underline"><FileText className="h-5 w-5 shrink-0" /><span className="min-w-0 truncate">{message.name}</span><Download className="h-4 w-4 shrink-0" /></a>;
}

export function formatTehranTime(timestamp: number) {
  return timeFormatter.format(new Date(timestamp));
}

export function formatTehranDateLabel(timestamp: number) {
  return formatDateLabel(timestamp);
}

export default function ChatTimeline({ items, messages, videoGroups, onOpenImage }: ChatTimelineProps) {
  let previousDateKey = '';
  return <div className="space-y-2">
    {items.map((item, itemIndex) => item.kind === 'video-group' ? <div key={`video-${item.index}-${itemIndex}`} className="flex w-full justify-end"><div className="grid max-w-[80%] grid-cols-2 gap-1 rounded-2xl rounded-ee-md bg-brand-pink/75 p-1">{(videoGroups[item.index] ?? []).map((video) => video.dataUrl ? <video key={video.name} src={video.dataUrl} controls className="max-h-64 w-full min-w-0 rounded-xl object-cover" /> : null)}</div></div> : (() => {
      const message = messages[item.index];
      if (!message) return null;
      const side = item.side ?? (item.index === 1 ? 'incoming' : 'outgoing');
      const timestamp = message.timestamp ?? Date.now();
      const dateKey = getTehranDateKey(timestamp);
      const dateSeparator = dateKey !== previousDateKey ? <div className="flex justify-center py-2"><span className="rounded-full bg-white/[0.08] px-3 py-1 text-[11px] text-ink-400">{formatDateLabel(timestamp)}</span></div> : null;
      previousDateKey = dateKey;
      const time = formatTehranTime(timestamp);
      return <>{dateSeparator}<div key={`message-${item.index}-${itemIndex}`} className={cn('flex', side === 'incoming' ? 'justify-start' : 'justify-end')}><div className={cn('max-w-[80%] rounded-2xl text-sm text-white', message.kind === 'file' || message.kind === 'gallery' ? 'bg-brand-pink/75 p-1' : side === 'incoming' ? 'rounded-es-md bg-white/[0.07] px-3 py-2.5 text-ink-200' : 'rounded-ee-md bg-brand-pink px-3 py-2.5')} dir="auto">{message.kind === 'text' ? <span className="block whitespace-pre-wrap text-start">{message.text}</span> : message.kind === 'gallery' ? (() => { const files = message.files.filter((file) => file.dataUrl); return <><div className={`grid w-full max-w-full gap-0.5 overflow-hidden rounded-xl ${files.length === 3 ? 'grid-cols-[2fr_1fr] grid-rows-2 aspect-[4/3]' : 'grid-cols-2 aspect-square'}`}>{files.map((file, index) => <button key={`${file.name}-${index}`} type="button" onClick={() => onOpenImage?.(files.flatMap((item) => item.dataUrl ? [item.dataUrl] : []), index)} className={`min-h-0 overflow-hidden ${files.length === 3 && index === 0 ? 'row-span-2' : ''}`}><img src={file.dataUrl} alt={file.name} className="block h-full w-full object-cover" /></button>)}</div>{message.caption && <p dir="auto" className="border-t border-white/20 px-2 pt-1.5 text-start text-xs">{message.caption}</p>}</>; })() : <><FileContent message={message} />{message.caption && <p dir="auto" className="mt-1 border-t border-white/20 px-2 pt-1.5 text-start text-xs">{message.caption}</p>}</>}<span className="mt-1 block text-end text-[10px] text-white/50">{time}</span></div></div></>;
    })())}
  </div>;
}
