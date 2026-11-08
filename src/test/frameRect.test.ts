import { describe, it, expect } from 'vitest';
import { frameRect } from '../utils/webglLutPipeline';

describe('frameRect (visible crop for frame-relative film effects)', () => {
  it('whole image when there is no ratio', () => {
    expect(frameRect(0.5625, null, 1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('4:3 portrait frame from a 9:16 sensor frame crops the height to 75%, centred', () => {
    const r = frameRect(9 / 16, 3 / 4, 1);
    expect(r.w).toBeCloseTo(1, 10);
    expect(r.h).toBeCloseTo(0.75, 10);
    expect(r.y).toBeCloseTo(0.125, 10);
    expect(r.x).toBeCloseTo(0, 10);
  });

  it('wider sensor than frame crops the width instead', () => {
    const r = frameRect(1, 0.75, 1);
    expect(r.w).toBeCloseTo(0.75, 10);
    expect(r.h).toBeCloseTo(1, 10);
    expect(r.x).toBeCloseTo(0.125, 10);
  });

  it('matching aspect needs no crop; digital zoom shrinks the window about the centre', () => {
    expect(frameRect(0.75, 0.75, 1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    const z = frameRect(0.75, 0.75, 2);
    expect(z.w).toBeCloseTo(0.5, 10);
    expect(z.h).toBeCloseTo(0.5, 10);
    expect(z.x).toBeCloseTo(0.25, 10);
    expect(z.y).toBeCloseTo(0.25, 10);
  });

  it('agrees with the saved-photo crop rule for a spread of ratios', () => {
    // captureFrameToDataUrl: cropW = srcW, cropH = srcW/ratio, clamped to the source, then divided by zoom
    for (const [sw, sh, ratio, zoom] of [[1080, 1920, 0.75, 1], [2448, 3264, 0.5625, 1], [3000, 3000, 0.75, 2], [4000, 3000, 1, 1.5]]) {
      let cw = sw;
      let ch = sw / ratio;
      if (ch > sh) { ch = sh; cw = sh * ratio; }
      cw /= zoom; ch /= zoom;
      const r = frameRect(sw / sh, ratio, zoom);
      expect(r.w * sw).toBeCloseTo(cw, 6);
      expect(r.h * sh).toBeCloseTo(ch, 6);
      expect(r.x * sw).toBeCloseTo((sw - cw) / 2, 6);
      expect(r.y * sh).toBeCloseTo((sh - ch) / 2, 6);
    }
  });
});
