import { describe, it, expect } from 'vitest';
import {
  addGrain,
  applyMaskAdjustments,
  blur,
  buildMaskAlpha,
  defringe,
  dehaze,
  gradePixel,
  localContrast,
  lumaOf,
  needsWarp,
  prepareGrade,
  reduceNoise,
  sharpen,
  warp,
  warpSource,
  type Pixels,
} from '../../utils/imageOps';
import type { ColorGradingSettings, MaskObject } from '../../types/studio';

// ---- helpers -------------------------------------------------------------------------------
const make = (w: number, h: number, fn: (x: number, y: number) => [number, number, number]): Pixels => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * w + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  return px;
};
const lumaStd = (px: Pixels): number => {
  let sum = 0;
  let sum2 = 0;
  const n = px.length / 4;
  for (let i = 0; i < px.length; i += 4) {
    const y = lumaOf(px[i], px[i + 1], px[i + 2]);
    sum += y;
    sum2 += y * y;
  }
  const m = sum / n;
  return Math.sqrt(Math.max(0, sum2 / n - m * m));
};
const meanLuma = (px: Pixels): number => {
  let s = 0;
  for (let i = 0; i < px.length; i += 4) s += lumaOf(px[i], px[i + 1], px[i + 2]);
  return s / (px.length / 4);
};
const rand = (() => {
  let s = 12345;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967295);
})();
const noisyFlat = (w: number, h: number, base: number, amp: number) =>
  make(w, h, () => {
    const v = base + (rand() - 0.5) * amp;
    return [v, v, v];
  });
const step = (w: number, h: number, lo: number, hi: number) => make(w, h, (x) => (x < w / 2 ? [lo, lo, lo] : [hi, hi, hi]));
const same = (a: Pixels, b: Pixels) => a.every((v, i) => v === b[i]);

const noMask: Omit<MaskObject, 'id' | 'type'> = {
  name: 'm', enabled: true, inverted: false, x: 50, y: 50, width: 40, height: 40, angle: 0, feather: 0,
  adjustments: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, saturation: 0, sharpness: 0 },
};

// ---- blur -----------------------------------------------------------------------------------
describe('blur', () => {
  it('leaves a flat image unchanged and a checkerboard much smoother', () => {
    const flat = make(20, 20, () => [90, 90, 90]);
    expect(same(blur(flat, 20, 20, 3), flat)).toBe(true);
    const checker = make(32, 32, (x, y) => ((x + y) % 2 ? [255, 255, 255] : [0, 0, 0]));
    expect(lumaStd(blur(checker, 32, 32, 2))).toBeLessThan(lumaStd(checker) * 0.3);
  });
});

// ---- noise reduction --------------------------------------------------------------------------
describe('reduceNoise', () => {
  it('luminance noise reduction smooths noise', () => {
    const px = noisyFlat(64, 64, 120, 14);
    const before = lumaStd(px);
    reduceNoise(px, 64, 64, { luminance: 100, detail: 0, color: 0 });
    expect(lumaStd(px)).toBeLessThan(before * 0.6);
  });

  it('does nothing when all amounts are zero', () => {
    const px = noisyFlat(32, 32, 120, 14);
    const copy = px.slice();
    reduceNoise(px, 32, 32, { luminance: 0, detail: 50, color: 0 });
    expect(same(px, copy)).toBe(true);
  });

  it('high detail protects a real edge better than low detail', () => {
    const edge = (detail: number) => {
      const px = step(40, 40, 60, 140);
      reduceNoise(px, 40, 40, { luminance: 100, detail, color: 0 });
      return Math.abs(px[(20 * 40 + 19) * 4] - px[(20 * 40 + 20) * 4]); // contrast across the edge
    };
    expect(edge(100)).toBeGreaterThanOrEqual(edge(0));
  });

  it('colour noise reduction removes chroma noise but keeps brightness', () => {
    const px = make(48, 48, () => {
      const n = (rand() - 0.5) * 40;
      return [128 + n, 128 - n, 128];
    });
    const lumBefore = meanLuma(px);
    const chroma = (p: Pixels) => {
      let s = 0;
      for (let i = 0; i < p.length; i += 4) s += Math.abs(p[i] - p[i + 1]);
      return s / (p.length / 4);
    };
    const cBefore = chroma(px);
    reduceNoise(px, 48, 48, { luminance: 0, detail: 50, color: 100 });
    expect(chroma(px)).toBeLessThan(cBefore * 0.7);
    expect(Math.abs(meanLuma(px) - lumBefore)).toBeLessThan(4);
  });
});

