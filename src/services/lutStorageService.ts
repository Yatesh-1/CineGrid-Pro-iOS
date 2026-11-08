import type { LutDefinition, UserLookPreset } from '../types/lut';
import { BUILTIN_LUTS } from '../data/lutLibrary';
import { parseCubeFile } from '../utils/cubeParser';

const STORAGE_IMPORTED_LUTS_KEY = 'cinegrid_imported_luts_meta';
const STORAGE_FAVORITES_KEY = 'cinegrid_lut_favorites';
const STORAGE_USER_PRESETS_KEY = 'cinegrid_user_look_presets';
const DB_NAME = 'CineGridLutStore';
const DB_VERSION = 1;
const CUBE_STORE = 'cube_blobs';

class LutStorageService {
  private static instance: LutStorageService;
  private db: IDBDatabase | null = null;
  private importedLutsCache: LutDefinition[] = [];
  private favoritesSet: Set<string> = new Set();
  private userPresets: UserLookPreset[] = [];
  private isInitialized = false;

  public static getInstance(): LutStorageService {
    if (!LutStorageService.instance) {
      LutStorageService.instance = new LutStorageService();
    }
    return LutStorageService.instance;
  }

  constructor() {
    this.loadFavoritesFromStorage();
    this.loadUserPresetsFromStorage();
  }

