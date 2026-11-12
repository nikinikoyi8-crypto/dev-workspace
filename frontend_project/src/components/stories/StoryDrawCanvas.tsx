import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { StoryLayer, StoryPoint } from '@/components/stories/useStoryLayers';

interface StoryDrawCanvasProps {
  active: boolean;
  layers: StoryLayer[];
  color: string;
  size: number;
  eraser: boolean;
  label: string;
  onStroke: (points: StoryPoint[], color: string, size: number, eraser: boolean) => void;
}

function traceSmoothStroke(context: CanvasRenderingContext2D, points: StoryPoint[], width: number, height: number, color: string, size: number, eraser: boolean) {
  if (points.length === 0) return;
  context.save();
  context.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (points.length === 1) {
    const point = points[0];
    const radius = size * Math.max(.35, point.pressure) / 2;
    context.beginPath();
    context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    context.fill();
  } else {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const midpointX = (previous.x + current.x) * width / 2;
      const midpointY = (previous.y + current.y) * height / 2;
      context.beginPath();
      context.lineWidth = size * Math.max(.35, (previous.pressure + current.pressure) / 2);
      if (index === 1) context.moveTo(previous.x * width, previous.y * height);
      else context.moveTo((points[index - 2].x + previous.x) * width / 2, (points[index - 2].y + previous.y) * height / 2);
      context.quadraticCurveTo(previous.x * width, previous.y * height, midpointX, midpointY);
      context.stroke();
    }
    const last = points[points.length - 1];
    context.beginPath();
    context.arc(last.x * width, last.y * height, size * Math.max(.35, last.pressure) / 2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function drawStoryStrokes(context: CanvasRenderingContext2D, width: number, height: number, layers: StoryLayer[]) {
  const strokes = layers.filter((layer) => layer.type === 'draw').sort((a, b) => a.zIndex - b.zIndex);
  strokes.forEach((layer) => traceSmoothStroke(context, layer.data.points ?? [], width, height, layer.data.brushColor ?? '#ffffff', (layer.data.brushSize ?? .02) * width, !!layer.data.eraser));
}

export default function StoryDrawCanvas({ active, layers, color, size, eraser, label, onStroke }: StoryDrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<StoryPoint[]>([]);
  const frameRef = useRef<number | null>(null);
  const activePointerRef = useRef<number | null>(null);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    drawStoryStrokes(context, width, height, layers);
  }, [layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawStoryStrokes(context, canvas.width, canvas.height, layers);
  }, [layers]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const makePoint = (event: ReactPointerEvent<HTMLCanvasElement>): StoryPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      pressure: event.pointerType === 'mouse' ? .7 : Math.max(.2, event.pressure || .6),
    };
  };

  const paintLive = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawStoryStrokes(context, canvas.width, canvas.height, layers);
    traceSmoothStroke(context, pointsRef.current, canvas.width, canvas.height, color, size * (window.devicePixelRatio || 1), eraser);
  };

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!active || event.button > 0) return;
    event.preventDefault();
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointsRef.current = [makePoint(event)];
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(paintLive);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    const next = makePoint(event);
    const previous = pointsRef.current[pointsRef.current.length - 1];
    if (previous && Math.hypot(next.x - previous.x, next.y - previous.y) < .001) return;
    pointsRef.current.push(next);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(paintLive);
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const points = pointsRef.current;
    pointsRef.current = [];
    activePointerRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (points.length) {
      const width = event.currentTarget.getBoundingClientRect().width;
      onStroke(points, color, size / Math.max(1, width), eraser);
    }
  };

  return <canvas ref={canvasRef} aria-label={label} className={`absolute inset-0 h-full w-full ${active ? 'z-[1000] touch-none cursor-crosshair' : 'pointer-events-none z-10'}`} onPointerDown={startStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} />;
}