// ---- local contrast, sharpening, dehaze ---------------------------------------------------------
describe('local contrast', () => {
  const texture = () => make(48, 48, (x, y) => { const v = 128 + 30 * Math.sin(x / 2) * Math.cos(y / 2); return [v, v, v]; });

  it('positive amount increases detail, negative decreases it, zero is a no-op', () => {
    const base = lumaStd(texture());
    const up = texture();
    localContrast(up, 48, 48, 0.8, 4, false);
    const down = texture();
    localContrast(down, 48, 48, -0.8, 4, false);
    expect(lumaStd(up)).toBeGreaterThan(base);
    expect(lumaStd(down)).toBeLessThan(base);
    const none = texture();
    localContrast(none, 48, 48, 0, 4, true);
    expect(same(none, texture())).toBe(true);
  });
});

describe('sharpen', () => {
  it('overshoots at an edge (halo) and leaves flat areas alone', () => {
    const px = step(40, 40, 80, 170);
    sharpen(px, 40, 40, { amount: 100, radius: 1.5, detail: 100, masking: 0 });
    expect(px[(20 * 40 + 19) * 4]).toBeLessThan(80); // dark side gets darker
    expect(px[(20 * 40 + 20) * 4]).toBeGreaterThan(170); // bright side gets brighter
    expect(px[(20 * 40 + 2) * 4]).toBe(80); // far from the edge: untouched
  });

  it('amount 0 changes nothing', () => {
    const px = step(30, 30, 50, 200);
    const copy = px.slice();
    sharpen(px, 30, 30, { amount: 0, radius: 1, detail: 50, masking: 0 });
    expect(same(px, copy)).toBe(true);
  });

  it('masking confines sharpening to edges, so noise in flat areas is not boosted', () => {
    const run = (masking: number) => {
      const px = noisyFlat(64, 64, 120, 6);
      sharpen(px, 64, 64, { amount: 150, radius: 1, detail: 100, masking });
      return lumaStd(px);
    };
    expect(run(100)).toBeLessThan(run(0));
  });

  it('per-pixel weights limit where it applies', () => {
    const px = step(40, 40, 80, 170);
    const weights = new Float32Array(40 * 40); // all zero
    sharpen(px, 40, 40, { amount: 100, radius: 1.5, detail: 100, masking: 0 }, weights);
    expect(px[(20 * 40 + 19) * 4]).toBe(80);
  });
});

describe('dehaze', () => {
  const hazy = () => make(40, 40, (x) => { const v = 150 + (x / 40) * 50; return [v, v, v]; });

  it('positive amount raises contrast and removes the veil', () => {
    const px = hazy();
    const std = lumaStd(px);
    dehaze(px, 40, 40, 80);
    expect(lumaStd(px)).toBeGreaterThan(std);
  });

  it('negative amount adds haze (brighter, flatter)', () => {
    const px = make(20, 20, () => [60, 60, 60]);
    dehaze(px, 20, 20, -80);
    expect(meanLuma(px)).toBeGreaterThan(60);
  });
});

