import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Clapperboard, Clock3, Download, Gauge, ImagePlus, Music2, Pause, Play, Scissors, SlidersHorizontal, Sparkles, Sticker, Type, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ReelPublishDetails {
  caption: string;
  posterUrl?: string;
  filter: string;
  allowComments: boolean;
  allowDownloads: boolean;
  audience: 'everyone' | 'followers';
  startSeconds: number;
  endSeconds: number;
  overlayText: string;
  sticker: string;
  playbackRate: number;
  textPosition: { x: number; y: number };
  stickerPosition: { x: number; y: number };
  textScale: number;
  stickerScale: number;
  textFont: string;
  textColor: string;
  textBold: boolean;
  textItalic: boolean;
  textAlign: 'left' | 'center' | 'right';
  artworkTag: string;
}

interface ReelComposerProps {
  mediaUrl: string;
  isPersian: boolean;
  artworkTagOptions: string[];
  onBack: () => void;
  onPublish: (details: ReelPublishDetails) => void;
}

const FILTERS = [
  { id: 'original', name: 'Original', css: 'none' },
  { id: 'warm', name: 'Warm', css: 'sepia(.2) saturate(1.25)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.12)' },
  { id: 'dream', name: 'Dream', css: 'saturate(1.35) brightness(1.08)' },
  { id: 'studio', name: 'Studio', css: 'contrast(1.08) saturate(.82)' },
];

const MOBILE_REEL_OVERLAY_SAFE_AREA = { left: 5, right: 95, top: 14, bottom: 91 };
const DESKTOP_REEL_OVERLAY_SAFE_AREA = { left: 3, right: 97, top: 15, bottom: 88 };

const LABELS = {
  en: {
    edit: 'Edit your reel', next: 'Next', back: 'Back', editVideo: 'Edit video', close: 'Close reel creator',
    text: 'Text', voice: 'Voice', stickers: 'Stickers', filters: 'Filters', speed: 'Speed',
    trim: 'Trim video', trimHint: 'Set the start and end, then scrub to preview the selected section.', timelineHint: 'Your original video stays untouched; choose a preview range.', caption: 'Write a caption', dragHint: 'Drag the text directly on the video to place it anywhere.',
    captionHint: 'Share the story behind this moment…', cover: 'Cover', coverHint: 'Choose a frame from your video', audience: 'Audience', everyone: 'Everyone', followers: 'Followers',
    settings: 'More settings', comments: 'Allow comments', downloads: 'Allow downloads', aiLabel: 'AI-generated label', location: 'Add location',
    share: 'Share reel', sharing: 'Publishing…', saveDraft: 'Save draft', draftSaved: 'Draft saved on this device', selectCover: 'Use current frame', addText: 'Add text to preview…', artworkTag: 'Artwork tag', chooseArtworkTag: 'Choose an artwork tag', artworkTagRequired: 'Choose an artwork tag before publishing.',
    addSticker: 'Choose a studio sticker', soundOn: 'Original audio on', soundOff: 'Original audio off', duration: 'Duration', video: 'Video', noCaption: 'Your caption will appear here.',
    discardTitle: 'Leave reel creation?', discardMessage: 'Your reel edits will be lost if you leave now.', keepEditing: 'Keep editing', discard: 'Discard reel',
    safeArea: 'Safe area · Keep clear of reel controls',
    font: 'Font', color: 'Color', bold: 'Bold', italic: 'Italic', align: 'Alignment',
  },
  fa: {
    edit: 'ویرایش ریل', next: 'بعدی', back: 'بازگشت', editVideo: 'ویرایش ویدیو', close: 'بستن ساخت ریل',
    text: 'متن', voice: 'صدا', stickers: 'استیکر', filters: 'فیلترها', speed: 'سرعت',
    trim: 'برش ویدیو', trimHint: 'نقطه شروع و پایان را تنظیم کن و برای پیش‌نمایش در ویدیو جابه‌جا شو.', timelineHint: 'ویدیوی اصلی بدون تغییر می‌ماند؛ بازه پیش‌نمایش را انتخاب کن.', caption: 'متن کپشن', dragHint: 'متن را روی ویدیو بکش و در هر جایی که می‌خواهی قرار بده.',
    captionHint: 'داستان این لحظه را بنویس…', cover: 'کاور', coverHint: 'یک فریم از ویدیو انتخاب کن', audience: 'مخاطب', everyone: 'همه', followers: 'دنبال‌کنندگان',
    settings: 'تنظیمات بیشتر', comments: 'فعال‌بودن نظرات', downloads: 'اجازه دانلود', aiLabel: 'برچسب محتوای هوش مصنوعی', location: 'افزودن مکان',
    share: 'انتشار ریل', sharing: 'در حال انتشار…', saveDraft: 'ذخیره پیش‌نویس', draftSaved: 'پیش‌نویس روی این دستگاه ذخیره شد', selectCover: 'انتخاب فریم فعلی', addText: 'متن را به پیش‌نمایش اضافه کن…', artworkTag: 'تگ اثر هنری', chooseArtworkTag: 'یک تگ برای اثر انتخاب کن', artworkTagRequired: 'برای انتشار، انتخاب تگ اثر هنری الزامی است.',
    addSticker: 'یک استیکر استودیو انتخاب کن', soundOn: 'صدای اصلی روشن', soundOff: 'صدای اصلی خاموش', duration: 'مدت ویدیو', video: 'ویدیو', noCaption: 'کپشن اینجا نمایش داده می‌شود.',
    discardTitle: 'از ساخت ریل خارج می‌شوی؟', discardMessage: 'اگر الان خارج شوی، تغییرات ریل از بین می‌روند.', keepEditing: 'ادامه ویرایش', discard: 'حذف ریل',
    safeArea: 'محدوده امن · دور از کنترل‌های ریل',
    font: 'فونت', color: 'رنگ', bold: 'ضخیم', italic: 'مورب', align: 'چینش',
  },
};

