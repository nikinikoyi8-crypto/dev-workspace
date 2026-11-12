import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { StoryLayer } from '@/components/stories/useStoryLayers';
import { drawStoryStrokes } from '@/components/stories/StoryDrawCanvas';
import StoryStickerVisual from '@/components/stories/StoryStickerVisual';

export default function StoryLayerOverlay({ layers }: { layers: StoryLayer[] }) {
  const drawRef = useRef<HTMLCanvasElement>(null);
  const layerRefs = useRef(new Map<string, HTMLDivElement>());
  const drawLayers = useMemo(() => layers.filter((layer) => layer.type === 'draw'), [layers]);

  const applyLayerPositions = useCallback(() => {
    layers.forEach((layer) => {
      const element = layerRefs.current.get(layer.id);
      const stageWidth = element?.parentElement?.clientWidth ?? 0;
      const elementWidth = element?.offsetWidth ?? 0;
      const targetX = stageWidth * layer.x / 100;
      const safeLeft = stageWidth && elementWidth ? Math.max(0, Math.min(stageWidth - elementWidth, targetX - elementWidth / 2)) : 0;
      const translateX = stageWidth && elementWidth ? (safeLeft - targetX) / elementWidth * 100 : -50;
      if (element) element.style.transform = `translate(${translateX}%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`;
    });
  }, [layers]);

  useLayoutEffect(() => {
    applyLayerPositions();
  }, [applyLayerPositions]);

  useEffect(() => {
    const stage = drawRef.current?.parentElement;
    if (!stage) return;
    const observer = new ResizeObserver(applyLayerPositions);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [applyLayerPositions]);

  useEffect(() => {
    const canvas = drawRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const context = canvas.getContext('2d');
      if (context) drawStoryStrokes(context, canvas.width, canvas.height, drawLayers);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [drawLayers]);

  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <canvas ref={drawRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    {layers.filter((layer) => layer.type === 'text' || layer.type === 'sticker').map((layer) => {
      const style = { left: `${layer.x}%`, top: `${layer.y}%`, zIndex: layer.zIndex + 10, transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})` };
      if (layer.type === 'text') return <div key={layer.id} ref={(element) => { if (element) layerRefs.current.set(layer.id, element); else layerRefs.current.delete(layer.id); }} className="absolute w-max max-w-[88%] whitespace-pre-wrap break-words px-2 py-1 leading-tight" style={{ ...style, boxSizing: 'border-box', color: layer.data.color ?? '#fff', fontSize: `${layer.data.fontSize ?? 28}px`, fontFamily: layer.data.font === 'editorial' ? 'Fraunces, Georgia, serif' : layer.data.font === 'vazirmatn' ? 'Vazirmatn, sans-serif' : layer.data.font === 'display' ? 'Poppins, Inter, sans-serif' : layer.data.font === 'handwritten' ? 'cursive' : 'Inter, Arial, sans-serif', textAlign: layer.data.align ?? 'center', wordBreak: 'normal', background: layer.data.highlight ? 'rgba(13,10,16,.72)' : 'transparent', textShadow: '0 2px 16px rgba(0,0,0,.5)' }}>{layer.data.text}</div>;
      const stickerStyle = { ...style, transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})` };
      return <div key={layer.id} ref={(element) => { if (element) layerRefs.current.set(layer.id, element); else layerRefs.current.delete(layer.id); }} className="absolute" style={stickerStyle}>
        <StoryStickerVisual data={layer.data} />
      </div>;
    })}
  </div>;
}
