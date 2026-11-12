import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import type { StoryLayer, StoryTextAlign } from '@/components/stories/useStoryLayers';
import type { StoryFont } from '@/components/stories/useStoryLayers';
import type { StoryPoint } from '@/components/stories/useStoryLayers';
import StoryDrawCanvas, { drawStoryStrokes } from '@/components/stories/StoryDrawCanvas';
import StoryStickerVisual from '@/components/stories/StoryStickerVisual';
import { STORY_MOOD_FILTERS } from '@/components/stories/StoryMoodFilter';
import type { StoryFrame } from '@/services/storyService';

export interface StoryEditorCanvasHandle {
  exportImage: () => Promise<Blob>;
}

export interface StoryMediaTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface StoryEditorCanvasProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isTextOnly: boolean;
  layers: StoryLayer[];
  selectedId: string | null;
  deleteLabel: string;
  textLabel: string;
  textPlaceholder: string;
  canvasLabel: string;
  transformLabel: string;
  direction: 'ltr' | 'rtl';
  moodFilter: string;
  mediaTransform: StoryMediaTransform;
  onMediaTransform: (transform: StoryMediaTransform) => void;
  drawMode: boolean;
  brushColor: string;
  brushSize: number;
  eraser: boolean;
  paletteLabel: string;
  drawLabel: string;
  onStroke: (points: StoryPoint[], color: string, size: number, eraser: boolean) => void;
  onSelect: (id: string | null) => void;
  onUpdateText: (id: string, text: string) => void;
  onTransform: (id: string, transform: Pick<StoryLayer, 'x' | 'y' | 'scale' | 'rotation'>) => void;
  onDelete: (id: string) => void;
  onDirty: () => void;
  frame: StoryFrame;
  editingTextId: string | null;
  onEditingTextId: (id: string | null) => void;
  onUpdateTextStyle: (id: string, patch: { font?: StoryFont; fontSize?: number; color?: string; align?: StoryTextAlign; highlight?: boolean }) => void;
  mediaBackground: 'solid' | 'blur';
  mediaFitMode: 'fill' | 'fit';
  backgroundColor?: string;
  onMediaBackground: () => void;
  onMediaFitMode: () => void;
  mediaTransformLabel: string;
  mediaControlLabels: { fit: string; fill: string; blur: string; solid: string; reset: string; rotate: string };
  allowMediaTransform?: boolean;
  allowLayerTransform?: boolean;
  onDeleteMedia?: () => void;
}

interface PointerPoint { x: number; y: number; }
interface GestureState {
  id: string;
  mode: 'drag' | 'transform';
  origin: StoryLayer;
  startX: number;
  startY: number;
  startDistance: number;
  startAngle: number;
  centerX: number;
  centerY: number;
}

const FONT_FAMILIES: Record<StoryFont, string> = {
  editorial: 'Fraunces, Georgia, serif',
  modern: 'Inter, Arial, sans-serif',
  display: 'Poppins, Inter, sans-serif',
  handwritten: 'cursive',
  vazirmatn: 'Vazirmatn, sans-serif',
};

const backgroundStyles: Record<string, string> = {
  'sunset-wash': 'linear-gradient(145deg,#ff8a3d 0%,#e84f9b 52%,#7b45e8 100%)',
  'gradient:sunset-wash': 'linear-gradient(145deg,#ff8a3d 0%,#e84f9b 52%,#7b45e8 100%)',
  'violet-hour': 'radial-gradient(ellipse at 25% 18%,#7548c8 0%,transparent 48%),linear-gradient(150deg,#251834,#11101c 72%,#301d3c)',
  'gradient:violet-hour': 'radial-gradient(ellipse at 25% 18%,#7548c8 0%,transparent 48%),linear-gradient(150deg,#251834,#11101c 72%,#301d3c)',
  'studio-dawn': 'radial-gradient(ellipse at 78% 14%,rgba(255,190,126,.72),transparent 36%),linear-gradient(150deg,#7d4260,#302039 66%,#17121f)',
  'gradient:studio-dawn': 'radial-gradient(ellipse at 78% 14%,rgba(255,190,126,.72),transparent 36%),linear-gradient(150deg,#7d4260,#302039 66%,#17121f)',
  'ink-black': '#0d0a10',
  'ink-plum': '#211827',
  'ink-mauve': '#382c44',
  'paper-cream': 'radial-gradient(ellipse at 20% 10%,rgba(255,255,255,.5),transparent 50%),repeating-linear-gradient(0deg,rgba(90,61,40,.07) 0px,rgba(90,61,40,.07) 1px,transparent 1px,transparent 5px),linear-gradient(135deg,#d7c8ad,#b6a58e)',
  'paper-rose': 'radial-gradient(ellipse at 80% 12%,rgba(255,255,255,.48),transparent 44%),repeating-linear-gradient(90deg,rgba(90,40,55,.06) 0px,rgba(90,40,55,.06) 1px,transparent 1px,transparent 6px),linear-gradient(145deg,#d6aeb8,#987482)',
  'paper-night': 'radial-gradient(ellipse at 16% 8%,rgba(232,79,155,.24),transparent 48%),repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0px,rgba(255,255,255,.035) 1px,transparent 1px,transparent 5px),linear-gradient(145deg,#201823,#0d0a10)',
};

