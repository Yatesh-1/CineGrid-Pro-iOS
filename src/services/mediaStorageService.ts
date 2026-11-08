// Binary Media Storage Service using IndexedDB & Bounded LRU Object URL Cache
// Eliminates multi-megabyte Base64 strings from thrashing React state & GC.

import { LRUCache } from '../utils/lruCache';
import { resourceManager } from './resourceManager';
import type { CapturedPhoto } from '../types/camera';
import { deleteVariants, fileBackingAvailable, initPhotoBase, isFileBacked, variantUrl } from './photoFiles';

const DB_NAME = 'CineGridMediaStore';
const DB_VERSION = 1;
const STORE_PHOTOS = 'photos';
const STORE_BLOBS = 'photo_blobs';

export class MediaStorageService {
  private static instance: MediaStorageService;
  private db: IDBDatabase | null = null;
  private isInit = false;

  // LRU cache for active Object URLs to prevent memory leaks
  private objectUrlCache: LRUCache<string, string>;

  private constructor() {
    this.objectUrlCache = new LRUCache<string, string>({
      maxEntries: 25,
      onEvict: (_id, url) => {
        resourceManager.revokeManagedObjectURL(url);
      },
    });
  }

  public static getInstance(): MediaStorageService {
    if (!MediaStorageService.instance) {
      MediaStorageService.instance = new MediaStorageService();
    }
    return MediaStorageService.instance;
  }

