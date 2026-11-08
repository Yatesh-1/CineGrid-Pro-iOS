import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Disk-backed photo variants. The bytes live in the app's private storage and the WebView is handed a served
 * file URL, so a photo costs the renderer (almost) nothing until an <img> actually decodes it.
 * The user's gallery copy (Pictures/CineGrid Pro) is written separately by saveToDevice and is never touched here.
 */

export type PhotoVariant = 'full' | 'look' | 'edited' | 'thumb';

const DIR = Directory.Data;
const SLICE = 3 * 1024 * 1024; // multiple of 3: each slice is valid standalone base64

export const fileBackingAvailable = (): boolean => Capacitor.isNativePlatform();

const pathFor = (id: string, v: PhotoVariant) => `photos/${id}_${v}.jpg`;

export function isFileBacked(url: string | undefined): boolean {
  // only the photo variants this service wrote (recordings live in files/recordings and are not photos)
  return !!url && url.includes('/_capacitor_file_/') && url.includes('/files/photos/');
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768) as unknown as number[]);
  }
  return btoa(binary);
}

/** Writes a variant to disk and returns the URL the WebView can load it from. */
export async function writeVariant(id: string, variant: PhotoVariant, blob: Blob): Promise<string> {
  const path = pathFor(id, variant);
  let uri = '';
  for (let off = 0; off < blob.size || off === 0; off += SLICE) {
    const b64 = await toBase64(blob.slice(off, off + SLICE));
    if (off === 0) {
      uri = (await Filesystem.writeFile({ path, data: b64, directory: DIR, recursive: true })).uri;
    } else {
      await Filesystem.appendFile({ path, data: b64, directory: DIR });
    }
  }
  // Same path is reused when a photo is re-edited, so bust the WebView's image cache
  return `${Capacitor.convertFileSrc(uri)}?v=${Date.now()}`;
}

let baseUri: string | null = null;

/** Resolves the photos folder once, so URLs for hundreds of photos can then be built with no native calls. */
export async function initPhotoBase(): Promise<void> {
  if (baseUri) return;
  const { uri } = await Filesystem.getUri({ path: 'photos', directory: DIR });
  baseUri = uri.replace(/\/+$/, '');
}

/** Synchronous URL for a variant (call initPhotoBase first). No existence check: it is only built for known photos. */
export function variantUrl(id: string, variant: PhotoVariant): string | undefined {
  return baseUri ? Capacitor.convertFileSrc(`${baseUri}/${id}_${variant}.jpg`) : undefined;
}

/** URL for a variant that was written earlier, or undefined if the file is gone. */
export async function urlForVariant(id: string, variant: PhotoVariant): Promise<string | undefined> {
  try {
    const { uri } = await Filesystem.getUri({ path: pathFor(id, variant), directory: DIR });
    await Filesystem.stat({ path: pathFor(id, variant), directory: DIR });
    return Capacitor.convertFileSrc(uri);
  } catch {
    return undefined;
  }
}

export async function deleteVariants(id: string): Promise<void> {
  for (const v of ['full', 'look', 'edited', 'thumb'] as PhotoVariant[]) {
    await Filesystem.deleteFile({ path: pathFor(id, v), directory: DIR }).catch(() => {});
  }
}

export async function removeVariant(id: string, variant: PhotoVariant): Promise<void> {
  await Filesystem.deleteFile({ path: pathFor(id, variant), directory: DIR }).catch(() => {});
}
