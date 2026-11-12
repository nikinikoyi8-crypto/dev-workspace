import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, ImagePlus, Layers3, Palette, Paintbrush, PaintBucket, RotateCcw, RotateCw, ShieldCheck, Sparkles, Type, Upload, X } from 'lucide-react';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLanguage } from '@/context/useLanguage';
import { useStories } from '@/context/StoriesContext';
import { useOnboarding } from '@/context/OnboardingContext';
import type { StoryAudience, StoryFrame, StoryMediaType, StoryProcess } from '@/services/storyService';
import { canonicalizeUserKey } from '@/services/storyService';
import StoryEditorCanvas from '@/components/stories/StoryEditorCanvas';
import type { StoryEditorCanvasHandle } from '@/components/stories/StoryEditorCanvas';
import StoryCamera from '@/components/stories/StoryCamera';
import StoryToolbar from '@/components/stories/StoryToolbar';
import StoryStickerTray from '@/components/stories/StoryStickerTray';
import { extractDominantColors } from '@/components/stories/extractPalette';
import { useStoryLayers } from '@/components/stories/useStoryLayers';
import type { StoryFont, StoryLayerData, StoryPoint, StoryTextAlign, StoryStickerKind } from '@/components/stories/useStoryLayers';
import { createTextMomentUrl, prepareStoryMedia } from '@/components/stories/storyMedia';
import { AUTO_APPROVE_VERIFICATION } from '@/lib/verification';
import { useStoryViewport } from '@/components/stories/useStoryViewport';
import { ART_DISCIPLINES, FALLBACK_PRACTICE_QUESTIONS, PRACTICE_QUESTIONS } from '@/data/categories';
import { localizedDisciplineLabel } from '@/data/disciplineTranslations';
import { localizePracticeQuestion } from '@/data/practiceTranslations';
import StoryMobileLayout from '@/components/stories/StoryMobileLayout';
import StoryTabletLayout from '@/components/stories/StoryTabletLayout';
import StoryDesktopLayout from '@/components/stories/StoryDesktopLayout';
import StoryTextToolbar from '@/components/stories/StoryTextToolbar';
import PostComposerLayout from '../PostComposerLayout';

interface StoryDraft { file?: File; mediaUrl: string; type: StoryMediaType; recordedDurationSeconds?: number; }
type ComposerStep = 'start' | 'edit' | 'done';
type MomentKind = 'finished' | 'process' | 'sketch' | 'note';
type ToolPanel = 'filters' | 'color' | 'publish' | null;
interface RecentMedia { id: string; url: string; type: StoryMediaType; file: File; }
interface ProcessFrameDraft { file: File; type: StoryMediaType; label: string; }
interface PostCropSettings { zoom: number; x: number; y: number; }
interface PostSlideDraft { url: string; type: 'image' | 'video'; name: string; file: File; }
interface StoryComposerProps {
  onClose: () => void;
  variant?: 'story' | 'post';
  initialFiles?: File[];
  initialCamera?: boolean;
  onPostPublish?: (post: { caption: string; artworkTag: string; media: Array<{ url: string; type: 'image' | 'video'; posterUrl?: string }> }) => void;
}

const MOMENT_DEFAULTS: Record<MomentKind, { process: string; filter: string; background: string; accent: string; font: StoryFont }> = {
  finished: { process: 'finished', filter: 'none', background: 'violet-hour', accent: '#b493ff', font: 'editorial' },
  process: { process: 'workInProgress', filter: 'warm', background: 'studio-dawn', accent: '#ff8a3d', font: 'modern' },
  sketch: { process: 'sketch', filter: 'mono', background: 'paper-cream', accent: '#382c44', font: 'handwritten' },
  note: { process: 'behindScenes', filter: 'none', background: 'ink-plum', accent: '#e84f9b', font: 'editorial' },
};

const STORY_BACKGROUND_CHOICES = [
  { value: '#000000', label: 'bgBlack', color: '#000000' },
  { value: '#ffffff', label: 'bgPaperCream', color: '#ffffff' },
  { value: '#211827', label: 'bgPlum', color: '#211827' },
  { value: '#382c44', label: 'bgMauve', color: '#382c44' },
  { value: '#243b55', label: 'bgViolet', color: '#243b55' },
  { value: 'gradient:sunset-wash', label: 'bgSunset', color: 'linear-gradient(135deg,#ff8a3d,#e84f9b 52%,#7b45e8)' },
  { value: 'gradient:violet-hour', label: 'bgViolet', color: 'linear-gradient(145deg,#7548c8,#251834 58%,#11101c)' },
  { value: 'gradient:studio-dawn', label: 'bgDawn', color: 'linear-gradient(145deg,#ffbe7e,#7d4260 52%,#17121f)' },
];

