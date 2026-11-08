/** Brightness slider next to the focus square, like the iPhone camera: drag up for brighter, down for darker. */
export const EV_MIN = -3;
export const EV_MAX = 3;
export const LONG_PRESS_MS = 550;
/** Finger movement (px) beyond which a press is a drag, not a long press. */
export const LONG_PRESS_SLOP = 10;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Position 0 (top) .. trackHeight (bottom) to an EV value, snapped to 0.1 and clamped. */
export function evFromTrackPosition(y: number, trackHeight: number, min = EV_MIN, max = EV_MAX): number {
  if (trackHeight <= 0) return 0;
  const ratio = clamp(y / trackHeight, 0, 1);
  const ev = max - ratio * (max - min);
  return Math.round(ev * 10) / 10 + 0; // + 0 turns -0 into 0
}

/** EV to the thumb position along the track, 0 at the top. */
export function trackPositionFromEv(ev: number, trackHeight: number, min = EV_MIN, max = EV_MAX): number {
  const ratio = (max - clamp(ev, min, max)) / (max - min);
  return ratio * trackHeight;
}

/** Keyboard step for the slider; keeps values on the 0.1 grid and inside the range. */
export function stepEv(ev: number, direction: 1 | -1, min = EV_MIN, max = EV_MAX): number {
  return Math.round(clamp(ev + direction * 0.1, min, max) * 10) / 10 + 0;
}

/** Where the slider sits relative to the focus square: on the right unless that would leave the frame. */
export function sliderSide(focusXPercent: number): 'left' | 'right' {
  return focusXPercent > 68 ? 'left' : 'right';
}
