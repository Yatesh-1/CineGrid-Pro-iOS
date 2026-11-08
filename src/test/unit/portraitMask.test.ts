import { describe, it, expect } from 'vitest';
import { detectSalientSubject, smoothBox, MASK_N, type SubjectBox } from '../../utils/subjectDetection';
import { focusFromBox, portraitMaskCss, portraitBlurStrength, portraitBlurPx } from '../../utils/portraitBlur';

function frame(w: number, h: number, bg: [number, number, number], draw: (x: number, y: number) => [number, number, number] | null) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = draw(x, y) || bg;
      const i = (y * w + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  return px;
}

describe('subject silhouette mask', () => {
  const W = 320;
  const H = 240;
  const px = frame(W, H, [110, 110, 110], (x, y) => (x >= 110 && x < 210 && y >= 80 && y < 170 ? [230, 200, 40] : null));
  const box = detectSalientSubject(px, W, H) as SubjectBox;

  it('marks the object as subject and the wall as background', () => {
    expect(box.mask).toBeTruthy();
    const at = (fx: number, fy: number) => box.mask![Math.floor(fy * MASK_N) * MASK_N + Math.floor(fx * MASK_N)];
    expect(at(160 / W, 125 / H)).toBe(255); // middle of the "mug"
    expect(at(20 / W, 20 / H)).toBe(0); // far corner of the wall
    expect(at(300 / W, 220 / H)).toBe(0);
  });

  it('covers about the object area, not the whole frame', () => {
    const on = box.mask!.reduce((n, v) => n + (v > 127 ? 1 : 0), 0) / box.mask!.length;
    const objectArea = (100 * 90) / (W * H); // ~0.117
    expect(on).toBeGreaterThan(objectArea * 0.8);
    expect(on).toBeLessThan(objectArea * 2.2);
  });

  it('fills a hole inside the object (a handle, a logo)', () => {
    const holed = frame(W, H, [110, 110, 110], (x, y) => {
      const inObj = x >= 100 && x < 220 && y >= 70 && y < 180;
      const hole = x >= 140 && x < 180 && y >= 105 && y < 145;
      return inObj && !hole ? [230, 200, 40] : null;
    });
    const b = detectSalientSubject(holed, W, H) as SubjectBox;
    expect(b.mask![Math.floor((125 / H) * MASK_N) * MASK_N + Math.floor((160 / W) * MASK_N)]).toBe(255);
  });
});

describe('mask smoothing over time', () => {
  const a: SubjectBox = { x: 0.4, y: 0.4, w: 0.2, h: 0.2, kind: 'object', score: 1, mask: new Uint8Array(MASK_N * MASK_N).fill(0) };
  const b: SubjectBox = { ...a, mask: new Uint8Array(MASK_N * MASK_N).fill(200) };

  it('blends the previous and the new silhouette so the edge does not flicker', () => {
    const m = smoothBox(a, b, 0.5)!.mask!;
    expect(m[0]).toBe(100);
  });

  it('uses the new mask as is for a new subject far away', () => {
    const far = { ...b, x: 0.01, y: 0.01 };
    expect(smoothBox(a, far)!.mask![0]).toBe(200);
  });
});

describe('portrait blur CSS and strength', () => {
  it('without a subject the centre stays sharp via a radial gradient', () => {
    expect(portraitMaskCss(null)).toContain('radial-gradient');
  });

  it('with a subject box but no silhouette it uses an ellipse at the subject', () => {
    const f = focusFromBox({ x: 0.2, y: 0.3, w: 0.2, h: 0.3 }); // no kind, no mask: a plain box
    expect(f.mask).toBeUndefined();
    expect(portraitMaskCss(f)).toContain('ellipse');
    expect(f.cx).toBeCloseTo(0.3, 5);
  });

  it('the sharp ellipse stays inside sensible bounds', () => {
    const f = focusFromBox({ x: 0, y: 0, w: 1, h: 1 });
    expect(f.rx).toBeLessThanOrEqual(0.7);
    expect(f.ry).toBeLessThanOrEqual(0.75);
    const tiny = focusFromBox({ x: 0.5, y: 0.5, w: 0.01, h: 0.01 });
    expect(tiny.rx).toBeGreaterThanOrEqual(0.22);
  });

  it('wider apertures blur more and f/8 and above is off', () => {
    expect(portraitBlurStrength(1.4)).toBe(1);
    expect(portraitBlurStrength(2.8)).toBeLessThan(portraitBlurStrength(1.4));
    expect(portraitBlurStrength(8)).toBe(0);
    expect(portraitBlurPx(0, 1000)).toBe(0);
    expect(portraitBlurPx(1, 1000)).toBeGreaterThan(portraitBlurPx(0.5, 1000));
  });
});
