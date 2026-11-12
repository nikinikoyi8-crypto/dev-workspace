import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FlipHorizontal, Loader2, RotateCcw, Zap, ZapOff, X } from 'lucide-react';

interface StoryCameraProps {
  maxDurationSeconds?: number;
  videoOnly?: boolean;
  labels: {
    cameraUnsupported: string;
    cameraInsecure: string;
    cameraUnavailable: string;
    cameraDenied: string;
    cameraNotFound: string;
    cameraBusy: string;
    cameraConstraints: string;
    cameraTimeout: string;
    cameraError: string;
    cameraStarting: string;
    takePhoto: string;
    recordVideo: string;
    stopRecording: string;
    cancelCamera: string;
    switchCamera: string;
    torch: string;
    chooseLibrary: string;
    audioUnavailable: string;
    recordingUnsupported: string;
    grid: string;
    safeZone: string;
    fallbackTitle: string;
    fallbackHint: string;
  };
  onCapture: (media: File, recordedDurationSeconds?: number) => void;
  onCancel: () => void;
}

const MAX_RECORDING_SECONDS = 60;
const CAMERA_TIMEOUT_MS = 8000;
const WEBM_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cameraErrorLabel(error: unknown, labels: StoryCameraProps['labels']): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return labels.cameraDenied;
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return labels.cameraNotFound;
  if (name === 'NotReadableError' || name === 'TrackStartError') return labels.cameraBusy;
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return labels.cameraConstraints;
  if (name === 'TimeoutError') return labels.cameraTimeout;
  return labels.cameraError;
}

async function requestWithTimeout(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      settled = true;
      reject(new DOMException('Camera request timed out', 'TimeoutError'));
    }, CAMERA_TIMEOUT_MS);
    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      if (settled) { stopStream(mediaStream); return; }
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(mediaStream);
    }).catch((cause: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(cause);
    });
  });
}

