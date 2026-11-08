import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraProfile } from '../utils/cameraProfile';
import {
  isNativeFilmSupported,
  nativeFilm,
  nativeStillToBitmap,
  type NativeFilmInfo,
  type NativeRecording,
  type NativeStill,
} from '../services/nativeFilmCamera';

interface Params {
  /** Film camera selected, photo mode, real (not simulated) camera. The Android check is done here. */
  wanted: boolean;
  profile: CameraProfile | null;
  front: boolean;
  /** Total zoom ratio the user asked for. */
  zoom: number;
  /** Exposure compensation in stops (hardware EV). */
  evStops: number;
  /** Stop and clear the web camera stream before native takes the camera. */
  releaseWebCamera: () => void;
  /** Re-open the web camera after native let go of it. */
  restoreWebCamera: () => void;
}

export interface NativeFilmState {
  /** Native owns the camera and is rendering the preview. */
  active: boolean;
  /** Native is supposed to run (it may still be starting). The web camera must stay closed while this is true. */
  intended: boolean;
  info: NativeFilmInfo | null;
  /** Why native could not start (the app then falls back to the web camera). */
  error: string | null;
  /** Takes a full-resolution photo through Camera2 and returns it decoded (upright) with its metadata. */
  takePhoto: () => Promise<{ bitmap: ImageBitmap; still: NativeStill }>;
  startRecording: (audio: boolean, height: number) => Promise<void>;
  /** Ends the recording and returns what was really written (size, measured fps, whether audio was captured). */
  stopRecording: () => Promise<NativeRecording>;
  setTorch: (on: boolean) => Promise<void>;
  setWhiteBalance: (mode: string) => Promise<void>;
}

const FRAME_SELECTOR = '[data-testid="viewfinder-frame"]';

const rectOf = (): { x: number; y: number; width: number; height: number } | null => {
  const el = document.querySelector(FRAME_SELECTOR);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 8 && r.height > 8 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
};

/**
 * Runs the native film camera (Camera2 -> GPU film shader) behind the transparent WebView while a film camera is
 * selected, and gives the camera back to the web path when it is not. Falls back to the web camera if native fails,
 * so a native problem can never leave the app without a camera.
 */
export function useNativeFilmCamera(p: Params): NativeFilmState {
  const supported = isNativeFilmSupported();
  const [active, setActive] = useState(false);
  const [info, setInfo] = useState<NativeFilmInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A start failure disables native until the settings change, instead of retrying in a loop.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  const key = `${p.front ? 'front' : 'back'}`;
  const intended = supported && p.wanted && failedKey !== key;

  const profileRef = useRef(p.profile);
  const handoffRef = useRef({ release: p.releaseWebCamera, restore: p.restoreWebCamera });
  const startedRect = useRef<{ w: number; h: number } | null>(null);
  const hadNative = useRef(false);
  useEffect(() => {
    profileRef.current = p.profile;
    handoffRef.current = { release: p.releaseWebCamera, restore: p.restoreWebCamera };
  });

  // ---- lifecycle: start / restart / stop ----------------------------------------------------------------------
  useEffect(() => {
    if (!intended) {
      // Native is not wanted (any more): hand the camera back to the web path exactly once.
      if (hadNative.current) {
        hadNative.current = false;
        handoffRef.current.restore();
      }
      return;
    }
    let cancelled = false;
    (async () => {
      let rect = rectOf();
      for (let i = 0; i < 20 && !rect && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 100));
        rect = rectOf();
      }
      if (cancelled) return;
      if (!rect) {
        setError('The viewfinder has no size yet.');
        setFailedKey(key);
        return;
      }
      handoffRef.current.release();
      hadNative.current = true;
      try {
        const started = await nativeFilm.start({ facing: p.front ? 'front' : 'back', ...rect, profile: profileRef.current });
        if (cancelled) {
          await nativeFilm.stop().catch(() => {});
          return;
        }
        startedRect.current = { w: rect.width, h: rect.height };
        setInfo(started);
        setError(null);
        setActive(true);
        document.documentElement.classList.add('native-film');
      } catch (e) {
        if (cancelled) return;
        hadNative.current = false;
        setActive(false);
        setError((e as Error)?.message || 'The native camera could not start.');
        setFailedKey(key);
        handoffRef.current.restore();
      }
    })();

    return () => {
      cancelled = true;
      document.documentElement.classList.remove('native-film');
      setActive(false);
      nativeFilm.stop().catch(() => {});
    };
    // p.front is represented by `key`; epoch forces a restart after an interruption or a resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intended, key, epoch]);

  // ---- the camera was taken away (app backgrounded): come back when visible again -------------------------------
  useEffect(() => {
    if (!intended) return;
    let remove: (() => Promise<void>) | null = null;
    let gone = false;
    nativeFilm
      .onInterrupted(() => {
        setActive(false);
        document.documentElement.classList.remove('native-film');
        if (!document.hidden) setEpoch((e) => e + 1);
      })
      .then((h) => {
        if (gone) h.remove();
        else remove = h.remove;
      })
      .catch(() => {});
    const onVisible = () => {
      if (!document.hidden) setEpoch((e) => e + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', onVisible);
      remove?.().catch(() => {});
    };
  }, [intended]);

  // ---- viewfinder resized (aspect ratio changed): restart over the new rect ------------------------------------
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(FRAME_SELECTOR);
    if (!el || typeof ResizeObserver === 'undefined') return;
    let timer: number | null = null;
    const ro = new ResizeObserver(() => {
      const r = rectOf();
      const s = startedRect.current;
      if (!r || !s) return;
      if (Math.abs(r.width - s.w) < 2 && Math.abs(r.height - s.h) < 2) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setEpoch((e) => e + 1), 250);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [active]);

  // ---- live controls ---------------------------------------------------------------------------------------------
  useEffect(() => {
    if (active) nativeFilm.setProfile(p.profile).catch(() => {});
  }, [active, p.profile]);

  useEffect(() => {
    if (active && info && info.evStep > 0) nativeFilm.setEv(p.evStops).catch(() => {});
  }, [active, info, p.evStops]);

  useEffect(() => {
    if (active) nativeFilm.setZoom(p.zoom).catch(() => {});
  }, [active, p.zoom]);

  const takePhoto = useCallback(async () => {
    const still = await nativeFilm.takePhoto();
    const bitmap = await nativeStillToBitmap(still);
    return { bitmap, still };
  }, []);

  return {
    active,
    intended,
    info,
    error,
    takePhoto,
    startRecording: async (audio: boolean, height: number) => {
      await nativeFilm.startRecording(audio, height);
    },
    stopRecording: nativeFilm.stopRecording,
    setTorch: nativeFilm.setTorch,
    setWhiteBalance: nativeFilm.setWhiteBalance,
  };
}