// ---- grain ------------------------------------------------------------------------------------
describe('addGrain', () => {
  const flat = () => make(64, 64, () => [128, 128, 128]);
  const strip = () => make(900, 12, () => [128, 128, 128]);

  it('amount 0 is a no-op; amount > 0 adds texture; same seed is repeatable', () => {
    const a = flat();
    addGrain(a, 64, 64, { amount: 0, size: 30, roughness: 40 });
    expect(same(a, flat())).toBe(true);
    const b = flat();
    addGrain(b, 64, 64, { amount: 60, size: 30, roughness: 40 });
    expect(lumaStd(b)).toBeGreaterThan(2);
    const c = flat();
    addGrain(c, 64, 64, { amount: 60, size: 30, roughness: 40 });
    expect(same(b, c)).toBe(true);
  });

  it('size controls how coarse the grain is (larger = neighbouring pixels correlate more)', () => {
    const corr = (size: number) => {
      const px = strip();
      addGrain(px, 900, 12, { amount: 80, size, roughness: 20 });
      let s = 0;
      let n = 0;
      for (let y = 0; y < 12; y++)
        for (let x = 0; x < 899; x++) {
          s += (px[(y * 900 + x) * 4] - 128) * (px[(y * 900 + x + 1) * 4] - 128);
          n++;
        }
      return s / n;
    };
    expect(corr(100)).toBeGreaterThan(corr(10));
  });

  it('roughness changes the grain pattern', () => {
    const a = strip();
    addGrain(a, 900, 12, { amount: 60, size: 100, roughness: 10 });
    const b = strip();
    addGrain(b, 900, 12, { amount: 60, size: 100, roughness: 100 });
    expect(same(a, b)).toBe(false);
  });
});

// ---- geometry warp ------------------------------------------------------------------------------
describe('warp (keystone, distortion, chromatic aberration)', () => {
  const zero = { keystoneV: 0, keystoneH: 0, distortion: 0, chromatic: 0 };

  it('is the identity when nothing is set', () => {
    expect(needsWarp(zero)).toBe(false);
    const px = make(10, 10, (x, y) => [x * 20, y * 20, 5]);
    expect(warp(px, 10, 10, zero)).toBe(px);
  });

  it('never samples outside the image (no empty borders), for extreme settings', () => {
    const p = { keystoneV: 100, keystoneH: -100, distortion: 100, chromatic: 0 };
    for (const [x, y] of [[0, 0], [99, 0], [0, 59], [99, 59], [50, 30]]) {
      const [sx, sy] = warpSource(p, 100, 60, x, y);
      expect(sx).toBeGreaterThanOrEqual(-1);
      expect(sx).toBeLessThanOrEqual(100);
      expect(sy).toBeGreaterThanOrEqual(-1);
      expect(sy).toBeLessThanOrEqual(60);
    }
  });

  it('vertical keystone widens the top: top row samples a narrower slice than the bottom row', () => {
    const p = { ...zero, keystoneV: 60 };
    const sliceWidth = (y: number) => warpSource(p, 100, 100, 99, y)[0] - warpSource(p, 100, 100, 0, y)[0];
    expect(sliceWidth(0)).toBeLessThan(sliceWidth(99));
  });

  it('horizontal keystone changes the vertical extent left vs right', () => {
    const p = { ...zero, keystoneH: 60 };
    const sliceHeight = (x: number) => warpSource(p, 100, 100, x, 99)[1] - warpSource(p, 100, 100, x, 0)[1];
    expect(sliceHeight(0)).not.toBeCloseTo(sliceHeight(99), 1);
  });

  it('distortion moves edge pixels but leaves the centre', () => {
    const p = { ...zero, distortion: 60 };
    const [cx, cy] = warpSource(p, 101, 101, 50, 50);
    expect(cx).toBeCloseTo(50, 0);
    expect(cy).toBeCloseTo(50, 0);
    const edge = warpSource(p, 101, 101, 5, 50)[0];
    const plain = warpSource(zero, 101, 101, 5, 50)[0];
    expect(Math.abs(edge - plain)).toBeGreaterThan(1);
  });

  it('chromatic correction separates red and blue sampling around the centre', () => {
    // a white dot on black, off-centre: red and blue are shifted in opposite directions
    const px = make(101, 101, (x, y) => (Math.abs(x - 80) < 1.5 && Math.abs(y - 50) < 1.5 ? [255, 255, 255] : [0, 0, 0]));
    const out = warp(px, 101, 101, { ...zero, chromatic: 100 });
    const peak = (c: number) => { let best = 0; let bx = 0; for (let x = 0; x < 101; x++) { const v = out[(50 * 101 + x) * 4 + c]; if (v > best) { best = v; bx = x; } } return bx; };
    expect(peak(0)).not.toBe(peak(2));
  });
});

