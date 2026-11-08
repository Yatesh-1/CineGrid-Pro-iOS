/**
 * Green / magenta white-balance tint. CSS filters have no per-channel gain, so the tint is an SVG
 * feColorMatrix (declared in index.html as #cg-tint) that both the CSS preview filter and the canvas
 * capture filter reference. Positive = green, negative = magenta (matches the slider label).
 */
export const TINT_FILTER_REF = 'url(#cg-tint)';
const MAX_TINT = 50;
const MAX_GAIN = 0.18;

/** 4x5 colour matrix string for a tint of -50 (magenta) to +50 (green). 0 is the identity. */
export function tintMatrix(tint: number): string {
  const t = Math.max(-MAX_TINT, Math.min(MAX_TINT, tint || 0)) / MAX_TINT;
  const g = 1 + t * MAX_GAIN; // green gain
  const rb = 1 - t * MAX_GAIN * 0.5; // red and blue move the other way, half as much
  return `${rb} 0 0 0 0  0 ${g} 0 0 0  0 0 ${rb} 0 0  0 0 0 1 0`;
}

/** Writes the current tint into the shared SVG filter. No-op outside a browser document. */
export function setTintFilter(tint: number): void {
  if (typeof document === 'undefined') return;
  document.getElementById('cg-tint-matrix')?.setAttribute('values', tintMatrix(tint));
}

/** The tint the app should apply for these pro settings (either field may carry it). */
export function effectiveTint(pro: { tint?: number; wbTint?: number }): number {
  return pro.tint ?? pro.wbTint ?? 0;
}