  private loadFavoritesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_FAVORITES_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        this.favoritesSet = new Set(arr);
      }
    } catch {}
  }

  private saveFavoritesToStorage() {
    try {
      localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(Array.from(this.favoritesSet)));
    } catch {}
  }

  private loadUserPresetsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_USER_PRESETS_KEY);
      if (raw) {
        this.userPresets = JSON.parse(raw);
      }
    } catch {}
  }

  private saveUserPresetsToStorage() {
    try {
      localStorage.setItem(STORAGE_USER_PRESETS_KEY, JSON.stringify(this.userPresets));
    } catch {}
  }

  /**
   * Initializes IndexedDB connection for persistent storage of large .cube files
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isInitialized = true;
      this.loadImportedLutsFromLocalStorage();
      return;
    }

    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(CUBE_STORE)) {
            db.createObjectStore(CUBE_STORE, { keyPath: 'id' });
          }
        };

        req.onsuccess = async (e: any) => {
          this.db = e.target.result;
          this.isInitialized = true;
          await this.loadImportedLutsFromDb();
          resolve();
        };

        req.onerror = () => {
          this.isInitialized = true;
          this.loadImportedLutsFromLocalStorage();
          resolve();
        };
      } catch {
        this.isInitialized = true;
        this.loadImportedLutsFromLocalStorage();
        resolve();
      }
    });
  }

  private loadImportedLutsFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_IMPORTED_LUTS_KEY);
      if (raw) {
        const parsedList: { id: string; name: string; rawCube: string; importDate?: number; size: number }[] = JSON.parse(raw);
        const items: LutDefinition[] = [];
        for (const item of parsedList) {
          const parsed = parseCubeFile(item.rawCube, item.name);
          if (parsed.success && parsed.lut) {
            items.push({
              ...parsed.lut,
              id: item.id,
              name: item.name,
              isImported: true,
              importDate: item.importDate || Date.now(),
              isFavorite: this.favoritesSet.has(item.id),
            });
          }
        }
        this.importedLutsCache = items;
      }
    } catch {}
  }

  private async loadImportedLutsFromDb() {
    if (!this.db) {
      this.loadImportedLutsFromLocalStorage();
      return;
    }

    return new Promise<void>((resolve) => {
      try {
        const tx = this.db!.transaction(CUBE_STORE, 'readonly');
        const store = tx.objectStore(CUBE_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const records: { id: string; name: string; rawCube: string; importDate?: number }[] = req.result || [];
          const items: LutDefinition[] = [];
          for (const rec of records) {
            const parsed = parseCubeFile(rec.rawCube, rec.name);
            if (parsed.success && parsed.lut) {
              items.push({
                ...parsed.lut,
                id: rec.id,
                name: rec.name,
                isImported: true,
                importDate: rec.importDate || Date.now(),
                isFavorite: this.favoritesSet.has(rec.id),
              });
            }
          }
          this.importedLutsCache = items;
          resolve();
        };

        req.onerror = () => {
          this.loadImportedLutsFromLocalStorage();
          resolve();
        };
      } catch {
        this.loadImportedLutsFromLocalStorage();
        resolve();
      }
    });
  }

  /**
   * Retrieves all available LUTs (built-in + imported)
   */
  public getAllLuts(): LutDefinition[] {
    const builtins = BUILTIN_LUTS.map((l) => ({
      ...l,
      isFavorite: this.favoritesSet.has(l.id),
    }));

    const imported = this.importedLutsCache.map((l) => ({
      ...l,
      isFavorite: this.favoritesSet.has(l.id),
    }));

    return [...imported, ...builtins];
  }

  public getLutById(id: string): LutDefinition | undefined {
    return this.getAllLuts().find((l) => l.id === id);
  }

  /**
   * Imports and stores a new custom LUT
   */
  public async saveImportedLut(lut: LutDefinition): Promise<boolean> {
    // Add to memory cache
    this.importedLutsCache = [lut, ...this.importedLutsCache.filter((l) => l.id !== lut.id)];

    // Persist to IndexedDB
    if (this.db) {
      return new Promise<boolean>((resolve) => {
        try {
          const tx = this.db!.transaction(CUBE_STORE, 'readwrite');
          const store = tx.objectStore(CUBE_STORE);
          store.put({
            id: lut.id,
            name: lut.name,
            rawCube: lut.rawCube || '',
            size: lut.size,
            importDate: lut.importDate || Date.now(),
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }

    // Fallback: LocalStorage
    try {
      const records = this.importedLutsCache.map((l) => ({
        id: l.id,
        name: l.name,
        rawCube: l.rawCube || '',
        size: l.size,
        importDate: l.importDate,
      }));
      localStorage.setItem(STORAGE_IMPORTED_LUTS_KEY, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes an imported LUT
   */
  public async deleteLut(id: string): Promise<boolean> {
    this.importedLutsCache = this.importedLutsCache.filter((l) => l.id !== id);
    this.favoritesSet.delete(id);
    this.saveFavoritesToStorage();

    if (this.db) {
      return new Promise<boolean>((resolve) => {
        try {
          const tx = this.db!.transaction(CUBE_STORE, 'readwrite');
          const store = tx.objectStore(CUBE_STORE);
          store.delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }

    try {
      const records = this.importedLutsCache.map((l) => ({
        id: l.id,
        name: l.name,
        rawCube: l.rawCube || '',
        size: l.size,
        importDate: l.importDate,
      }));
      localStorage.setItem(STORAGE_IMPORTED_LUTS_KEY, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Renames a LUT
   */
  public async renameLut(id: string, newName: string): Promise<boolean> {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const lut = this.importedLutsCache.find((l) => l.id === id);
    if (!lut) return false;

    lut.name = trimmed;
    lut.title = trimmed;
    return this.saveImportedLut(lut);
  }

  /**
   * Toggles favorite status for any LUT
   */
  public toggleFavorite(id: string): boolean {
    if (this.favoritesSet.has(id)) {
      this.favoritesSet.delete(id);
    } else {
      this.favoritesSet.add(id);
    }
    this.saveFavoritesToStorage();
    return this.favoritesSet.has(id);
  }

  public isFavorite(id: string): boolean {
    return this.favoritesSet.has(id);
  }

  // --- Custom Look Presets ---
  public getUserPresets(): UserLookPreset[] {
    return this.userPresets;
  }

  public saveUserPreset(preset: UserLookPreset): void {
    this.userPresets = [preset, ...this.userPresets.filter((p) => p.id !== preset.id)];
    this.saveUserPresetsToStorage();
  }

  public deleteUserPreset(id: string): void {
    this.userPresets = this.userPresets.filter((p) => p.id !== id);
    this.saveUserPresetsToStorage();
  }
}

export const lutStorageService = LutStorageService.getInstance();
