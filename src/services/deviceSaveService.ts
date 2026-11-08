import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Saving captured photos and videos.
 * - In a phone app (Capacitor): into the system gallery (MediaStore) in "CineGrid Pro" folder (Movies for video, Pictures for photos).
 * - In a browser: standard file download.
 */
export const ALBUM_NAME = 'CineGrid Pro';

export type SaveResult = { where: 'gallery' | 'download'; fileName: string };

const VIDEO_EXT = /\.(mp4|mov|webm|m4v|mkv)$/i;

interface MediaSaverPluginInterface {
  saveMedia(options: {
    data?: string;
    tempFilePath?: string;
    mediaType: 'photo' | 'video';
    mimeType?: string;
    fileName?: string;
  }): Promise<{ success: boolean; fileName: string; uri: string; bytesWritten: number }>;
}

const MediaSaver = registerPlugin<MediaSaverPluginInterface>('MediaSaver');

/**
 * What a video file really is, from its first bytes. MediaRecorder in a WebView usually produces WebM even
 * when the app asked for MP4; saving WebM bytes under an .mp4 name leaves a gallery file that often will not play.
 */
export function sniffVideoMime(head: Uint8Array): 'video/webm' | 'video/mp4' | null {
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'video/webm';
  if (head.length >= 8 && head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return 'video/mp4'; // "ftyp"
  return null;
}

/** File name whose extension matches the real container. */
export function nameForMime(fileName: string, mime: string): string {
  const ext = mime === 'video/webm' ? '.webm' : '.mp4';
  return fileName.replace(/\.[a-z0-9]+$/i, '') + ext;
}

export function mediaKindFor(fileName: string, mime?: string): 'photo' | 'video' {
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.startsWith('image/')) return 'photo';
  return VIDEO_EXT.test(fileName) ? 'video' : 'photo';
}

/** The plugin wants the name without extension, and no path characters. */
export function galleryFileName(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[^\w-]+/g, '_') || `cinegrid_${Date.now()}`;
}

interface AlbumLike {
  name: string;
  identifier: string;
}

/** Android needs an album identifier (its folder path); iOS can save without one. */
export function pickAlbumIdentifier(albums: AlbumLike[], albumsPath: string | null, platform: string): string | undefined {
  const found = albums.find((a) => a.name === ALBUM_NAME);
  if (found) return found.identifier;
  if (platform === 'android' && albumsPath) return `${albumsPath.replace(/\/+$/, '')}/${ALBUM_NAME}`;
  return undefined;
}

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsDataURL(blob);
  });
}