async function cropPostImage(file: File, crop: PostCropSettings, errorMessage: string): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const targetRatio = 1;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    if (sourceWidth / sourceHeight > targetRatio) sourceWidth = sourceHeight * targetRatio;
    else sourceHeight = sourceWidth / targetRatio;
    sourceWidth /= crop.zoom;
    sourceHeight /= crop.zoom;
    const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceWidth, (image.naturalWidth - sourceWidth) * crop.x / 100));
    const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceHeight, (image.naturalHeight - sourceHeight) * crop.y / 100));
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(errorMessage);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .94));
    if (!blob) throw new Error(errorMessage);
    const fileName = file.name.replace(/\.[^.]+$/, '') || 'artwork';
    return new File([blob], `${fileName}-crop.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function StartScreen({ t, onUpload, onCamera, onText, onKind, recent, onRecent, variant = 'story' }: {
  t: (key: string) => string; onUpload: () => void; onCamera: () => void; onText: () => void;
  onKind: (kind: MomentKind) => void; recent: RecentMedia[]; onRecent: (media: RecentMedia) => void; variant?: 'story' | 'post';
}) {
  const kinds: Array<{ kind: MomentKind; icon: typeof Sparkles; key: string }> = [
    { kind: 'finished', icon: Sparkles, key: 'finished' }, { kind: 'process', icon: Paintbrush, key: 'process' },
    { kind: 'sketch', icon: Layers3, key: 'sketch' }, { kind: 'note', icon: Type, key: 'note' },
  ];
  return <div className="mx-auto w-full max-w-3xl space-y-7 pb-5">
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(ellipse_at_70%_5%,rgba(232,79,155,.2),transparent_40%),linear-gradient(145deg,#211827,#100c15)] p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ink-950/20 via-ink-950/55 to-ink-950/90" />
      <div className="relative z-10">
      <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-brand-pink">{t('stories.composer.eyebrow')}</p>
      <h3 className="mt-2 max-w-lg font-editorial text-3xl text-white sm:text-4xl">{t('stories.composer.studioTitle')}</h3>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-200">{t('stories.composer.studioHint')}</p>
      <div className={variant === 'post' ? 'mt-6 grid grid-cols-2 gap-2 sm:max-w-lg sm:gap-3' : 'mt-6 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3'}>
        <button type="button" onClick={onCamera} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/20 text-xs font-semibold text-white transition hover:border-brand-pink/40 hover:bg-white/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"><Camera className="h-5 w-5 text-brand-orange" />{variant === 'post' ? 'Camera' : t('stories.composer.cameraOption')}</button>
        <button type="button" onClick={onUpload} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/20 text-xs font-semibold text-white transition hover:border-brand-pink/40 hover:bg-white/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"><Upload className="h-5 w-5 text-brand-pink" />{variant === 'post' ? 'Gallery' : t('stories.composer.uploadOption')}</button>
        {variant !== 'post' && (
          <button type="button" onClick={onText} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/20 text-xs font-semibold text-white transition hover:border-brand-pink/40 hover:bg-white/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"><Type className="h-5 w-5 text-brand-purple" />{t('stories.composer.textOption')}</button>
        )}
      </div>
      </div>
    </div>
    {variant !== 'post' && (
      <>
        <section>
          <div className="mb-3"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand-pink">{t('stories.composer.momentTypeEyebrow')}</p><h3 className="mt-1 font-editorial text-xl text-white">{t('stories.composer.momentTypeTitle')}</h3></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{kinds.map(({ kind, icon: Icon, key }) => <button key={kind} type="button" onClick={() => onKind(kind)} className="group min-h-28 rounded-2xl border border-white/10 bg-ink-900/70 p-4 text-start transition hover:-translate-y-0.5 hover:border-brand-pink/40 hover:bg-ink-850 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"><Icon className="h-5 w-5 text-brand-pink transition group-hover:scale-110" /><span className="mt-3 block text-sm font-semibold text-white">{t(`stories.composer.kind_${key}`)}</span><span className="mt-1 block text-[11px] leading-relaxed text-ink-400">{t(`stories.composer.kindHint_${key}`)}</span></button>)}</div>
        </section>
        <section><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-ink-400">{t('stories.composer.recentEyebrow')}</p><h3 className="mt-1 font-editorial text-xl text-white">{t('stories.composer.recentTitle')}</h3></div><span className="text-[10px] text-ink-500">{t('stories.composer.recentSession')}</span></div>
          {recent.length ? <div className="flex gap-3 overflow-x-auto pb-2">{recent.map((item) => <button key={item.id} type="button" onClick={() => onRecent(item)} aria-label={t('stories.composer.useRecent')} className="group relative aspect-[9/12] w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"><img src={item.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />{item.type === 'video' && <span className="absolute bottom-2 end-2 rounded-full bg-black/60 px-2 py-1 text-[9px] text-white">{t('stories.composer.video')}</span>}</button>)}</div> : <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-dashed border-white/10 px-4 text-xs text-ink-400"><ImagePlus className="h-5 w-5 text-ink-500" />{t('stories.composer.recentEmpty')}</div>}
        </section>
      </>
    )}
  </div>;
}

export default function StoryComposer({ onClose, variant = 'story', initialFiles = [], initialCamera = false, onPostPublish }: StoryComposerProps) {
  const { t, lang } = useLanguage();
  const { addStory } = useStories();
  const { state: profile, auth, update } = useOnboarding();
  const viewport = useStoryViewport();
  const [step, setStep] = useState<ComposerStep>('start');
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [recent, setRecent] = useState<RecentMedia[]>([]);
  const recentRef = useRef<RecentMedia[]>([]);
  const priorRecentRef = useRef<RecentMedia[]>([]);
  const [pendingMomentKind, setPendingMomentKind] = useState<MomentKind | null>(null);
  const [activeMomentKind, setActiveMomentKind] = useState<MomentKind | null>(null);
  const [processMode, setProcessMode] = useState(false);
  const [processFrames, setProcessFrames] = useState<ProcessFrameDraft[]>([]);
  const [nextProcessLabel, setNextProcessLabel] = useState<'coloring' | 'final'>('coloring');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [moodFilter, setMoodFilter] = useState('none');
  const [mediaTransform, setMediaTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [drawMode, setDrawMode] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(8);
  const [eraser, setEraser] = useState(false);
  const [stickerTrayOpen, setStickerTrayOpen] = useState(false);
  const [toolPanel, setToolPanel] = useState<ToolPanel>(null);
  const [backgroundSheetOpen, setBackgroundSheetOpen] = useState(false);
  const [cameraSheetOpen, setCameraSheetOpen] = useState(false);
  const [gallerySheetOpen, setGallerySheetOpen] = useState(false);
  const [palette, setPalette] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [artworkTag, setArtworkTag] = useState('');
  const [postSlides, setPostSlides] = useState<PostSlideDraft[]>([]);
  const postSlidesRef = useRef<PostSlideDraft[]>([]);
  const initialPostFilesStartedRef = useRef(false);
  const [activePostSlide, setActivePostSlide] = useState(0);
  const [postWarning, setPostWarning] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSettings, setCropSettings] = useState<PostCropSettings>({ zoom: 1, x: 50, y: 50 });
  const [audience, setAudience] = useState<StoryAudience>('everyone');
  const [durationHours, setDurationHours] = useState<6 | 12 | 24 | 48>(24);
  const [frame, setFrame] = useState<StoryFrame>('none');
  const [mediaBackground, setMediaBackground] = useState<'solid' | 'blur'>('solid');
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#000000');
  const [mediaFitMode, setMediaFitMode] = useState<'fill' | 'fit'>('fill');
  const [verificationRequested, setVerificationRequested] = useState(profile.verificationRequested);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [mobileViewportHeight] = useState(() => typeof window === 'undefined' ? 0 : window.innerHeight);
  const [previewMode, setPreviewMode] = useState<'ring' | 'viewer'>('ring');
  const [sectionOpen, setSectionOpen] = useState<'tools' | 'details' | 'publish'>('tools');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mobileTextInputRef = useRef<HTMLTextAreaElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const processFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<StoryEditorCanvasHandle>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const discardDialogRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const verificationPromiseRef = useRef<Promise<boolean> | null>(null);
  const editor = useStoryLayers();
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const isTextOnly = draft !== null && !draft.file;
  const canPublish = auth.isAuthenticated && (verificationRequested || profile.verificationRequested);
  const formatLabel = useCallback((template: string, values: Record<string, string>) => Object.entries(values).reduce((label, [key, value]) => label.replace(`{${key}}`, value), template), []);
  const resetMediaChoice = () => { setPendingMomentKind(null); setActiveMomentKind(null); setProcessMode(false); setProcessFrames([]); };
  const postArtworkTagOptions = [...new Set(profile.disciplines.flatMap((disciplineId) => {
    const questions = PRACTICE_QUESTIONS[disciplineId] ?? (disciplineId.startsWith('custom:') ? [] : FALLBACK_PRACTICE_QUESTIONS);
    return questions.flatMap((question) => {
      const answers = profile.practiceAnswers[question.id] ?? [];
      const localizedOptions = localizePracticeQuestion(question, lang).options;
      return answers.map((answer) => localizedOptions[question.options.indexOf(answer)] ?? answer);
    });
  }))];
  const onUpload = () => {
    resetMediaChoice();
    setGallerySheetOpen(true);
  };
  const onNativeCamera = (source: 'photo' | 'video') => {
    setCameraSheetOpen(false);
    const input = source === 'photo' ? cameraPhotoInputRef.current : cameraVideoInputRef.current;
    input?.click();
  };
  const onGalleryFilter = (filter: 'all' | 'photos' | 'videos') => {
    const input = galleryInputRef.current;
    if (!input) return;
    input.accept = filter === 'photos' ? 'image/*' : filter === 'videos' ? 'video/*' : 'image/*,video/*';
    setGallerySheetOpen(false);
    input.click();
  };
  const chooseCanvasBackground = (value: string) => {
    setCanvasBackgroundColor(value);
    const backgroundLayer = editor.layers.find((layer) => layer.type === 'background');
    if (backgroundLayer) editor.updateLayer(backgroundLayer.id, { data: { backgroundKind: 'solid', backgroundValue: value } });
    setDirty(true);
  };

  const requestClose = useCallback((destination: 'close' | 'start' = 'close') => {
    if (step === 'done') { onClose(); return; }
    if (dirty && step === 'edit') { setDiscardPrompt(true); return; }
    if (destination === 'start') { setStep('start'); return; }
    onClose();
  }, [dirty, onClose, step]);
  useCloseOnBackButton(true, requestClose);
  useFocusTrap(shellRef, !discardPrompt && !stickerTrayOpen && !toolPanel, requestClose);
  useFocusTrap(discardDialogRef, discardPrompt, () => setDiscardPrompt(false));
  useFocusTrap(sheetRef, !!toolPanel, () => setToolPanel(null));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape' && target.isContentEditable) return;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === 'Escape') { event.preventDefault(); requestClose(); return; }
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) editorRef.current.redo(); else editorRef.current.undo();
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && editorRef.current.selectedId) {
        event.preventDefault(); editorRef.current.deleteLayer(editorRef.current.selectedId); setDirty(true);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', keydown); };
  }, [requestClose]);

  useEffect(() => {
    const viewportMeta = window.visualViewport;
    if (!viewportMeta) return;
    const updateInset = () => setKeyboardInset(Math.max(0, mobileViewportHeight - viewportMeta.height - viewportMeta.offsetTop));
    updateInset();
    viewportMeta.addEventListener('resize', updateInset);
    viewportMeta.addEventListener('scroll', updateInset);
    return () => { viewportMeta.removeEventListener('resize', updateInset); viewportMeta.removeEventListener('scroll', updateInset); };
  }, [mobileViewportHeight]);

  useEffect(() => {
    if (!draft?.file || draft.type !== 'image') { setPalette([]); return; }
    let cancelled = false;
    void extractDominantColors(draft.file).then((colors) => { if (!cancelled) setPalette(colors); });
    return () => { cancelled = true; };
  }, [draft?.file, draft?.type]);

  useEffect(() => {
    const retainedIds = new Set(recent.map((item) => item.id));
    priorRecentRef.current.filter((item) => !retainedIds.has(item.id)).forEach((item) => URL.revokeObjectURL(item.url));
    priorRecentRef.current = recent;
    recentRef.current = recent;
  }, [recent]);
  useEffect(() => () => recentRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  const applyKind = (kind: MomentKind) => {
    setPendingMomentKind(kind);
    setActiveMomentKind(kind);
    setProcessMode(kind === 'process');
    setProcessFrames([]);
    setNextProcessLabel('coloring');
    const defaults = MOMENT_DEFAULTS[kind];
    setMoodFilter(defaults.filter);
    setBrushColor(defaults.accent);
    setCaption('');
    setFrame(kind === 'sketch' ? 'paper' : 'none');
    editor.resetLayers();
    editor.addBackground(kind === 'note' ? 'solid' : kind === 'sketch' ? 'paper' : 'gradient', defaults.background);
    setDirty(true);
    if (kind === 'note') setDraft({ mediaUrl: createTextMomentUrl(), type: 'image' });
  };

  const prepareFile = useCallback(async (file?: File, recordedDurationSeconds?: number) => {
    if (!file) return;
    setError(''); setProcessing(true);
    try {
      const prepared = await prepareStoryMedia(file, {
        unsupported: t('stories.composer.unsupportedFile'), imageTooLarge: t('stories.composer.imageTooLarge'),
        videoTooLarge: t('stories.composer.videoTooLarge'), videoTooLong: variant === 'post' ? t('stories.composer.postVideoTooLong') : t('stories.composer.videoTooLong'),
        couldNotRead: t('stories.composer.couldNotRead'),
      }, recordedDurationSeconds, variant === 'post' ? 15 : 60);
      const mediaUrl = URL.createObjectURL(prepared.file);
      const recentItem = { id: `${Date.now()}-${Math.random()}`, url: URL.createObjectURL(prepared.file), type: prepared.type, file: prepared.file };
      const nextRecent = [recentItem, ...recentRef.current].slice(0, 8);
      recentRef.current = nextRecent;
      setRecent(nextRecent);
      setDraft({ file: prepared.file, mediaUrl, type: prepared.type, recordedDurationSeconds: prepared.durationSeconds });
      setStep('edit'); setDirty(true);
      const selectedKind = pendingMomentKind;
      const defaults = selectedKind ? MOMENT_DEFAULTS[selectedKind] : { process: '', filter: 'none', background: 'ink-black', accent: '#ffffff', font: 'editorial' as const };
      setMoodFilter(defaults.filter); setMediaTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
      setMediaFitMode('fill');
      setBrushColor(defaults.accent);
      editorRef.current.resetLayers();
      if (selectedKind) {
        editorRef.current.addBackground(selectedKind === 'sketch' ? 'paper' : selectedKind === 'note' ? 'solid' : 'gradient', defaults.background);
        if (selectedKind === 'finished') editorRef.current.addSticker('process', { process: t('stories.stickers.finished') });
        if (selectedKind === 'process') editorRef.current.addSticker('process', { process: t('stories.stickers.workInProgress') });
        if (selectedKind === 'sketch') editorRef.current.addSticker('process', { process: t('stories.stickers.sketch') });
      }
      setPendingMomentKind(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('stories.composer.couldNotRead'));
    } finally { setProcessing(false); }
  }, [pendingMomentKind, t, variant]);

  const preparePostFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setStep('edit');
    const currentSlides = postSlidesRef.current;
    const remaining = Math.max(0, 10 - currentSlides.length);
    if (files.length > remaining) setPostWarning(t('stories.composer.postMaxSlides'));
    const acceptedFiles = files.slice(0, remaining);
    if (!acceptedFiles.length) return;
    setProcessing(true);
    setError('');
    try {
      const preparedSlides = await Promise.all(acceptedFiles.map(async (file) => {
        const prepared = await prepareStoryMedia(file, {
          unsupported: t('stories.composer.unsupportedFile'), imageTooLarge: t('stories.composer.imageTooLarge'),
          videoTooLarge: t('stories.composer.videoTooLarge'), videoTooLong: t('stories.composer.postVideoTooLong'),
          couldNotRead: t('stories.composer.couldNotRead'),
        }, undefined, 15);
        return {
          file: prepared.file,
          url: URL.createObjectURL(prepared.file),
          type: prepared.type,
          name: prepared.file.name,
        } satisfies PostSlideDraft;
      }));
      const nextSlides = [...postSlidesRef.current, ...preparedSlides].slice(0, 10);
      postSlidesRef.current = nextSlides;
      setPostSlides(nextSlides);
      if (!currentSlides.length && nextSlides[0]) {
        setDraft({ file: nextSlides[0].file, mediaUrl: nextSlides[0].url, type: nextSlides[0].type });
        setActivePostSlide(0);
        setDirty(true);
      } else setDirty(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('stories.composer.couldNotRead'));
    } finally {
      setProcessing(false);
    }
  }, [t]);

  useEffect(() => {
    if (!initialFiles.length || initialPostFilesStartedRef.current || step !== 'start' || variant !== 'post') return;
    initialPostFilesStartedRef.current = true;
    void preparePostFiles(initialFiles);
  }, [initialFiles, preparePostFiles, step, variant]);

  useEffect(() => {
    if (initialCamera && variant === 'post' && step === 'start') setCameraSheetOpen(true);
  }, [initialCamera, step, variant]);

  useEffect(() => {
    if (step !== 'start' || viewport === 'mobile') return;
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith('image/'))?.getAsFile();
      if (file) { event.preventDefault(); void prepareFile(file); }
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [prepareFile, step, viewport]);

  const startTextMoment = () => {
    setPendingMomentKind('note');
    applyKind('note');
    setDraft({ mediaUrl: createTextMomentUrl(), type: 'image' });
    setStep('edit');
  };
  const handleDrop = (event: React.DragEvent<HTMLElement>) => { event.preventDefault(); setDragging(false); setPendingMomentKind(null); setActiveMomentKind(null); setProcessMode(false); setProcessFrames([]); void prepareFile(event.dataTransfer.files[0]); };
  const addProcessFrame = async (file?: File) => {
    if (!file) return;
    setProcessing(true);
    try {
      const prepared = await prepareStoryMedia(file, {
        unsupported: t('stories.composer.unsupportedFile'), imageTooLarge: t('stories.composer.imageTooLarge'),
        videoTooLarge: t('stories.composer.videoTooLarge'), videoTooLong: t('stories.composer.videoTooLong'),
        couldNotRead: t('stories.composer.couldNotRead'),
      });
      setProcessFrames((current) => [...current, { file: prepared.file, type: prepared.type, label: t(`stories.composer.process_${nextProcessLabel}`) }]);
      setNextProcessLabel(nextProcessLabel === 'coloring' ? 'final' : 'coloring');
      setDirty(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('stories.composer.couldNotRead'));
    } finally { setProcessing(false); }
  };
  const addText = () => {
    const id = editor.addTextLayer();
    const font: StoryFont = lang === 'fa' ? 'vazirmatn' : activeMomentKind ? MOMENT_DEFAULTS[activeMomentKind].font : 'editorial';
    editor.updateLayer(id, { data: { text: '', font, fontSize: 28, color: '#ffffff', align: 'center', highlight: false } });
    setEditingTextId(id);
    setDirty(true);
  };
  const updateTextLayer = (id: string, patch: { text?: string; font?: StoryFont; color?: string; align?: StoryTextAlign; highlight?: boolean }) => { editor.updateLayer(id, { data: patch }); setDirty(true); };
  const addSticker = (kind: StoryStickerKind, data: StoryLayerData) => {
    editor.addSticker(kind, data);
    setStickerTrayOpen(false);
    setDirty(true);
  };
  const updateSelectedSticker = (data: StoryLayerData) => {
    const selectedSticker = editor.selectedLayer?.type === 'sticker' ? editor.selectedLayer : null;
    if (!selectedSticker) return;
    editor.updateLayer(selectedSticker.id, { data });
    setDirty(true);
  };
  const closeStickerTray = useCallback(() => setStickerTrayOpen(false), []);
  const updateSticker = (id: string, patch: Partial<StoryLayerData>) => { editor.updateLayer(id, { data: patch }); setDirty(true); };
  const handleStroke = (points: StoryPoint[], color: string, size: number, useEraser: boolean) => { editor.addStroke({ points, brushColor: color, brushSize: size, eraser: useEraser }); setDirty(true); };

  const selectPostSlide = (index: number) => {
    const slide = postSlides[index];
    if (!slide) return;
    setActivePostSlide(index);
    setDraft({ file: slide.file, mediaUrl: slide.url, type: slide.type });
  };
  const movePostSlide = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= postSlides.length) return;
    const nextSlides = [...postSlides];
    [nextSlides[index], nextSlides[targetIndex]] = [nextSlides[targetIndex], nextSlides[index]];
    postSlidesRef.current = nextSlides;
    setPostSlides(nextSlides);
    if (activePostSlide === index) setActivePostSlide(targetIndex);
    else if (activePostSlide === targetIndex) setActivePostSlide(index);
    setDirty(true);
  };
  const removePostSlide = (index: number) => {
    const removedSlide = postSlides[index];
    if (!removedSlide) return;
    const nextSlides = postSlides.filter((_, slideIndex) => slideIndex !== index);
    postSlidesRef.current = nextSlides;
    setPostSlides(nextSlides);
    URL.revokeObjectURL(removedSlide.url);
    if (!nextSlides.length) {
      setActivePostSlide(0);
      setDraft(null);
      setDirty(true);
      return;
    }
    const nextActiveIndex = activePostSlide > index ? activePostSlide - 1 : activePostSlide === index ? Math.min(index, nextSlides.length - 1) : activePostSlide;
    setActivePostSlide(nextActiveIndex);
    const active = nextSlides[nextActiveIndex];
    setDraft({ file: active.file, mediaUrl: active.url, type: active.type });
    setDirty(true);
  };
  const applyPostCrop = async () => {
    const activeSlide = postSlides[activePostSlide];
    if (!activeSlide || activeSlide.type !== 'image') return;
    setProcessing(true);
    try {
      const croppedFile = await cropPostImage(activeSlide.file, cropSettings, t('stories.composer.couldNotRead'));
      const croppedSlide: PostSlideDraft = { file: croppedFile, url: URL.createObjectURL(croppedFile), type: 'image', name: croppedFile.name };
      const nextSlides = postSlides.map((slide, index) => index === activePostSlide ? croppedSlide : slide);
      postSlidesRef.current = nextSlides;
      setPostSlides(nextSlides);
      setDraft({ file: croppedFile, mediaUrl: croppedSlide.url, type: 'image' });
      setCropOpen(false);
      setCropSettings({ zoom: 1, x: 50, y: 50 });
      setDirty(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('stories.composer.couldNotRead'));
    } finally {
      setProcessing(false);
    }
  };

  const publishMoment = async () => {
    const currentDraft = draft;
    if (!currentDraft || saving || processing) return;
    if (!auth.isAuthenticated) { setError(t('stories.composer.signInToPublish')); return; }
    if (variant !== 'post' && !canPublish) {
      try {
        const verifiedForPublish = await requestVerification();
        if (!verifiedForPublish) return;
      } catch {
        setError(t('stories.composer.verificationFailed'));
        return;
      }
    }
    setSaving(true); setError('');
    try {
      if (variant === 'post') {
        if (!postArtworkTagOptions.includes(artworkTag)) {
          setError(t('stories.composer.artworkDetailsRequired'));
          setSaving(false);
          return;
        }
        const media = postSlides.map((slide) => ({ url: slide.url, type: slide.type }));
        onPostPublish?.({ caption, artworkTag, media });
        setDirty(false);
        onClose();
        return;
      }
      const preview = await canvasRef.current?.exportImage();
      if (!preview) throw new Error(t('stories.composer.saveFailed'));
      const previewUrl = URL.createObjectURL(preview);
      const isVideo = currentDraft.type === 'video';
      const processGroupId = processMode ? `process-${Date.now()}-${Math.random().toString(36).slice(2)}` : undefined;
      const processTotal = processMode ? processFrames.length + 1 : 0;
      const processMeta = (step: number, label: string): StoryProcess | undefined => processGroupId ? { groupId: processGroupId, step, label, total: processTotal } : undefined;
      await addStory({
        mediaUrl: isVideo ? currentDraft.mediaUrl : previewUrl,
        type: isVideo ? 'video' : 'image', posterUrl: isVideo ? previewUrl : undefined,
        mediaTransform: isVideo ? mediaTransform : { x: 0, y: 0, scale: 1, rotation: 0 }, overlays: isVideo ? editor.layers.filter((layer) => layer.type !== 'background') : undefined,
        moodFilter: isVideo ? moodFilter : 'none', caption, audience, durationHours, frame,
        mediaBackground,
        mediaFitMode: isVideo ? mediaFitMode : 'fill',
        backgroundColor: canvasBackgroundColor,
        ownerId: canonicalizeUserKey(profile.username || profile.email || 'current-artist'),
        username: canonicalizeUserKey(profile.username || profile.email || 'current-artist'),
        artistName: profile.displayName || profile.fullName || profile.username || t('stories.stickers.defaultArtist'),
        artistAvatarUrl: profile.avatarUrl || undefined,
        artistProfileUrl: profile.username ? `/artist/${profile.username}` : '/profile',
        palette,
        process: processMeta(1, t('stories.composer.process_start')),
        artworkCard: (() => {
          const card = editor.layers.find((layer) => layer.type === 'sticker' && layer.data.stickerKind === 'title');
          return card ? { title: card.data.title ?? '', technique: card.data.medium ?? '', dimensions: card.data.dimensions ?? '', year: card.data.year ?? '', profileUrl: card.data.profileUrl || profile.username ? card.data.profileUrl || `/artist/${profile.username}` : '/profile' } : undefined;
        })(),
      });
      for (const [frameIndex, frameDraft] of processFrames.entries()) {
        const frameUrl = URL.createObjectURL(frameDraft.file);
        await addStory({
          mediaUrl: frameUrl,
          type: frameDraft.type,
          posterUrl: undefined,
          caption,
          audience,
          durationHours,
          frame,
          backgroundColor: canvasBackgroundColor,
          ownerId: canonicalizeUserKey(profile.username || profile.email || 'current-artist'),
          username: canonicalizeUserKey(profile.username || profile.email || 'current-artist'),
          artistName: profile.displayName || profile.fullName || profile.username || t('stories.stickers.defaultArtist'),
          artistAvatarUrl: profile.avatarUrl || undefined,
          artistProfileUrl: profile.username ? `/artist/${profile.username}` : '/profile',
          palette,
          process: processMeta(frameIndex + 2, frameDraft.label),
        });
      }
      setStep('done'); setDirty(false);
      window.setTimeout(onClose, 1400);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('stories.composer.saveFailed')); setSaving(false); }
  };

  const requestVerification = useCallback(async (): Promise<boolean> => {
    if (verificationRequested || profile.verificationRequested) return true;
    if (verificationPromiseRef.current) return verificationPromiseRef.current;
    setVerificationBusy(true);
    const request = Promise.resolve().then(async () => {
      try {
        if (AUTO_APPROVE_VERIFICATION) await new Promise((resolve) => window.setTimeout(resolve, 700));
        update({ verificationRequested: true });
        setVerificationRequested(true);
        return true;
      } finally {
        setVerificationBusy(false);
        verificationPromiseRef.current = null;
      }
    });
    verificationPromiseRef.current = request;
    return request;
  }, [profile.verificationRequested, update, verificationRequested]);

  const confirmDiscard = () => {
    setDiscardPrompt(false);
    setDraft(null);
    editor.resetLayers();
    setDirty(false);
    setError('');
    if (variant === 'post') { onClose(); return; }
    setStep('start');
  };
  const shellStyle = { '--story-keyboard-inset': `${keyboardInset}px` } as CSSProperties;
  const toolbarLabels: Record<string, string> = {
    tools: t('stories.editor.tools'), undo: t('stories.editor.undo'), redo: t('stories.editor.redo'), addText: t('stories.editor.addText'),
    background: t('stories.editor.background'), backgrounds: t('stories.editor.backgrounds'), textStyle: t('stories.editor.textStyle'),
    bringFront: t('stories.editor.bringFront'), delete: t('stories.editor.delete'), textPlaceholder: t('stories.editor.textPlaceholder'),
    font: t('stories.editor.font'), editorial: t('stories.editor.editorial'), modern: t('stories.editor.modern'), display: t('stories.editor.display'),
    handwritten: t('stories.editor.handwritten'), vazirmatn: t('stories.editor.vazirmatn'), color: t('stories.editor.color'),
    align_left: t('stories.editor.alignLeft'), align_center: t('stories.editor.alignCenter'), align_right: t('stories.editor.alignRight'),
    highlight: t('stories.editor.highlight'), dragHint: t('stories.editor.dragHint'), selectHint: t('stories.editor.selectHint'),
    toolHint: t('stories.editor.toolHint'), layerCount: t('stories.editor.layerCount'),
    'sunset-wash': t('stories.editor.bgSunset'), 'violet-hour': t('stories.editor.bgViolet'), 'studio-dawn': t('stories.editor.bgDawn'),
    'ink-black': t('stories.editor.bgBlack'), 'ink-plum': t('stories.editor.bgPlum'), 'ink-mauve': t('stories.editor.bgMauve'),
    customBackground: t('stories.editor.customBackground'),
    'paper-cream': t('stories.editor.bgPaperCream'), 'paper-rose': t('stories.editor.bgPaperRose'), 'paper-night': t('stories.editor.bgPaperNight'),
    draw: t('stories.editor.draw'), stickers: t('stories.editor.stickers'), filters: t('stories.editor.filters'), moodFilters: t('stories.editor.moodFilters'),
    filter_none: t('stories.editor.filterNone'), filter_warm: t('stories.editor.filterWarm'), filter_mono: t('stories.editor.filterMono'),
    filter_neon: t('stories.editor.filterNeon'), filter_faded: t('stories.editor.filterFaded'), drawingTools: t('stories.editor.drawingTools'),
    eraser: t('stories.editor.eraser'), brushColor: t('stories.editor.brushColor'), brushSize: t('stories.editor.brushSize'),
    titleCard: t('stories.stickers.titleCard'), artworkTitle: t('stories.stickers.artworkTitle'), artworkTitlePlaceholder: t('stories.stickers.artworkTitlePlaceholder'), artistName: t('stories.stickers.artistName'),
  };
  const stickerLabels: Record<string, string> = {
    stickersEyebrow: t('stories.stickers.eyebrow'), stickerTray: t('stories.stickers.title'), close: t('stories.composer.close'),
    mediumTag: t('stories.stickers.mediumTag'), processBadge: t('stories.stickers.processBadge'), paletteStrip: t('stories.stickers.paletteStrip'),
    paletteUnavailable: t('stories.stickers.paletteUnavailable'), titleCard: t('stories.stickers.titleCard'), artworkTitle: t('stories.stickers.artworkTitle'),
    artworkTitlePlaceholder: t('stories.stickers.artworkTitlePlaceholder'), artistName: t('stories.stickers.artistName'), addTitleCard: t('stories.stickers.addTitleCard'),
    defaultArtworkTitle: t('stories.stickers.defaultArtworkTitle'), defaultArtist: t('stories.stickers.defaultArtist'), workInProgress: t('stories.stickers.workInProgress'),
    sketch: t('stories.stickers.sketch'), finished: t('stories.stickers.finished'), behindScenes: t('stories.stickers.behindScenes'),
    artworkTechnique: t('stories.stickers.artworkTechnique'), artworkTechniqueHint: t('stories.stickers.artworkTechniqueHint'), artworkYear: t('stories.stickers.artworkYear'), artworkDimensions: t('stories.stickers.artworkDimensions'), artworkDimensionsHint: t('stories.stickers.artworkDimensionsHint'), artistProfileLink: t('stories.stickers.artistProfileLink'), artistProfileLinkHint: t('stories.stickers.artistProfileLinkHint'),
    labelStyle: t('stories.stickers.labelStyle'), labelStyle_museum: t('stories.stickers.labelStyle_museum'), labelStyle_paper: t('stories.stickers.labelStyle_paper'), labelStyle_minimal: t('stories.stickers.labelStyle_minimal'),
    showProfileLink: t('stories.stickers.showProfileLink'), updateSticker: t('stories.stickers.updateSticker'), bringFront: t('stories.editor.bringFront'), removeSticker: t('stories.stickers.removeSticker'),
    customPracticeTag: t('stories.stickers.customPracticeTag'), customPracticeTagHint: t('stories.stickers.customPracticeTagHint'), noDisciplines: t('stories.stickers.noDisciplines'), addSticker: t('stories.stickers.addSticker'),
    mediumStyle: t('stories.stickers.mediumStyle'), mediumStyle_soft: t('stories.stickers.mediumStyle_soft'), mediumStyle_gallery: t('stories.stickers.mediumStyle_gallery'), mediumStyle_label: t('stories.stickers.mediumStyle_label'),
  };
  const textToolbarLabels = {
    font: t('stories.editor.font'), editorial: t('stories.editor.editorial'), modern: t('stories.editor.modern'), display: t('stories.editor.display'),
    handwritten: t('stories.editor.handwritten'), vazirmatn: t('stories.editor.vazirmatn'), color: t('stories.editor.color'),
    alignLeft: t('stories.editor.alignLeft'), alignCenter: t('stories.editor.alignCenter'), alignRight: t('stories.editor.alignRight'),
    highlight: t('stories.editor.highlight'), size: t('stories.editor.textSize'), done: t('stories.editor.finishText'),
  };
  const mediaControlLabels = { fit: t('stories.editor.fit'), fill: t('stories.editor.fill'), blur: t('stories.editor.blurBackground'), solid: t('stories.editor.solidBackground'), reset: t('stories.editor.resetMedia'), rotate: t('stories.editor.rotateMedia') };
  const cameraLabels = {
    cameraUnsupported: t('stories.composer.cameraUnsupported'), cameraInsecure: t('stories.composer.cameraInsecure'), cameraUnavailable: t('stories.composer.cameraUnavailable'),
    cameraDenied: t('stories.composer.cameraDenied'), cameraNotFound: t('stories.composer.cameraNotFound'), cameraBusy: t('stories.composer.cameraBusy'),
    cameraConstraints: t('stories.composer.cameraConstraints'), cameraTimeout: t('stories.composer.cameraTimeout'), cameraError: t('stories.composer.cameraError'),
    cameraStarting: t('stories.composer.cameraStarting'), takePhoto: t('stories.composer.takePhoto'), recordVideo: t('stories.composer.recordVideo'),
    stopRecording: t('stories.composer.stopRecording'), cancelCamera: t('stories.composer.closeCamera'), switchCamera: t('stories.composer.switchCamera'),
    torch: t('stories.composer.torch'), chooseLibrary: t('stories.composer.chooseLibrary'), audioUnavailable: t('stories.composer.audioUnavailable'),
    recordingUnsupported: t('stories.composer.recordingUnsupported'), grid: t('stories.composer.grid'), safeZone: t('stories.composer.safeZone'),
    fallbackTitle: t('stories.composer.cameraFallbackTitle'), fallbackHint: t('stories.composer.cameraFallbackHint'),
  };
  const mediumLabels = Object.fromEntries(['Oil on canvas', 'Digital collage', 'Abstract painting', 'Mixed media', 'Fine art photography', 'Generative art'].map((medium) => [medium, t(`stories.stickers.mediums.${medium}`)]));
  const stickerPracticeGroups = profile.disciplines.map((disciplineId) => {
    const category = ART_DISCIPLINES.find((item) => item.id === disciplineId);
    const name = disciplineId.startsWith('custom:') ? disciplineId.slice(7) : category ? localizedDisciplineLabel(category, lang) : disciplineId;
    const questions = PRACTICE_QUESTIONS[disciplineId] ?? (disciplineId.startsWith('custom:') ? [] : FALLBACK_PRACTICE_QUESTIONS);
    const savedAnswers = questions.flatMap((question) => profile.practiceAnswers[question.id] ?? []);
    const relevantSuggestions = questions.flatMap((question) => localizePracticeQuestion(question, lang).options).slice(0, 8);
    const options = [...new Set([...savedAnswers, ...relevantSuggestions])].slice(0, 11);
    return { name, options: [...new Set([...options, name])] };
  });
  const editingTextLayer = editingTextId ? editor.layers.find((layer) => layer.id === editingTextId && layer.type === 'text') ?? null : null;
  const editingTextLayerId = editingTextLayer?.id;
  useEffect(() => {
    if (viewport !== 'mobile' || !editingTextLayerId) return;
    const frame = window.requestAnimationFrame(() => {
      const input = mobileTextInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingTextLayerId, viewport]);
  const finishTextEditing = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.isContentEditable) activeElement.blur();
    setEditingTextId(null);
  };
  const openMobileTextEditor = () => {
    addText();
  };
  const mobileTextComposer = editingTextLayer ? (
    <div data-story-text-editor className="z-[70] shrink-0 space-y-2 border-t border-white/10 bg-ink-950/95 px-3 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">{t('stories.editor.addText')}</span>
        <button type="button" onClick={finishTextEditing} className="min-h-10 rounded-full bg-brand-gradient px-4 text-xs font-semibold text-white">{t('stories.editor.finishText')}</button>
      </div>
      <textarea ref={mobileTextInputRef} value={editingTextLayer.data.text ?? ''} onChange={(event) => updateTextLayer(editingTextLayer.id, { text: event.currentTarget.value.slice(0, 160) })} rows={3} maxLength={160} placeholder={t('stories.editor.textPlaceholder')} aria-label={t('stories.editor.textPlaceholder')} dir={lang === 'fa' ? 'rtl' : 'ltr'} className="min-h-20 max-h-[28dvh] w-full resize-y rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-lg leading-relaxed text-white outline-none placeholder:text-white/50 focus:border-brand-pink/60" />
      <StoryTextToolbar layer={editingTextLayer} labels={textToolbarLabels} isPersian={lang === 'fa'} keyboardInset={keyboardInset} inline={true} onUpdate={(patch) => updateSticker(editingTextLayer.id, patch)} onDone={finishTextEditing} />
    </div>
  ) : null;
  const editorCanvas = draft ? <div className="relative aspect-[9/16] h-full max-h-full w-auto max-w-full overflow-hidden rounded-[1.4rem] border border-white/10 bg-ink-800 shadow-card" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={handleDrop}>
    <StoryEditorCanvas ref={canvasRef} mediaUrl={draft.mediaUrl} mediaType={draft.type} isTextOnly={isTextOnly} layers={editor.layers} selectedId={editor.selectedId} deleteLabel={t('stories.editor.deleteSelection')} textLabel={t('stories.editor.layerText')} textPlaceholder={t('stories.editor.textPlaceholder')} canvasLabel={t('stories.editor.canvas')} transformLabel={t('stories.editor.transform')} direction={lang === 'fa' ? 'rtl' : 'ltr'} moodFilter={moodFilter} mediaTransform={mediaTransform} onMediaTransform={(transform) => { setMediaTransform(transform); setDirty(true); }} drawMode={drawMode} brushColor={brushColor} brushSize={brushSize} eraser={eraser} paletteLabel={t('stories.stickers.paletteStrip')} drawLabel={t('stories.editor.drawingCanvas')} onStroke={handleStroke} onSelect={editor.selectLayer} onUpdateText={(id, text) => updateTextLayer(id, { text })} editingTextId={editingTextId} onEditingTextId={setEditingTextId} onUpdateTextStyle={(id, patch) => { editor.updateLayer(id, { data: patch }); setDirty(true); }} onTransform={(id, transform) => { editor.commitLayer(id, transform); setDirty(true); }} onDelete={(id) => { editor.deleteLayer(id); setDirty(true); }} onDeleteMedia={() => { setDraft(null); editor.resetLayers(); setStep('start'); setDirty(false); setError(''); }} onDirty={() => setDirty(true)} frame={frame} mediaBackground={mediaBackground} mediaFitMode={mediaFitMode} backgroundColor={canvasBackgroundColor} onMediaBackground={() => setMediaBackground((value) => value === 'blur' ? 'solid' : 'blur')} onMediaFitMode={() => { setMediaFitMode((value) => value === 'fill' ? 'fit' : 'fill'); setMediaTransform({ x: 0, y: 0, scale: 1, rotation: 0 }); }} mediaTransformLabel={t('stories.editor.transform')} mediaControlLabels={mediaControlLabels} allowMediaTransform allowLayerTransform />
    {dragging && <div className="absolute inset-0 z-[200] flex items-center justify-center bg-ink-950/70 text-sm font-semibold text-white"><Upload className="me-2 h-5 w-5 text-brand-pink" />{t('stories.composer.dropHere')}</div>}
    {processing && <div role="status" className="absolute inset-0 z-[210] flex items-center justify-center bg-ink-950/70 text-sm text-white"><span className="me-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-brand-pink" />{t('stories.composer.processing')}</div>}
  </div> : <div className="mx-auto flex aspect-[9/16] w-full max-w-[20rem] items-center justify-center rounded-[1.5rem] border border-white/10 bg-ink-950/40 text-ink-400"><ImagePlus className="h-8 w-8" /></div>;

  const verificationBanner = variant === 'post' ? null : <div className="flex items-start gap-3 rounded-2xl border border-brand-pink/15 bg-brand-pink/[.06] p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink"><ShieldCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white">{profile.verificationRequested || verificationRequested ? t('stories.share.requestSubmitted') : t('stories.share.verificationTitle')}</p><p className="mt-1 text-[11px] leading-relaxed text-ink-300">{profile.verificationRequested || verificationRequested ? t('stories.share.requestedBody') : t('stories.share.verificationBody')}</p>{!verificationRequested && !profile.verificationRequested && <button type="button" disabled={verificationBusy} onClick={() => void requestVerification()} className="mt-2 min-h-11 text-xs font-semibold text-brand-pink underline-offset-4 hover:underline disabled:opacity-60">{verificationBusy ? t('stories.share.verifying') : t('stories.share.requestVerification')}</button>}</div><Check className={`mt-1 h-4 w-4 shrink-0 ${verificationRequested || profile.verificationRequested ? 'text-emerald-400' : 'text-ink-500'}`} /></div>;

  const audienceDuration = <div className="space-y-3">
    <fieldset><legend className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-400">{t('stories.share.audience')}</legend><div className="grid grid-cols-2 gap-2">{(['everyone', 'followers'] as const).map((choice) => <button key={choice} type="button" onClick={() => setAudience(choice)} aria-pressed={audience === choice} className={`min-h-11 rounded-xl border px-3 py-2 text-xs transition ${audience === choice ? 'border-brand-pink/50 bg-brand-pink/10 text-white' : 'border-white/10 bg-white/[.03] text-ink-300'}`}>{t(`stories.share.${choice}`)}</button>)}</div></fieldset>
    <fieldset><legend className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-400">{t('stories.share.duration')}</legend><div className="grid grid-cols-4 gap-1.5">{([6, 12, 24, 48] as const).map((value) => <button key={value} type="button" onClick={() => setDurationHours(value)} aria-pressed={durationHours === value} className={`min-h-11 rounded-xl border px-2 text-[10px] transition ${durationHours === value ? 'border-brand-pink/50 bg-brand-gradient text-white' : 'border-white/10 bg-white/[.03] text-ink-300'}`}>{t(`stories.share.hours${value}`)}</button>)}</div></fieldset>
  </div>;

  const processControls = processMode ? <section className="rounded-2xl border border-brand-pink/20 bg-brand-pink/[.05] p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold text-white">{t('stories.composer.processMode')}</p><p className="mt-1 text-[10px] leading-relaxed text-ink-400">{t('stories.composer.processModeHint')}</p></div><span className="rounded-full bg-brand-pink/15 px-2.5 py-1 text-[10px] font-semibold text-brand-pink">{new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en').format(processFrames.length + 1)}</span></div><div className="mt-3 space-y-2">{processFrames.map((frameDraft, frameIndex) => <div key={`${frameDraft.file.name}-${frameIndex}`} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2"><span className="min-w-0 truncate text-[10px] text-ink-200">{frameDraft.label} · {frameDraft.file.name}</span><button type="button" onClick={() => setProcessFrames((current) => current.filter((_, index) => index !== frameIndex))} aria-label={t('stories.composer.removeProcessFrame')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-300 hover:bg-white/10"><X className="h-4 w-4" /></button></div>)}</div><div className="mt-3 flex gap-2"><select value={nextProcessLabel} onChange={(event) => setNextProcessLabel(event.target.value as 'coloring' | 'final')} aria-label={t('stories.composer.processStage')} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-950 px-3 text-xs text-white"><option value="coloring">{t('stories.composer.process_coloring')}</option><option value="final">{t('stories.composer.process_final')}</option></select><button type="button" onClick={() => processFileInputRef.current?.click()} className="min-h-11 rounded-xl bg-white/[.08] px-3 text-[10px] font-semibold text-white hover:bg-white/15">{t('stories.composer.addProcessFrame')}</button></div><input ref={processFileInputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => { void addProcessFrame(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} aria-label={t('stories.composer.addProcessFrame')} /></section> : null;

  const tools = <div className="relative z-[80] flex shrink-0 items-center justify-center border-t border-white/[.07] bg-ink-950/95 px-2 py-2.5 pb-[max(.65rem,env(safe-area-inset-bottom))] lg:hidden">
    <div className="flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button type="button" onClick={openMobileTextEditor} aria-label={t('stories.editor.addText')} className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[9px] text-ink-200 hover:bg-white/[.08]"><Type className="h-4 w-4" />{t('stories.editor.addText')}</button>
      <button type="button" onClick={() => { setStickerTrayOpen(true); setToolPanel(null); }} aria-label={t('stories.editor.stickers')} className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[9px] text-ink-200 hover:bg-white/[.08]"><Layers3 className="h-4 w-4" />{t('stories.editor.stickers')}</button>
      <button type="button" onClick={() => setDrawMode((value) => !value)} aria-pressed={drawMode} className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[9px] ${drawMode ? 'bg-brand-pink/15 text-white' : 'text-ink-200 hover:bg-white/[.08]'}`}><Paintbrush className="h-4 w-4" />{t('stories.editor.draw')}</button>
      <button type="button" onClick={() => { setToolPanel('filters'); setDrawMode(false); }} aria-label={t('stories.editor.filters')} className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[9px] text-ink-200 hover:bg-white/[.08]"><Sparkles className="h-4 w-4" />{t('stories.editor.filters')}</button>
      <button type="button" onClick={() => { setToolPanel('color'); setDrawMode(false); }} aria-label={t('stories.composer.palette')} className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[9px] text-ink-200 hover:bg-white/[.08]"><Palette className="h-4 w-4" />{t('stories.composer.palette')}</button>
      <button type="button" onClick={() => { setBackgroundSheetOpen(true); setToolPanel(null); setDrawMode(false); }} aria-label={t('stories.editor.background')} className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[9px] text-ink-200 hover:bg-white/[.08]"><PaintBucket className="h-4 w-4" />{t('stories.editor.background')}</button>
    </div>
  </div>;

  const mobileDetails = step === 'edit' ? <div className="z-[65] shrink-0 border-t border-white/[.06] bg-ink-950/90 px-3 py-2">
    <label className="flex min-h-11 items-center rounded-full border border-white/10 bg-white/[.04] px-4 focus-within:border-brand-pink/50">
      <input type="text" value={caption} onChange={(event) => { setCaption(event.currentTarget.value.slice(0, 100)); setDirty(true); }} maxLength={100} placeholder={t('stories.share.captionHint')} aria-label={t('stories.share.caption')} dir={lang === 'fa' ? 'rtl' : 'ltr'} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-ink-400" />
    </label>
    {variant !== 'post' && processControls}
  </div> : null;

  const header = <header className="z-[70] flex shrink-0 items-center justify-between border-b border-white/[.07] px-4 py-2.5 sm:px-6">
    <div className="flex items-center gap-2"><button type="button" onClick={() => step === 'edit' ? requestClose('start') : requestClose()} aria-label={step === 'edit' ? t('stories.composer.backToPicker') : t('stories.composer.close')} className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink">{step === 'edit' || variant === 'post' ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}</button><div><p className="hidden text-[9px] font-semibold uppercase tracking-[.2em] text-brand-pink sm:block">{variant === 'post' ? 'ARTISTRY POST STUDIO' : t('stories.composer.eyebrow')}</p><h2 id="story-composer-title" className="font-editorial text-lg text-white">{variant === 'post' ? 'Edit your post' : step === 'edit' ? t('stories.composer.editorTitle') : step === 'done' ? t('stories.share.successTitle') : t('stories.composer.title')}</h2></div></div>
    {step === 'edit' && <div className="flex items-center gap-1">{variant === 'post' && <span className="me-2 inline-flex items-center gap-1 rounded-full border border-brand-pink/25 bg-brand-pink/10 px-2.5 py-1 text-[10px] font-semibold text-brand-pink"><Layers3 className="h-3 w-3" />{postSlides.length}/10</span>}{variant !== 'post' && <><button type="button" disabled={!editor.canUndo} onClick={editor.undo} aria-label={t('stories.editor.undo')} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-200 hover:bg-white/[.08] disabled:opacity-35"><RotateCcw className="h-4 w-4" /></button><button type="button" disabled={!editor.canRedo} onClick={editor.redo} aria-label={t('stories.editor.redo')} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-200 hover:bg-white/[.08] disabled:opacity-35"><RotateCw className="h-4 w-4" /></button></>}</div>}
  </header>;

  const stage = step === 'start' ? <StartScreen t={t} onUpload={onUpload}
    onCamera={() => { resetMediaChoice(); setCameraSheetOpen(true); }}
    onText={startTextMoment}
    onKind={(kind) => { if (kind === 'note') { startTextMoment(); return; } applyKind(kind); fileInputRef.current?.click(); }} 
    recent={recent}
    onRecent={(item) => { setPendingMomentKind(null); setActiveMomentKind(null); setProcessMode(false); setProcessFrames([]); void prepareFile(item.file); }} 
  /> : step === 'done' ? <div role="status" className="flex h-full flex-col items-center justify-center text-center"><span className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-brand-gradient shadow-glow-brand"><Check className="h-10 w-10 text-white" /></span><h3 className="mt-6 font-editorial text-3xl text-white">{t('stories.share.successTitle')}</h3><p className="mt-2 text-sm text-ink-200">{t('stories.share.successBody')}</p></div> : <>{editorCanvas}<div className="absolute bottom-4 end-4 z-50 flex gap-1 rounded-full border border-white/10 bg-ink-950/80 p-1 backdrop-blur"><button type="button" onClick={() => setPreviewMode('ring')} aria-pressed={previewMode === 'ring'} className="min-h-10 rounded-full px-3 text-[10px] text-white aria-pressed:bg-brand-pink/25">{t('stories.composer.previewRing')}</button><button type="button" onClick={() => setPreviewMode('viewer')} aria-pressed={previewMode === 'viewer'} className="min-h-10 rounded-full px-3 text-[10px] text-white aria-pressed:bg-brand-pink/25">{t('stories.composer.previewViewer')}</button></div>{previewMode === 'ring' ? <div className="absolute start-4 top-4 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-[10px] text-white backdrop-blur"><span className="h-7 w-7 rounded-full bg-brand-gradient p-[2px]"><span className="block h-full w-full overflow-hidden rounded-full border-2 border-ink-950 bg-ink-700">{profile.avatarUrl && <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />}</span></span>{profile.displayName || profile.username || t('stories.stickers.defaultArtist')}</div> : <div aria-label={t('stories.composer.previewViewer')} className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between bg-black/10 p-4"><div className="mt-8 flex items-center gap-2 text-[10px] font-semibold text-white drop-shadow"><span className="h-7 w-7 overflow-hidden rounded-full border border-white/40 bg-ink-700">{profile.avatarUrl && <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />}</span>{profile.displayName || profile.username || t('stories.stickers.defaultArtist')}<span className="ms-auto">•••</span></div><div className="flex items-end justify-between" /></div>}</>;

  const editorPanel = <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
    {verificationBanner}
    {step === 'start' && <><p className="text-xs leading-relaxed text-ink-300">{t('stories.composer.entryHint')}</p><button type="button" onClick={onUpload} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white"><Upload className="h-4 w-4" />{t('stories.composer.uploadOption')}</button></>}
    {step === 'edit' && <>
        {variant !== 'post' && processControls}
      <div className="hidden lg:block"><button type="button" onClick={() => setSectionOpen(sectionOpen === 'tools' ? 'details' : 'tools')} aria-expanded={sectionOpen === 'tools'} className="flex min-h-11 w-full items-center justify-between text-xs font-semibold text-white">{t('stories.editor.tools')}<span>{sectionOpen === 'tools' ? '−' : '+'}</span></button>{sectionOpen === 'tools' && <div className="max-h-[min(48dvh,34rem)] overflow-y-auto overscroll-contain pe-1"><StoryToolbar layers={editor.layers} selectedLayer={editor.selectedLayer} canUndo={editor.canUndo} canRedo={editor.canRedo} labels={toolbarLabels} language={lang} canChangeBackground={isTextOnly} backgroundColor={canvasBackgroundColor} onBackgroundColor={chooseCanvasBackground} canFilter={!isTextOnly} moodFilter={moodFilter} drawMode={drawMode} brushColor={brushColor} brushSize={brushSize} eraser={eraser} onMoodFilter={(filter) => { setMoodFilter(filter); setDirty(true); }} onDrawMode={setDrawMode} onBrushColor={setBrushColor} onBrushSize={setBrushSize} onEraser={setEraser} onOpenStickers={() => setStickerTrayOpen(true)} onAddText={addText} onBackground={(kind, value) => { editor.addBackground(kind, value); setDirty(true); }} onUpdateText={updateTextLayer} onUpdateSticker={updateSticker} onDelete={() => { if (editor.selectedId) editor.deleteLayer(editor.selectedId); }} onBringFront={() => editor.selectedId && editor.bringToFront(editor.selectedId)} onUndo={editor.undo} onRedo={editor.redo} /></div>}</div>
      <section className="rounded-2xl border border-white/[.08] bg-black/15 p-3"><button type="button" onClick={() => setSectionOpen(sectionOpen === 'details' ? 'tools' : 'details')} aria-expanded={sectionOpen === 'details'} className="flex min-h-11 w-full items-center justify-between text-xs font-semibold text-white">{t('stories.composer.detailsAndCaption')}<span>{sectionOpen === 'details' ? '−' : '+'}</span></button>{sectionOpen === 'details' && <div className="space-y-3 pt-2"><div className="flex flex-wrap gap-2">{(palette.length ? palette : ['#382c44', '#211827', '#100c15', '#e84f9b']).map((color) => <button key={color} type="button" onClick={() => { setBrushColor(color); setDirty(true); }} aria-label={`${t('stories.composer.palette')} ${color}`} className="h-7 w-7 rounded-full border border-white/25" style={{ backgroundColor: color }} />)}</div><div className="grid grid-cols-3 gap-2">{(['none', 'gallery', 'paper'] as const).map((value) => <button key={value} type="button" onClick={() => { setFrame(value); setDirty(true); }} aria-pressed={frame === value} className="min-h-11 rounded-xl border border-white/10 px-2 text-[10px] text-ink-200 aria-pressed:border-brand-pink/50 aria-pressed:bg-brand-pink/10">{t(`stories.composer.frame_${value}`)}</button>)}</div><label className="block text-[10px] font-semibold uppercase tracking-[.16em] text-ink-400">{t('stories.share.caption')}<textarea value={caption} onChange={(event) => { setCaption(event.target.value.slice(0, 100)); setDirty(true); }} rows={2} maxLength={100} placeholder={t('stories.share.captionHint')} className="mt-2 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-sm font-normal text-white outline-none placeholder:text-ink-500 focus:border-brand-pink/50" /></label><p className="text-end text-[10px] text-ink-500">{caption.length}/100</p></div>}</section>
      {variant !== 'post' && <section className="rounded-2xl border border-white/[.08] bg-black/15 p-3"><button type="button" onClick={() => setSectionOpen(sectionOpen === 'publish' ? 'details' : 'publish')} aria-expanded={sectionOpen === 'publish'} className="flex min-h-11 w-full items-center justify-between text-xs font-semibold text-white"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand-pink" />{t('stories.composer.audienceAndDuration')}</span><span>{sectionOpen === 'publish' ? '−' : '+'}</span></button>{sectionOpen === 'publish' && <div className="pt-2">{audienceDuration}</div>}</section>}
      <div className="mt-auto hidden lg:block"><button type="button" onClick={() => void publishMoment()} disabled={saving || processing} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white shadow-glow-brand transition hover:brightness-110 disabled:opacity-60">{saving ? t('stories.share.sharing') : variant === 'post' ? 'Publish post' : t('stories.share.shareMoment')}<ArrowRight className="h-4 w-4" /></button></div>
    </>}
    {error && <p role="alert" className="rounded-xl border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-xs leading-relaxed text-brand-orange">{error}</p>}
  </div>;

  const publishBar = step === 'edit' ? <div className="z-[75] flex shrink-0 items-center gap-2 border-t border-white/[.08] bg-ink-950/95 px-3 py-2.5 pb-[max(.65rem,env(safe-area-inset-bottom))] lg:hidden">
    {variant !== 'post' && <><button type="button" onClick={() => setToolPanel('publish')} aria-label={t('stories.share.audience')} className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-ink-800 px-3 text-[10px] font-semibold text-white"><span className="truncate">{t(`stories.share.${audience}`)}</span></button>
    <button type="button" onClick={() => setToolPanel('publish')} aria-label={t('stories.share.duration')} className="flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-ink-800 px-3 text-[10px] font-semibold text-white"><Clock3 className="h-3.5 w-3.5 text-brand-pink" />{formatLabel(t('stories.share.hoursCompact'), { hours: String(durationHours) })}</button></>}
    <button type="button" onClick={() => void publishMoment()} disabled={saving || processing} aria-label={variant === 'post' ? 'Publish post' : t('stories.share.shareMoment')} className={`flex h-12 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow-brand disabled:opacity-60 ${variant === 'post' ? 'min-w-32 px-5 text-sm font-semibold' : 'w-12'}`}>{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : variant === 'post' ? 'Publish post' : <ArrowRight className="h-5 w-5" />}</button>
  </div> : null;
  const overlays: ReactNode = <>
    {editingTextLayer && viewport !== 'mobile' && <StoryTextToolbar layer={editingTextLayer} labels={textToolbarLabels} isPersian={lang === 'fa'} keyboardInset={keyboardInset} onUpdate={(patch) => updateSticker(editingTextLayer.id, patch)} onDone={finishTextEditing} />}
    {stickerTrayOpen && <StoryStickerTray open palette={draft?.type === 'image' ? palette : []} artistName={profile.displayName || profile.username || t('stories.stickers.defaultArtist')} artistProfileUrl={profile.username ? `/artist/${profile.username}` : '/profile'} practiceGroups={stickerPracticeGroups} labels={stickerLabels} mediumLabels={mediumLabels} selectedSticker={editor.selectedLayer?.type === 'sticker' ? editor.selectedLayer : null} onClose={closeStickerTray} onAdd={addSticker} onUpdateSelected={updateSelectedSticker} onBringToFront={() => { if (editor.selectedId) { editor.bringToFront(editor.selectedId); setDirty(true); } }} onDelete={() => { if (editor.selectedId) { editor.deleteLayer(editor.selectedId); setDirty(true); } }} />}
    {toolPanel && <div className="fixed inset-0 z-[10020] flex items-end bg-black/55 backdrop-blur-sm lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setToolPanel(null); }}>
      <section ref={sheetRef} role="dialog" aria-modal="true" aria-label={toolPanel === 'filters' ? t('stories.editor.filters') : toolPanel === 'publish' ? t('stories.composer.audienceAndDuration') : t('stories.composer.palette')} tabIndex={-1} className="w-full rounded-t-[1.6rem] border border-white/10 bg-ink-900 p-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-editorial text-xl text-white">{toolPanel === 'filters' ? t('stories.editor.moodFilters') : toolPanel === 'publish' ? t('stories.composer.audienceAndDuration') : t('stories.composer.palette')}</h3>
          <button type="button" onClick={() => setToolPanel(null)} aria-label={t('stories.composer.close')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        {toolPanel === 'filters' ? <div className="grid grid-cols-2 gap-2">
          {['none', 'warm', 'mono', 'neon', 'faded'].map((filter) => <button key={filter} type="button" onClick={() => { setMoodFilter(filter); setDirty(true); setToolPanel(null); }} aria-pressed={moodFilter === filter} className="min-h-12 rounded-xl border border-white/10 text-xs text-white aria-pressed:border-brand-pink/50 aria-pressed:bg-brand-pink/10">{toolbarLabels[`filter_${filter}`]}</button>)}
        </div> : toolPanel === 'publish' ? audienceDuration : <div className="flex flex-wrap gap-3">
          {(palette.length ? palette : ['#ffffff', '#ff8a3d', '#e84f9b', '#a882ff', '#56d6c2']).map((color) => <button key={color} type="button" onClick={() => { setBrushColor(color); setToolPanel(null); }} aria-label={`${t('stories.composer.palette')} ${color}`} className="h-12 w-12 rounded-full border border-white/25" style={{ backgroundColor: color }} />)}
        </div>}
      </section>
    </div>}
    {discardPrompt && <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/75 p-4">
      <section ref={discardDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="story-discard-title" tabIndex={-1} className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-5 shadow-premium">
        <h3 id="story-discard-title" className="font-editorial text-2xl text-white">{t('stories.editor.discardTitle')}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-200">{t('stories.editor.discardConfirm')}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setDiscardPrompt(false)} className="min-h-11 flex-1 rounded-full border border-white/10 text-sm text-white">{t('stories.editor.keepEditing')}</button>
          <button type="button" onClick={confirmDiscard} className="min-h-11 flex-1 rounded-full bg-rose-500/90 text-sm font-semibold text-white">{t('stories.editor.discard')}</button>
        </div>
      </section>
    </div>}
  </>;

  const fileInput = <input ref={fileInputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) return; if (variant === 'post') void preparePostFiles([file]); else void prepareFile(file); event.currentTarget.value = ''; }} aria-label={t('stories.composer.uploadOption')} />;
  const activeSlide = postSlides[activePostSlide];
  const postPreview = activeSlide?.type === 'video'
    ? <video src={activeSlide.url} controls playsInline className="absolute inset-0 h-full w-full object-cover" />
    : activeSlide
      ? <img src={activeSlide.url} alt="Post preview" className="absolute inset-0 h-full w-full object-cover" />
      : <button type="button" onClick={() => galleryInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-ink-300"><ImagePlus className="h-8 w-8 text-brand-pink" />{t('stories.composer.uploadOption')}</button>;
  const activeLayout = variant === 'post'
    ? <PostComposerLayout
        header={header}
        preview={postPreview}
        caption={caption}
        captionLabel={t('stories.share.caption')}
        captionHint={t('stories.share.captionHint')}
        mediaLabel={t('stories.composer.detailsAndCaption')}
        mediaCount={postSlides.length}
        slides={postSlides}
        activeSlideIndex={activePostSlide}
        maxSlidesWarning={postWarning}
        cropOpen={cropOpen}
        cropSettings={cropSettings}
        cropLabel={t('stories.composer.crop')}
        applyCropLabel={t('stories.composer.applyCrop')}
        cancelLabel={t('stories.composer.cancel')}
        zoomLabel={t('stories.composer.cropZoom')}
        horizontalLabel={t('stories.composer.cropHorizontal')}
        verticalLabel={t('stories.composer.cropVertical')}
        cropGestureHint={t('stories.composer.cropGestureHint')}
        removeSlideLabel={t('stories.composer.removePostSlide')}
        closedPreviewLabel={t('stories.composer.closedPostPreview')}
        openPreviewLabel={t('stories.composer.openPostPreview')}
        addMediaLabel="Add media"
        publishLabel="Publish post"
        publishingLabel={t('stories.share.sharing')}
        artworkTag={artworkTag}
        artworkTagOptions={postArtworkTagOptions}
        artworkTagLabel={t('stories.composer.artworkTag')}
        requiredLabel={t('stories.composer.requiredField')}
        overlays={overlays}
        error={error}
        publishing={saving || processing}
        onCaptionChange={(value) => { setCaption(value.slice(0, 500)); setDirty(true); }}
        onCaptionCommit={() => setDirty(true)}
        onArtworkTagChange={(value) => { setArtworkTag(value); setDirty(true); }}
        onSelectSlide={selectPostSlide}
        onRemoveSlide={removePostSlide}
        onMoveSlide={movePostSlide}
        onOpenCrop={() => { setCropSettings({ zoom: 1, x: 50, y: 50 }); setCropOpen(true); }}
        onCropSettingsChange={setCropSettings}
        onApplyCrop={() => void applyPostCrop()}
        onCloseCrop={() => setCropOpen(false)}
        onAddMedia={() => galleryInputRef.current?.click()}
        onPublish={() => void publishMoment()}
      />
    : viewport === 'mobile'
    ? <StoryMobileLayout header={header} stage={step === 'edit' ? editorCanvas : stage} details={mobileDetails} tools={step === 'edit' ? tools : null} publish={publishBar} overlays={overlays} isEditing={step === 'edit'} isTextEditing={step === 'edit' && !!editingTextLayer} textComposer={mobileTextComposer} viewportHeight={mobileViewportHeight} />
    : viewport === 'tablet'
      ? <StoryTabletLayout header={header} stage={stage} panel={editorPanel} overlays={overlays} isEditing={step === 'edit'} />
      : <StoryDesktopLayout header={header} stage={stage} panel={editorPanel} overlays={overlays} isEditing={step === 'edit'} />;

  return createPortal(<div className="story-composer fixed inset-0 z-[10002] flex items-center justify-center bg-black/75 backdrop-blur-xl lg:p-6" style={shellStyle} role="dialog" aria-modal="true" aria-labelledby="story-composer-title" tabIndex={-1} ref={shellRef} onDragOver={(event) => { if (step === 'start') { event.preventDefault(); setDragging(true); } }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={handleDrop} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    {fileInput}
    <input ref={cameraPhotoInputRef} type="file" accept={variant === 'post' ? 'image/*' : 'image/*'} capture="environment" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) { if (variant === 'post') void preparePostFiles([file]); else void prepareFile(file); } event.currentTarget.value = ''; }} aria-label={t('stories.composer.takePhoto')} />
    <input ref={cameraVideoInputRef} type="file" accept="video/*" capture="environment" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) { if (variant === 'post') void preparePostFiles([file]); else void prepareFile(file); } event.currentTarget.value = ''; }} aria-label={t('stories.composer.recordVideo')} />
    <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple={variant === 'post'} className="sr-only" onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); if (!files.length) return; if (variant === 'post') void preparePostFiles(files); else void prepareFile(files[0]); event.currentTarget.value = ''; }} aria-label={t('stories.composer.uploadOption')} />
    {activeLayout}
    {cameraSheetOpen && variant === 'post' && <StoryCamera labels={cameraLabels} maxDurationSeconds={15} onCapture={(file) => { setCameraSheetOpen(false); void preparePostFiles([file]); }} onCancel={() => setCameraSheetOpen(false)} />}
    {cameraSheetOpen && variant !== 'post' && <div className="fixed inset-0 z-[10010] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setCameraSheetOpen(false); }}><section role="dialog" aria-modal="true" aria-label={t('stories.composer.cameraOption')} className="w-full rounded-t-[1.6rem] border border-white/10 bg-ink-900 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl md:pb-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-editorial text-xl text-white">{t('stories.composer.cameraOption')}</h3><button type="button" onClick={() => setCameraSheetOpen(false)} aria-label={t('stories.composer.close')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><X className="h-5 w-5 text-white" /></button></div><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => onNativeCamera('photo')} className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] text-sm font-medium text-white"><Camera className="h-5 w-5 text-brand-orange" />{t('stories.composer.takePhoto')}</button><button type="button" onClick={() => onNativeCamera('video')} className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] text-sm font-medium text-white"><Camera className="h-5 w-5 text-brand-pink" />{t('stories.composer.recordVideo')}</button></div></section></div>}
    {gallerySheetOpen && <div className="fixed inset-0 z-[10010] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setGallerySheetOpen(false); }}><section role="dialog" aria-modal="true" aria-label={t('stories.composer.uploadOption')} className="w-full rounded-t-[1.6rem] border border-white/10 bg-ink-900 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl md:pb-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-editorial text-xl text-white">{t('stories.composer.uploadOption')}</h3><button type="button" onClick={() => setGallerySheetOpen(false)} aria-label={t('stories.composer.close')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><X className="h-5 w-5 text-white" /></button></div><div className="space-y-2"><button type="button" onClick={() => onGalleryFilter('all')} className="flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-sm font-medium text-white">{t('stories.composer.galleryAll')}</button><button type="button" onClick={() => onGalleryFilter('photos')} className="flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-sm font-medium text-white">{t('stories.composer.galleryPhotos')}</button><button type="button" onClick={() => onGalleryFilter('videos')} className="flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-sm font-medium text-white">{t('stories.composer.galleryVideos')}</button></div></section></div>}
    {backgroundSheetOpen && <div className="fixed inset-0 z-[10012] flex items-end bg-black/60 backdrop-blur-sm md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setBackgroundSheetOpen(false); }}><section role="dialog" aria-modal="true" aria-label={t('stories.editor.background')} className="w-full rounded-t-[1.6rem] border border-white/10 bg-ink-900 p-5 pb-[max(1rem,env(safe-area-inset-bottom))]"><div className="mb-4 flex items-center justify-between"><h3 className="font-editorial text-xl text-white">{t('stories.editor.backgrounds')}</h3><button type="button" onClick={() => setBackgroundSheetOpen(false)} aria-label={t('stories.composer.close')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><X className="h-5 w-5 text-white" /></button></div><div className="grid grid-cols-4 gap-3">{STORY_BACKGROUND_CHOICES.map((choice) => <button key={choice.value} type="button" onClick={() => { chooseCanvasBackground(choice.value); setBackgroundSheetOpen(false); }} aria-label={t(`stories.editor.${choice.label}`)} aria-pressed={canvasBackgroundColor === choice.value} className="aspect-square rounded-2xl border border-white/20 aria-pressed:ring-2 aria-pressed:ring-brand-pink" style={{ background: choice.color }} />)}<label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/[.05] text-[9px] font-medium text-white"><input type="color" value={canvasBackgroundColor.startsWith('#') ? canvasBackgroundColor : '#000000'} onChange={(event) => chooseCanvasBackground(event.target.value)} aria-label={t('stories.editor.customBackground')} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /><span>{t('stories.editor.customBackground')}</span></label></div></section></div>}
    {step === 'edit' && <div className="fixed inset-x-0 bottom-0 z-[76] hidden justify-center border-t border-white/10 bg-ink-950/95 px-5 py-3 md:flex lg:hidden">{variant !== 'post' && audienceDuration}<button type="button" onClick={() => void publishMoment()} disabled={saving || processing} className="ms-4 min-h-12 rounded-full bg-brand-gradient px-6 text-sm font-semibold text-white">{saving ? t('stories.share.sharing') : variant === 'post' ? 'Publish post' : t('stories.share.shareMoment')}</button></div>}
    <span className="sr-only">{variant === 'post' || canPublish ? '' : t('stories.share.verificationBody')}</span>
  </div>, document.body);
}