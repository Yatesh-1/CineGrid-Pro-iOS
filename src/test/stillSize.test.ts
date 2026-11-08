import { describe, it, expect } from 'vitest';
import { stillSizeFor } from '../services/cameraService';

describe('stillSizeFor', () => {
  // Camera advertised maxima on the test phone: 3840 x 2448 (independent limits, not a real mode)
  it('matches the frame shape inside the advertised limits', () => {
    expect(stillSizeFor(3840, 2448, 4 / 3)).toEqual({ width: 3264, height: 2448 });
    expect(stillSizeFor(3840, 2448, 16 / 9)).toEqual({ width: 3840, height: 2160 });
    expect(stillSizeFor(3840, 2448, 1)).toEqual({ width: 2448, height: 2448 });
  });

  it('never exceeds the limits and keeps the requested shape', () => {
    for (const r of [1, 1.25, 4 / 3, 3 / 2, 16 / 9, 2, 3]) {
      const s = stillSizeFor(3840, 2448, r);
      expect(s.width).toBeLessThanOrEqual(3840);
      expect(s.height).toBeLessThanOrEqual(2448);
      expect(s.width / s.height).toBeCloseTo(r, 2);
    }
  });

  it('falls back to the maxima for a missing or invalid ratio (the old behaviour)', () => {
    for (const r of [undefined, 0, NaN, 0.5]) expect(stillSizeFor(3840, 2448, r)).toEqual({ width: 3840, height: 2448 });
  });
});
