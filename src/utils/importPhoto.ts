import type { AspectRatio, CapturedPhoto } from '../types/camera';

export const IMPORT_MAX_BYTES = 40 * 1024 * 1024;

const KNOWN_RATIOS: [AspectRatio, number][] = [
  ['9:16', 9 / 16],
  ['4:5', 4 / 5],
  ['1:1', 1],
  ['5:4', 5 / 4],
  ['4:3', 4 / 3],
  ['3:2', 3 / 2],
  ['16:9', 16 / 9],
  ['21:9', 21 / 9],
  ['2.35:1', 2.35],
  ['2.39:1', 2.39],
];

/** The camera aspect-ratio label closest to an image's real proportions (for display only). */
export function nearestAspectRatio(width: number, height: number): AspectRatio {
  const r = width / height;
  let best = KNOWN_RATIOS[0];
  for (const k of KNOWN_RATIOS) if (Math.abs(Math.log(k[1] / r)) < Math.abs(Math.log(best[1] / r))) best = k;
  return best[0];
}

/** Reason an image file cannot be imported, or null if it looks fine. */
export function validateImportFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) return 'That file is not an image.';
  if (file.size > IMPORT_MAX_BYTES) return 'That image is larger than 40 MB.';
  return null;
}

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });

const loadSize = (url: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('decode failed'));
    img.src = url;
  });

/**
 * Builds a photo record from a file. The file's bytes are kept exactly as they are in `dataUrl`
 * (no re-encoding), so the imported original is never altered by editing.
 */
export async function photoFromFile(file: File): Promise<CapturedPhoto> {
  const dataUrl = await readAsDataUrl(file);
  const { width, height } = await loadSize(dataUrl); // throws for formats this browser cannot decode (e.g. HEIC in Chrome)
  return {
    id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    dataUrl,
    thumbnailUrl: dataUrl,
    timestamp: Date.now(),
    aspectRatio: nearestAspectRatio(width, height),
    filterUsed: 'Imported',
    gridUsed: 'None',
    proSettings: { iso: 0, shutter: '', kelvin: 0, ev: 0 },
  };
}