function captureCroppedPhoto(video: HTMLVideoElement): Promise<File> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return Promise.reject(new Error('Camera frame is not ready'));
  const targetRatio = 9 / 16;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceWidth / sourceHeight > targetRatio) cropWidth = sourceHeight * targetRatio;
  else cropHeight = sourceWidth / targetRatio;
  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropWidth);
  canvas.height = Math.round(cropHeight);
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Photo capture is unavailable'));
  context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob) { reject(new Error('Photo capture failed')); return; }
    resolve(new File([blob], `moment-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }, 'image/jpeg', .92));
}

export default function StoryCamera({ labels, onCapture, onCancel, maxDurationSeconds = MAX_RECORDING_SECONDS, videoOnly = false }: StoryCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdTimerRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);
  const recordingStartedRef = useRef(0);
  const elapsedTimerRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioFallback, setAudioFallback] = useState(false);
  const [nativeFallback, setNativeFallback] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [safeZoneVisible, setSafeZoneVisible] = useState(false);
  const pendingPhotoRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    if (maxDurationTimerRef.current !== null) window.clearTimeout(maxDurationTimerRef.current);
    maxDurationTimerRef.current = null;
    if (elapsedTimerRef.current !== null) window.clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const releaseStream = useCallback(() => {
    requestIdRef.current += 1;
    stopRecording();
    const current = streamRef.current;
    streamRef.current = null;
    setStream(null);
    setCameraLive(false);
    setTorchAvailable(false);
    setTorchEnabled(false);
    if (videoRef.current) videoRef.current.srcObject = null;
    stopStream(current);
  }, [stopRecording]);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    releaseStream();
    const requestId = ++requestIdRef.current;
    setStarting(true);
    setError('');
    setNativeFallback(false);
    setAudioFallback(false);
    setCameraLive(false);
    if (!window.isSecureContext) {
      setError(labelsRef.current.cameraInsecure);
      setNativeFallback(true);
      setStarting(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(labelsRef.current.cameraUnavailable);
      setNativeFallback(true);
      setStarting(false);
      return;
    }

    const preferred: MediaStreamConstraints = {
      video: { facingMode: { ideal: mode }, width: { ideal: 1080 }, height: { ideal: 1920 } },
      audio: true,
    };
    try {
      let nextStream: MediaStream;
      try {
        nextStream = await requestWithTimeout(preferred);
      } catch (cause) {
        const name = cause instanceof DOMException ? cause.name : '';
        if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
          nextStream = await requestWithTimeout({ video: true, audio: false });
          setAudioFallback(true);
        } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          nextStream = await requestWithTimeout({
            video: { facingMode: { ideal: mode }, width: { ideal: 1080 }, height: { ideal: 1920 } },
            audio: false,
          });
          setAudioFallback(true);
        } else throw cause;
      }

      if (requestIdRef.current !== requestId) {
        stopStream(nextStream);
        return;
      }

      streamRef.current = nextStream;
      setStream(nextStream);
      setError('');
      const videoTrack = nextStream.getVideoTracks()[0];
      const capabilities = videoTrack?.getCapabilities() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchAvailable(!!capabilities?.torch);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        void videoRef.current.play().catch(() => undefined);
      }
    } catch (cause) {
      if (requestIdRef.current !== requestId) return;
      const message = cameraErrorLabel(cause, labelsRef.current);
      setError(message);
      setNativeFallback(true);
      setStarting(false);
    }
  }, [releaseStream]);

  useEffect(() => {
    let cancelled = false;
    const open = async () => { if (!cancelled) await startCamera(facingMode); };
    void open();
    return () => {
      cancelled = true;
      releaseStream();
    };
  }, [facingMode, releaseStream, startCamera]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') releaseStream();
      else if (!streamRef.current) void startCamera(facingMode);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [facingMode, releaseStream, startCamera]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    const onLive = () => {
      setCameraLive(true);
      setStarting(false);
      if (pendingPhotoRef.current) {
        pendingPhotoRef.current = false;
        void captureCroppedPhoto(video).then(onCapture).catch(() => setError(labelsRef.current.cameraError));
      }
    };
    video.addEventListener('playing', onLive);
    void video.play().then(onLive).catch(() => undefined);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.paused) onLive();
    return () => video.removeEventListener('playing', onLive);
  }, [onCapture, stream]);

  useEffect(() => () => {
    discardRecordingRef.current = true;
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    if (maxDurationTimerRef.current !== null) window.clearTimeout(maxDurationTimerRef.current);
    if (elapsedTimerRef.current !== null) window.clearInterval(elapsedTimerRef.current);
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    try {
      const file = await captureCroppedPhoto(video);
      navigator.vibrate?.(10);
      onCapture(file);
    } catch {
      setError(labelsRef.current.cameraError);
    }
  }, [onCapture]);

  const startRecording = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream || recordingRef.current) return;
    if (typeof MediaRecorder === 'undefined') {
      setNativeFallback(true);
      setError(labelsRef.current.recordingUnsupported);
      videoInputRef.current?.click();
      return;
    }
    const videoTrack = currentStream.getVideoTracks()[0];
    try {
      await videoTrack?.applyConstraints({ width: { ideal: 720 }, height: { ideal: 1280 } });
    } catch {
      // Keep the active camera resolution if the device rejects the video preset.
    }
    if (!streamRef.current || recordingRef.current) return;
    const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const mimeTypes = isAppleMobile ? ['video/mp4', ...WEBM_TYPES] : [...WEBM_TYPES, 'video/mp4'];
    const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
    try {
      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 4_500_000,
        audioBitsPerSecond: 128_000,
      };
      const recorder = new MediaRecorder(currentStream, options);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        recordingRef.current = false;
        setRecording(false);
        setError(labelsRef.current.cameraError);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        chunksRef.current = [];
        const recordedDurationSeconds = Math.min(maxDurationSeconds, Math.max(.1, (Date.now() - recordingStartedRef.current) / 1000));
        recordingRef.current = false;
        setRecording(false);
        setRecordingSeconds(0);
        const activeStream = streamRef.current;
        streamRef.current = null;
        setStream(null);
        setCameraLive(false);
        if (videoRef.current) videoRef.current.srcObject = null;
        stopStream(activeStream);
        if (blob.size > 0 && !discardRecordingRef.current) {
          const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
          onCapture(new File([blob], `moment-${Date.now()}.${extension}`, { type: blob.type }), recordedDurationSeconds);
        } else if (!discardRecordingRef.current) setError(labelsRef.current.cameraError);
        discardRecordingRef.current = false;
      };
      recorder.start(1000);
      recordingRef.current = true;
      recordingStartedRef.current = Date.now();
      setRecording(true);
      setRecordingSeconds(0);
      navigator.vibrate?.(10);
      elapsedTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.min(maxDurationSeconds, Math.floor((Date.now() - recordingStartedRef.current) / 1000)));
      }, 250);
      maxDurationTimerRef.current = window.setTimeout(stopRecording, maxDurationSeconds * 1000);
    } catch {
      setNativeFallback(true);
      setError(labelsRef.current.recordingUnsupported);
      videoInputRef.current?.click();
    }
  }, [onCapture, stopRecording, maxDurationSeconds]);

  const onShutterPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!cameraLive) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (videoOnly) {
      if (recordingRef.current) stopRecording();
      else void startRecording();
      return;
    }
    if (recordingRef.current) return;
      holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
        void startRecording();
    }, 300);
  };

  const onShutterPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (videoOnly) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      void takePhoto();
    } else if (recordingRef.current) stopRecording();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onShutterPointerCancel = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    if (recordingRef.current) stopRecording();
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchAvailable) return;
    const next = !torchEnabled;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchEnabled(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  const handleNativeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) onCapture(file);
  };

  const showNativeCapture = nativeFallback || !cameraLive;
  const progress = Math.min(100, (recordingSeconds / maxDurationSeconds) * 100);
  const shutterStyle = recording ? {
    background: `conic-gradient(#f5d7ff 0deg ${Math.max(20, progress * 3.6)}deg, rgba(255,255,255,0.16) ${Math.max(20, progress * 3.6)}deg 360deg)`,
    boxShadow: '0 0 0 6px rgba(255,255,255,0.12), 0 30px 60px rgba(240,103,192,0.4)',
    transform: 'scale(1.08)',
  } : undefined;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-ink-950">
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleNativeFile} aria-label={labels.takePhoto} />
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="sr-only" onChange={handleNativeFile} aria-label={labels.recordVideo} />
      <input ref={libraryInputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={handleNativeFile} aria-label={labels.chooseLibrary} />
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,145,118,0.16),transparent_28%),radial-gradient(circle_at_80%_82%,rgba(139,92,246,0.22),transparent_34%),linear-gradient(180deg,#140d16_0%,#0c0910_100%)]" />
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined, visibility: cameraLive ? 'visible' : 'hidden' }} />
        {gridVisible && <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:33.333%_100%] opacity-60" />}
        {safeZoneVisible && <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute inset-x-4 top-16 bottom-24 rounded-[2rem] border border-white/20 bg-white/5" />
          <div className="absolute left-1/2 top-16 h-[calc(100%-7.5rem)] w-[62%] -translate-x-1/2 rounded-[1.5rem] border border-dashed border-brand-pink/50" />
        </div>}
        {starting && <div role="status" className="absolute inset-0 z-20 flex items-center justify-center bg-ink-950/65 text-brand-pink backdrop-blur-sm"><span className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white"><Loader2 className="h-5 w-5 animate-spin" />{labels.cameraStarting}</span></div>}
        {showNativeCapture && !starting && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 text-center">
          <div className="pointer-events-auto w-full max-w-sm rounded-[2rem] border border-white/10 bg-black/25 p-6 shadow-premium backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/15 bg-white/5 text-brand-pink"><Camera className="h-7 w-7" /></div>
            <h3 className="font-editorial text-2xl text-white">{labels.fallbackTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-200">{error || labels.fallbackHint}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {!videoOnly && <button type="button" onClick={() => photoInputRef.current?.click()} className="rounded-2xl border border-white/10 bg-white/[.04] px-3 py-3 text-xs font-semibold text-white">{labels.takePhoto}</button>}
              <button type="button" onClick={() => videoInputRef.current?.click()} className="rounded-2xl border border-white/10 bg-white/[.04] px-3 py-3 text-xs font-semibold text-white">{labels.recordVideo}</button>
            </div>
            <button type="button" onClick={() => libraryInputRef.current?.click()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-3 py-3 text-xs font-semibold text-white shadow-glow-brand">{labels.chooseLibrary}</button>
            {audioFallback && <p className="mt-3 text-[10px] text-ink-300">{labels.audioUnavailable}</p>}
          </div>
        </div>}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 sm:p-5">
          <button type="button" onClick={onCancel} aria-label={labels.cancelCamera} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55"><X className="h-5 w-5" /></button>
          <div className="pointer-events-auto flex items-center gap-2">
            <button type="button" onClick={() => setGridVisible((value) => !value)} aria-pressed={gridVisible} className={`flex h-11 items-center justify-center rounded-full border px-3 text-[11px] font-medium tracking-[.12em] uppercase ${gridVisible ? 'border-brand-pink/40 bg-brand-pink/15 text-white' : 'border-white/15 bg-black/35 text-ink-200'} backdrop-blur-md`}>{labels.grid ?? 'Grid'}</button>
            <button type="button" onClick={() => setSafeZoneVisible((value) => !value)} aria-pressed={safeZoneVisible} className={`flex h-11 items-center justify-center rounded-full border px-3 text-[11px] font-medium tracking-[.12em] uppercase ${safeZoneVisible ? 'border-brand-purple/40 bg-brand-purple/15 text-white' : 'border-white/15 bg-black/35 text-ink-200'} backdrop-blur-md`}>{labels.safeZone ?? 'Safe zone'}</button>
          </div>
        </div>
        {cameraLive && <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#0b090f] via-[#0b090f]/80 to-transparent" />
          <div className="relative flex items-end justify-between gap-3">
            <div className="pointer-events-auto flex items-center gap-2">
              <button type="button" onClick={() => { releaseStream(); libraryInputRef.current?.click(); }} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white backdrop-blur-md" aria-label={labels.chooseLibrary}><RotateCcw className="h-5 w-5" /></button>
            </div>
            <div className="pointer-events-auto flex flex-col items-center gap-3">
              {recording && <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md"><span className="h-2 w-2 animate-pulse rounded-full bg-brand-pink" />{`0:${String(recordingSeconds).padStart(2, '0')} / 0:${String(maxDurationSeconds).padStart(2, '0')}`}</span>}
              <button type="button" onPointerDown={onShutterPointerDown} onPointerUp={onShutterPointerUp} onPointerCancel={onShutterPointerCancel} disabled={!cameraLive} aria-label={recording ? labels.stopRecording : videoOnly ? labels.recordVideo : labels.takePhoto} className={`relative flex h-[5.25rem] w-[5.25rem] touch-none items-center justify-center rounded-full border-[6px] border-white/80 bg-transparent text-white shadow-[0_18px_60px_rgba(199,83,172,0.45)] transition ${recording ? 'scale-110' : 'scale-100'}`} style={shutterStyle}>
                <span className="absolute inset-[7px] rounded-full bg-brand-gradient" />
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-ink-950">{recording ? <span className="h-5 w-5 rounded-[0.35rem] bg-brand-pink" /> : <Camera className="h-5 w-5" />}</span>
              </button>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <button type="button" disabled={recording} onClick={() => setFacingMode((mode) => mode === 'environment' ? 'user' : 'environment')} aria-label={labels.switchCamera} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white backdrop-blur-md disabled:opacity-40"><FlipHorizontal className="h-5 w-5" /></button>
              {torchAvailable && <button type="button" disabled={recording} onClick={() => void toggleTorch()} aria-label={labels.torch} aria-pressed={torchEnabled} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white backdrop-blur-md disabled:opacity-40">{torchEnabled ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}</button>}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
