/** Zoom ceilings per capture style: stills reach 24x, video stays at 8x so footage remains usable. */
export const PHOTO_MAX_ZOOM = 24;
export const VIDEO_MAX_ZOOM = 8;

export function maxZoomFor(captureMode: string): number {
  return captureMode === 'video' ? VIDEO_MAX_ZOOM : PHOTO_MAX_ZOOM;
}

/** Zoom feels linear on a log scale (1x to 2x spans the same travel as 12x to 24x). */
export function zoomToRatio(zoom: number, min: number, max: number): number {
  if (max <= min) return 0;
  const z = Math.min(max, Math.max(min, zoom));
  return (Math.log(z) - Math.log(min)) / (Math.log(max) - Math.log(min));
}

export function ratioToZoom(ratio: number, min: number, max: number): number {
  const r = Math.min(1, Math.max(0, ratio));
  return Math.exp(Math.log(min) + r * (Math.log(max) - Math.log(min)));
}

/** Rounds to a step that suits the magnitude: 0.1x under 10x, whole numbers above. */
export function snapZoom(zoom: number): number {
  return zoom < 10 ? Math.round(zoom * 10) / 10 : Math.round(zoom);
}

export function formatZoom(zoom: number): string {
  const s = snapZoom(zoom);
  return `${Number.isInteger(s) ? s : s.toFixed(1)}x`;
}

/** Quick-pick stops that fit inside [min, max]. */
export function zoomStops(min: number, max: number): number[] {
  const candidates = [0.5, 1, 2, 3, 5, 8, 10, 15, 24];
  return candidates.filter((c) => c >= min - 0.01 && c <= max + 0.01);
}
