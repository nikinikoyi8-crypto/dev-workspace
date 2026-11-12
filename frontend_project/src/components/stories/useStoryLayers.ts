import { useCallback, useMemo, useState } from 'react';

export type StoryFont = 'editorial' | 'modern' | 'display' | 'handwritten' | 'vazirmatn';
export type StoryTextAlign = 'left' | 'center' | 'right';
export type StoryBackgroundKind = 'gradient' | 'solid' | 'paper';
export type StoryStickerKind = 'medium' | 'process' | 'palette' | 'title' | 'price' | 'edition' | 'tools' | 'inspiration' | 'timer' | 'signature';

export interface StoryPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface StoryLayerData {
  text?: string;
  font?: StoryFont;
  color?: string;
  align?: StoryTextAlign;
  highlight?: boolean;
  fontSize?: number;
  backgroundKind?: StoryBackgroundKind;
  backgroundValue?: string;
  stickerKind?: StoryStickerKind;
  medium?: string;
  process?: string;
  processType?: 'workInProgress' | 'sketch' | 'finished' | 'behindScenes';
  palette?: string[];
  title?: string;
  artist?: string;
  year?: string;
  dimensions?: string;
  profileUrl?: string;
  titleStyle?: 'museum' | 'paper' | 'minimal';
  stickerStyle?: 'soft' | 'gallery' | 'label';
  showProfileLink?: boolean;
  price?: string;
  edition?: string;
  editionTotal?: string;
  tools?: string;
  inspiration?: string;
  projectDay?: string;
  elapsedTime?: string;
  signature?: string;
  dayCount?: string;
  priceCurrency?: string;
  qrCode?: boolean;
  points?: StoryPoint[];
  brushColor?: string;
  brushSize?: number;
  eraser?: boolean;
}

export interface StoryLayer {
  id: string;
  type: 'text' | 'background' | 'draw' | 'sticker';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  data: StoryLayerData;
}

interface HistoryState {
  past: StoryLayer[][];
  layers: StoryLayer[];
  future: StoryLayer[][];
  selectedId: string | null;
}

const MAX_HISTORY = 40;
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function pushHistory(state: HistoryState, layers: StoryLayer[], selectedId = state.selectedId): HistoryState {
  if (JSON.stringify(state.layers) === JSON.stringify(layers)) return { ...state, selectedId };
  return {
    past: [...state.past, state.layers].slice(-MAX_HISTORY),
    layers,
    future: [],
    selectedId,
  };
}

