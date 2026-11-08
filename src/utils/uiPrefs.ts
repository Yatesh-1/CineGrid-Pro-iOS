/**
 * Small persisted preferences for settings that used to live only in memory (so every restart reset them):
 * aspect ratio, the legacy filter and its strength, the self-timer, HDR and the flash mode.
 * Everything read back is validated, so a corrupt or outdated value can only fall back to the default, never break the app.
 * Zoom and front/rear facing are deliberately NOT persisted (the camera opens on the rear camera at 1x).
 */
import type { AspectRatio } from '../types/camera';

export type FlashMode = 'off' | 'auto' | 'on';

export interface UiPrefs {
  aspectRatio?: AspectRatio;
  filterId?: string;
  filterStrength?: number;
  timer?: number;
  hdr?: boolean;
  flashMode?: FlashMode;
}

const KEY = 'cinegrid_ui_prefs_v1';
const ASPECTS: AspectRatio[] = ['1:1', '4:3', '3:2', '4:5', '5:4', '9:16', '16:9', '2.35:1', '2.39:1', '21:9'];
const TIMERS = [0, 3, 5, 10];
const FLASH: FlashMode[] = ['off', 'auto', 'on'];

export function sanitizePrefs(raw: unknown, validAspects: readonly string[] = ASPECTS, validFilterIds?: readonly string[]): UiPrefs {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: UiPrefs = {};
  if (typeof r.aspectRatio === 'string' && validAspects.includes(r.aspectRatio)) out.aspectRatio = r.aspectRatio as AspectRatio;
  if (typeof r.filterId === 'string' && (!validFilterIds || validFilterIds.includes(r.filterId))) out.filterId = r.filterId;
  if (typeof r.filterStrength === 'number' && Number.isFinite(r.filterStrength)) out.filterStrength = Math.min(100, Math.max(0, r.filterStrength));
  if (typeof r.timer === 'number' && TIMERS.includes(r.timer)) out.timer = r.timer;
  if (typeof r.hdr === 'boolean') out.hdr = r.hdr;
  if (typeof r.flashMode === 'string' && FLASH.includes(r.flashMode as FlashMode)) out.flashMode = r.flashMode as FlashMode;
  return out;
}

export function loadPrefs(validAspects?: readonly string[], validFilterIds?: readonly string[]): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitizePrefs(JSON.parse(raw), validAspects, validFilterIds) : {};
  } catch {
    return {};
  }
}

export function savePrefs(p: UiPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sanitizePrefs(p)));
  } catch {
    /* storage full or blocked: the setting simply will not persist */
  }
}