function stageBackground(layers: StoryLayer[], isTextOnly: boolean, mediaBackgroundColor: string): string {
  const background = layers.find((layer) => layer.type === 'background');
  if (background?.data.backgroundValue) return backgroundStyles[background.data.backgroundValue] ?? background.data.backgroundValue;
  return isTextOnly ? backgroundStyles['sunset-wash'] : backgroundStyles[mediaBackgroundColor] ?? mediaBackgroundColor;
}

function paintCanvasBackground(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, preset: string): void {
  const backgroundPreset = preset.startsWith('gradient:') ? preset.slice('gradient:'.length) : preset;
  if (/^#[0-9a-f]{3,8}$/i.test(backgroundPreset)) {
    context.fillStyle = backgroundPreset;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const palettes: Record<string, string[]> = {
    'sunset-wash': ['#ff8a3d', '#e84f9b', '#7b45e8'],
    'violet-hour': ['#7548c8', '#251834', '#11101c'],
    'studio-dawn': ['#ffbe7e', '#7d4260', '#17121f'],
  };
  const paperColors: Record<string, string> = { 'paper-cream': '#d7c8ad', 'paper-rose': '#d6aeb8', 'paper-night': '#201823' };
  const colors = palettes[backgroundPreset];
  if (colors) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const glow = context.createRadialGradient(canvas.width * .24, canvas.height * .14, 0, canvas.width * .24, canvas.height * .14, canvas.width * .8);
    glow.addColorStop(0, 'rgba(255,255,255,.22)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const paper = paperColors[backgroundPreset];
  const solid = paper ?? ({ 'ink-black': '#0d0a10', 'ink-plum': '#211827', 'ink-mauve': '#382c44' }[backgroundPreset] ?? '#100c15');
  context.fillStyle = solid;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (paper) {
    context.save();
    context.strokeStyle = backgroundPreset === 'paper-night' ? 'rgba(255,255,255,.035)' : 'rgba(64,42,50,.055)';
    context.lineWidth = 2;
    const vertical = backgroundPreset === 'paper-rose';
    for (let position = 0; position < (vertical ? canvas.width : canvas.height); position += 12) {
      context.beginPath();
      if (vertical) { context.moveTo(position, 0); context.lineTo(position, canvas.height); }
      else { context.moveTo(0, position); context.lineTo(canvas.width, position); }
      context.stroke();
    }
    const highlight = context.createRadialGradient(canvas.width * .2, canvas.height * .08, 0, canvas.width * .2, canvas.height * .08, canvas.width * .9);
    highlight.addColorStop(0, 'rgba(255,255,255,.17)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = highlight;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  return text.split('\n').flatMap((paragraph) => {
    const words = paragraph.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    });
    lines.push(line);
    return lines;
  });
}

function layerTransformStyle(element: HTMLElement | null, x: number, y: number, rotation: number, scale: number): string {
  const stageWidth = element?.parentElement?.clientWidth ?? 0;
  const elementWidth = element?.offsetWidth ?? 0;
  const targetX = stageWidth * x / 100;
  const safeLeft = stageWidth && elementWidth ? Math.max(0, Math.min(stageWidth - elementWidth, targetX - elementWidth / 2)) : 0;
  const translateX = stageWidth && elementWidth ? (safeLeft - targetX) / elementWidth * 100 : -50;
  return `translate(${translateX}%, -50%) rotate(${rotation}deg) scale(${scale})`;
}

