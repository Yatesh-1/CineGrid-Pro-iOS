/**
 * Chooses the longest side of the live GPU preview so the viewfinder keeps a smooth frame rate on whatever phone
 * it runs on. Rendering cost is mostly GPU fill-rate shared with the page compositor: on the test phone a full
 * 1080x1920 preview dragged even the raw camera video from 30 to 16 fps. Photos and video recording do not use
 * this size (photos are re-rendered from the full-resolution still).
 */
export const PREVIEW_SIDE_MAX = 1280;
export const PREVIEW_SIDE_MIN = 640;

const FPS_TOO_LOW = 22;
const FPS_PLENTY = 28.5;

/**
 * @param fps measured preview fps over the last window, or null when there is not enough data yet
 * @param current current longest side in pixels
 * @returns the side to use next (unchanged when fps is acceptable or unknown)
 */
export function nextPreviewSide(fps: number | null, current: number): number {
  if (fps === null) return current;
  if (fps < FPS_TOO_LOW) return Math.max(PREVIEW_SIDE_MIN, Math.round((current * 0.85) / 16) * 16);
  if (fps > FPS_PLENTY && current < PREVIEW_SIDE_MAX) return Math.min(PREVIEW_SIDE_MAX, Math.round((current * 1.1) / 16) * 16);
  return current;
}
