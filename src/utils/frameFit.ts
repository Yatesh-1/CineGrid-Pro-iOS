import type { AspectRatio } from '../types/camera';

/**
 * Viewfinder frame width / height for each capture ratio, in portrait like a phone camera:
 * "4:3" is a 3-wide by 4-tall frame, "16:9" is 9-wide by 16-tall, "1:1" is square.
 */
const PORTRAIT_FRAME: Record<AspectRatio, number> = {
  '1:1': 1,
  '4:3': 3 / 4,
  '3:2': 2 / 3,
  '4:5': 4 / 5,
  '5:4': 5 / 4,
  '9:16': 9 / 16,
  '16:9': 9 / 16,
  '2.35:1': 1 / 2.35,
  '2.39:1': 1 / 2.39,
  '21:9': 9 / 21,
};

export function frameWidthOverHeight(ratio: AspectRatio): number {
  return PORTRAIT_FRAME[ratio] ?? 9 / 16;
}

export interface FrameSize {
  width: number;
  height: number;
}

/** Largest frame with the given width/height ratio that fits inside the stage; never exceeds it on either side. */
export function fitFrame(stageWidth: number, stageHeight: number, widthOverHeight: number): FrameSize {
  if (stageWidth <= 0 || stageHeight <= 0 || widthOverHeight <= 0) return { width: 0, height: 0 };
  let width = stageWidth;
  let height = width / widthOverHeight;
  if (height > stageHeight) {
    height = stageHeight;
    width = height * widthOverHeight;
  }
  return { width: Math.floor(width), height: Math.floor(height) };
}

/** Like a phone camera: tall photo frames sit at the top of the stage, square and cinema frames are centred. */
export function framePlacement(ratio: AspectRatio): 'start' | 'center' {
  return ratio === '4:3' || ratio === '3:2' || ratio === '4:5' || ratio === '5:4' ? 'start' : 'center';
}