const StoryEditorCanvas = forwardRef<StoryEditorCanvasHandle, StoryEditorCanvasProps>(function StoryEditorCanvas({ mediaUrl, mediaType, isTextOnly, layers, selectedId, deleteLabel, textLabel, textPlaceholder, canvasLabel, transformLabel, direction, moodFilter, mediaTransform, onMediaTransform, drawMode, brushColor, brushSize, eraser, paletteLabel, drawLabel, onStroke, onSelect, onUpdateText, onTransform, onDelete, onDeleteMedia, onDirty, frame, editingTextId, onEditingTextId, onUpdateTextStyle, mediaBackground, mediaFitMode, backgroundColor = '#000000', onMediaBackground, onMediaFitMode, mediaTransformLabel, mediaControlLabels, allowMediaTransform = true, allowLayerTransform = true }, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const layerRefs = useRef(new Map<string, HTMLDivElement>());
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<GestureState | null>(null);
  const mediaPointersRef = useRef(new Map<number, PointerPoint>());
  const mediaGestureRef = useRef<{ origin: StoryMediaTransform; startCenterX: number; startCenterY: number; startDistance: number; startAngle: number; centerX: number; centerY: number } | null>(null);
  const transformRef = useRef<Pick<StoryLayer, 'x' | 'y' | 'scale' | 'rotation'> | null>(null);
  const rafRef = useRef<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | 'media' | null>(null);
  const [mediaCenterGuides, setMediaCenterGuides] = useState(false);
  const textEditorRefs = useRef(new Map<string, HTMLDivElement>());
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const textSizeRatio = useRef(1);
  const longPressRef = useRef<{ pointerId: number; x: number; y: number; timer: number } | null>(null);
  const suppressTapRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  }, []);

  const beginLongPress = useCallback((pointerId: number, x: number, y: number, target: string | 'media') => {
    clearLongPress();
    const timer = window.setTimeout(() => {
      suppressTapRef.current = true;
      pointersRef.current.clear();
      mediaPointersRef.current.clear();
      gestureRef.current = null;
      mediaGestureRef.current = null;
      transformRef.current = null;
      setMediaCenterGuides(false);
      setDeleteTarget(target);
      longPressRef.current = null;
    }, 520);
    longPressRef.current = { pointerId, x, y, timer };
  }, [clearLongPress]);

  const cancelLongPressOnMove = (pointerId: number, x: number, y: number) => {
    const pending = longPressRef.current;
    if (pending?.pointerId === pointerId && Math.hypot(x - pending.x, y - pending.y) > 10) clearLongPress();
  };

  useLayoutEffect(() => {
    if (!editingTextId) return;
    const element = textEditorRefs.current.get(editingTextId);
    if (!element) return;
    const layer = layersRef.current.find((item) => item.id === editingTextId);
    const text = layer?.data.text ?? '';
    if (element.textContent !== text) element.textContent = text;
    element.focus({ preventScroll: true });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingTextId]);

  const paintTransform = useCallback((id: string, transform: Pick<StoryLayer, 'x' | 'y' | 'scale' | 'rotation'>) => {
    const element = layerRefs.current.get(id);
    if (!element) return;
    element.style.left = `${transform.x}%`;
    element.style.top = `${transform.y}%`;
    element.style.transform = layerTransformStyle(element, transform.x, transform.y, transform.rotation, transform.scale);
  }, []);

  useLayoutEffect(() => {
    layers.forEach((layer) => {
      if (layer.type !== 'text' && layer.type !== 'sticker') return;
      const element = layerRefs.current.get(layer.id);
      if (element) element.style.transform = layerTransformStyle(element, layer.x, layer.y, layer.rotation, layer.scale);
    });
  }, [layers]);

  const clampMediaTransform = useCallback((transform: StoryMediaTransform): StoryMediaTransform => {
    const rect = stageRef.current?.getBoundingClientRect();
    const maxX = rect ? rect.width * .78 : 260;
    const maxY = rect ? rect.height * .78 : 460;
    return {
      x: Math.max(-maxX, Math.min(maxX, transform.x)),
      y: Math.max(-maxY, Math.min(maxY, transform.y)),
      scale: Math.max(.5, Math.min(5, transform.scale)),
      rotation: ((transform.rotation % 360) + 360) % 360,
    };
  }, []);

  useImperativeHandle(ref, () => ({
    exportImage: async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create story image');
      const backgroundLayer = layers.find((layer) => layer.type === 'background');
      const backgroundValue = backgroundLayer?.data.backgroundValue;
      if (isTextOnly) {
        paintCanvasBackground(context, canvas, backgroundValue ?? 'sunset-wash');
      } else {
        const media = mediaRef.current;
        if (media) {
          if (media instanceof HTMLImageElement) {
            await Promise.race([media.decode(), new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Image preview timed out. Try another image.')), 8000))]);
          }
          if (media instanceof HTMLVideoElement && media.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            await new Promise<void>((resolve, reject) => {
              let settled = false;
              const finish = (error?: Error) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeout);
                media.removeEventListener('loadeddata', onReady);
                media.removeEventListener('seeked', onReady);
                media.removeEventListener('error', onError);
                if (error) reject(error); else resolve();
              };
              const timeout = window.setTimeout(() => finish(new Error('Video frame is not ready. Try again.')), 8000);
              const onReady = () => finish();
              const onError = () => finish(new Error('Could not read a frame from this video.'));
              media.addEventListener('loadeddata', onReady, { once: true });
              media.addEventListener('seeked', onReady, { once: true });
              media.addEventListener('error', onError, { once: true });
              if (media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish();
              else if (media.readyState >= HTMLMediaElement.HAVE_METADATA) {
                try { media.currentTime = Math.min(media.duration || 0, media.currentTime + .01); } catch { /* wait for loadeddata */ }
              }
            });
          }
          const sourceWidth = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
          const sourceHeight = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
          if (!sourceWidth || !sourceHeight) throw new Error('The selected story image is not ready. Try again.');
          {
            const pixelRatio = canvas.width / Math.max(1, stageRef.current?.clientWidth ?? 300);
            const backdropScale = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight);
            if (mediaBackground === 'blur') {
              context.save();
              context.filter = `blur(${Math.max(18, canvas.width * .035)}px) ${STORY_MOOD_FILTERS[moodFilter as keyof typeof STORY_MOOD_FILTERS] ?? 'none'}`;
              context.drawImage(media, (canvas.width - sourceWidth * backdropScale) / 2, (canvas.height - sourceHeight * backdropScale) / 2, sourceWidth * backdropScale, sourceHeight * backdropScale);
              context.restore();
            } else {
              paintCanvasBackground(context, canvas, backgroundValue ?? backgroundColor);
            }
            const baseScale = mediaFitMode === 'fit' ? Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight) : backdropScale;
            const drawScale = baseScale * mediaTransform.scale;
            const width = sourceWidth * drawScale;
            const height = sourceHeight * drawScale;
            context.save();
            context.beginPath();
            context.rect(0, 0, canvas.width, canvas.height);
            context.clip();
            context.translate(canvas.width / 2 + mediaTransform.x * pixelRatio, canvas.height / 2 + mediaTransform.y * pixelRatio);
            context.rotate(mediaTransform.rotation * Math.PI / 180);
            context.filter = STORY_MOOD_FILTERS[moodFilter as keyof typeof STORY_MOOD_FILTERS] ?? 'none';
            context.drawImage(media, -width / 2, -height / 2, width, height);
            context.restore();
            context.filter = 'none';
          }
        }
      }
      const drawCanvas = document.createElement('canvas');
      drawCanvas.width = canvas.width;
      drawCanvas.height = canvas.height;
      const drawContext = drawCanvas.getContext('2d');
      if (drawContext) {
        drawStoryStrokes(drawContext, drawCanvas.width, drawCanvas.height, layers);
        context.drawImage(drawCanvas, 0, 0);
      }
      textSizeRatio.current = canvas.width / Math.max(1, stageRef.current?.clientWidth ?? 300);
      layers.filter((layer) => layer.type === 'text').sort((a, b) => a.zIndex - b.zIndex).forEach((layer) => {
        const text = layer.data.text ?? '';
        if (!text.trim()) return;
        context.save();
        context.direction = direction;
        const font = layer.data.font ?? 'editorial';
        const size = (layer.data.fontSize ?? 28) * textSizeRatio.current;
        context.font = `600 ${size}px ${FONT_FAMILIES[font]}`;
        const lines = wrapCanvasText(context, text, 760);
        const blockWidth = Math.min(canvas.width * .88, Math.max(1, ...lines.map((line) => context.measureText(line).width)) * layer.scale);
        const targetX = canvas.width * layer.x / 100;
        const safeTextX = Math.max(blockWidth / 2, Math.min(canvas.width - blockWidth / 2, targetX));
        context.translate(safeTextX, canvas.height * layer.y / 100);
        context.rotate(layer.rotation * Math.PI / 180);
        context.scale(layer.scale, layer.scale);
        context.textAlign = (layer.data.align ?? 'center') as CanvasTextAlign;
        context.textBaseline = 'middle';
        const lineHeight = size * 1.2;
        const startY = -((lines.length - 1) * lineHeight) / 2;
        const textAlign = layer.data.align ?? 'center';
        const textX = textAlign === 'left' ? -blockWidth / 2 : textAlign === 'right' ? blockWidth / 2 : 0;
        lines.forEach((line, index) => {
          const lineWidth = context.measureText(line).width;
          if (layer.data.highlight) {
            context.fillStyle = 'rgba(13,10,16,.72)';
            const boxLeft = textAlign === 'left' ? textX : textAlign === 'right' ? textX - lineWidth : -lineWidth / 2;
            context.fillRect(boxLeft - 20, startY + index * lineHeight - size * .52, lineWidth + 40, lineHeight * .95);
          }
          context.fillStyle = layer.data.color ?? '#ffffff';
          context.fillText(line, textX, startY + index * lineHeight, 760);
        });
        context.restore();
      });
      layers.filter((layer) => layer.type === 'sticker').sort((a, b) => a.zIndex - b.zIndex).forEach((layer) => {
        const stickerKind = layer.data.stickerKind;
        context.save();
        context.direction = direction;
        context.translate(canvas.width * layer.x / 100, canvas.height * layer.y / 100);
        context.rotate(layer.rotation * Math.PI / 180);
        context.scale(layer.scale, layer.scale);
        if (stickerKind === 'palette') {
          const colors = layer.data.palette ?? [];
          const swatchWidth = 76;
          const totalWidth = colors.length * swatchWidth;
          context.fillStyle = 'rgba(13,10,16,.55)';
          context.beginPath();
          context.roundRect(-totalWidth / 2 - 12, -34, totalWidth + 24, 68, 18);
          context.fill();
          colors.forEach((color, index) => {
            context.fillStyle = color;
            context.fillRect(-totalWidth / 2 + index * swatchWidth, -22, swatchWidth, 44);
          });
        } else {
          const isTitle = stickerKind === 'title';
          const isMedium = stickerKind === 'medium';
          const isSignature = stickerKind === 'signature';
          const label = stickerKind === 'medium' ? layer.data.medium ?? ''
            : stickerKind === 'process' ? layer.data.process ?? ''
              : isTitle ? layer.data.title ?? ''
                : stickerKind === 'price' ? `${layer.data.priceCurrency || '$'}${layer.data.price ?? ''}`
                  : stickerKind === 'edition' ? `${layer.data.edition || '1'}/${layer.data.editionTotal || '20'}`
                    : stickerKind === 'tools' ? layer.data.tools ?? ''
                      : stickerKind === 'inspiration' ? layer.data.inspiration ?? ''
                        : stickerKind === 'timer' ? layer.data.elapsedTime || '00:00'
                          : layer.data.signature || layer.data.artist || '';
          const details = isTitle ? [layer.data.medium, layer.data.dimensions, layer.data.year].filter(Boolean).join(' · ') : '';
          const hasProfileLink = isTitle && layer.data.showProfileLink && layer.data.profileUrl;
          const fontSize = isTitle ? 46 : isSignature ? 42 : 27;
          context.font = `${isTitle ? '600' : isSignature ? 'italic 500' : '500'} ${fontSize}px ${isTitle ? 'Fraunces, Georgia, serif' : isSignature ? 'cursive' : 'Inter, Arial, sans-serif'}`;
          const width = Math.max(context.measureText(label).width, context.measureText(details).width, hasProfileLink ? context.measureText(layer.data.profileUrl ?? '').width : 0);
          const boxWidth = isTitle ? Math.min(canvas.width * .86, Math.max(300, width + 72)) : Math.min(canvas.width * .8, Math.max(120, width + 54));
          const boxHeight = isTitle ? (hasProfileLink ? 204 : 158) : isSignature ? 72 : 64;
          const paperLabel = isTitle && layer.data.titleStyle === 'paper';
          const minimalLabel = isTitle && layer.data.titleStyle === 'minimal';
          if (!isSignature) {
            context.fillStyle = isTitle ? paperLabel ? 'rgba(241,232,217,.94)' : minimalLabel ? 'rgba(13,10,16,.35)' : 'rgba(13,10,16,.78)' : 'rgba(13,10,16,.78)';
            context.beginPath();
            context.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, isMedium && layer.data.stickerStyle === 'gallery' ? 0 : 16);
            context.fill();
            if (isMedium && layer.data.stickerStyle === 'gallery') {
              context.strokeStyle = 'rgba(255,255,255,.8)';
              context.lineWidth = 3;
              context.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            }
            if (isMedium && layer.data.stickerStyle === 'label') {
              context.fillStyle = '#ff8a3d';
              context.fillRect(-boxWidth / 2, -boxHeight / 2, 6, boxHeight);
            }
          }
          if (isTitle) {
            context.fillStyle = paperLabel ? '#725c4e' : minimalLabel ? 'rgba(255,255,255,.65)' : '#ff8a3d';
            context.fillRect(-boxWidth / 2, -boxHeight / 2, minimalLabel ? 2 : 7, boxHeight);
            context.fillStyle = paperLabel ? '#17121c' : '#ffffff';
            context.textAlign = 'start';
            context.textBaseline = 'middle';
            context.fillText(label, -boxWidth / 2 + 28, -38, boxWidth - 52);
            context.font = '500 22px Inter, Arial, sans-serif';
            context.fillStyle = paperLabel ? 'rgba(23,18,28,.68)' : 'rgba(255,255,255,.7)';
            context.fillText(details, -boxWidth / 2 + 28, 4, boxWidth - 52);
            context.fillText(layer.data.artist ?? '', -boxWidth / 2 + 28, 48, boxWidth - 52);
            if (hasProfileLink) {
              context.fillStyle = paperLabel ? '#725c4e' : '#e84f9b';
              context.font = '500 18px Inter, Arial, sans-serif';
              context.fillText(layer.data.profileUrl ?? '', -boxWidth / 2 + 28, 82, boxWidth - 52);
            }
          } else {
            context.fillStyle = '#ffffff';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(isSignature ? label : label.toLocaleUpperCase(), 0, 0, boxWidth - 24);
          }
        }
        context.restore();
      });
      if (frame === 'gallery') {
        context.save();
        context.strokeStyle = 'rgba(247, 239, 224, .92)';
        context.lineWidth = 24;
        context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
        context.strokeStyle = 'rgba(255,255,255,.28)';
        context.lineWidth = 2;
        context.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);
        context.restore();
      } else if (frame === 'paper') {
        context.save();
        context.strokeStyle = 'rgba(232, 219, 197, .95)';
        context.lineWidth = 54;
        context.strokeRect(27, 27, canvas.width - 54, canvas.height - 54);
        context.strokeStyle = 'rgba(110, 86, 71, .18)';
        context.lineWidth = 2;
        context.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);
        context.restore();
      }
      return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not export story')), 'image/jpeg', .94));
    },
  }), [backgroundColor, direction, frame, isTextOnly, layers, mediaBackground, mediaFitMode, mediaTransform.rotation, mediaTransform.scale, mediaTransform.x, mediaTransform.y, moodFilter]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const onLayerPointerDown = (event: ReactPointerEvent<HTMLElement>, layer: StoryLayer) => {
    if (event.button === 2) return;
    if (pointersRef.current.size > 0 && !allowLayerTransform) return;
    event.preventDefault();
    event.stopPropagation();
    setDeleteTarget(null);
    clearLongPress();
    onSelect(layer.id);
    onDirty();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1 && event.pointerType !== 'mouse') beginLongPress(event.pointerId, event.clientX, event.clientY, layer.id);
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const isTransformHandle = allowLayerTransform && !!(event.target as HTMLElement).closest('[data-transform-handle]');
    const origin = transformRef.current ? { ...layer, ...transformRef.current } : layer;
    gestureRef.current = {
      id: layer.id,
      mode: allowLayerTransform && (pointersRef.current.size > 1 || isTransformHandle) ? 'transform' : 'drag',
      origin,
      startX: event.clientX,
      startY: event.clientY,
      startDistance: 1,
      startAngle: 0,
      centerX: rect.left + rect.width * origin.x / 100,
      centerY: rect.top + rect.height * origin.y / 100,
    };
    if (gestureRef.current.mode === 'transform' && pointersRef.current.size === 1) {
      const point = pointersRef.current.get(event.pointerId)!;
      const dx = point.x - gestureRef.current.centerX;
      const dy = point.y - gestureRef.current.centerY;
      gestureRef.current.startDistance = Math.max(1, Math.hypot(dx, dy));
      gestureRef.current.startAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    } else if (pointersRef.current.size > 1) {
      const points = [...pointersRef.current.values()];
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      gestureRef.current.startDistance = Math.max(1, Math.hypot(dx, dy));
      gestureRef.current.startAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      gestureRef.current.startX = (points[0].x + points[1].x) / 2;
      gestureRef.current.startY = (points[0].y + points[1].y) / 2;
    }
  };

  const onMediaPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button === 2) return;
    if (!allowMediaTransform) return;
    event.preventDefault();
    event.stopPropagation();
    setDeleteTarget(null);
    clearLongPress();
    if (selectedId) onSelect(null);
    const pointer = { x: event.clientX, y: event.clientY };
    mediaPointersRef.current.set(event.pointerId, pointer);
    if (mediaPointersRef.current.size === 1 && event.pointerType !== 'mouse') beginLongPress(event.pointerId, event.clientX, event.clientY, 'media');
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const points = [...mediaPointersRef.current.values()];
    const centerX = points.length > 1 ? (points[0].x + points[1].x) / 2 : pointer.x;
    const centerY = points.length > 1 ? (points[0].y + points[1].y) / 2 : pointer.y;
    const distance = points.length > 1 ? Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)) : 1;
    const angle = points.length > 1 ? Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) * 180 / Math.PI : 0;
    mediaGestureRef.current = { origin: { ...mediaTransform }, startCenterX: centerX, startCenterY: centerY, startDistance: distance, startAngle: angle, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    cancelLongPressOnMove(event.pointerId, event.clientX, event.clientY);
    if (mediaPointersRef.current.has(event.pointerId) && mediaGestureRef.current) {
      mediaPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...mediaPointersRef.current.values()];
      const gesture = mediaGestureRef.current;
      const centerX = points.length > 1 ? (points[0].x + points[1].x) / 2 : points[0].x;
      const centerY = points.length > 1 ? (points[0].y + points[1].y) / 2 : points[0].y;
      const distance = points.length > 1 ? Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)) : gesture.startDistance;
      const angle = points.length > 1 ? Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) * 180 / Math.PI : gesture.startAngle;
      const next = clampMediaTransform({
        x: gesture.origin.x + centerX - gesture.startCenterX,
        y: gesture.origin.y + centerY - gesture.startCenterY,
        scale: points.length > 1 ? gesture.origin.scale * distance / gesture.startDistance : gesture.origin.scale,
        rotation: gesture.origin.rotation + angle - gesture.startAngle,
      });
      setMediaCenterGuides(Math.abs(next.x) < 12 || Math.abs(next.y) < 12);
      onMediaTransform(next);
      return;
    }
    if (!pointersRef.current.has(event.pointerId) || !gestureRef.current) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const points = [...pointersRef.current.values()];
    let transform: Pick<StoryLayer, 'x' | 'y' | 'scale' | 'rotation'>;
    if (gesture.mode === 'transform' && points.length === 1) {
      const dx = points[0].x - gesture.centerX;
      const dy = points[0].y - gesture.centerY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      transform = {
        x: gesture.origin.x,
        y: gesture.origin.y,
        scale: Math.max(.35, Math.min(3, gesture.origin.scale * distance / gesture.startDistance)),
        rotation: gesture.origin.rotation + angle - gesture.startAngle,
      };
    } else if (points.length > 1) {
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const centerX = (points[0].x + points[1].x) / 2;
      const centerY = (points[0].y + points[1].y) / 2;
      transform = {
        x: Math.max(4, Math.min(96, gesture.origin.x + (centerX - gesture.startX) / rect.width * 100)),
        y: Math.max(4, Math.min(96, gesture.origin.y + (centerY - gesture.startY) / rect.height * 100)),
        scale: Math.max(.35, Math.min(3, gesture.origin.scale * distance / gesture.startDistance)),
        rotation: gesture.origin.rotation + angle - gesture.startAngle,
      };
    } else {
      transform = {
        x: Math.max(4, Math.min(96, gesture.origin.x + (event.clientX - gesture.startX) / rect.width * 100)),
        y: Math.max(4, Math.min(96, gesture.origin.y + (event.clientY - gesture.startY) / rect.height * 100)),
        scale: gesture.origin.scale,
        rotation: gesture.origin.rotation,
      };
    }
    transformRef.current = transform;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => paintTransform(gesture.id, transform));
  };

  const onStageWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.deltaY === 0) return;
    if (event.shiftKey && selectedId && allowLayerTransform) {
      const layer = layers.find((item) => item.id === selectedId);
      if (!layer || (layer.type !== 'text' && layer.type !== 'sticker')) return;
      event.preventDefault();
      onTransform(layer.id, { x: layer.x, y: layer.y, rotation: layer.rotation, scale: Math.max(.35, Math.min(3, layer.scale * (event.deltaY < 0 ? 1.08 : .92))) });
      return;
    }
    if (event.ctrlKey && allowMediaTransform && !isTextOnly) {
      event.preventDefault();
      onMediaTransform(clampMediaTransform({ ...mediaTransform, scale: mediaTransform.scale * (event.deltaY < 0 ? 1.08 : .92) }));
    }
  };

  const onStageContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) return;
    const layerElement = (event.target as HTMLElement).closest<HTMLElement>('[data-story-layer-id]');
    if (!layerElement) return;
    event.preventDefault();
    setDeleteTarget(layerElement.dataset.storyLayerId ?? null);
  };

  const finishPointer = (event: ReactPointerEvent<HTMLElement>) => {
    clearLongPress();
    if (suppressTapRef.current) {
      suppressTapRef.current = false;
      return;
    }
    if (mediaPointersRef.current.has(event.pointerId)) {
      mediaPointersRef.current.delete(event.pointerId);
      if (mediaPointersRef.current.size === 0) {
        mediaGestureRef.current = null;
        setMediaCenterGuides(false);
        return;
      }
      const points = [...mediaPointersRef.current.values()];
      const point = points[0];
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect && point) mediaGestureRef.current = { origin: { ...mediaTransform }, startCenterX: point.x, startCenterY: point.y, startDistance: 1, startAngle: 0, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
      return;
    }
    if (mediaGestureRef.current) {
      mediaGestureRef.current = null;
      return;
    }
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size > 0) {
      const remaining = [...pointersRef.current.values()][0];
      const layer = gestureRef.current?.origin;
      if (gestureRef.current && remaining && layer) {
        gestureRef.current = { ...gestureRef.current, mode: 'drag', origin: { ...layer, ...(transformRef.current ?? {}) }, startX: remaining.x, startY: remaining.y, startDistance: 1, startAngle: 0 };
      }
      return;
    }
    const gesture = gestureRef.current;
    const transform = transformRef.current;
    if (gesture && transform) {
      onTransform(gesture.id, transform);
    } else if (gesture?.mode === 'drag' && gesture.origin.type === 'text' && allowLayerTransform && event.pointerType !== 'mouse') {
      onEditingTextId(gesture.id);
    }
    pointersRef.current.clear();
    gestureRef.current = null;
    transformRef.current = null;
    setDeleteTarget(null);
  };

  const mediaFitClass = mediaFitMode === 'fit' ? 'object-contain' : 'object-cover';
  const mediaTransformStyle = { filter: STORY_MOOD_FILTERS[moodFilter as keyof typeof STORY_MOOD_FILTERS] ?? 'none', transform: `translate(${mediaTransform.x}px, ${mediaTransform.y}px) rotate(${mediaTransform.rotation}deg) scale(${mediaTransform.scale})` };
  const mediaBackdrop = !isTextOnly && mediaBackground === 'blur' ? mediaType === 'video'
    ? <video src={mediaUrl} aria-hidden="true" tabIndex={-1} autoPlay muted loop playsInline preload="metadata" className="pointer-events-none absolute inset-[-8%] h-[116%] w-[116%] scale-110 object-cover opacity-60 blur-2xl" style={{ filter: STORY_MOOD_FILTERS[moodFilter as keyof typeof STORY_MOOD_FILTERS] ?? 'none' }} />
    : <div aria-hidden="true" className="pointer-events-none absolute inset-[-8%] scale-110 bg-cover bg-center opacity-60 blur-2xl" style={{ backgroundImage: `url("${mediaUrl}")`, filter: STORY_MOOD_FILTERS[moodFilter as keyof typeof STORY_MOOD_FILTERS] ?? 'none' }} /> : null;
  const media = !isTextOnly && mediaType === 'video'
    ? <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={mediaUrl} preload="metadata" style={{ ...mediaTransformStyle, objectFit: mediaFitMode === 'fit' ? 'contain' : 'cover' }} className={`absolute inset-0 h-full w-full ${mediaFitClass}`} autoPlay muted loop playsInline onPointerDown={allowMediaTransform ? onMediaPointerDown : undefined} onContextMenu={(event) => { event.preventDefault(); setDeleteTarget('media'); }} onDoubleClick={allowMediaTransform ? (event) => { event.stopPropagation(); onMediaFitMode(); } : undefined} />
    : !isTextOnly && <img ref={mediaRef as React.RefObject<HTMLImageElement>} src={mediaUrl} alt="" draggable={false} style={{ ...mediaTransformStyle, objectFit: mediaFitMode === 'fit' ? 'contain' : 'cover' }} className={`absolute inset-0 h-full w-full ${mediaFitClass}`} onPointerDown={allowMediaTransform ? onMediaPointerDown : undefined} onContextMenu={(event) => { event.preventDefault(); setDeleteTarget('media'); }} onDoubleClick={allowMediaTransform ? (event) => { event.stopPropagation(); onMediaFitMode(); } : undefined} />;

  return (
    <div ref={stageRef} className="relative h-full w-full touch-none overflow-hidden" style={{ background: stageBackground(layers, isTextOnly, backgroundColor) }} onWheel={onStageWheel} onContextMenu={onStageContextMenu} onPointerMove={onStagePointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onPointerDown={(event) => { if (event.target === event.currentTarget) onSelect(null); }}>
      {mediaBackdrop}
          {media}
      {mediaCenterGuides && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[95]"><span className="absolute inset-y-0 start-1/2 border-s border-dashed border-white/70" /><span className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/70" /></div>}
      <StoryDrawCanvas active={drawMode} layers={layers} color={brushColor} size={brushSize} eraser={eraser} label={drawLabel} onStroke={onStroke} />
      {layers.filter((layer) => layer.type === 'text').sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
        const isSelected = layer.id === selectedId;
        const font = layer.data.font ?? 'editorial';
        return (
          <div key={layer.id} data-story-layer-id={layer.id} ref={(element) => { if (element) layerRefs.current.set(layer.id, element); else layerRefs.current.delete(layer.id); }} role="group" aria-label={textLabel} tabIndex={isSelected ? 0 : -1} className={`absolute w-max max-w-[88%] cursor-text select-none px-2 py-1 leading-tight outline-none ${isSelected ? 'ring-1 ring-white/70 ring-offset-2 ring-offset-black/30' : ''}`} style={{ left: `${layer.x}%`, top: `${layer.y}%`, zIndex: layer.zIndex + 20, boxSizing: 'border-box', transform: layerTransformStyle(layerRefs.current.get(layer.id) ?? null, layer.x, layer.y, layer.rotation, layer.scale), color: layer.data.color ?? '#ffffff', fontFamily: FONT_FAMILIES[font], fontSize: `${layer.data.fontSize ?? 28}px`, textAlign: layer.data.align as StoryTextAlign ?? 'center', direction, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'normal', background: layer.data.highlight ? 'rgba(13,10,16,.72)' : 'transparent', textShadow: '0 2px 16px rgba(0,0,0,.45)' }} onPointerDown={(event) => { if (editingTextId === layer.id) { event.stopPropagation(); return; } onLayerPointerDown(event, layer); }} onKeyDown={(event) => { if (event.key === 'Enter' && editingTextId !== layer.id) { event.preventDefault(); onEditingTextId(layer.id); } }}>
            <div
              ref={(element) => { if (element) textEditorRefs.current.set(layer.id, element); else textEditorRefs.current.delete(layer.id); }}
              data-text-edit
              data-placeholder={textPlaceholder}
              contentEditable={editingTextId === layer.id}
              suppressContentEditableWarning
              role="textbox"
              aria-label={textLabel}
              aria-multiline="true"
              dir={direction}
              onInput={(event) => { onUpdateText(layer.id, event.currentTarget.textContent ?? ''); onDirty(); }}
              onBlur={(event) => {
                const nextTarget = event.relatedTarget as HTMLElement | null;
                if (nextTarget?.closest('[data-story-text-toolbar], [data-story-text-editor]')) return;
                onEditingTextId(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onEditingTextId(null); event.currentTarget.blur(); }
              }}
              onDoubleClick={(event) => { if (!allowLayerTransform) return; event.stopPropagation(); onSelect(layer.id); onEditingTextId(layer.id); }}
              className="min-h-[1.2em] min-w-[1ch] whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-white/55 empty:before:content-[attr(data-placeholder)]"
            >{editingTextId === layer.id ? undefined : layer.data.text}</div>
            {isSelected && allowLayerTransform && <button type="button" data-transform-handle onPointerDown={(event) => onLayerPointerDown(event, layer)} className="absolute -bottom-5 -end-5 flex h-5 w-5 touch-none cursor-nwse-resize rounded-full border-2 border-white bg-brand-pink shadow-glow" aria-label={transformLabel} />}
          </div>
        );
      })}
      {layers.filter((layer) => layer.type === 'sticker').sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
        const isSelected = layer.id === selectedId;
        return <div key={layer.id} data-story-layer-id={layer.id} ref={(element) => { if (element) layerRefs.current.set(layer.id, element); else layerRefs.current.delete(layer.id); }} role="group" aria-label={textLabel} onPointerDown={(event) => onLayerPointerDown(event, layer)} className={`absolute cursor-move select-none ${isSelected ? 'ring-1 ring-white/70 ring-offset-2 ring-offset-black/30' : ''}`} style={{ left: `${layer.x}%`, top: `${layer.y}%`, zIndex: layer.zIndex + 20, transform: layerTransformStyle(layerRefs.current.get(layer.id) ?? null, layer.x, layer.y, layer.rotation, layer.scale) }}>
          <StoryStickerVisual data={layer.data} direction={direction} paletteLabel={paletteLabel} />
          {isSelected && allowLayerTransform && <button type="button" data-transform-handle onPointerDown={(event) => onLayerPointerDown(event, layer)} className="absolute -bottom-3 -end-3 h-5 w-5 touch-none cursor-nwse-resize rounded-full border-2 border-white bg-brand-pink shadow-glow" aria-label={transformLabel} />}
        </div>;
      })}
      {frame !== 'none' && <span aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[110] ${frame === 'gallery' ? 'border-[10px] border-[#f7efe0]/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,.28)]' : 'border-[18px] border-[#e8dbc5]/95 shadow-[inset_0_0_0_1px_rgba(110,86,71,.18)]'}`} />}
      {layers.filter((layer) => layer.type === 'background').length > 0 && <span className="pointer-events-none absolute start-3 top-3 z-[100] rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] font-medium uppercase tracking-widest text-white/80 backdrop-blur"><Layers className="me-1 inline h-3 w-3" />{canvasLabel}</span>}
      {deleteTarget && <div className="absolute inset-x-0 bottom-4 z-[220] flex justify-center"><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); if (deleteTarget === 'media') onDeleteMedia?.(); else onDelete(deleteTarget); setDeleteTarget(null); }} className="flex min-h-12 items-center gap-2 rounded-full border border-rose-300/50 bg-rose-600 px-5 text-sm font-semibold text-white shadow-premium"><Trash2 className="h-4 w-4" />{deleteLabel}</button></div>}
    </div>
  );
});

export default StoryEditorCanvas;