  public async init(): Promise<void> {
    if (this.isInit) return;

    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        this.isInit = true;
        resolve();
        return;
      }

      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
            db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_BLOBS)) {
            db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
          }
        };

        req.onsuccess = () => {
          this.db = req.result;
          this.isInit = true;
          resolve();
        };

        req.onerror = () => {
          console.warn('Failed to open IndexedDB Media Store, falling back to memory.');
          this.isInit = true;
          resolve();
        };
      } catch {
        this.isInit = true;
        resolve();
      }
    });
  }

  /**
   * Converts a DataURL to a binary Blob efficiently
   */
  public dataUrlToBlob(dataUrl: string): Blob {
    try {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch {
      return new Blob([], { type: 'image/jpeg' });
    }
  }

  /**
   * Saves a newly captured photo to IndexedDB with binary separation
   */
  /** Any data:/blob: URL to a Blob; null when the URL is empty or cannot be read. */
  private async urlToBlob(url: string | undefined): Promise<Blob | null> {
    if (!url) return null;
    if (url.startsWith('data:')) return this.dataUrlToBlob(url);
    try {
      return await (await fetch(url)).blob();
    } catch {
      return null;
    }
  }

  public async savePhoto(photo: CapturedPhoto): Promise<void> {
    await this.init();

    if (fileBackingAvailable() && photo.mediaType !== 'video') {
      // Native photos persist as files + a metadata row. A photo still in Base64 is persisted right after it is
      // moved to disk (see compactPhoto), so nothing large is ever written to IndexedDB for it.
      if (!isFileBacked(photo.dataUrl) || !this.db) return;
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction([STORE_PHOTOS, STORE_BLOBS], 'readwrite');
          tx.objectStore(STORE_PHOTOS).put({
            ...photo,
            dataUrl: '',
            lookDataUrl: undefined,
            editedDataUrl: undefined,
            thumbnailUrl: '',
            fileBacked: true,
            hasThumb: !!photo.thumbnailUrl && photo.thumbnailUrl.includes('_thumb.jpg'),
            hasLook: !!photo.lookDataUrl,
            hasEdited: !!photo.editedDataUrl,
          });
          // any legacy binary copy of this id is superseded by the files
          for (const key of [photo.id, `${photo.id}#look`, `${photo.id}#edited`, `${photo.id}#thumb`]) {
            tx.objectStore(STORE_BLOBS).delete(key);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    // A streamed recording already lives in app storage: keep only its location, never a second copy of the video.
    if (fileBackingAvailable() && photo.mediaType === 'video' && photo.dataUrl.includes('/files/recordings/')) {
      if (!this.db) return;
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction([STORE_PHOTOS], 'readwrite');
          tx.objectStore(STORE_PHOTOS).put({
            ...photo,
            videoUrl: photo.dataUrl,
            dataUrl: '',
            thumbnailUrl: '',
            fileBacked: true,
            hasThumb: !!photo.thumbnailUrl && photo.thumbnailUrl.includes('_thumb.jpg'),
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    // Binary copies of every image variant: the metadata row never holds pixels (no Base64 in IndexedDB).
    const blob = (await this.urlToBlob(photo.dataUrl)) ?? new Blob([], { type: 'image/jpeg' });
    const lookBlob = await this.urlToBlob(photo.lookDataUrl);
    const editedBlob = await this.urlToBlob(photo.editedDataUrl);
    const thumbBlob = await this.urlToBlob(photo.thumbnailUrl);

    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction([STORE_PHOTOS, STORE_BLOBS], 'readwrite');
        const photoStore = tx.objectStore(STORE_PHOTOS);
        const blobStore = tx.objectStore(STORE_BLOBS);

        const meta = {
          ...photo,
          dataUrl: '',
          lookDataUrl: undefined,
          editedDataUrl: undefined,
          thumbnailUrl: '',
          hasBlob: true,
          blobSize: blob.size,
        };

        photoStore.put(meta);
        blobStore.put({ id: photo.id, blob });
        if (lookBlob) blobStore.put({ id: `${photo.id}#look`, blob: lookBlob });
        else blobStore.delete(`${photo.id}#look`);
        if (editedBlob) blobStore.put({ id: `${photo.id}#edited`, blob: editedBlob });
        else blobStore.delete(`${photo.id}#edited`);
        if (thumbBlob && thumbBlob.size > 0 && thumbBlob.size < blob.size) blobStore.put({ id: `${photo.id}#thumb`, blob: thumbBlob });
        else blobStore.delete(`${photo.id}#thumb`);

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Retrieves an Object URL for a photo (using bounded LRU cache)
   */
  public async getPhotoObjectUrl(photoId: string, fallbackDataUrl?: string): Promise<string> {
    if (this.objectUrlCache.has(photoId)) {
      return this.objectUrlCache.get(photoId)!;
    }

    await this.init();
    if (!this.db) {
      return fallbackDataUrl || '';
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_BLOBS, 'readonly');
        const store = tx.objectStore(STORE_BLOBS);
        const req = store.get(photoId);

        req.onsuccess = () => {
          if (req.result && req.result.blob instanceof Blob) {
            const url = resourceManager.createManagedObjectURL(req.result.blob, 'gallery_viewer');
            this.objectUrlCache.set(photoId, url);
            resolve(url);
          } else {
            resolve(fallbackDataUrl || '');
          }
        };

        req.onerror = () => resolve(fallbackDataUrl || '');
      } catch {
        resolve(fallbackDataUrl || '');
      }
    });
  }

  /**
   * Deletes a photo from persistent storage and releases its Object URL
   */
  public async deletePhoto(photoId: string): Promise<void> {
    this.objectUrlCache.delete(photoId);
    resourceManager.releaseByOwner(`photo_${photoId}`);
    // app-private copies only; the gallery copy in Pictures/CineGrid Pro is never deleted here
    deleteVariants(photoId).catch(() => {});

    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction([STORE_PHOTOS, STORE_BLOBS], 'readwrite');
        tx.objectStore(STORE_PHOTOS).delete(photoId);
        for (const key of [photoId, `${photoId}#look`, `${photoId}#edited`, `${photoId}#thumb`]) {
          tx.objectStore(STORE_BLOBS).delete(key);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Loads all saved photos from persistent storage, ordered newest first
   */
  public async loadAllPhotos(): Promise<CapturedPhoto[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction([STORE_PHOTOS, STORE_BLOBS], 'readonly');
        const photoStore = tx.objectStore(STORE_PHOTOS);
        const req = photoStore.getAll();

        req.onsuccess = async () => {
          const rawList = (req.result || []) as Array<CapturedPhoto & { hasBlob?: boolean }>;
          rawList.sort((a, b) => b.timestamp - a.timestamp);

          // Blobs are file-backed in the WebView, so holding a URL per photo costs almost nothing. They are NOT put
          // in the bounded LRU cache: evicting (revoking) a URL the gallery still shows would break that image.
          const urlFor = async (key: string): Promise<string | undefined> => {
            const blob = await new Promise<Blob | undefined>((res) => {
              const r = this.db!.transaction(STORE_BLOBS, 'readonly').objectStore(STORE_BLOBS).get(key);
              r.onsuccess = () => res(r.result?.blob instanceof Blob ? r.result.blob : undefined);
              r.onerror = () => res(undefined);
            });
            return blob && blob.size > 0 ? resourceManager.createManagedObjectURL(blob, `photo_${key.split('#')[0]}`) : undefined;
          };
          const photos: CapturedPhoto[] = [];
          for (const item of rawList as Array<CapturedPhoto & { fileBacked?: boolean; hasLook?: boolean; hasEdited?: boolean }>) {
            if (item.fileBacked && (item as { videoUrl?: string }).videoUrl) {
              await initPhotoBase();
              const hasThumb = (item as { hasThumb?: boolean }).hasThumb;
              photos.push({
                ...item,
                dataUrl: (item as { videoUrl?: string }).videoUrl as string,
                thumbnailUrl: hasThumb ? variantUrl(item.id, 'thumb') || '' : '',
              });
              continue;
            }
            if (item.fileBacked) {
              // Built without any per-photo native call (200 photos used to mean ~800 bridge calls and a slow, late list)
              await initPhotoBase();
              const fullUrl = variantUrl(item.id, 'full');
              if (!fullUrl) continue;
              photos.push({
                ...item,
                dataUrl: fullUrl,
                lookDataUrl: item.hasLook ? variantUrl(item.id, 'look') : undefined,
                editedDataUrl: item.hasEdited ? variantUrl(item.id, 'edited') : undefined,
                thumbnailUrl: (item as { hasThumb?: boolean }).hasThumb === false ? fullUrl : variantUrl(item.id, 'thumb') || fullUrl,
              });
              continue;
            }
            const full = item.dataUrl || (await urlFor(item.id)) || '';
            if (!full) continue;
            photos.push({
              ...item,
              dataUrl: full,
              lookDataUrl: item.lookDataUrl || (await urlFor(`${item.id}#look`)),
              editedDataUrl: item.editedDataUrl || (await urlFor(`${item.id}#edited`)),
              thumbnailUrl: (await urlFor(`${item.id}#thumb`)) || item.thumbnailUrl || full,
            });
          }
          resolve(photos);
        };

        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
}

export const mediaStorageService = MediaStorageService.getInstance();
