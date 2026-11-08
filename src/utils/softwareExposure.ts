import type { ProSettings } from '../types/camera';

/**
 * Manual ISO and shutter on a camera that cannot set them (most webcams and browsers).
 * The app then applies them as a software exposure change, in stops, on top of the metered picture,
 * and labels them as software. Reference point: ISO 100 at 1/60 s is "no change".
 */
export const REFERENCE_ISO = 100;
export const REFERENCE_SHUTTER_SECONDS = 1 / 60;
export const MAX_SOFTWARE_STOPS = 4;

/** Shutter time in seconds from "1/48", "0.5", "2" or an angle at a frame rate; null when unknown. */
export function shutterSeconds(settings: Pick<ProSettings, 'shutterMode' | 'shutterSpeed' | 'shutterAngle' | 'videoFps'>): number | null {
  if (settings.shutterMode === 'angle') {
    if (!(settings.shutterAngle > 0) || !(settings.videoFps > 0)) return null;
    return settings.shutterAngle / 360 / settings.videoFps;
  }
  const raw = String(settings.shutterSpeed ?? '').replace(/s$/i, '').trim();
  const frac = /^1\/(\d+(\.\d+)?)$/.exec(raw);
  if (frac) return 1 / Number(frac[1]);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const clamp = (v: number) => Math.max(-MAX_SOFTWARE_STOPS, Math.min(MAX_SOFTWARE_STOPS, v));

export function isoStops(iso: number): number {
  return iso > 0 ? clamp(Math.log2(iso / REFERENCE_ISO)) : 0;
}

export function shutterStops(seconds: number | null): number {
  return seconds && seconds > 0 ? clamp(Math.log2(seconds / REFERENCE_SHUTTER_SECONDS)) : 0;
}

/**
 * Stops to add to the preview and capture for settings the hardware did not apply.
 * Anything on AUTO, or already applied by the camera, contributes nothing.
 */
export function softwareExposureStops(
  settings: ProSettings,
  applied: { iso: boolean; shutter: boolean }
): number {
  let stops = 0;
  if (!settings.isoAuto && !applied.iso) stops += isoStops(settings.iso);
  if (!settings.shutterAuto && !applied.shutter) stops += shutterStops(shutterSeconds(settings));
  return clamp(stops);
}
