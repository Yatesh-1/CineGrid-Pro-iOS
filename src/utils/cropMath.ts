import type { CropAspectRatio } from '../types/studio';

/** Crop rectangle as percentages of the source image (0..100 on both axes). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

export const FULL_CROP: CropRect = { x: 0, y: 0, width: 100, height: 100 };

const MIN_SIZE = 5; // percent

const PRESET_RATIOS: Partial<Record<CropAspectRatio, number>> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '4:5': 4 / 5,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
};

/** Numeric width/height for a ratio, or null when the crop is free. `original` follows the image. */
export function ratioValue(ratio: CropAspectRatio, imageAspect: number): number | null {
  if (ratio === 'free') return null;
  if (ratio === 'original') return imageAspect;
  return PRESET_RATIOS[ratio] ?? null;
}

/** Largest crop of the given pixel ratio that fits the image, centred. */
export function centeredCropRect(ratio: CropAspectRatio, imageAspect: number): CropRect {
  const r = ratioValue(ratio, imageAspect);
  if (r === null || ratio === 'original') return { ...FULL_CROP };
  let width: number;
  let height: number;
  if (r >= imageAspect) {
    width = 100;
    height = (imageAspect / r) * 100;
  } else {
    height = 100;
    width = (r / imageAspect) * 100;
  }
  return { x: (100 - width) / 2, y: (100 - height) / 2, width, height };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Pixel aspect of a rect (width / height) on an image with the given aspect. */
export const rectAspect = (rect: CropRect, imageAspect: number): number => (rect.width / rect.height) * imageAspect;

/**
 * Applies a pointer drag to a crop rectangle.
 * @param px,py  pointer position, in percent of the image
 * @param start  rectangle when the drag began
 * @param grab   offset (percent) of the pointer inside the rect for `move`
 * @param lock   pixel aspect to hold, or null for free cropping
 */
export function dragCrop(
  handle: CropHandle,
  start: CropRect,
  px: number,
  py: number,
  imageAspect: number,
  lock: number | null,
  grab: { x: number; y: number } = { x: 0, y: 0 }
): CropRect {
  if (handle === 'move') {
    return {
      ...start,
      x: clamp(px - grab.x, 0, 100 - start.width),
      y: clamp(py - grab.y, 0, 100 - start.height),
    };
  }

  const right = start.x + start.width;
  const bottom = start.y + start.height;
  const movesW = handle.includes('w');
  const movesE = handle.includes('e');
  const movesN = handle.includes('n');
  const movesS = handle.includes('s');

  let left = movesW ? clamp(px, 0, right - MIN_SIZE) : start.x;
  let rgt = movesE ? clamp(px, start.x + MIN_SIZE, 100) : right;
  let top = movesN ? clamp(py, 0, bottom - MIN_SIZE) : start.y;
  let bot = movesS ? clamp(py, start.y + MIN_SIZE, 100) : bottom;

  if (lock !== null) {
    // corners only: the opposite corner stays fixed and the size follows the pointer, ratio held
    const heightPerWidth = imageAspect / lock; // height% = width% * heightPerWidth
    const anchorX = movesW ? right : start.x;
    const anchorY = movesN ? bottom : start.y;
    const availW = movesW ? anchorX : 100 - anchorX;
    const availH = movesN ? anchorY : 100 - anchorY;
    const wantW = Math.abs(px - anchorX);
    const wantH = Math.abs(py - anchorY);
    let w = Math.max(wantW, wantH / heightPerWidth);
    w = Math.min(w, availW, availH / heightPerWidth);
    w = Math.max(w, MIN_SIZE);
    const h = w * heightPerWidth;
    left = movesW ? anchorX - w : anchorX;
    rgt = movesW ? anchorX : anchorX + w;
    top = movesN ? anchorY - h : anchorY;
    bot = movesN ? anchorY : anchorY + h;
  }

  return { x: left, y: top, width: rgt - left, height: bot - top };
}

/** Rect with a changed ratio, keeping its centre and fitting inside the image. */
export function refitCrop(rect: CropRect, ratio: CropAspectRatio, imageAspect: number): CropRect {
  const r = ratioValue(ratio, imageAspect);
  if (r === null) return rect;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const target = centeredCropRect(ratio, imageAspect);
  const scale = Math.min(1, Math.max(rect.width / target.width, rect.height / target.height));
  const width = target.width * scale;
  const height = target.height * scale;
  return {
    x: clamp(cx - width / 2, 0, 100 - width),
    y: clamp(cy - height / 2, 0, 100 - height),
    width,
    height,
  };
}
