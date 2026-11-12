import type { StoryMediaType } from '@/services/storyService';

export interface PreparedStoryMedia {
  file: File;
  type: StoryMediaType;
  durationSeconds?: number;
}

export interface MediaValidationMessages {
  unsupported: string;
  imageTooLarge: string;
  videoTooLarge: string;
  videoTooLong: string;
  couldNotRead: string;
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_IMAGE_EDGE = 2400;
const DOWNSCALE_IMAGE_BYTES = 8 * 1024 * 1024;

export async function prepareStoryMedia(file: File, messages: MediaValidationMessages, recordedDurationSeconds?: number, maxVideoDurationSeconds = DEFAULT_MAX_VIDEO_DURATION_SECONDS): Promise<PreparedStoryMedia> {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) throw new Error(messages.unsupported);
  if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_BYTES) throw new Error(messages.videoTooLarge);
    const durationSeconds = await validateVideoDuration(file, messages, recordedDurationSeconds, maxVideoDurationSeconds);
    return { file, type: 'video', durationSeconds };
  }

  if (file.size > MAX_IMAGE_BYTES) throw new Error(messages.imageTooLarge);
  return { file: await downscaleImageIfNeeded(file, messages), type: 'image' };
}

async function validateVideoDuration(file: File, messages: MediaValidationMessages, recordedDurationSeconds?: number, maxVideoDurationSeconds = DEFAULT_MAX_VIDEO_DURATION_SECONDS): Promise<number> {
  if (recordedDurationSeconds !== undefined) {
    if (!Number.isFinite(recordedDurationSeconds) || recordedDurationSeconds <= 0 || recordedDurationSeconds > maxVideoDurationSeconds) throw new Error(messages.videoTooLong);
    return recordedDurationSeconds;
  }
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = url;
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => finish(new Error(messages.couldNotRead)), 8000);
      const finish = (error?: Error, value?: number) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onMetadata);
        video.removeEventListener('timeupdate', onSeeked);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        if (error) reject(error); else resolve(value ?? Number.NaN);
      };
      const onSeeked = () => finish(undefined, video.currentTime);
      const onError = () => finish(new Error(messages.couldNotRead));
      const onMetadata = () => {
        if (Number.isFinite(video.duration)) { finish(undefined, video.duration); return; }
        video.addEventListener('timeupdate', onSeeked, { once: true });
        video.addEventListener('seeked', onSeeked, { once: true });
        try {
          video.currentTime = 1e101;
        } catch { finish(new Error(messages.couldNotRead)); }
      };
      video.addEventListener('loadedmetadata', onMetadata, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
    if (!Number.isFinite(duration) || duration <= 0 || duration > maxVideoDurationSeconds) throw new Error(messages.videoTooLong);
    return duration;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function downscaleImageIfNeeded(file: File, messages: MediaValidationMessages): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const maxEdge = Math.max(image.naturalWidth, image.naturalHeight);
    if (maxEdge <= MAX_IMAGE_EDGE && file.size <= DOWNSCALE_IMAGE_BYTES) return file;

    const scale = Math.min(1, MAX_IMAGE_EDGE / maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(messages.couldNotRead);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!blob) throw new Error(messages.couldNotRead);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'moment';
    return new File([blob], `${baseName}.webp`, { type: blob.type || 'image/webp', lastModified: Date.now() });
  } catch {
    throw new Error(messages.couldNotRead);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function createTextMomentUrl(): string {
  const artwork = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1600"><defs><linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff8a3d"/><stop offset=".48" stop-color="#e84f9b"/><stop offset="1" stop-color="#7b45e8"/></linearGradient><radialGradient id="glow"><stop stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="900" height="1600" fill="#100c15"/><rect width="900" height="1600" fill="url(#wash)" opacity=".66"/><circle cx="250" cy="300" r="580" fill="url(#glow)"/><circle cx="800" cy="1300" r="540" fill="url(#glow)" opacity=".55"/></svg>';
  return `data:image/svg+xml,${encodeURIComponent(artwork)}`;
}
