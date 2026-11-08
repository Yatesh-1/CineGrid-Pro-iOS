import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
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