describe('defringe', () => {
  it('desaturates purple fringes on a high-contrast edge only', () => {
    const px = make(30, 30, (x) => (x < 15 ? [20, 20, 20] : x === 15 ? [150, 60, 170] : [235, 235, 235]));
    defringe(px, 30, 30, 100);
    const i = (10 * 30 + 15) * 4;
    expect(px[i + 2] - px[i + 1]).toBeLessThan(170 - 60);
    expect(px[(10 * 30 + 3) * 4]).toBe(20); // flat region untouched
  });
});

// ---- colour grading -------------------------------------------------------------------------------
const cg = (patch: Partial<ColorGradingSettings> = {}): ColorGradingSettings => ({
  shadows: { hue: 0, saturation: 0, luminance: 0 },
  midtones: { hue: 0, saturation: 0, luminance: 0 },
  highlights: { hue: 0, saturation: 0, luminance: 0 },
  global: { hue: 0, saturation: 0, luminance: 0 },
  blending: 50,
  balance: 0,
  ...patch,
});

describe('colour grading', () => {
  it('is inactive when every wheel is neutral', () => {
    const g = prepareGrade(cg());
    expect(g.active).toBe(false);
    expect(gradePixel(10, 20, 30, g)).toEqual([10, 20, 30]);
  });

  it('shadow wheel tints dark pixels far more than bright ones', () => {
    const g = prepareGrade(cg({ shadows: { hue: 0, saturation: 100, luminance: 0 } })); // red
    const dark = gradePixel(40, 40, 40, g);
    const bright = gradePixel(220, 220, 220, g);
    expect(dark[0] - dark[2]).toBeGreaterThan(bright[0] - bright[2] + 5);
  });

  it('highlight wheel tints bright pixels more than dark ones', () => {
    const g = prepareGrade(cg({ highlights: { hue: 240, saturation: 100, luminance: 0 } })); // blue
    const dark = gradePixel(40, 40, 40, g);
    const bright = gradePixel(220, 220, 220, g);
    expect(bright[2] - bright[0]).toBeGreaterThan(dark[2] - dark[0] + 5);
  });

  it('global wheel and luminance both act on every pixel', () => {
    const g = prepareGrade(cg({ global: { hue: 120, saturation: 100, luminance: 50 } }));
    const out = gradePixel(100, 100, 100, g);
    expect(out[1]).toBeGreaterThan(out[0]);
    expect(lumaOf(...out)).toBeGreaterThan(100);
  });

  it('balance moves the shadow/highlight split and blending changes the overlap', () => {
    const shadowTint = { shadows: { hue: 0, saturation: 100, luminance: 0 } };
    const midPixel = gradePixel(128, 128, 128, prepareGrade(cg(shadowTint)));
    const shiftedUp = gradePixel(128, 128, 128, prepareGrade(cg({ ...shadowTint, balance: 100 })));
    const shiftedDown = gradePixel(128, 128, 128, prepareGrade(cg({ ...shadowTint, balance: -100 })));
    expect(shiftedUp[0] - shiftedUp[2]).toBeGreaterThan(midPixel[0] - midPixel[2]);
    expect(shiftedDown[0] - shiftedDown[2]).toBeLessThan(midPixel[0] - midPixel[2]);
    const hard = gradePixel(128, 128, 128, prepareGrade(cg({ ...shadowTint, blending: 0 })));
    const soft = gradePixel(128, 128, 128, prepareGrade(cg({ ...shadowTint, blending: 100 })));
    expect(hard).not.toEqual(soft);
  });
});

