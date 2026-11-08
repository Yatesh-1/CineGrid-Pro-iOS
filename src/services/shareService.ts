import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Opens the phone's own share sheet for a picture (data URL or blob URL). On a phone the picture is written to the
 * app cache first because the share sheet needs a real file. In a browser the Web Share API is used when present,
 * otherwise the file is downloaded. Resolves true when a share sheet or a download was started.
 */
export async function shareImage(url: string, fileName: string, title = 'CineGrid Pro'): Promise<boolean> {
  const blob = await (await fetch(url)).blob();
  if (Capacitor.isNativePlatform()) {
    const base64: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '');
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    const path = `share/${fileName}`;
    await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({ title, files: [uri], dialogTitle: 'Share photo' });
    return true;
  }
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title });
    return true;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

export type ShareFileResult = 'shared' | 'cancelled';

/**
 * Hands a small text file (e.g. a camera profile) to the phone's share sheet so the user can save it to Files or
 * send it. Android's WebView silently ignores blob download links, so a plain <a download> would report success
 * while writing nothing; here the file is really written to the app cache first. 'shared' means the share sheet was
 * shown (the user may still choose where it goes); 'cancelled' means they dismissed it. Throws if the file could
 * not be written or the sheet could not open, so callers never claim a success that did not happen.
 */
export async function shareTextFile(
  fileName: string,
  text: string,
  mime = 'application/json',
  title = 'CineGrid Pro'
): Promise<ShareFileResult> {
  if (Capacitor.isNativePlatform()) {
    const path = `share/${fileName}`;
    await Filesystem.writeFile({ path, data: text, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    try {
      await Share.share({ title, files: [uri], dialogTitle: 'Export camera profile' });
      return 'shared';
    } catch (err) {
      if (/cancel/i.test(String((err as Error)?.message ?? err))) return 'cancelled';
      throw err;
    }
  }
  const blob = new Blob([text], { type: mime });
  const file = new File([blob], fileName, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      throw err;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'shared';
}