export function useStoryLayers(initialBackground?: StoryLayer): {
  layers: StoryLayer[];
  selectedLayer: StoryLayer | null;
  selectedId: string | null;
  hasLayers: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectLayer: (id: string | null) => void;
  addTextLayer: () => string;
  addBackground: (kind: StoryBackgroundKind, value: string) => void;
  addSticker: (kind: StoryStickerKind, data: StoryLayerData) => string;
  addStroke: (data: StoryLayerData) => void;
  updateLayer: (id: string, patch: Partial<StoryLayer> & { data?: Partial<StoryLayerData> }) => void;
  commitLayer: (id: string, patch: Partial<StoryLayer>) => void;
  deleteLayer: (id: string) => void;
  bringToFront: (id: string) => void;
  undo: () => void;
  redo: () => void;
  resetLayers: (layers?: StoryLayer[]) => void;
} {
  const [history, setHistory] = useState<HistoryState>(() => ({ past: [], layers: initialBackground ? [initialBackground] : [], future: [], selectedId: null }));

  const selectLayer = useCallback((id: string | null) => setHistory((current) => current.selectedId === id ? current : { ...current, selectedId: id }), []);

  const addTextLayer = useCallback(() => {
    const id = makeId();
    setHistory((current) => pushHistory(current, [...current.layers, {
      id, type: 'text', x: 50, y: 50, scale: 1, rotation: 0,
      zIndex: Math.max(0, ...current.layers.map((layer) => layer.zIndex)) + 1,
      data: { text: '', font: 'editorial', fontSize: 28, color: '#ffffff', align: 'center', highlight: false },
    }], id));
    return id;
  }, []);

  const addBackground = useCallback((kind: StoryBackgroundKind, value: string) => {
    setHistory((current) => {
      const background: StoryLayer = { id: makeId(), type: 'background', x: 50, y: 50, scale: 1, rotation: 0, zIndex: 0, data: { backgroundKind: kind, backgroundValue: value } };
      const withoutBackground = current.layers.filter((layer) => layer.type !== 'background');
      return pushHistory(current, [background, ...withoutBackground], current.selectedId);
    });
  }, []);

  const addSticker = useCallback((kind: StoryStickerKind, data: StoryLayerData) => {
    const id = makeId();
    setHistory((current) => pushHistory(current, [...current.layers, {
      id, type: 'sticker', x: 50, y: 50, scale: 1, rotation: 0,
      zIndex: Math.max(0, ...current.layers.map((layer) => layer.zIndex)) + 1,
      data: { ...data, stickerKind: kind },
    }], id));
    return id;
  }, []);

  const addStroke = useCallback((data: StoryLayerData) => {
    setHistory((current) => pushHistory(current, [...current.layers, {
      id: makeId(), type: 'draw', x: 50, y: 50, scale: 1, rotation: 0,
      zIndex: Math.max(0, ...current.layers.map((layer) => layer.zIndex)) + 1,
      data,
    }]));
  }, []);

  const updateLayer = useCallback((id: string, patch: Partial<StoryLayer> & { data?: Partial<StoryLayerData> }) => {
    setHistory((current) => pushHistory(current, current.layers.map((layer) => layer.id === id ? { ...layer, ...patch, data: patch.data ? { ...layer.data, ...patch.data } : layer.data } : layer)));
  }, []);

  const commitLayer = useCallback((id: string, patch: Partial<StoryLayer>) => {
    setHistory((current) => {
      const layers = current.layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer);
      return pushHistory(current, layers);
    });
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setHistory((current) => pushHistory(current, current.layers.filter((layer) => layer.id !== id), current.selectedId === id ? null : current.selectedId));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setHistory((current) => {
      const maxZ = Math.max(0, ...current.layers.map((layer) => layer.zIndex));
      const layers = current.layers.map((layer) => layer.id === id ? { ...layer, zIndex: maxZ + 1 } : layer);
      return pushHistory(current, layers, id);
    });
  }, []);

  const undo = useCallback(() => setHistory((current) => {
    const previous = current.past[current.past.length - 1];
    if (!previous) return current;
    return { past: current.past.slice(0, -1), layers: previous, future: [current.layers, ...current.future], selectedId: current.selectedId && previous.some((layer) => layer.id === current.selectedId) ? current.selectedId : null };
  }), []);

  const redo = useCallback(() => setHistory((current) => {
    const next = current.future[0];
    if (!next) return current;
    return { past: [...current.past, current.layers].slice(-MAX_HISTORY), layers: next, future: current.future.slice(1), selectedId: current.selectedId && next.some((layer) => layer.id === current.selectedId) ? current.selectedId : null };
  }), []);

  const resetLayers = useCallback((layers: StoryLayer[] = []) => setHistory({ past: [], layers, future: [], selectedId: null }), []);

  const selectedLayer = useMemo(() => history.layers.find((layer) => layer.id === history.selectedId) ?? null, [history.layers, history.selectedId]);
  return {
    layers: history.layers,
    selectedLayer,
    selectedId: history.selectedId,
    hasLayers: history.layers.length > 0,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    selectLayer,
    addTextLayer,
    addBackground,
    addSticker,
    addStroke,
    updateLayer,
    commitLayer,
    deleteLayer,
    bringToFront,
    undo,
    redo,
    resetLayers,
  };
}
