import React, { useEffect, useMemo, useState } from 'react';

type IconSet = 'pack1' | 'pack2' | 'all';

interface FloatingBlobsProps {
  iconSet?: IconSet;
}

const iconCache = new Map<IconSet, string[]>();
const iconLoaders = new Map<IconSet, Promise<string[]>>();

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function filterManifestBySet(paths: string[], iconSet: IconSet): string[] {
  if (iconSet === 'all') return paths;
  const prefix = iconSet === 'pack1' ? 'pack1_' : 'pack2_';
  return paths.filter((path) => path.startsWith(prefix));
}

async function fetchManifest(): Promise<string[] | null> {
  try {
    const res = await fetch('/assets/images/icons/manifest.json');
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

async function extractFromSheets(paths: string[], maxTotal = 300): Promise<string[]> {
  const results: string[] = [];
  for (const p of paths) {
    try {
      const img = await loadImage(p);
      const w = img.width;
      const h = img.height;
      const scale = Math.max(1, Math.round(Math.max(w, h) / 1200));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w / scale);
      canvas.height = Math.round(h / scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = data.data;
      const visited = new Uint8Array(canvas.width * canvas.height);

      const isBg = (x: number, y: number) => {
        const idx = (y * canvas.width + x) * 4;
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2], a = pixels[idx + 3];
        if (a < 10) return true;
        return r >= 245 && g >= 245 && b >= 245;
      };

      const bfs = (sx: number, sy: number) => {
        const q: [number, number][] = [[sx, sy]];
        visited[sy * canvas.width + sx] = 1;
        let minx = sx, miny = sy, maxx = sx, maxy = sy;
        while (q.length) {
          const [cx, cy] = q.shift()!;
          for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
            if (nx >= 0 && ny >= 0 && nx < canvas.width && ny < canvas.height) {
              const idx = ny * canvas.width + nx;
              if (visited[idx]) continue;
              visited[idx] = 1;
              if (!isBg(nx, ny)) {
                q.push([nx, ny]);
                minx = Math.min(minx, nx);
                miny = Math.min(miny, ny);
                maxx = Math.max(maxx, nx);
                maxy = Math.max(maxy, ny);
              }
            }
          }
        }
        return [minx, miny, maxx + 1, maxy + 1];
      };

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = y * canvas.width + x;
          if (visited[idx]) continue;
          if (isBg(x, y)) {
            visited[idx] = 1;
            continue;
          }
          const bbox = bfs(x, y);
          const bw = bbox[2] - bbox[0];
          const bh = bbox[3] - bbox[1];
          if (bw <= 4 || bh <= 4) continue;
          const sx = Math.round(bbox[0] * scale);
          const sy = Math.round(bbox[1] * scale);
          const sw = Math.round(bw * scale);
          const sh = Math.round(bh * scale);
          const outCanvas = document.createElement('canvas');
          outCanvas.width = sw;
          outCanvas.height = sh;
          const outCtx = outCanvas.getContext('2d');
          if (!outCtx) continue;
          outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          const outData = outCtx.getImageData(0, 0, sw, sh);
          const outPix = outData.data;
          for (let i = 0; i < outPix.length; i += 4) {
            const r = outPix[i], g = outPix[i + 1], b = outPix[i + 2], a = outPix[i + 3];
            if (a < 10 || (r >= 245 && g >= 245 && b >= 245)) {
              outPix[i + 3] = 0;
            }
          }
          outCtx.putImageData(outData, 0, 0);
          const dataUrl = outCanvas.toDataURL('image/png');
          results.push(dataUrl);
          if (results.length >= maxTotal) return results;
        }
      }
    } catch {
      // ignore
    }
  }
  return results;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadIcons(iconSet: IconSet): Promise<string[]> {
  const cached = iconCache.get(iconSet);
  if (cached) return cached;

  const existingLoader = iconLoaders.get(iconSet);
  if (existingLoader) return existingLoader;

  const loader = (async () => {
    const manifest = await fetchManifest();
    if (manifest && manifest.length > 0) {
      const filtered = filterManifestBySet(manifest, iconSet);
      const paths = filtered.map((name) => `/assets/images/icons/${name}`);
      iconCache.set(iconSet, paths);
      return paths;
    }

    const selectedSheets = iconSet === 'pack1'
      ? ['/assets/images/icon-pack-1.png']
      : iconSet === 'pack2'
        ? ['/assets/images/icon-pack-2.png']
        : ['/assets/images/icon-pack-1.png', '/assets/images/icon-pack-2.png'];
    const extracted = await extractFromSheets(selectedSheets, 80);
    iconCache.set(iconSet, extracted);
    return extracted;
  })();

  iconLoaders.set(iconSet, loader);
  return loader;
}

export default function FloatingBlobs({ iconSet = 'all' }: FloatingBlobsProps): JSX.Element {
  const [icons, setIcons] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    loadIcons(iconSet)
      .then((loaded) => {
        if (mounted) setIcons(loaded);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [iconSet]);

  const maxIcons = typeof window !== 'undefined' && window.innerWidth < 640 ? 72 : 105;
  const chosen = useMemo(() => icons.slice(0, maxIcons), [icons, maxIcons]);
  const blobStyles = useMemo(() => chosen.map(() => ({
    left: `${rand(2, 98).toFixed(2)}%`,
    top: `${rand(2, 94).toFixed(2)}%`,
    width: `${Math.round(rand(20, 40))}px`,
    height: `${Math.round(rand(20, 40))}px`,
    opacity: rand(0.06, 0.14),
    animationDelay: `${rand(0, 8).toFixed(2)}s`,
    animationDuration: `${rand(6, 14).toFixed(2)}s`,
    position: 'absolute' as const,
    willChange: 'transform, opacity',
    WebkitTransform: 'translateZ(0)',
  })), [chosen]);

  return (
    <div className="pointer-events-none decor-blobs fixed inset-0 z-10 overflow-hidden">
      {chosen.map((src, i) => {
        return (
          <img
            key={`fb-${i}`}
            src={src}
            alt="decor"
            className="absolute object-contain animate-float floating-blob"
            style={blobStyles[i]}
            draggable={false}
          />
        );
      })}
    </div>
  );
}

