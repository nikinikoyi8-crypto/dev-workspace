const FALLBACK_PALETTE = ['#e84f9b', '#7b45e8', '#ff8a3d'];

export async function extractDominantColors(file: Blob, colorCount = 5): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return FALLBACK_PALETTE.slice(0, Math.max(3, Math.min(7, colorCount)));

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeout = window.setTimeout(() => finish(new Error('Video palette timed out')), 7000);
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('seeked', onReady);
          video.removeEventListener('error', onError);
          if (error) reject(error); else resolve();
        };
        const onReady = () => { if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish(); };
        const onError = () => finish(new Error('Video frame could not be read'));
        video.addEventListener('loadeddata', onReady);
        video.addEventListener('seeked', onReady);
        video.addEventListener('error', onError);
        void video.play().then(() => video.pause()).catch(() => undefined);
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onReady();
        else if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          try { video.currentTime = Number.isFinite(video.duration) ? Math.min(.15, video.duration / 2) : .15; } catch { /* loadeddata will resolve */ }
        }
      });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      video.removeAttribute('src');
      video.load();
    } else {
      const image = new Image();
      image.src = url;
      await image.decode();
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map<number, { count: number; red: number; green: number; blue: number; score: number }>();
    for (let index = 0; index < pixels.length; index += 16) {
      if (pixels[index + 3] < 180) continue;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const chroma = max - min;
      const brightness = (red + green + blue) / 3;
      const grayPenalty = chroma < 24 ? .14 : 1;
      const shadowPenalty = brightness < 24 ? .08 : brightness < 42 ? .35 : 1;
      const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
      const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0, score: 0 };
      bucket.count += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      bucket.score += grayPenalty * shadowPenalty * (1 + chroma / 255);
      buckets.set(key, bucket);
    }
    const wanted = Math.max(3, Math.min(7, colorCount));
    const candidates = [...buckets.values()].sort((a, b) => b.score - a.score);
    const result: string[] = [];
    for (const bucket of candidates) {
      const color = [bucket.red, bucket.green, bucket.blue].map((sum) => Math.round(sum / bucket.count));
      const max = Math.max(...color);
      const min = Math.min(...color);
      if (max - min < 20 && color.reduce((sum, value) => sum + value, 0) / 3 < 110) continue;
      if (result.some((entry) => colorDistance(entry, color) < 42)) continue;
      result.push(`#${color.map((value) => value.toString(16).padStart(2, '0')).join('')}`);
      if (result.length >= wanted) break;
    }
    return result.length >= 3 ? result : [...result, ...FALLBACK_PALETTE.filter((color) => !result.includes(color))].slice(0, wanted);
  } catch {
    return FALLBACK_PALETTE.slice(0, Math.max(3, Math.min(7, colorCount)));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function colorDistance(hex: string, channels: number[]): number {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return Math.hypot(red - channels[0], green - channels[1], blue - channels[2]);
}