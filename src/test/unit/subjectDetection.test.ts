import { describe, it, expect } from 'vitest';
import { detectSalientSubject, smoothBox, type SubjectBox } from '../../utils/subjectDetection';

function frame(w: number, h: number, bg: [number, number, number], draw?: (x: number, y: number) => [number, number, number] | null) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = (draw && draw(x, y)) || bg;
      const i = (y * w + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  }
  return px;
}

describe('detectSalientSubject', () => {
  it('boxes a coloured object on a plain background, in the right place', () => {
    const W = 320;
    const H = 240;
    // yellow "mug" at x 110-210, y 80-170 on a grey wall
    const px = frame(W, H, [110, 110, 110], (x, y) => (x >= 110 && x < 210 && y >= 80 && y < 170 ? [230, 200, 40] : null));
    const box = detectSalientSubject(px, W, H) as SubjectBox;
    expect(box).not.toBeNull();
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    expect(cx).toBeGreaterThan(110 / W - 0.05);
    expect(cx).toBeLessThan(210 / W + 0.05);
    expect(cy).toBeGreaterThan(80 / H - 0.05);
    expect(cy).toBeLessThan(170 / H + 0.05);
    // the box is about the object's size, not the whole frame
    expect(box.w).toBeGreaterThan(0.2);
    expect(box.w).toBeLessThan(0.6);
  });

  it('finds an off-centre subject too', () => {
    const W = 320;
    const H = 240;
    const px = frame(W, H, [60, 70, 60], (x, y) => (x >= 40 && x < 100 && y >= 40 && y < 110 ? [220, 60, 60] : null));
    const box = detectSalientSubject(px, W, H) as SubjectBox;
    expect(box).not.toBeNull();
    expect(box.x + box.w / 2).toBeLessThan(0.45);
    expect(box.y + box.h / 2).toBeLessThan(0.55);
  });

  it('returns nothing for a flat, featureless frame', () => {
    const px = frame(320, 240, [90, 90, 90]);
    expect(detectSalientSubject(px, 320, 240)).toBeNull();
  });

  it('returns nothing when the "subject" is the whole frame', () => {
    const px = frame(320, 240, [90, 90, 90], (x) => (x < 160 ? [200, 50, 50] : [50, 50, 200]));
    const box = detectSalientSubject(px, 320, 240);
    if (box) expect(box.w * box.h).toBeLessThan(0.7);
  });
});

describe('smoothBox', () => {
  const a: SubjectBox = { x: 0.4, y: 0.4, w: 0.2, h: 0.2, kind: 'object', score: 1 };
  it('moves part of the way for small changes', () => {
    const b = smoothBox(a, { ...a, x: 0.44 }, 0.5) as SubjectBox;
    expect(b.x).toBeCloseTo(0.42, 3);
  });
  it('jumps straight to a new subject far away', () => {
    const far = { ...a, x: 0.05, y: 0.05 };
    expect(smoothBox(a, far)).toEqual(far);
  });
  it('clears when nothing is found', () => {
    expect(smoothBox(a, null)).toBeNull();
  });
});
