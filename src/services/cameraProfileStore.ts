/**
 * Storage and lookup for virtual camera profiles.
 *
 * Built-in cameras ship with the app and are never overwritten. Editing one stores an override
 * (so "reset" really restores factory values). User profiles (duplicates and imports) are stored
 * whole. Everything is persisted in localStorage, failures are swallowed so a full or blocked
 * store can never break the camera.
 */
import {
  BUILTIN_PROFILES,
  type CameraProfile,
  clampProfile,
  duplicateProfile,
  exportProfile,
  importProfile,
  mergeProfile,
  NEUTRAL_PROFILE,
} from '../utils/cameraProfile';

const USER_KEY = 'cinegrid_camera_profiles_v1';
const OVERRIDE_KEY = 'cinegrid_camera_profile_overrides_v1';
/** Last selected camera. Deliberately NOT in resetOnLaunch's FEATURE_STATE_KEYS, so it survives restarts. */
const ACTIVE_KEY = 'cinegrid_active_camera_v1';
const MAX_USER_PROFILES = 100;

type Listener = () => void;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const newId = (): string => `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

class CameraProfileStore {
  private users: CameraProfile[] = [];
  private overrides: Record<string, CameraProfile> = {};
  private listeners = new Set<Listener>();
  private revision = 0;
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const users = readJson<unknown>(USER_KEY, []);
    this.users = (Array.isArray(users) ? users : [])
      .slice(0, MAX_USER_PROFILES)
      .map((u) => ({ ...clampProfile(mergeProfile(NEUTRAL_PROFILE, u)), builtIn: false }));
    const ov = readJson<Record<string, unknown>>(OVERRIDE_KEY, {});
    this.overrides = {};
    for (const b of BUILTIN_PROFILES) {
      if (ov && typeof ov === 'object' && ov[b.id]) {
        this.overrides[b.id] = { ...clampProfile(mergeProfile(b, ov[b.id])), id: b.id, builtIn: true };
      }
    }
  }

  private commit(): void {
    writeJson(USER_KEY, this.users);
    writeJson(OVERRIDE_KEY, this.overrides);
    this.revision++;
    this.listeners.forEach((l) => l());
  }

  /** For useSyncExternalStore. */
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getRevision = (): number => this.revision;

  list(): CameraProfile[] {
    this.load();
    return [...BUILTIN_PROFILES.map((b) => this.overrides[b.id] ?? b), ...this.users];
  }

  get(id: string | null | undefined): CameraProfile | null {
    if (!id) return null;
    return this.list().find((p) => p.id === id) ?? null;
  }

  /** The remembered camera, or null if none was chosen or it no longer exists (deleted / corrupt). */
  getActiveId(): string | null {
    try {
      const id = localStorage.getItem(ACTIVE_KEY);
      return id && this.get(id) ? id : null;
    } catch {
      return null;
    }
  }

  /** Remembers the selection (null = explicit No camera). Never notifies: it mirrors UI state. */
  setActiveId(id: string | null): void {
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* storage unavailable: selection just won't persist */
    }
  }

  isModified(id: string): boolean {
    this.load();
    return Boolean(this.overrides[id]);
  }

  /** Saves edits. Built-ins keep their identity and are stored as an override; user profiles are replaced. */
  update(profile: CameraProfile): CameraProfile | null {
    this.load();
    const clean = clampProfile(profile);
    if (BUILTIN_PROFILES.some((b) => b.id === profile.id)) {
      const saved = { ...clean, id: profile.id, builtIn: true };
      this.overrides[profile.id] = saved;
      this.commit();
      return saved;
    }
    const i = this.users.findIndex((u) => u.id === profile.id);
    if (i < 0) return null;
    const saved = { ...clean, id: profile.id, builtIn: false };
    this.users[i] = saved;
    this.commit();
    return saved;
  }

  duplicate(id: string): CameraProfile | null {
    this.load();
    const src = this.get(id);
    if (!src || this.users.length >= MAX_USER_PROFILES) return null;
    const copy = duplicateProfile(src, newId());
    this.users.push(copy);
    this.commit();
    return copy;
  }

  /** Restores a built-in to factory values. No-op for user profiles. */
  reset(id: string): CameraProfile | null {
    this.load();
    if (!this.overrides[id]) return this.get(id);
    delete this.overrides[id];
    this.commit();
    return this.get(id);
  }

  remove(id: string): boolean {
    this.load();
    const i = this.users.findIndex((u) => u.id === id);
    if (i < 0) return false;
    this.users.splice(i, 1);
    this.commit();
    return true;
  }

  exportJson(id: string): string | null {
    const p = this.get(id);
    return p ? exportProfile(p) : null;
  }

  importJson(text: string): { ok: true; profile: CameraProfile } | { ok: false; error: string } {
    this.load();
    if (this.users.length >= MAX_USER_PROFILES) return { ok: false, error: 'Profile limit reached. Delete one first.' };
    const r = importProfile(text, newId());
    if (!r.ok) return r;
    this.users.push(r.profile);
    this.commit();
    return r;
  }

  /** Test hook: forget in-memory state so the next call re-reads storage. */
  _reloadForTests(): void {
    this.loaded = false;
    this.users = [];
    this.overrides = {};
  }
}

export const cameraProfileStore = new CameraProfileStore();

// Handy for on-device debugging over remote DevTools: window.__cgProfiles.get('cam_gold400')
if (typeof window !== 'undefined') (window as unknown as { __cgProfiles: CameraProfileStore }).__cgProfiles = cameraProfileStore;
