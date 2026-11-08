import { resourceManager } from '../services/resourceManager';
import { mediaStorageService } from '../services/mediaStorageService';
import type { CapturedPhoto } from '../types/camera';
import { fileBackingAvailable, isFileBacked, writeVariant, type PhotoVariant } from '../services/photoFiles';

/**
 * Keeps React state light. A fresh capture arrives as a multi-megabyte Base64 string (three of them with a look
 * and an edit). This swaps every data: URL for a blob: URL (the bytes move out of the JS heap) and gives the
 * photo a small real thumbnail, so grids and strips never decode the full image.
 */

export const THUMB_PX = 360;

export function needsCompaction(p: CapturedPhoto): boolean {
  if (p.mediaType === 'video') return false;
  return (
    p.dataUrl.startsWith('data:') ||
    !!p.lookDataUrl?.startsWith('data:') ||
    !!p.editedDataUrl?.startsWith('data:') ||
    // photos restored from the old IndexedDB blob storage move to real files once
    (fileBackingAvailable() && !isFileBacked(p.dataUrl))
  );
}

async function thumbBlobFrom(blob: Blob, maxPx: number): Promise<Blob | null> {
  try {
    const probe = await createImageBitmap(blob);
    const scale = Math.min(1, maxPx / Math.max(probe.width, probe.height));
    const w = Math.max(1, Math.round(probe.width * scale));
    const h = Math.max(1, Math.round(probe.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      probe.close();
      return null;
    }
    ctx.drawImage(probe, 0, 0, w, h);
    probe.close();
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
    canvas.width = 0; // release the backing store now rather than at GC time
    canvas.height = 0;
    return out;
  } catch {
    return null;
  }
}

/** Returns the same photo with blob: URLs and a small thumbnail. Never touches the saved gallery file. */
export async function compactPhoto(p: CapturedPhoto): Promise<CapturedPhoto> {
  if (fileBackingAvailable()) return compactToFiles(p);
  const owner = `photo_${p.id}`;
  const toUrl = async (url: string | undefined): Promise<string | undefined> => {
    if (!url || !url.startsWith('data:')) return url;
    const blob = await (await fetch(url)).blob();
    return resourceManager.createManagedObjectURL(blob, owner);
  };
  const dataUrl = (await toUrl(p.dataUrl)) ?? p.dataUrl;
  const lookDataUrl = await toUrl(p.lookDataUrl);
  const editedDataUrl = await toUrl(p.editedDataUrl);

  let thumbnailUrl = p.thumbnailUrl;
  const variantChanged = !!p.editedDataUrl?.startsWith('data:') || !!p.lookDataUrl?.startsWith('data:');
  if (variantChanged || !thumbnailUrl || thumbnailUrl === p.dataUrl || thumbnailUrl.startsWith('data:') || thumbnailUrl === dataUrl) {
    const src = await (await fetch(editedDataUrl || lookDataUrl || dataUrl)).blob();
    const t = await thumbBlobFrom(src, THUMB_PX);
    thumbnailUrl = t ? resourceManager.createManagedObjectURL(t, owner) : dataUrl;
  }
  return { ...p, dataUrl, lookDataUrl, editedDataUrl, thumbnailUrl };
}

/** Native: every variant goes to app storage and state keeps only served file URLs (no bytes in the renderer). */
async function compactToFiles(p: CapturedPhoto): Promise<CapturedPhoto> {
  const moveToDisk = async (url: string | undefined, variant: PhotoVariant): Promise<string | undefined> => {
    if (!url || isFileBacked(url)) return url;
    const blob = await (await fetch(url)).blob();
    return writeVariant(p.id, variant, blob);
  };
  const dataUrl = (await moveToDisk(p.dataUrl, 'full')) ?? p.dataUrl;
  const lookDataUrl = await moveToDisk(p.lookDataUrl, 'look');
  const editedDataUrl = await moveToDisk(p.editedDataUrl, 'edited');

  let thumbnailUrl = p.thumbnailUrl;
  const variantChanged = !!p.editedDataUrl?.startsWith('data:') || !!p.lookDataUrl?.startsWith('data:');
  if (variantChanged || !thumbnailUrl || thumbnailUrl === p.dataUrl || thumbnailUrl === dataUrl || !isFileBacked(thumbnailUrl)) {
    const src = await (await fetch(editedDataUrl || lookDataUrl || dataUrl)).blob();
    const t = await thumbBlobFrom(src, THUMB_PX);
    thumbnailUrl = t ? await writeVariant(p.id, 'thumb', t) : dataUrl;
  }
  return { ...p, dataUrl, lookDataUrl, editedDataUrl, thumbnailUrl };
}

/**
 * A real poster frame for a video: decode the first moment of the clip in a hidden <video>, draw it small, and save it
 * as the thumbnail file. (Video items used to have the video itself as their "image", so they showed broken-image text.)
 */
export async function makeVideoThumb(id: string, videoUrl: string): Promise<string | undefined> {
  if (!fileBackingAvailable()) return undefined;
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.playsInline = true;
    const done = (value: string | undefined) => {
      v.removeAttribute('src');
      v.load();
      resolve(value);
    };
    const timer = window.setTimeout(() => done(undefined), 8000);
    v.onerror = () => {
      window.clearTimeout(timer);
      done(undefined);
    };
    v.onloadeddata = () => {
      try {
        v.currentTime = Math.min(0.2, (v.duration || 1) / 2);
      } catch {
        window.clearTimeout(timer);
        done(undefined);
      }
    };
    v.onseeked = async () => {
      window.clearTimeout(timer);
      try {
        const scale = Math.min(1, THUMB_PX / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(v.videoWidth * scale));
        c.height = Math.max(1, Math.round(v.videoHeight * scale));
        c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.8));
        c.width = 0;
        c.height = 0;
        done(blob ? await writeVariant(id, 'thumb', blob) : undefined);
      } catch {
        done(undefined);
      }
    };
    v.src = videoUrl;
  });
}

/** Persists the compact form (real thumbnail included) so a restart restores it without re-decoding. */
export function persistCompact(p: CapturedPhoto): void {
  mediaStorageService.savePhoto(p).catch(() => {});
}
