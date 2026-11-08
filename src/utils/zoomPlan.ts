export interface HardwareZoomRange {
  min: number;
  max: number;
}

export interface ZoomPlan {
  /** Value to send to the camera track, or null when the device exposes no hardware zoom. */
  hardwareZoom: number | null;
  /** Remaining magnification applied by cropping the image (1 = none). Never below 1. */
  digitalScale: number;
  /** True when part of the zoom is a digital crop, so it must not be labelled optical. */
  isDigital: boolean;
}

const EPS = 0.02;

/**
 * Splits a requested zoom into what the camera hardware can do and what must be cropped.
 *
 * @param requested  zoom the user asked for, relative to the 1x main lens
 * @param range      hardware zoom range reported by the active track (null if unsupported)
 * @param lensBase   zoom factor the active physical lens already represents (e.g. 3 for a 3x tele lens)
 */
export function planZoom(requested: number, range: HardwareZoomRange | null, lensBase = 1): ZoomPlan {
  const relative = requested / Math.max(lensBase, 0.01);
  if (!range) {
    const digitalScale = Math.max(1, relative);
    return { hardwareZoom: null, digitalScale, isDigital: digitalScale > 1 + EPS };
  }
  const hardwareZoom = Math.min(range.max, Math.max(range.min, relative));
  // Never crop below 1: zooming out past the hardware minimum is simply not possible.
  const digitalScale = Math.max(1, relative / hardwareZoom);
  return { hardwareZoom, digitalScale, isDigital: digitalScale > 1 + EPS };
}

/** Lowest and highest effective zoom the preview can offer. */
export function zoomLimits(
  range: HardwareZoomRange | null,
  lensBase: number,
  hasUltraWideLens: boolean,
  maxDigital = 24
): { min: number; max: number } {
  const hwMin = range ? range.min * lensBase : 1;
  // The strip must only offer zoom levels that really change the picture. Below 1x that needs either hardware
  // that zooms out (the track's own range goes below 1) or an ultra-wide lens (0.5x). With neither, the widest
  // view is 1x: a 0.5x stop would just show the same picture as 1x.
  let min = 1;
  if (hwMin < 1) min = hwMin;
  else if (hasUltraWideLens) min = 0.5;
  return { min: Math.max(0.3, Number(min.toFixed(2))), max: Math.max(maxDigital, range ? range.max * lensBase : 1) };
}

/**
 * The zoom factor a physical lens absorbs for a request, or null when the lens must not be treated as the zoom itself.
 * Front cameras and single-lens devices report an "exact match" for every request; accepting that would turn the
 * remaining digital crop into 1x and zoom would do nothing. A lens counts only when its own factor equals the request.
 */
export function lensAbsorbedZoom(isExactMatch: boolean, lensFactor: number | undefined, requested: number): number | null {
  const factor = lensFactor ?? 1;
  return isExactMatch && Math.abs(factor - requested) < 0.05 ? factor : null;
}