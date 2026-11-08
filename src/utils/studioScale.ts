/**
 * 1-100 scales for the camera studio sliders. Every slider maps onto the camera's own range (never beyond it), so 1 is the
 * lowest the hardware offers and 100 the highest. Exposure-type values use a logarithmic scale (equal steps = equal
 * changes in brightness), like a real exposure dial.
 */
export const clampPct = (p: number): number => Math.min(100, Math.max(1, Math.round(p)));

const t = (p: number) => (clampPct(p) - 1) / 99; // 0..1

const logLerp = (min: number, max: number, u: number) => min * Math.pow(max / min, u);
const logInverse = (min: number, max: number, v: number) => Math.log(Math.min(max, Math.max(min, v)) / min) / Math.log(max / min);

export interface Range {
  min: number;
  max: number;
}

export const isoFromPct = (p: number, r: Range): number => Math.round(logLerp(r.min, r.max, t(p)));
export const pctFromIso = (iso: number, r: Range): number => clampPct(1 + 99 * logInverse(r.min, r.max, iso));

/** Shutter: 1 = fastest, 100 = slowest. Range in seconds. */
export const shutterFromPct = (p: number, r: Range): number => logLerp(r.min, r.max, t(p));
export const pctFromShutter = (secs: number, r: Range): number => clampPct(1 + 99 * logInverse(r.min, r.max, secs));

/** "1/250" for fast speeds, "0.5" / "2.0" (seconds) for slow ones; both are understood by the shutter parser. */
export function shutterLabel(secs: number): string {
  if (secs >= 0.5) return secs.toFixed(1);
  return `1/${Math.max(1, Math.round(1 / secs))}`;
}

export const evFromPct = (p: number, r: Range): number => Math.round((r.min + (r.max - r.min) * t(p)) * 10) / 10;
export const pctFromEv = (ev: number, r: Range): number => clampPct(1 + (99 * (ev - r.min)) / (r.max - r.min));

/** Focus: 1 = nearest, 100 = farthest. Stored as 0..1 (the app's manualFocus). */
export const focusFromPct = (p: number): number => t(p);
export const pctFromFocus = (f: number): number => clampPct(1 + 99 * Math.min(1, Math.max(0, f)));

export const kelvinFromPct = (p: number, r: Range): number => Math.round((r.min + (r.max - r.min) * t(p)) / 50) * 50;
export const pctFromKelvin = (k: number, r: Range): number => clampPct(1 + (99 * (k - r.min)) / (r.max - r.min));