// ---- masks ------------------------------------------------------------------------------------------
describe('buildMaskAlpha', () => {
  const W = 40;
  const H = 40;
  const grey = () => make(W, H, () => [128, 128, 128]);
  const at = (a: Float32Array, x: number, y: number) => a[y * W + x];

  it('radial: strong at the centre, zero outside, invert flips it', () => {
    const m = { ...noMask, id: '1', type: 'radial' as const, width: 50, height: 50 };
    const a = buildMaskAlpha(m, W, H, grey());
    expect(at(a, 20, 20)).toBeGreaterThan(0.9);
    expect(at(a, 1, 1)).toBe(0);
    const inv = buildMaskAlpha({ ...m, inverted: true }, W, H, grey());
    expect(at(inv, 20, 20)).toBeLessThan(0.1);
    expect(at(inv, 1, 1)).toBe(1);
  });

  it('linear: one side selected, the other not', () => {
    const m = { ...noMask, id: '2', type: 'linear' as const, angle: 90, y: 50 };
    const a = buildMaskAlpha(m, W, H, grey());
    expect(at(a, 20, 2)).toBeGreaterThan(0.9);
    expect(at(a, 20, 37)).toBeLessThan(0.1);
  });

  it('brush: painted points are selected, the rest is not', () => {
    const m = { ...noMask, id: '3', type: 'brush' as const, brushPoints: [{ x: 25, y: 25, r: 10 }] };
    const a = buildMaskAlpha(m, W, H, grey());
    expect(at(a, 10, 10)).toBeGreaterThan(0.8);
    expect(at(a, 35, 35)).toBe(0);
  });

  it('luminance range selects only pixels in the range', () => {
    const px = make(W, H, (x) => (x < 20 ? [30, 30, 30] : [220, 220, 220]));
    const m = { ...noMask, id: '4', type: 'luminance' as const, lumMin: 70, lumMax: 100 };
    const a = buildMaskAlpha(m, W, H, px);
    expect(at(a, 30, 10)).toBeGreaterThan(0.9);
    expect(at(a, 5, 10)).toBeLessThan(0.1);
  });

  it('colour range selects the chosen hue and not others', () => {
    const px = make(W, H, (x) => (x < 20 ? [30, 90, 220] : [220, 60, 40]));
    const m = { ...noMask, id: '5', type: 'color' as const, hue: 215, hueRange: 30 };
    const a = buildMaskAlpha(m, W, H, px);
    expect(at(a, 5, 10)).toBeGreaterThan(0.8);
    expect(at(a, 30, 10)).toBeLessThan(0.1);
  });

  it('sky estimate prefers blue areas near the top over blue near the bottom and non-blue areas', () => {
    const px = make(W, H, (_x, y) => (y < 20 ? [110, 160, 235] : [90, 70, 50]));
    const m = { ...noMask, id: '6', type: 'sky' as const };
    const a = buildMaskAlpha(m, W, H, px);
    expect(at(a, 20, 4)).toBeGreaterThan(0.5);
    expect(at(a, 20, 35)).toBeLessThan(0.1);
  });
});

describe('applyMaskAdjustments', () => {
  const px = () => make(4, 1, () => [100, 100, 100]);

  it('applies exposure only where the mask is, proportional to its strength', () => {
    const a = px();
    applyMaskAdjustments(a, new Float32Array([1, 0.5, 0, 0]), { ...noMask.adjustments, exposure: 1 });
    expect(a[0]).toBeGreaterThan(a[4]); // full > half
    expect(a[4]).toBeGreaterThan(100);
    expect(a[8]).toBe(100); // outside the mask: untouched
  });

  it('saturation -100 turns the masked area grey; temperature warms it; contrast spreads values', () => {
    const colour = make(2, 1, () => [200, 100, 50]);
    applyMaskAdjustments(colour, new Float32Array([1, 0]), { ...noMask.adjustments, saturation: -100 });
    expect(Math.abs(colour[0] - colour[1])).toBeLessThan(2);
    expect(colour[4]).toBe(200);

    const warm = px();
    applyMaskAdjustments(warm, new Float32Array([1, 0, 0, 0]), { ...noMask.adjustments, temperature: 100 });
    expect(warm[0]).toBeGreaterThan(warm[2]);

    const contrast = make(2, 1, (x) => (x === 0 ? [180, 180, 180] : [60, 60, 60]));
    applyMaskAdjustments(contrast, new Float32Array([1, 1]), { ...noMask.adjustments, contrast: 60 });
    expect(contrast[0] - contrast[4]).toBeGreaterThan(120);
  });
});