type TextOverlayStyle = {
  font: string;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
};

const DEFAULT_TEXT_STYLE: TextOverlayStyle = { font: 'sans', color: '#ffffff', bold: true, italic: false, align: 'center' };

function textFontFamily(font: string) {
  if (font === 'serif') return 'Georgia, serif';
  if (font === 'mono') return 'ui-monospace, monospace';
  if (font === 'editorial') return 'cursive';
  return 'ui-sans-serif, sans-serif';
}

function TextStyleControls({ isPersian, labels, initialStyle, onStyleChange }: {
  isPersian: boolean;
  labels: { font: string; color: string; bold: string; italic: string; align: string };
  initialStyle: TextOverlayStyle;
  onStyleChange: (style: TextOverlayStyle) => void;
}) {
  const [style, setStyle] = useState(initialStyle);
  const update = (patch: Partial<TextOverlayStyle>) => {
    const next = { ...style, ...patch };
    setStyle(next);
    onStyleChange(next);
  };
  const fonts = [
    { id: 'sans', name: isPersian ? 'مدرن' : 'Modern' },
    { id: 'serif', name: isPersian ? 'سریف' : 'Serif' },
    { id: 'mono', name: isPersian ? 'مونو' : 'Mono' },
    { id: 'editorial', name: isPersian ? 'دست‌نویس' : 'Script' },
  ];
  const colors = ['#ffffff', '#ff5c8a', '#ffc857', '#6ee7d8', '#a78bfa', '#111111'];

  return <div className="space-y-3">
    <div><span className="text-[10px] text-ink-300">{labels.font}</span><div className="mt-1 grid grid-cols-4 gap-1.5">{fonts.map((font) => <button type="button" key={font.id} aria-pressed={style.font === font.id} onClick={() => update({ font: font.id })} className={cn('min-h-10 truncate rounded-lg border px-1 text-xs text-white transition', style.font === font.id ? 'border-brand-pink bg-brand-pink/15' : 'border-white/10 bg-white/[.04] hover:bg-white/[.08]')} style={{ fontFamily: textFontFamily(font.id) }}>{font.name}</button>)}</div></div>
    <div><div className="flex items-center justify-between"><span className="text-[10px] text-ink-300">{labels.color}</span><label className="relative flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[10px] text-white"><span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: style.color }} />{style.color}<input type="color" aria-label={isPersian ? 'انتخاب رنگ دلخواه متن' : 'Choose custom text color'} value={style.color} onChange={(event) => update({ color: event.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label></div><div className="mt-2 flex flex-wrap gap-2">{colors.map((color) => <button type="button" key={color} aria-label={`${labels.color} ${color}`} aria-pressed={style.color === color} onClick={() => update({ color })} className={cn('h-7 w-7 rounded-full border border-white/30', style.color === color && 'ring-2 ring-brand-pink ring-offset-2 ring-offset-[#17191f]')} style={{ backgroundColor: color }} />)}</div></div>
    <div className="grid grid-cols-2 gap-2"><div className="flex gap-2"><button type="button" aria-pressed={style.bold} onClick={() => update({ bold: !style.bold })} className={cn('min-h-9 flex-1 rounded-lg border text-sm font-bold', style.bold ? 'border-brand-pink/50 bg-brand-pink/15 text-white' : 'border-white/10 bg-white/[.04] text-ink-300')}>B</button><button type="button" aria-pressed={style.italic} onClick={() => update({ italic: !style.italic })} className={cn('min-h-9 flex-1 rounded-lg border text-sm italic', style.italic ? 'border-brand-pink/50 bg-brand-pink/15 text-white' : 'border-white/10 bg-white/[.04] text-ink-300')}>I</button></div><div className="flex gap-1">{(['left', 'center', 'right'] as const).map((align) => <button type="button" key={align} aria-label={`${labels.align} ${align}`} aria-pressed={style.align === align} onClick={() => update({ align })} className={cn('min-h-9 flex-1 rounded-lg border text-xs', style.align === align ? 'border-brand-pink/50 bg-brand-pink/15 text-white' : 'border-white/10 bg-white/[.04] text-ink-300')}>{align === 'left' ? '≡' : align === 'center' ? '☰' : '≡'}</button>)}</div></div>
  </div>;
}

export default function ReelComposer({ mediaUrl, isPersian, artworkTagOptions, onBack, onPublish }: ReelComposerProps) {
  const labels = isPersian ? LABELS.fa : LABELS.en;
  const [isDesktopPreview, setIsDesktopPreview] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const textOverlayRef = useRef<HTMLDivElement>(null);
  const stickerOverlayRef = useRef<HTMLDivElement>(null);
  const draggingOverlayRef = useRef<'text' | 'sticker' | null>(null);
  const dragBoundsRef = useRef<DOMRect | null>(null);
  const pendingOverlayPositionRef = useRef<{ kind: 'text' | 'sticker'; x: number; y: number } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const trimInitializedRef = useRef(false);
  const [step, setStep] = useState<'edit' | 'share'>('edit');
  const [activeTool, setActiveTool] = useState<'trim' | 'text' | 'voice' | 'stickers' | 'filters' | 'speed' | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [caption, setCaption] = useState('');
  const [artworkTag, setArtworkTag] = useState('');
  const [publishError, setPublishError] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [sticker, setSticker] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [stickerPosition, setStickerPosition] = useState({ x: 50, y: 42 });
  const [textScale, setTextScale] = useState(1);
  const [stickerScale, setStickerScale] = useState(1);
  const textStyleRef = useRef<TextOverlayStyle>(DEFAULT_TEXT_STYLE);
  const [filterId, setFilterId] = useState('original');
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [posterUrl, setPosterUrl] = useState('');
  const [audience, setAudience] = useState<'everyone' | 'followers'>('everyone');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(false);
  const [draftToast, setDraftToast] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [expandedSettings, setExpandedSettings] = useState(false);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const activeFilter = FILTERS.find((filter) => filter.id === filterId) ?? FILTERS[0];
  const requestExit = useCallback(() => {
    if (!isPublishing) setExitPromptOpen(true);
  }, [isPublishing]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestExit();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', keydown);
    };
  }, [requestExit]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktopPreview(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const reelOverlaySafeArea = isDesktopPreview ? DESKTOP_REEL_OVERLAY_SAFE_AREA : MOBILE_REEL_OVERLAY_SAFE_AREA;

  useEffect(() => {
    if (!duration || trimInitializedRef.current) return;
    trimInitializedRef.current = true;
    setTrimEnd(duration);
  }, [duration]);

  const handleVideoMetadata = (video: HTMLVideoElement) => {
    const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!videoDuration) return;
    setDuration(videoDuration);
    if (!trimInitializedRef.current) {
      trimInitializedRef.current = true;
      setTrimStart(0);
      setTrimEnd(videoDuration);
    } else {
      video.currentTime = Math.min(Math.max(trimStart, 0), Math.max(videoDuration - 0.05, 0));
    }
  };

  const captureCover = () => {
    const video = videoRef.current;
    const canvas = posterCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.filter = activeFilter.css;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const nextCover = canvas.toDataURL('image/jpeg', .88);
      setPosterUrl(nextCover);
    } catch {
      setPosterUrl('');
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) video.currentTime = trimStart;
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (trimEnd > trimStart && video.currentTime >= trimEnd) {
      video.currentTime = trimStart;
      if (playing) void video.play();
    }
  };

  const chooseTool = (tool: NonNullable<typeof activeTool>) => {
    setActiveTool((current) => current === tool ? null : tool);
    if (tool === 'voice') setMuted((value) => !value);
  };

  const handleOverlayPointerDown = (kind: 'text' | 'sticker', event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    event.stopPropagation();
    const frame = previewFrameRef.current;
    if (!frame) return;
    draggingOverlayRef.current = kind;
    dragBoundsRef.current = frame.getBoundingClientRect();
    frame.setPointerCapture(event.pointerId);
  };

  const handleOverlayContextMenu = (event: React.MouseEvent<HTMLDivElement>, kind: 'text' | 'sticker') => {
    event.preventDefault();
    event.stopPropagation();
    if (kind === 'text') setOverlayText('');
    else setSticker('');
    setActiveTool(null);
  };

  const clampOverlayPosition = (kind: 'text' | 'sticker', x: number, y: number, scale = kind === 'text' ? textScale : stickerScale) => {
    const frame = previewFrameRef.current;
    const overlay = kind === 'text' ? textOverlayRef.current : stickerOverlayRef.current;
    const bounds = frame?.getBoundingClientRect();
    if (!frame || !bounds?.width || !bounds.height) return {
      x: Math.max(reelOverlaySafeArea.left, Math.min(reelOverlaySafeArea.right, x)),
      y: Math.max(reelOverlaySafeArea.top, Math.min(reelOverlaySafeArea.bottom, y)),
    };
    const halfWidth = (overlay?.offsetWidth ?? 0) * scale / bounds.width * 50;
    const halfHeight = (overlay?.offsetHeight ?? 0) * scale / bounds.height * 50;
    const left = reelOverlaySafeArea.left + halfWidth;
    const right = reelOverlaySafeArea.right - halfWidth;
    const top = reelOverlaySafeArea.top + halfHeight;
    const bottom = reelOverlaySafeArea.bottom - halfHeight;
    return {
      x: Math.max(left, Math.min(Math.max(left, right), x)),
      y: Math.max(top, Math.min(Math.max(top, bottom), y)),
    };
  };

  const applyTextStyle = (style: TextOverlayStyle) => {
    textStyleRef.current = style;
    const overlay = textOverlayRef.current;
    if (!overlay) return;
    overlay.style.color = style.color;
    overlay.style.fontFamily = textFontFamily(style.font);
    overlay.style.fontWeight = style.bold ? '700' : '400';
    overlay.style.fontStyle = style.italic ? 'italic' : 'normal';
    overlay.style.textAlign = style.align;
  };

  const handleScalePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, kind: 'text' | 'sticker') => {
    event.preventDefault();
    event.stopPropagation();
    const overlay = kind === 'text' ? textOverlayRef.current : stickerOverlayRef.current;
    if (!overlay) return;
    const bounds = overlay.getBoundingClientRect();
    overlay.dataset.resizeKind = kind;
    overlay.dataset.resizeStart = `${event.clientX},${event.clientY},${bounds.width},${bounds.height},${kind === 'text' ? textScale : stickerScale}`;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleScalePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const grip = event.currentTarget;
    const overlay = grip.closest<HTMLElement>('[data-resize-start]');
    const origin = overlay?.dataset.resizeStart?.split(',').map(Number);
    const kind = overlay?.dataset.resizeKind;
    if (!overlay || !origin || origin.length !== 5 || !kind) return;
    const [startX, startY, width, height, startScale] = origin;
    const delta = Math.max(event.clientX - startX, event.clientY - startY);
    const position = kind === 'text' ? textPosition : stickerPosition;
    const frameBounds = previewFrameRef.current?.getBoundingClientRect();
    const availableWidth = frameBounds ? Math.max(1, Math.min(position.x - reelOverlaySafeArea.left, reelOverlaySafeArea.right - position.x) * 2 / 100 * frameBounds.width) : width * 3;
    const availableHeight = frameBounds ? Math.max(1, Math.min(position.y - reelOverlaySafeArea.top, reelOverlaySafeArea.bottom - position.y) * 2 / 100 * frameBounds.height) : height * 3;
    const maxSafeScale = Math.min(3, availableWidth / Math.max(width, 1), availableHeight / Math.max(height, 1));
    const nextScale = Math.max(.5, Math.min(maxSafeScale, startScale * (1 + delta / Math.max(width, height, 1))));
    overlay.style.setProperty('--reel-overlay-scale', String(nextScale));
  };

  const handleScalePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const grip = event.currentTarget;
    const overlay = grip.closest<HTMLElement>('[data-resize-start]');
    if (overlay) {
      const scale = Number.parseFloat(overlay.style.getPropertyValue('--reel-overlay-scale'));
      if (Number.isFinite(scale)) {
        if (overlay.dataset.resizeKind === 'text') setTextScale(scale);
        else setStickerScale(scale);
      }
      overlay.style.removeProperty('--reel-overlay-scale');
      delete overlay.dataset.resizeStart;
      delete overlay.dataset.resizeKind;
    }
    if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
  };

  const handleOverlayPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const kind = draggingOverlayRef.current;
    const bounds = dragBoundsRef.current;
    if (!kind || !bounds || bounds.width === 0 || bounds.height === 0) return;
    const dragKind = kind!;
    const dragBounds = bounds!;
    const position = clampOverlayPosition(dragKind, (event.clientX - dragBounds.left) / dragBounds.width * 100, (event.clientY - dragBounds.top) / dragBounds.height * 100);
    pendingOverlayPositionRef.current = { kind: dragKind, ...position };
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const pending = pendingOverlayPositionRef.current;
      if (!pending) return;
      const overlay = pending.kind === 'text' ? textOverlayRef.current : stickerOverlayRef.current;
      if (!overlay) return;
      overlay.style.left = `${pending.x}%`;
      overlay.style.top = `${pending.y}%`;
    });
  };

  const handleOverlayPointerUp = (event?: ReactPointerEvent<HTMLDivElement>) => {
    const kind = draggingOverlayRef.current;
    const pending = pendingOverlayPositionRef.current;
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    if (kind && pending?.kind === kind) {
      const scale = kind === 'text' ? textScale : stickerScale;
      const position = clampOverlayPosition(kind, pending.x, pending.y, scale);
      const overlay = kind === 'text' ? textOverlayRef.current : stickerOverlayRef.current;
      if (overlay) {
        overlay.style.left = `${position.x}%`;
        overlay.style.top = `${position.y}%`;
      }
      if (kind === 'text') {
        setTextPosition(position);
      } else {
        setStickerPosition(position);
      }
    }
    draggingOverlayRef.current = null;
    dragBoundsRef.current = null;
    pendingOverlayPositionRef.current = null;
    const frame = previewFrameRef.current;
    if (event && frame?.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
  };

  useEffect(() => () => {
    if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
  }, []);

  const renderOverlays = (editable: boolean) => <>
    {editable && <div aria-hidden="true" className="pointer-events-none absolute z-[5] rounded-2xl border border-dashed border-white/45 bg-white/[.025] shadow-[0_0_0_9999px_rgba(0,0,0,.13)]" style={{ left: `${reelOverlaySafeArea.left}%`, top: `${reelOverlaySafeArea.top}%`, width: `${reelOverlaySafeArea.right - reelOverlaySafeArea.left}%`, height: `${reelOverlaySafeArea.bottom - reelOverlaySafeArea.top}%` }}><span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2 py-1 text-[9px] font-medium text-white/80 backdrop-blur">{labels.safeArea}</span></div>}
    {sticker && <div ref={editable ? stickerOverlayRef : undefined} onPointerDown={editable ? (event) => handleOverlayPointerDown('sticker', event) : undefined} onContextMenu={editable ? (event) => handleOverlayContextMenu(event, 'sticker') : undefined} className={cn('absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1.5 text-base font-semibold text-white [text-shadow:0_2px_8px_rgba(0,0,0,.9)] select-none', editable ? 'touch-none cursor-grab border border-dashed border-white/50 hover:border-brand-pink active:cursor-grabbing' : 'pointer-events-none')} style={{ left: `${stickerPosition.x}%`, top: `${stickerPosition.y}%`, transform: `translate(-50%, -50%) scale(var(--reel-overlay-scale, ${stickerScale}))` }}>{sticker}{editable && <button type="button" aria-label={isPersian ? 'تغییر اندازه استیکر' : 'Resize sticker'} onPointerDown={(event) => handleScalePointerDown(event, 'sticker')} onPointerMove={handleScalePointerMove} onPointerUp={handleScalePointerUp} onPointerCancel={handleScalePointerUp} className="absolute -bottom-3 -right-3 flex h-6 w-6 touch-none items-center justify-center rounded-full border border-white/60 bg-brand-pink text-[10px] font-bold text-white shadow-lg">↘</button>}</div>}
    {overlayText && <div ref={editable ? textOverlayRef : undefined} onPointerDown={editable ? (event) => handleOverlayPointerDown('text', event) : undefined} onContextMenu={editable ? (event) => handleOverlayContextMenu(event, 'text') : undefined} className={cn('absolute z-10 max-w-[85%] -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap break-words select-none', editable ? 'touch-none cursor-grab border border-dashed border-white/50 px-2 py-1 hover:border-brand-pink active:cursor-grabbing' : 'pointer-events-none')} style={{ left: `${textPosition.x}%`, top: `${textPosition.y}%`, transform: `translate(-50%, -50%) scale(var(--reel-overlay-scale, ${textScale}))`, color: textStyleRef.current.color, fontFamily: textFontFamily(textStyleRef.current.font), fontSize: '20px', fontWeight: textStyleRef.current.bold ? 700 : 400, fontStyle: textStyleRef.current.italic ? 'italic' : 'normal', textAlign: textStyleRef.current.align, textShadow: '0 2px 12px rgba(0,0,0,.95)' }}>{overlayText}{editable && <button type="button" aria-label={isPersian ? 'تغییر اندازه متن' : 'Resize text'} onPointerDown={(event) => handleScalePointerDown(event, 'text')} onPointerMove={handleScalePointerMove} onPointerUp={handleScalePointerUp} onPointerCancel={handleScalePointerUp} className="absolute -bottom-3 -right-3 flex h-6 w-6 touch-none items-center justify-center rounded-full border border-white/60 bg-brand-pink text-[10px] font-bold text-white shadow-lg">↘</button>}</div>}
  </>;

  const handlePublish = () => {
    if (isPublishing) return;
    if (!artworkTag || !artworkTagOptions.includes(artworkTag)) {
      setPublishError(labels.artworkTagRequired);
      return;
    }
    setPublishError('');
    setIsPublishing(true);
    const textStyle = textStyleRef.current;
    onPublish({ caption: caption.trim(), posterUrl: posterUrl || undefined, filter: activeFilter.css, allowComments, allowDownloads, audience, startSeconds: trimStart, endSeconds: trimEnd || duration, overlayText, sticker, playbackRate: speed, textPosition, stickerPosition, textScale, stickerScale, textFont: textStyle.font, textColor: textStyle.color, textBold: textStyle.bold, textItalic: textStyle.italic, textAlign: textStyle.align, artworkTag });
  };

  const saveDraft = () => {
    try {
      localStorage.setItem('artistry-reel-draft', JSON.stringify({ caption, posterUrl, filterId, mediaName: mediaUrl.split('/').pop() ?? 'video' }));
    } catch {
      // Draft saving is best-effort when local storage is unavailable.
    }
    setDraftToast(true);
    window.setTimeout(() => setDraftToast(false), 2200);
  };

  const toolList = [
    { id: 'text' as const, Icon: Type, label: labels.text },
    { id: 'voice' as const, Icon: muted ? VolumeX : Volume2, label: labels.voice },
    { id: 'stickers' as const, Icon: Sticker, label: labels.stickers },
    { id: 'filters' as const, Icon: Sparkles, label: labels.filters },
    { id: 'speed' as const, Icon: Gauge, label: `${labels.speed} ${speed}×` },
  ];

  const toolPanelContent = activeTool ? (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-white">{activeTool === 'trim' ? labels.trim : activeTool === 'filters' ? labels.filters : activeTool === 'stickers' ? labels.stickers : activeTool === 'voice' ? labels.voice : activeTool === 'speed' ? labels.speed : labels.text}</p><button type="button" aria-label={labels.close} onClick={() => setActiveTool(null)} className="rounded-full p-1.5 text-ink-300 hover:bg-white/10"><X className="h-4 w-4" /></button></div>
      {activeTool === 'trim' && <div className="space-y-3"><p className="text-xs leading-relaxed text-ink-300">{labels.trimHint}</p><div className="relative h-11 overflow-hidden rounded-xl bg-white/[.06]"><video src={mediaUrl} muted playsInline className="h-full w-full object-cover opacity-60" /><div className="pointer-events-none absolute inset-y-0 border-x-2 border-brand-pink" style={{ left: `${duration ? trimStart / duration * 100 : 0}%`, right: `${duration ? 100 - trimEnd / duration * 100 : 0}%` }} /></div><label className="block text-[10px] text-ink-300">{isPersian ? `پیش‌نمایش · ${currentTime.toFixed(1)} ثانیه` : `Preview · ${currentTime.toFixed(1)}s`}<input aria-label={isPersian ? 'جابه‌جایی در ویدیو' : 'Scrub video'} type="range" min={trimStart} max={Math.max(trimEnd, trimStart + 0.1)} step="0.1" value={Math.min(Math.max(currentTime, trimStart), trimEnd || duration)} onChange={(event) => { const next = Number(event.target.value); setCurrentTime(next); if (videoRef.current) { videoRef.current.currentTime = next; if (playing) void videoRef.current.play(); } }} className="mt-2 w-full accent-pink-500" /></label><div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-ink-300">{isPersian ? 'شروع' : 'Start'} · {trimStart.toFixed(1)}s<input aria-label={isPersian ? 'شروع برش' : 'Trim start'} type="range" min={0} max={Math.max(trimEnd - .1, 0)} step="0.1" value={trimStart} onChange={(event) => { const next = Math.min(Number(event.target.value), trimEnd - .1); setTrimStart(next); if (videoRef.current) videoRef.current.currentTime = next; setCurrentTime(next); }} className="mt-2 w-full accent-pink-500" /></label><label className="text-[10px] text-ink-300">{isPersian ? 'پایان' : 'End'} · {trimEnd.toFixed(1)}s<input aria-label={isPersian ? 'پایان برش' : 'Trim end'} type="range" min={Math.min(trimStart + .1, duration)} max={duration || 0} step="0.1" value={Math.max(trimEnd, trimStart + .1)} onChange={(event) => { const next = Math.max(Number(event.target.value), trimStart + .1); setTrimEnd(next); if (videoRef.current && videoRef.current.currentTime >= next) { videoRef.current.currentTime = trimStart; setCurrentTime(trimStart); } }} className="mt-2 w-full accent-pink-500" /></label></div><p className="text-[10px] text-ink-400">{isPersian ? `مدت انتخاب‌شده: ${Math.max(0, trimEnd - trimStart).toFixed(1)} ثانیه` : `Selected duration: ${Math.max(0, trimEnd - trimStart).toFixed(1)}s`}</p></div>}
      {activeTool === 'filters' && <div className="grid grid-cols-5 gap-2">{FILTERS.map((filter) => <button type="button" key={filter.id} onClick={() => setFilterId(filter.id)} aria-pressed={filterId === filter.id} className="group"><span className={cn('block aspect-square overflow-hidden rounded-xl border-2 bg-gradient-to-br from-brand-purple/30 to-brand-orange/30', filterId === filter.id ? 'border-brand-pink' : 'border-white/10')}><video src={mediaUrl} muted playsInline className="h-full w-full object-cover" style={{ filter: filter.css }} /></span><span className="mt-1 block text-[9px] text-ink-200">{filter.name}</span></button>)}</div>}
      {activeTool === 'text' && <div className="space-y-3"><input autoFocus value={overlayText} onChange={(event) => setOverlayText(event.target.value)} placeholder={labels.addText} className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-brand-pink/50"/><TextStyleControls isPersian={isPersian} labels={labels} initialStyle={textStyleRef.current} onStyleChange={applyTextStyle} />{overlayText && <p className="text-[11px] leading-relaxed text-ink-400">{labels.dragHint}</p>}</div>}
      {activeTool === 'stickers' && <><div className="grid grid-cols-3 gap-2">{['✦ Studio', '✿ Handmade', '◉ Process'].map((item) => <button type="button" key={item} onClick={() => { setSticker(item); setActiveTool(null); }} className="rounded-xl border border-white/10 bg-white/[.05] px-2 py-3 text-xs text-white hover:border-brand-pink/50">{item}</button>)}</div>{sticker && <p className="text-[11px] leading-relaxed text-ink-400">{isPersian ? 'استیکر را روی ویدیو بکش و هر جا خواستی قرارش بده.' : 'Drag the sticker on the video to place it anywhere.'}</p>}</>}
      {activeTool === 'voice' && <div className="space-y-3"><p className="text-xs leading-relaxed text-ink-300">{isPersian ? 'صدای اصلی ویدیو را روشن یا خاموش کن.' : 'Toggle the original audio in the reel preview.'}</p><button type="button" aria-pressed={!muted} onClick={() => setMuted((value) => !value)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.05] text-sm font-semibold text-white">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{muted ? labels.soundOff : labels.soundOn}</button></div>}
      {activeTool === 'speed' && <div className="space-y-3"><p className="text-xs leading-relaxed text-ink-300">{isPersian ? 'سرعت پخش ویدیو را انتخاب کن.' : 'Choose the playback speed for your reel.'}</p><div className="grid grid-cols-4 gap-2">{[0.5, 1, 1.5, 2].map((rate) => <button type="button" key={rate} aria-pressed={speed === rate} onClick={() => { setSpeed(rate); if (videoRef.current) videoRef.current.playbackRate = rate; }} className={cn('min-h-10 rounded-xl border text-xs font-semibold transition', speed === rate ? 'border-brand-pink/50 bg-brand-pink/15 text-white' : 'border-white/10 bg-white/[.04] text-ink-300 hover:text-white')}>{rate}×</button>)}</div></div>}
    </div>
  ) : null;

  const toolRail = (
    <div className="grid w-full shrink-0 grid-cols-4 gap-2 px-3 py-3 sm:grid-cols-5 lg:grid-cols-3 lg:gap-2 lg:px-0 lg:py-1">
      {toolList.map(({ id, Icon, label }) => <button type="button" key={id} aria-pressed={activeTool === id} onClick={() => chooseTool(id)} className={cn('flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-[10px] text-ink-300 transition hover:bg-white/[.04] hover:text-white lg:min-h-14 lg:w-full lg:gap-1 lg:rounded-xl lg:px-1 lg:py-2 lg:text-[9px]', activeTool === id && 'bg-brand-pink/[.1] text-white ring-1 ring-inset ring-brand-pink/30')}><span className={cn('flex h-11 w-full max-w-16 items-center justify-center rounded-2xl border border-white/[.09] bg-[#1b1d23] transition-colors lg:h-9 lg:w-9 lg:shrink-0 lg:rounded-xl', activeTool === id && 'border-brand-pink/40 bg-brand-pink/10 text-brand-pink')}><Icon className="h-5 w-5 lg:h-4 lg:w-4" /></span><span className="max-w-full truncate whitespace-nowrap">{label}</span><ChevronRight className={cn('hidden h-3 w-3 text-ink-500 transition-transform lg:block', activeTool === id && 'rotate-90 text-brand-pink')} /></button>)}
    </div>
  );

  const player = (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
      <div ref={previewFrameRef} onPointerMove={handleOverlayPointerMove} onPointerUp={handleOverlayPointerUp} onPointerCancel={handleOverlayPointerUp} className="relative h-full w-auto max-h-full aspect-[9/16] max-w-full shrink-0 overflow-hidden rounded-2xl bg-black shadow-2xl lg:aspect-[4/5] lg:max-w-[400px]">
        <video ref={videoRef} src={mediaUrl} muted={muted} playsInline autoPlay loop onLoadedMetadata={(event) => handleVideoMetadata(event.currentTarget)} onTimeUpdate={handleTimeUpdate} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={togglePlayback} className="absolute inset-0 h-full w-full object-cover" style={{ filter: activeFilter.css }} />
        <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-4 px-3"><button type="button" onClick={togglePlayback} aria-label={playing ? 'Pause video' : 'Play video'} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md">{playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</button><span className="rounded-full bg-black/50 px-3 py-1 text-xs tabular-nums text-white backdrop-blur">{currentTime.toFixed(1)}s <span className="text-white/50">/ {duration.toFixed(1)}s</span></span></div>
        {renderOverlays(true)}
        {caption && <div className="pointer-events-none absolute inset-x-5 bottom-16 z-10 line-clamp-2 text-center text-sm font-medium text-white [text-shadow:0_2px_8px_rgba(0,0,0,.9)]">{caption}</div>}
      </div>
    </div>
  );

  const editorStep = (
    <div className="relative flex h-full min-h-0 flex-col bg-black text-white lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative flex min-h-0 flex-1 flex-col lg:min-h-[min(78vh,760px)]">
        <header className="z-10 flex h-14 shrink-0 items-center justify-between px-4 lg:px-6"><button type="button" onClick={requestExit} aria-label={labels.back} className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"><X className="h-5 w-5" /></button><div className="flex items-center gap-2 text-sm font-semibold"><Clapperboard className="h-4 w-4 text-brand-pink" />{labels.edit}</div><button type="button" onClick={() => setStep('share')} className="inline-flex h-9 items-center gap-2 rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white">{labels.next}<ArrowRight className="h-4 w-4" /></button></header>
        {player}
        <div className="shrink-0 border-t border-white/[.06] lg:hidden">{toolRail}{toolPanelContent && <div className="mx-3 mb-3 max-h-[35dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#17191f] p-4">{toolPanelContent}</div>}<div className="flex items-center justify-between px-4 pb-[max(.75rem,env(safe-area-inset-bottom))]"><button type="button" onClick={() => chooseTool('trim')} className="inline-flex items-center gap-2 rounded-full bg-[#202127] px-4 py-3 text-xs font-semibold text-white"><Scissors className="h-4 w-4" />{labels.editVideo}</button><span className="text-[10px] text-ink-500">{labels.video} · {duration.toFixed(1)}s</span></div></div>
      </div>
        <aside className="hidden min-h-0 flex-col overflow-hidden border-l border-white/[.08] bg-[#0e0f13] p-4 lg:flex"><div className="mb-2 shrink-0"><h3 className="text-xs font-semibold uppercase tracking-[.18em] text-ink-200">{labels.edit}</h3><p className="mt-1 text-[10px] text-ink-500">{isPersian ? 'ابزار موردنظر را برای ویرایش انتخاب کن' : 'Choose a tool to edit your reel'}</p></div>{toolRail}<div className="mt-3 min-h-0 flex-1 overflow-y-auto">{activeTool ? <div key={activeTool} className="min-h-36 rounded-2xl border border-brand-pink/20 bg-[#17191f] p-4 shadow-inner shadow-black/20">{toolPanelContent}</div> : <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-white/[.08] px-5 text-center text-xs leading-relaxed text-ink-500">{isPersian ? 'با انتخاب یکی از ابزارهای بالا، تنظیمات آن اینجا نمایش داده می‌شود.' : 'Select a tool above to see its controls here.'}</div>}</div><div className="mt-3 shrink-0 space-y-2 border-t border-white/[.08] pt-3"><button type="button" onClick={() => chooseTool('trim')} className={cn('flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] text-sm font-semibold text-white hover:bg-white/[.08]', activeTool === 'trim' && 'border-brand-pink/40 bg-brand-pink/10')}><Scissors className="h-4 w-4" />{labels.editVideo}</button><p className="text-center text-[11px] text-ink-400">{labels.duration}: {duration.toFixed(1)}s</p></div></aside>
    </div>
  );

  const shareStep = (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0e12] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[.08] px-4 sm:px-6"><button type="button" onClick={() => setStep('edit')} aria-label={labels.back} className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button><h2 className="text-base font-semibold">{isPersian ? 'ریلز جدید' : 'New reel'}</h2><button type="button" onClick={requestExit} aria-label={labels.close} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-300 hover:bg-white/10"><X className="h-5 w-5" /></button></header>
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(18rem,.82fr)_minmax(0,1.18fr)]">
        <section className="flex flex-col items-center border-b border-white/[.08] p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div ref={previewFrameRef} onPointerMove={handleOverlayPointerMove} onPointerUp={handleOverlayPointerUp} onPointerCancel={handleOverlayPointerUp} className="relative aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-[1.6rem] border border-white/10 bg-black shadow-2xl"><video ref={videoRef} src={mediaUrl} muted playsInline autoPlay loop onLoadedMetadata={(event) => handleVideoMetadata(event.currentTarget)} onTimeUpdate={handleTimeUpdate} className="h-full w-full object-cover" style={{ filter: activeFilter.css }} />{posterUrl && <img src={posterUrl} alt="Selected reel cover" className="absolute inset-0 h-full w-full object-cover" />}{renderOverlays(false)}<button type="button" onClick={captureCover} className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><ImagePlus className="h-4 w-4" />{labels.cover}</button><span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] text-white"><Clock3 className="mr-1 inline h-3 w-3" />{(trimEnd - trimStart).toFixed(1)}s</span></div>
          <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-ink-400">{labels.coverHint}</p>
        </section>
        <section className="space-y-5 p-4 sm:p-6 lg:overflow-y-auto lg:p-8">
          <div><label htmlFor="reel-caption" className="mb-2 block text-sm font-semibold text-white">{labels.caption}</label><textarea id="reel-caption" value={caption} onChange={(event) => setCaption(event.target.value.slice(0, 500))} placeholder={labels.captionHint} rows={4} maxLength={500} className="w-full resize-y rounded-2xl border border-white/10 bg-white/[.035] p-4 text-sm leading-relaxed text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50"/><div className="mt-1 text-right text-[10px] text-ink-500">{caption.length}/500</div></div>
          <div><label htmlFor="reel-artwork-tag" className="mb-2 block text-sm font-semibold text-white">{labels.artworkTag}<span className="ms-1 text-brand-pink">*</span></label><select id="reel-artwork-tag" required value={artworkTag} onChange={(event) => { setArtworkTag(event.target.value); setPublishError(''); }} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#17191f] px-3 text-sm text-white outline-none focus:border-brand-pink/50"><option value="" disabled>{labels.chooseArtworkTag}</option>{artworkTagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>{publishError && <p role="alert" className="mt-2 text-xs text-rose-300">{publishError}</p>}</div>
          <div><p className="mb-2 text-sm font-semibold text-white">{labels.audience}</p><div className="grid grid-cols-2 gap-2">{(['everyone', 'followers'] as const).map((option) => <button type="button" key={option} aria-pressed={audience === option} onClick={() => setAudience(option)} className={cn('flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm transition', audience === option ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : 'border-white/10 bg-white/[.025] text-ink-300')}><span>{option === 'everyone' ? labels.everyone : labels.followers}</span>{audience === option && <Check className="h-4 w-4 text-brand-pink" />}</button>)}</div></div>
          <button type="button" onClick={() => setExpandedSettings((value) => !value)} aria-expanded={expandedSettings} className="flex min-h-12 w-full items-center justify-between border-b border-white/[.08] text-left text-sm font-semibold text-white"><span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-brand-pink" />{labels.settings}</span><ChevronDown className={cn('h-4 w-4 transition-transform', expandedSettings && 'rotate-180')} /></button>
          {expandedSettings && <div className="space-y-1">{[[labels.comments, allowComments, setAllowComments], [labels.downloads, allowDownloads, setAllowDownloads]] .map(([label, value, setter]) => <button type="button" key={String(label)} onClick={() => (setter as (next: boolean) => void)(!(value as boolean))} className="flex min-h-12 w-full items-center justify-between border-b border-white/[.05] text-sm text-ink-200"><span>{label as string}</span><span className={cn('h-6 w-11 rounded-full p-1 transition-colors', value ? 'bg-brand-pink' : 'bg-white/15')}><span className={cn('block h-4 w-4 rounded-full bg-white transition-transform', value && 'translate-x-5')} /></span></button>)}<div className="flex min-h-12 items-center justify-between border-b border-white/[.05] text-sm text-ink-500"><span>{labels.location}</span><span className="text-xs">{isPersian ? 'به‌زودی' : 'Coming soon'}</span></div><div className="flex min-h-12 items-center justify-between text-sm text-ink-500"><span>{labels.aiLabel}</span><span className="text-xs">{isPersian ? 'به‌زودی' : 'Coming soon'}</span></div></div>}
          <div className="hidden items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-xs text-ink-300 sm:flex"><Music2 className="h-4 w-4 text-brand-pink" />{muted ? labels.soundOff : labels.soundOn}<span className="ml-auto rounded-full bg-white/[.06] px-2 py-1">{activeFilter.name}</span></div>
        </section>
      </div>
      <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-white/[.08] bg-[#0d0e12] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8"><button type="button" onClick={saveDraft} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25272e] px-4 text-sm font-semibold text-white transition hover:bg-[#30323a]"><Download className="h-4 w-4" />{draftToast ? labels.draftSaved : labels.saveDraft}</button><button type="button" disabled={isPublishing} onClick={handlePublish} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-glow-brand disabled:cursor-wait disabled:opacity-60">{isPublishing ? labels.sharing : labels.share}<ArrowRight className="h-4 w-4" /></button></footer>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-stretch justify-center bg-black/75 text-white backdrop-blur-xl lg:items-center lg:p-8" role="dialog" aria-modal="true" aria-label={step === 'edit' ? labels.edit : isPersian ? 'جزئیات انتشار ریل' : 'Reel publishing details'}>
      <div className="relative h-[100dvh] w-full overflow-hidden bg-black lg:h-[min(90dvh,900px)] lg:max-w-6xl lg:rounded-[1.75rem] lg:border lg:border-white/10 lg:shadow-2xl"><canvas ref={posterCanvasRef} className="hidden" />{step === 'edit' ? editorStep : shareStep}</div>
      {exitPromptOpen && <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby="reel-discard-title" className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#17191f] p-5 shadow-2xl"><h3 id="reel-discard-title" className="text-lg font-semibold text-white">{labels.discardTitle}</h3><p className="mt-2 text-sm leading-relaxed text-ink-300">{labels.discardMessage}</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" autoFocus onClick={() => setExitPromptOpen(false)} className="min-h-11 rounded-full border border-white/10 bg-white/[.04] px-3 text-sm font-semibold text-white hover:bg-white/[.08]">{labels.keepEditing}</button><button type="button" onClick={onBack} className="min-h-11 rounded-full bg-rose-500/90 px-3 text-sm font-semibold text-white hover:bg-rose-500">{labels.discard}</button></div></section></div>}
    </div>,
    document.body,
  );
}
