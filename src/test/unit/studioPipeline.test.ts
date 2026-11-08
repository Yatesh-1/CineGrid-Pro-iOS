import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { StudioEngine, DEFAULT_STUDIO_STATE, computeCurveLut } from '../../utils/studioEngine';
import type { MaskObject, StudioEditState } from '../../types/studio';

/**
 * Drives the real StudioEngine.processImage through a minimal fake 2D canvas (jsdom has none), so the
 * whole pipeline runs on real pixels. The key property: every control must change the output.
 */
const W = 2000;
const H = 40;

interface FakeSource {
  naturalWidth: number;
  naturalHeight: number;
  px: Uint8ClampedArray;
}

const makeSource = (): FakeSource => {
  const px = new Uint8ClampedArray(W * H * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967295) - 0.5;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const band = Math.floor(x / (W / 6)); // six colour bands: red, orange, yellow, green, blue, purple
      const hues: [number, number, number][] = [[200, 50, 50], [220, 140, 50], [210, 200, 60], [60, 180, 70], [90, 150, 255], [140, 60, 190]];
      const [r, g, b] = hues[band];
      const shade = 0.5 + 0.5 * (y / H); // vertical gradient: shadows to highlights
      const n = rnd() * 16;
      px[i] = Math.max(0, Math.min(255, r * shade + n));
      px[i + 1] = Math.max(0, Math.min(255, g * shade + n));
      px[i + 2] = Math.max(0, Math.min(255, b * shade + n));
      px[i + 3] = 255;
    }
  return { naturalWidth: W, naturalHeight: H, px };
};

const outputs = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    const canvas: HTMLCanvasElement = this; // eslint-disable-line typescript/no-this-alias -- the stub needs the canvas it was called on
    return {
      save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
      drawImage(src: FakeSource, sx: number, sy: number, sw: number, sh: number) {
        const buf = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        for (let y = 0; y < canvas.height; y++)
          for (let x = 0; x < canvas.width; x++) {
            const sxx = Math.min(src.naturalWidth - 1, sx + Math.floor((x * sw) / canvas.width));
            const syy = Math.min(src.naturalHeight - 1, sy + Math.floor((y * sh) / canvas.height));
            const si = (syy * src.naturalWidth + sxx) * 4;
            const di = (y * canvas.width + x) * 4;
            buf[di] = src.px[si];
            buf[di + 1] = src.px[si + 1];
            buf[di + 2] = src.px[si + 2];
            buf[di + 3] = src.px[si + 3];
          }
        outputs.set(canvas, buf);
      },
      getImageData() { return { data: outputs.get(canvas)!.slice(), width: canvas.width, height: canvas.height }; },
      putImageData(img: { data: Uint8ClampedArray }) { outputs.set(canvas, img.data); },
    } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext);
});
afterAll(() => vi.restoreAllMocks());

const render = (state: StudioEditState, src = makeSource()) => {
  const canvas = document.createElement('canvas');
  StudioEngine.processImage(src as unknown as CanvasImageSource, state, canvas, false);
  return { canvas, px: outputs.get(canvas)! };
};

const clone = (s: StudioEditState): StudioEditState => JSON.parse(JSON.stringify(s));
const withState = (patch: (s: StudioEditState) => void, base = DEFAULT_STUDIO_STATE): StudioEditState => {
  const s = clone(base);
  patch(s);
  return s;
};
const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 2) n++;
  return n / (a.length / 4);
};

const mask = (patch: Partial<MaskObject>): MaskObject => ({
  id: 'm1', name: 'Mask', type: 'radial', enabled: true, inverted: false, x: 50, y: 50, width: 60, height: 100, angle: 0, feather: 30,
  adjustments: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, saturation: 0, sharpness: 0 },
  ...patch,
});

describe('tone curve LUT', () => {
  it('the default two-point curve is an exact identity (it used to be an S-curve)', () => {
    const lut = computeCurveLut([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
    for (let i = 0; i < 256; i++) expect(lut[i]).toBe(i);
  });

  it('passes through its control points and keeps the right direction', () => {
    const lut = computeCurveLut([{ x: 0, y: 0 }, { x: 64, y: 100 }, { x: 192, y: 180 }, { x: 255, y: 255 }]);
    expect(lut[64]).toBe(100);
    expect(lut[192]).toBe(180);
    for (let i = 1; i < 256; i++) expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]); // no overshoot or reversal
  });

  it('lifting the middle brightens midtones; lowering the end clips highlights', () => {
    expect(computeCurveLut([{ x: 0, y: 0 }, { x: 128, y: 180 }, { x: 255, y: 255 }])[128]).toBe(180);
    expect(computeCurveLut([{ x: 0, y: 0 }, { x: 255, y: 200 }])[255]).toBe(200);
  });
});

