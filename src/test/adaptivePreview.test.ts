import { describe, it, expect } from 'vitest';
import { nextPreviewSide, PREVIEW_SIDE_MAX, PREVIEW_SIDE_MIN } from '../utils/adaptivePreview';

describe('nextPreviewSide', () => {
  it('keeps the size when fps is unknown or acceptable', () => {
    expect(nextPreviewSide(null, 1280)).toBe(1280);
    expect(nextPreviewSide(24, 1000)).toBe(1000);
    expect(nextPreviewSide(28, 1000)).toBe(1000);
  });

  it('steps down when fps is too low, never below the minimum', () => {
    expect(nextPreviewSide(15, 1280)).toBeLessThan(1280);
    let side = 1280;
    for (let i = 0; i < 30; i++) side = nextPreviewSide(5, side);
    expect(side).toBe(PREVIEW_SIDE_MIN);
  });

  it('steps up when there is headroom, never above the maximum', () => {
    expect(nextPreviewSide(30, 800)).toBeGreaterThan(800);
    let side = 640;
    for (let i = 0; i < 30; i++) side = nextPreviewSide(30, side);
    expect(side).toBe(PREVIEW_SIDE_MAX);
    expect(nextPreviewSide(30, PREVIEW_SIDE_MAX)).toBe(PREVIEW_SIDE_MAX);
  });

  it('converges instead of oscillating when fps depends on size', () => {
    // Model: fps falls as pixels rise; the controller should settle inside the acceptable band
    const fpsAt = (side: number) => 30 * Math.min(1, (900 / side) ** 2);
    let side = 1280;
    const seen: number[] = [];
    for (let i = 0; i < 40; i++) {
      side = nextPreviewSide(fpsAt(side), side);
      seen.push(side);
    }
    expect(new Set(seen.slice(-8)).size).toBeLessThanOrEqual(2);
    expect(fpsAt(side)).toBeGreaterThanOrEqual(22);
  });
});