export function browserDownload(url: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function saveToDevice(url: string, fileName: string, mime?: string): Promise<SaveResult> {
  if (!Capacitor.isNativePlatform()) {
    browserDownload(url, fileName);
    return { where: 'download', fileName };
  }

  const kind = mediaKindFor(fileName, mime);
  let effectiveMime =
    mime ||
    (kind === 'video'
      ? fileName.endsWith('.webm')
        ? 'video/webm'
        : 'video/mp4'
      : fileName.endsWith('.png')
      ? 'image/png'
      : 'image/jpeg');

  // 1. Direct Android MediaStore MediaSaver plugin
  try {
    if (url.includes('/_capacitor_file_/')) {
      // A file already in app storage (a streamed recording): copy it natively, so a clip of any length or size
      // never passes through JavaScript memory. The original stays for in-app playback.
      const nativePath = decodeURI(url.split('/_capacitor_file_')[1].split('?')[0]);
      if (kind === 'video') {
        effectiveMime = nativePath.endsWith('.webm') ? 'video/webm' : 'video/mp4';
        fileName = nameForMime(fileName, effectiveMime);
      }
      const tempName = `temp_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const copied = await Filesystem.copy({ from: `file://${nativePath}`, to: tempName, toDirectory: Directory.Cache });
      const res = await MediaSaver.saveMedia({
        tempFilePath: copied.uri.replace(/^file:\/\//, ''),
        mediaType: kind,
        mimeType: effectiveMime,
        fileName,
      });
      if (res && res.success) return { where: 'gallery', fileName: res.fileName || fileName };
    } else if (url.startsWith('data:')) {
      const res = await MediaSaver.saveMedia({
        data: url,
        mediaType: kind,
        mimeType: effectiveMime,
        fileName,
      });
      if (res && res.success) {
        return { where: 'gallery', fileName: res.fileName || fileName };
      }
    } else {
      // blob: or file: URL
      const response = await fetch(url);
      const blob = await response.blob();

      // Name and tag a video by what it really is, not by what the caller assumed
      if (kind === 'video') {
        const real = sniffVideoMime(new Uint8Array(await blob.slice(0, 12).arrayBuffer()));
        if (real) {
          effectiveMime = real;
          fileName = nameForMime(fileName, real);
        }
      }

      // If under 15MB, convert to Base64
      if (blob.size <= 15 * 1024 * 1024) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          // Rebuild the URL with a plain media type: a recorder type like "video/mp4;codecs=avc1,opus" contains a
          // comma, which broke every parser that splits a data URL at its first comma (the file saved as garbage).
          reader.onload = () => {
            const full = String(reader.result);
            const marker = full.indexOf(';base64,');
            resolve(marker >= 0 ? `data:${effectiveMime};base64,${full.slice(marker + 8)}` : full);
          };
          reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
          reader.readAsDataURL(blob);
        });
        const res = await MediaSaver.saveMedia({
          data: dataUrl,
          mediaType: kind,
          mimeType: effectiveMime,
          fileName,
        });
        if (res && res.success) {
          return { where: 'gallery', fileName: res.fileName || fileName };
        }
      } else {
        // Large media: write to cache directory to avoid IPC limit
        const tempName = `temp_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        // Stream the blob to the cache folder in ~3 MB slices so a long clip never exists as one giant
        // ArrayBuffer + binary string + base64 string at the same time (that was ~5x the file size in RAM).
        const SLICE = 3 * 1024 * 1024; // multiple of 3 so every slice is valid standalone base64
        let uri = '';
        try {
          for (let off = 0; off < blob.size; off += SLICE) {
            const bytes = new Uint8Array(await blob.slice(off, off + SLICE).arrayBuffer());
            let binary = '';
            for (let i = 0; i < bytes.length; i += 32768) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768) as unknown as number[]);
            }
            const b64 = btoa(binary);
            if (off === 0) {
              uri = (await Filesystem.writeFile({ path: tempName, data: b64, directory: Directory.Cache })).uri;
            } else {
              await Filesystem.appendFile({ path: tempName, data: b64, directory: Directory.Cache });
            }
          }
          const res = await MediaSaver.saveMedia({
            tempFilePath: uri.replace(/^file:\/\//, ''),
            mediaType: kind,
            mimeType: effectiveMime,
            fileName,
          });
          if (res && res.success) {
            return { where: 'gallery', fileName: res.fileName || fileName };
          }
        } finally {
          Filesystem.deleteFile({ path: tempName, directory: Directory.Cache }).catch(() => {});
        }
      }
    }
  } catch (nativeErr) {
    console.warn('MediaSaver native direct attempt encountered an error, trying fallback:', nativeErr);
  }

  // 2. Fallback to @capacitor-community/media
  try {
    const { Media } = await import('@capacitor-community/media');
    const platform = Capacitor.getPlatform();
    const albums = (await Media.getAlbums()).albums ?? [];
    if (!albums.some((a) => a.name === ALBUM_NAME)) {
      try {
        await Media.createAlbum({ name: ALBUM_NAME });
      } catch {}
    }
    const refreshed = (await Media.getAlbums()).albums ?? [];
    const albumsPath = platform === 'android' ? (await Media.getAlbumsPath()).path : null;
    const albumIdentifier = pickAlbumIdentifier(refreshed, albumsPath, platform);

    const path = await toDataUrl(url);
    const options = { path, albumIdentifier, fileName: galleryFileName(fileName) };
    if (kind === 'video') await Media.saveVideo(options);
    else await Media.savePhoto(options);
    return { where: 'gallery', fileName };
  } catch (fallbackErr) {
    console.error('All native gallery save methods failed:', fallbackErr);
    throw fallbackErr;
  }
}