describe('studio pipeline', () => {
  const src = makeSource();
  let baseline: Uint8ClampedArray;
  beforeAll(() => {
    baseline = render(DEFAULT_STUDIO_STATE, src).px;
  });

  it('a default (untouched) state returns the source image', () => {
    expect(diff(baseline, src.px)).toBeLessThan(0.02);
  });

  it('is non-destructive: rendering does not modify the source pixels', () => {
    const copy = src.px.slice();
    render(withState((s) => { s.light.exposure = 2; s.effects.grain = 100; s.detail.sharpening = 150; }), src);
    expect(Array.from(src.px)).toEqual(Array.from(copy));
  });

  // [label, how to set it up, optional base setup that makes a dependent control visible]
  type Case = [string, (s: StudioEditState) => void];
  const sharpOn = (s: StudioEditState) => { s.detail.sharpening = 100; s.detail.sharpMasking = 0; };
  const grainOn = (s: StudioEditState) => { s.effects.grain = 70; };
  const nrOn = (s: StudioEditState) => { s.detail.noiseReduction = 70; };
  const wheelsOn = (s: StudioEditState) => { s.colorGrading.shadows = { hue: 20, saturation: 80, luminance: 0 }; s.colorGrading.highlights = { hue: 210, saturation: 80, luminance: 0 }; };

  const controls: Case[] = [
    ['light.exposure', (s) => { s.light.exposure = 1; }],
    ['light.contrast', (s) => { s.light.contrast = 50; }],
    ['light.highlights', (s) => { s.light.highlights = -80; }],
    ['light.shadows', (s) => { s.light.shadows = 80; }],
    ['light.whites', (s) => { s.light.whites = 60; }],
    ['light.blacks', (s) => { s.light.blacks = -60; }],
    ['light.brightness', (s) => { s.light.brightness = 30; }],
    ['curves.rgb', (s) => { s.curves.rgb = [{ x: 0, y: 0 }, { x: 128, y: 190 }, { x: 255, y: 255 }]; }],
    ['curves.red', (s) => { s.curves.red = [{ x: 0, y: 0 }, { x: 128, y: 60 }, { x: 255, y: 255 }]; }],
    ['curves.green', (s) => { s.curves.green = [{ x: 0, y: 0 }, { x: 128, y: 190 }, { x: 255, y: 255 }]; }],
    ['curves.blue', (s) => { s.curves.blue = [{ x: 0, y: 40 }, { x: 255, y: 255 }]; }],
    ['color.temperature', (s) => { s.color.temperature = 60; }],
    ['color.tint', (s) => { s.color.tint = 60; }],
    ['color.vibrance', (s) => { s.color.vibrance = 80; }],
    ['color.saturation', (s) => { s.color.saturation = -60; }],
    ['hsl.red.hue', (s) => { s.hsl.red.hue = 60; }],
    ['hsl.orange.saturation', (s) => { s.hsl.orange.saturation = 80; }],
    ['hsl.yellow.luminance', (s) => { s.hsl.yellow.luminance = 80; }],
    ['hsl.green.hue', (s) => { s.hsl.green.hue = 60; }],
    ['hsl.blue.saturation', (s) => { s.hsl.blue.saturation = -80; }],
    ['hsl.purple.luminance', (s) => { s.hsl.purple.luminance = 80; }],
    ['colorGrading.shadows', (s) => { s.colorGrading.shadows = { hue: 20, saturation: 90, luminance: 0 }; }],
    ['colorGrading.midtones', (s) => { s.colorGrading.midtones = { hue: 120, saturation: 90, luminance: 0 }; }],
    ['colorGrading.highlights', (s) => { s.colorGrading.highlights = { hue: 210, saturation: 90, luminance: 0 }; }],
    ['colorGrading.global', (s) => { s.colorGrading.global = { hue: 300, saturation: 90, luminance: 0 }; }],
    ['colorGrading.global.luminance', (s) => { s.colorGrading.global = { hue: 0, saturation: 0, luminance: 60 }; }],
    ['effects.texture', (s) => { s.effects.texture = 80; }],
    ['effects.clarity', (s) => { s.effects.clarity = 80; }],
    ['effects.dehaze', (s) => { s.effects.dehaze = 80; }],
    ['effects.vignette', (s) => { s.effects.vignette = -80; }],
    ['effects.grain', grainOn],
    ['detail.sharpening', sharpOn],
    ['detail.noiseReduction', nrOn],
    ['detail.colorNoiseRed', (s) => { s.detail.colorNoiseRed = 90; }],
    ['optics.distortion', (s) => { s.optics.distortion = 60; }],
    ['optics.chromaticAberration', (s) => { s.optics.chromaticAberration = 100; }],
    ['optics.vignetteCorrection', (s) => { s.optics.vignetteCorrection = 80; }],
    ['geometry.verticalKeystone', (s) => { s.geometry.verticalKeystone = 50; }],
    ['geometry.horizontalKeystone', (s) => { s.geometry.horizontalKeystone = 50; }],
  ];

  for (const [label, setup] of controls) {
    it(`${label} changes the image`, () => {
      const out = render(withState(setup), src).px;
      expect(diff(out, baseline), label).toBeGreaterThan(0.002);
    });
  }

  // Controls that only matter once their parent effect is on: compare against that effect alone.
  const dependent: [string, (s: StudioEditState) => void, (s: StudioEditState) => void][] = [
    ['effects.grainSize', grainOn, (s) => { s.effects.grainSize = 100; }],
    ['effects.grainRoughness', grainOn, (s) => { s.effects.grainRoughness = 100; s.effects.grainSize = 100; }],
    ['detail.sharpRadius', sharpOn, (s) => { s.detail.sharpRadius = 3; }],
    ['detail.sharpDetail', sharpOn, (s) => { s.detail.sharpDetail = 100; s.detail.sharpMasking = 0; }],
    ['detail.sharpMasking', sharpOn, (s) => { s.detail.sharpMasking = 100; }],
    ['detail.noiseDetail', nrOn, (s) => { s.detail.noiseDetail = 100; }],
    ['colorGrading.balance', wheelsOn, (s) => { s.colorGrading.balance = 100; }],
    ['colorGrading.blending', wheelsOn, (s) => { s.colorGrading.blending = 100; }],
  ];

  for (const [label, parent, extra] of dependent) {
    it(`${label} changes the image on top of its parent effect`, () => {
      const a = render(withState(parent), src).px;
      const b = render(withState((s) => { parent(s); extra(s); }), src).px;
      expect(diff(b, a), label).toBeGreaterThan(0.001);
    });
  }

  describe('selective masks', () => {
    const adjustments: [string, Partial<MaskObject['adjustments']>][] = [
      ['exposure', { exposure: 1 }],
      ['contrast', { contrast: 60 }],
      ['highlights', { highlights: -80 }],
      ['shadows', { shadows: 80 }],
      ['saturation', { saturation: -90 }],
      ['temperature', { temperature: 80 }],
    ];
    // Column 840 of 2000 sits in the bright yellow band, so highlights and temperature are visible there.
    const COL = 840;
    const pixelChange = (out: Uint8ClampedArray, x: number, y: number) => {
      const i = (y * W + x) * 4;
      return Math.abs(out[i] - baseline[i]) + Math.abs(out[i + 1] - baseline[i + 1]) + Math.abs(out[i + 2] - baseline[i + 2]);
    };
    for (const [name, adj] of adjustments) {
      it(`mask ${name} changes only the masked region`, () => {
        const m = mask({ adjustments: { ...mask({}).adjustments, ...adj }, x: 42, width: 20, height: 100, feather: 20 });
        const out = render(withState((s) => { s.masks = [m]; }), src).px;
        let inside = 0;
        for (let y = 0; y < H; y++) inside = Math.max(inside, pixelChange(out, COL, y));
        const outside = pixelChange(out, 5, 20);
        expect(inside, `${name} inside`).toBeGreaterThan(3);
        expect(outside, `${name} outside`).toBeLessThanOrEqual(2);
      });
    }
    it('mask sharpness sharpens inside the mask', () => {
      const m = mask({ adjustments: { ...mask({}).adjustments, sharpness: 100 } });
      const out = render(withState((s) => { s.masks = [m]; }), src).px;
      expect(diff(out, baseline)).toBeGreaterThan(0.001);
    });

    it('disabled masks do nothing and the overlay colours the active mask', () => {
      const off = mask({ enabled: false, adjustments: { ...mask({}).adjustments, exposure: 2 } });
      expect(diff(render(withState((s) => { s.masks = [off]; }), src).px, baseline)).toBeLessThan(0.002);

      const on = mask({ adjustments: { ...mask({}).adjustments, exposure: 0 } });
      const canvas = document.createElement('canvas');
      StudioEngine.processImage(src as unknown as CanvasImageSource, withState((s) => { s.masks = [on]; s.activeMaskId = on.id; }), canvas, true);
      const o = outputs.get(canvas)!;
      const i = (20 * W + 1000) * 4;
      expect(o[i]).toBeGreaterThan(baseline[i]); // red overlay raises red inside the mask
    });

    it('luminance, colour and sky masks select real pixels', () => {
      for (const m of [mask({ type: 'luminance', lumMin: 0, lumMax: 100, feather: 10 }), mask({ type: 'color', hue: 220, hueRange: 40 }), mask({ type: 'sky', feather: 10 })]) {
        const withAdj = { ...m, adjustments: { ...m.adjustments, exposure: 1.5 } };
        const out = render(withState((s) => { s.masks = [withAdj]; }), src).px;
        expect(diff(out, baseline), m.type).toBeGreaterThan(0.001);
      }
    });
  });

  describe('geometry', () => {
    it('crop changes the output size, 90-degree rotation swaps it', () => {
      const cropped = render(withState((s) => { s.geometry.cropRect = { x: 10, y: 10, width: 50, height: 50 }; }), src).canvas;
      expect(cropped.width).toBe(Math.round(W * 0.5));
      expect(cropped.height).toBe(Math.round(H * 0.5));
      const rotated = render(withState((s) => { s.geometry.rotation = 90; }), src).canvas;
      expect(rotated.width).toBe(H);
      expect(rotated.height).toBe(W);
    });
  });
});
