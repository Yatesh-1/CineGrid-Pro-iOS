/**
 * Pure pixel operations for the photo studio. They work on RGBA byte arrays (the same layout as
 * canvas ImageData) and never touch the DOM, so every slider's effect can be tested directly.
 *
 * Sizes that should look the same at any resolution (blur radii, grain size) are expressed
 * through `scale = longEdge / 2000`, so the small preview and the full-resolution export agree.
 */
import type { ColorGradingSettings, MaskAdjustments, MaskObject } from '../types/studio';

export type Pixels = Uint8ClampedArray;

export const resolutionScale = (w: number, h: number): number => Math.max(w, h) / 2000;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (e0: number, e1: number, x: number): number => {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const lumaOf = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

// ---------------------------------------------------------------------------------------------
// Blur
// ---------------------------------------------------------------------------------------------

/** One separable box-blur pass over the RGB channels (alpha is copied). Edges are clamped. */
function boxBlurPass(src: Pixels, w: number, h: number, radius: number): Pixels {
  const out = new Uint8ClampedArray(src.length);
  const tmp = new Float32Array(src.length);
  const win = 2 * radius + 1;

  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let i = -radius; i <= radius; i++) sum += src[row + Math.min(w - 1, Math.max(0, i)) * 4 + c];
      for (let x = 0; x < w; x++) {
        tmp[row + x * 4 + c] = sum / win;
        sum += src[row + Math.min(w - 1, x + radius + 1) * 4 + c] - src[row + Math.max(0, x - radius) * 4 + c];
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let i = -radius; i <= radius; i++) sum += tmp[Math.min(h - 1, Math.max(0, i)) * w * 4 + x * 4 + c];
      for (let y = 0; y < h; y++) {
        out[y * w * 4 + x * 4 + c] = sum / win;
        sum += tmp[Math.min(h - 1, y + radius + 1) * w * 4 + x * 4 + c] - tmp[Math.max(0, y - radius) * w * 4 + x * 4 + c];
      }
    }
  }
  for (let i = 3; i < src.length; i += 4) out[i] = src[i];
  return out;
}

/** Approximate Gaussian blur (repeated box blur). Returns a new array. */
export function blur(src: Pixels, w: number, h: number, radius: number, passes = 2): Pixels {
  const r = Math.round(radius);
  if (r < 1) return src.slice();
  let cur = src;
  for (let i = 0; i < passes; i++) cur = boxBlurPass(cur, w, h, r);
  return cur;
}

/** Single-channel box blur used for alpha / haze planes. */
export function blurPlane(plane: Float32Array, w: number, h: number, radius: number): Float32Array {
  const r = Math.round(radius);
  if (r < 1) return plane.slice();
  const tmp = new Float32Array(plane.length);
  const out = new Float32Array(plane.length);
  const win = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += plane[row + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / win;
      sum += plane[row + Math.min(w - 1, x + r + 1)] - plane[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / win;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Noise reduction
// ---------------------------------------------------------------------------------------------

export interface NoiseParams {
  /** 0..100 luminance noise reduction strength. */
  luminance: number;
  /** 0..100 how much fine detail is protected from smoothing. */
  detail: number;
  /** 0..100 colour (chroma) noise reduction. */
  color: number;
}

/** Edge-aware luminance smoothing plus chroma smoothing. Runs on the untouched pixels, before tone edits. */
export function reduceNoise(px: Pixels, w: number, h: number, p: NoiseParams): void {
  const scale = resolutionScale(w, h);

  if (p.luminance > 0) {
    const soft = blur(px, w, h, Math.max(1, 1.6 * scale), 2);
    const strength = p.luminance / 100;
    // Differences below `lo` are treated as noise; above `hi` as real detail that must be kept.
    const lo = 2;
    const hi = 8 + (1 - p.detail / 100) * 42;
    for (let i = 0; i < px.length; i += 4) {
      const d = Math.abs(lumaOf(px[i], px[i + 1], px[i + 2]) - lumaOf(soft[i], soft[i + 1], soft[i + 2]));
      const wgt = strength * (1 - smoothstep(lo, hi, d));
      if (wgt > 0) {
        px[i] += (soft[i] - px[i]) * wgt;
        px[i + 1] += (soft[i + 1] - px[i + 1]) * wgt;
        px[i + 2] += (soft[i + 2] - px[i + 2]) * wgt;
      }
    }
  }

  if (p.color > 0) {
    const wide = blur(px, w, h, Math.max(2, (2 + (p.color / 100) * 5) * scale), 2);
    const k = p.color / 100;
    for (let i = 0; i < px.length; i += 4) {
      const y0 = lumaOf(px[i], px[i + 1], px[i + 2]);
      const y1 = lumaOf(wide[i], wide[i + 1], wide[i + 2]);
      // keep the pixel's own brightness, replace its colour (chroma) by the smoothed chroma
      for (let c = 0; c < 3; c++) {
        const own = px[i + c] - y0;
        const smooth = wide[i + c] - y1;
        px[i + c] = y0 + own + (smooth - own) * k;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Local contrast (clarity, texture) and sharpening
// ---------------------------------------------------------------------------------------------

/**
 * Adds (or, when negative, removes) detail at one spatial scale.
 * @param amount  -1..1
 * @param radius  blur radius in pixels that defines the scale of the detail
 * @param protectExtremes  weight by midtones so highlights and shadows are not blown (used by clarity)
 */
export function localContrast(px: Pixels, w: number, h: number, amount: number, radius: number, protectExtremes: boolean): void {
  if (amount === 0) return;
  const soft = blur(px, w, h, radius, 2);
  const gain = amount * 1.4;
  for (let i = 0; i < px.length; i += 4) {
    let wgt = 1;
    if (protectExtremes) {
      const y = lumaOf(px[i], px[i + 1], px[i + 2]) / 255;
      const e = Math.abs(2 * y - 1);
      wgt = 1 - e * e;
    }
    for (let c = 0; c < 3; c++) px[i + c] += (px[i + c] - soft[i + c]) * gain * wgt;
  }
}

export interface SharpenParams {
  /** 0..150 */
  amount: number;
  /** 0.5..3 (pixels at a 2000 px reference size) */
  radius: number;
  /** 0..100: higher also sharpens fine detail; lower ignores small differences (noise). */
  detail: number;
  /** 0..100: higher restricts sharpening to edges. */
  masking: number;
}

/**
 * Unsharp mask on luminance only (no colour halos). `weights` (0..1 per pixel) scales the effect,
 * which is how per-mask sharpness is applied.
 */
export function sharpen(px: Pixels, w: number, h: number, p: SharpenParams, weights?: Float32Array): void {
  if (p.amount <= 0) return;
  const scale = resolutionScale(w, h);
  const soft = blur(px, w, h, Math.max(1, p.radius * scale), 2);
  const gain = (p.amount / 100) * 1.2;
  const threshold = (1 - p.detail / 100) * 8;
  const m = p.masking / 100;
  for (let i = 0, n = 0; i < px.length; i += 4, n++) {
    const d = lumaOf(px[i], px[i + 1], px[i + 2]) - lumaOf(soft[i], soft[i + 1], soft[i + 2]);
    const mag = Math.abs(d);
    if (mag <= threshold) continue;
    const edge = smoothstep(0, 25, mag);
    const wgt = (1 - m) + m * edge;
    const k = gain * d * wgt * (weights ? weights[n] : 1);
    px[i] += k;
    px[i + 1] += k;
    px[i + 2] += k;
  }
}

// ---------------------------------------------------------------------------------------------
// Dehaze
// ---------------------------------------------------------------------------------------------

/** Dark-channel dehaze: positive removes atmospheric veil, negative adds it. */
export function dehaze(px: Pixels, w: number, h: number, amount: number): void {
  if (amount === 0) return;
  const air = 235;
  if (amount < 0) {
    const k = Math.min(0.6, (-amount / 100) * 0.6);
    for (let i = 0; i < px.length; i += 4) {
      for (let c = 0; c < 3; c++) px[i + c] = px[i + c] * (1 - k) + air * k;
    }
    return;
  }
  const dark = new Float32Array(w * h);
  for (let i = 0, n = 0; i < px.length; i += 4, n++) dark[n] = Math.min(px[i], px[i + 1], px[i + 2]);
  const smooth = blurPlane(dark, w, h, Math.max(2, 0.02 * Math.max(w, h)));
  const omega = (amount / 100) * 0.8;
  for (let i = 0, n = 0; i < px.length; i += 4, n++) {
    const t = Math.max(0.3, 1 - (omega * smooth[n]) / air);
    for (let c = 0; c < 3; c++) px[i + c] = (px[i + c] - air) / t + air;
  }
}

// ---------------------------------------------------------------------------------------------
// Grain
// ---------------------------------------------------------------------------------------------

const hash2 = (x: number, y: number, seed: number): number => {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return ((n >>> 0) / 4294967295) * 2 - 1;
};

export interface GrainParams {
  /** 0..100 */
  amount: number;
  /** 10..100: larger = coarser grain clumps. */
  size: number;
  /** 10..100: low = smooth, soft grain; high = hard, uneven grain. */
  roughness: number;
}

/** Monochrome film grain, stronger in the midtones. Deterministic for a given seed. */
export function addGrain(px: Pixels, w: number, h: number, p: GrainParams, seed = 1337): void {
  if (p.amount <= 0) return;
  const cell = Math.max(1, (p.size / 100) * 3.2 * resolutionScale(w, h) + 0.6);
  const rough = p.roughness / 100;
  const amp = (p.amount / 100) * 42;
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const iy = Math.floor(gy);
    const fy = gy - iy;
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const ix = Math.floor(gx);
      const fx = gx - ix;
      const a = hash2(ix, iy, seed);
      const b = hash2(ix + 1, iy, seed);
      const c = hash2(ix, iy + 1, seed);
      const d = hash2(ix + 1, iy + 1, seed);
      const soft = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      const n = soft + (a - soft) * rough; // roughness blends smooth noise toward blocky per-cell noise
      const i = (y * w + x) * 4;
      const yN = lumaOf(px[i], px[i + 1], px[i + 2]) / 255;
      const wgt = 1 - 0.6 * Math.abs(2 * yN - 1);
      const delta = n * amp * wgt;
      px[i] += delta;
      px[i + 1] += delta;
      px[i + 2] += delta;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Geometry warp (keystone, lens distortion, lateral chromatic aberration)
// ---------------------------------------------------------------------------------------------

export interface WarpParams {
  /** -100..100. Positive widens the top (corrects converging verticals). */
  keystoneV: number;
  /** -100..100. Positive widens the left side. */
  keystoneH: number;
  /** -100..100. Positive corrects barrel distortion, negative corrects pincushion. */
  distortion: number;
  /** 0..100 lateral chromatic aberration correction (red and blue re-aligned to green). */
  chromatic: number;
}

export const needsWarp = (p: WarpParams): boolean =>
  p.keystoneV !== 0 || p.keystoneH !== 0 || p.distortion !== 0 || p.chromatic !== 0;

/** Bilinear sample of one channel at fractional pixel coordinates (edges clamped). */
function sample(px: Pixels, w: number, h: number, x: number, y: number, c: number): number {
  const fx = Math.min(w - 1, Math.max(0, x));
  const fy = Math.min(h - 1, Math.max(0, y));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = px[(y0 * w + x0) * 4 + c];
  const b = px[(y0 * w + x1) * 4 + c];
  const d = px[(y1 * w + x0) * 4 + c];
  const e = px[(y1 * w + x1) * 4 + c];
  return (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
}

/** Keystone and lens distortion in normalised (-1..1) coordinates, before zoom. */
function warpNormalised(p: WarpParams, u: number, v: number): [number, number] {
  const kv = (p.keystoneV / 100) * 0.35;
  const kh = (p.keystoneH / 100) * 0.35;
  const kd = (p.distortion / 100) * 0.35;
  const su = u * (1 + kv * v);
  const sv = v * (1 + kh * u);
  const f = 1 + kd * (su * su + sv * sv);
  return [su * f, sv * f];
}

let zoomCache: { key: string; zoom: number } = { key: '', zoom: 1 };

/** Smallest zoom-in that keeps every sampled coordinate inside the image for these settings. */
function warpZoom(p: WarpParams): number {
  const key = `${p.keystoneV}|${p.keystoneH}|${p.distortion}`;
  if (zoomCache.key === key) return zoomCache.zoom;
  let reach = 1;
  for (const u of [-1, 0, 1]) {
    for (const v of [-1, 0, 1]) {
      if (u === 0 && v === 0) continue;
      const [su, sv] = warpNormalised(p, u, v);
      reach = Math.max(reach, Math.abs(su), Math.abs(sv));
    }
  }
  zoomCache = { key, zoom: 1 / reach };
  return zoomCache.zoom;
}

/** Maps an output pixel to source pixel coordinates (before the chromatic shift). */
export function warpSource(p: WarpParams, w: number, h: number, x: number, y: number): [number, number] {
  const zoom = warpZoom(p);
  const [u, v] = warpNormalised(p, ((x + 0.5) / w) * 2 - 1, ((y + 0.5) / h) * 2 - 1);
  return [(((u * zoom) + 1) / 2) * w - 0.5, (((v * zoom) + 1) / 2) * h - 0.5];
}
export function warp(src: Pixels, w: number, h: number, p: WarpParams): Pixels {
  if (!needsWarp(p)) return src;
  const out = new Uint8ClampedArray(src.length);
  const ca = (p.chromatic / 100) * 0.004;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx, sy] = warpSource(p, w, h, x, y);
      const o = (y * w + x) * 4;
      out[o + 1] = sample(src, w, h, sx, sy, 1);
      out[o + 3] = src[(Math.min(h - 1, Math.max(0, Math.round(sy))) * w + Math.min(w - 1, Math.max(0, Math.round(sx)))) * 4 + 3];
      if (ca === 0) {
        out[o] = sample(src, w, h, sx, sy, 0);
        out[o + 2] = sample(src, w, h, sx, sy, 2);
      } else {
        // red is sampled slightly closer to, and blue slightly farther from, the optical centre
        out[o] = sample(src, w, h, cx + (sx - cx) * (1 - ca), cy + (sy - cy) * (1 - ca), 0);
        out[o + 2] = sample(src, w, h, cx + (sx - cx) * (1 + ca), cy + (sy - cy) * (1 + ca), 2);
      }
    }
  }
  return out;
}

/** Reduces purple/green colour fringes around high-contrast edges. */
export function defringe(px: Pixels, w: number, h: number, amount: number): void {
  if (amount <= 0) return;
  const soft = blur(px, w, h, Math.max(1, 1.5 * resolutionScale(w, h)), 1);
  const k = amount / 100;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const edge = smoothstep(10, 60, Math.abs(lumaOf(r, g, b) - lumaOf(soft[i], soft[i + 1], soft[i + 2])));
    if (edge === 0) continue;
    // purple fringe: blue and red above green; green fringe: green above red and blue
    const purple = Math.max(0, Math.min(r, b) - g);
    const green = Math.max(0, g - Math.max(r, b));
    const fringe = Math.max(purple, green);
    if (fringe < 6) continue;
    const y = lumaOf(r, g, b);
    const wgt = k * edge * smoothstep(6, 40, fringe);
    px[i] += (y - r) * wgt;
    px[i + 1] += (y - g) * wgt;
    px[i + 2] += (y - b) * wgt;
  }
}

// ---------------------------------------------------------------------------------------------
// Colour grading (shadows / midtones / highlights / global wheels)
// ---------------------------------------------------------------------------------------------

const hueToRgb = (hue: number): [number, number, number] => {
  const h6 = (((hue % 360) + 360) % 360) / 60;
  const x = 1 - Math.abs((h6 % 2) - 1);
  if (h6 < 1) return [1, x, 0];
  if (h6 < 2) return [x, 1, 0];
  if (h6 < 3) return [0, 1, x];
  if (h6 < 4) return [0, x, 1];
  if (h6 < 5) return [x, 0, 1];
  return [1, 0, x];
};

export interface GradeContext {
  active: boolean;
  tints: Record<'shadows' | 'midtones' | 'highlights' | 'global', { rgb: [number, number, number]; sat: number; lum: number }>;
  pivot: number;
  width: number;
}

export function prepareGrade(cg: ColorGradingSettings): GradeContext {
  const make = (v: ColorGradingSettings['shadows']) => ({ rgb: hueToRgb(v.hue), sat: v.saturation / 100, lum: v.luminance / 100 });
  const tints = { shadows: make(cg.shadows), midtones: make(cg.midtones), highlights: make(cg.highlights), global: make(cg.global) };
  const active = Object.values(tints).some((t) => t.sat > 0 || t.lum !== 0);
  return {
    active,
    tints,
    // balance moves the shadow/highlight crossover, blending sets how wide they overlap
    pivot: 0.5 + (cg.balance / 100) * 0.25,
    width: 0.08 + (cg.blending / 100) * 0.4,
  };
}

/** Applies the colour grade to one pixel (0..255 values) and returns the result. */
export function gradePixel(r: number, g: number, b: number, ctx: GradeContext): [number, number, number] {
  if (!ctx.active) return [r, g, b];
  const y = lumaOf(r, g, b) / 255;
  const t = clamp01((y - (ctx.pivot - ctx.width)) / (2 * ctx.width));
  const s = t * t * (3 - 2 * t);
  const weights = { shadows: 1 - s, midtones: 4 * t * (1 - t), highlights: s, global: 1 };
  for (const key of ['shadows', 'midtones', 'highlights', 'global'] as const) {
    const tint = ctx.tints[key];
    const wgt = weights[key];
    if (wgt <= 0) continue;
    const k = tint.sat * wgt * 0.5;
    if (k > 0) {
      // multiplicative tint keeps brightness roughly constant
      r *= 1 + k * (2 * tint.rgb[0] - 1);
      g *= 1 + k * (2 * tint.rgb[1] - 1);
      b *= 1 + k * (2 * tint.rgb[2] - 1);
    }
    if (tint.lum !== 0) {
      const dl = tint.lum * wgt * 40;
      r += dl;
      g += dl;
      b += dl;
    }
  }
  return [r, g, b];
}

// ---------------------------------------------------------------------------------------------
// Selective masks
// ---------------------------------------------------------------------------------------------

const rgbHue = (r: number, g: number, b: number): [number, number] => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d === 0) return [0, 0];
  let hue: number;
  if (mx === r) hue = ((g - b) / d) % 6;
  else if (mx === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return [((hue * 60) + 360) % 360, mx === 0 ? 0 : d / mx];
};

/**
 * Per-pixel mask strength (0..1). `px` is only read by content-aware masks
 * (luminance range, colour range, sky estimate).
 */
export function buildMaskAlpha(mask: MaskObject, w: number, h: number, px: Pixels): Float32Array {
  const a = new Float32Array(w * h);
  const feather = Math.max(0, Math.min(100, mask.feather)) / 100;
  const cxp = (mask.x / 100) * w;
  const cyp = (mask.y / 100) * h;

  switch (mask.type) {
    case 'linear': {
      const rad = (mask.angle * Math.PI) / 180;
      const nx = Math.cos(rad);
      const ny = Math.sin(rad);
      const span = Math.max(1, feather * Math.hypot(w, h) * 0.5);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const d = (x - cxp) * nx + (y - cyp) * ny;
          a[y * w + x] = clamp01(0.5 - d / (2 * span));
        }
      }
      break;
    }
    case 'radial': {
      const rx = Math.max(1, (mask.width / 200) * w);
      const ry = Math.max(1, (mask.height / 200) * h);
      const inner = 1 - feather;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const d = Math.hypot((x - cxp) / rx, (y - cyp) / ry);
          a[y * w + x] = 1 - smoothstep(Math.min(inner, 0.999), 1, d);
        }
      }
      break;
    }
    case 'brush': {
      for (const pt of mask.brushPoints ?? []) {
        const rad = Math.max(1, (pt.r / 100) * w);
        const px0 = (pt.x / 100) * w;
        const py0 = (pt.y / 100) * h;
        const x0 = Math.max(0, Math.floor(px0 - rad));
        const x1 = Math.min(w - 1, Math.ceil(px0 + rad));
        const y0 = Math.max(0, Math.floor(py0 - rad));
        const y1 = Math.min(h - 1, Math.ceil(py0 + rad));
        const inner = Math.min(0.99, 1 - Math.max(0.15, feather));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const v = 1 - smoothstep(inner, 1, Math.hypot(x - px0, y - py0) / rad);
            const i = y * w + x;
            if (v > a[i]) a[i] = v;
          }
        }
      }
      break;
    }
    case 'luminance': {
      const lo = (mask.lumMin ?? 0) / 100;
      const hi = (mask.lumMax ?? 100) / 100;
      const f = Math.max(0.01, feather * 0.3);
      for (let i = 0, n = 0; i < px.length; i += 4, n++) {
        const y = lumaOf(px[i], px[i + 1], px[i + 2]) / 255;
        a[n] = smoothstep(lo - f, lo + f, y) * (1 - smoothstep(hi - f, hi + f, y));
      }
      break;
    }
    case 'color': {
      const centre = mask.hue ?? 210;
      const range = Math.max(5, mask.hueRange ?? 30);
      for (let i = 0, n = 0; i < px.length; i += 4, n++) {
        const [hue, sat] = rgbHue(px[i], px[i + 1], px[i + 2]);
        let dh = Math.abs(hue - centre);
        if (dh > 180) dh = 360 - dh;
        a[n] = (1 - smoothstep(range * (1 - Math.max(0.1, feather)), range, dh)) * smoothstep(0.08, 0.25, sat);
      }
      break;
    }
    case 'sky': {
      // Estimate from colour and position only; this is NOT object recognition.
      for (let y = 0; y < h; y++) {
        const above = clamp01(1.15 - (y / h) * 1.3);
        if (above === 0) continue;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          const lum = lumaOf(r, g, b);
          const blueSky = smoothstep(8, 40, b - Math.max(r, g * 0.9)) * smoothstep(60, 120, lum);
          const overcast = (1 - smoothstep(0.04, 0.16, (Math.max(r, g, b) - Math.min(r, g, b)) / 255)) * smoothstep(165, 215, lum);
          a[y * w + x] = Math.max(blueSky, overcast) * above;
        }
      }
      const soft = blurPlane(a, w, h, Math.max(2, 0.01 * Math.max(w, h)));
      a.set(soft);
      break;
    }
    default:
      break;
  }

  if (mask.inverted) for (let i = 0; i < a.length; i++) a[i] = 1 - a[i];
  return a;
}

/** Applies a mask's tone/colour adjustments, scaled per pixel by its alpha. */
export function applyMaskAdjustments(px: Pixels, alpha: Float32Array, adj: MaskAdjustments): void {
  const exp = Math.pow(2, adj.exposure * 0.7);
  const cf = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));
  const hiF = adj.highlights / 100;
  const shF = adj.shadows / 100;
  const tR = adj.temperature > 0 ? 1 + (adj.temperature / 100) * 0.25 : 1;
  const tB = adj.temperature < 0 ? 1 + (-adj.temperature / 100) * 0.25 : 1;
  const sat = 1 + adj.saturation / 100;
  for (let i = 0, n = 0; i < px.length; i += 4, n++) {
    const a = alpha[n];
    if (a <= 0.001) continue;
    let r = px[i] * exp;
    let g = px[i + 1] * exp;
    let b = px[i + 2] * exp;
    if (adj.contrast !== 0) {
      r = cf * (r - 128) + 128;
      g = cf * (g - 128) + 128;
      b = cf * (b - 128) + 128;
    }
    const y = lumaOf(r, g, b);
    if (hiF !== 0 && y > 128) {
      const d = hiF * ((y - 128) / 127) * 40;
      r += d;
      g += d;
      b += d;
    }
    if (shF !== 0 && y < 128) {
      const d = shF * ((128 - y) / 128) * 40;
      r += d;
      g += d;
      b += d;
    }
    r *= tR;
    b *= tB;
    if (sat !== 1) {
      const y2 = lumaOf(r, g, b);
      r = y2 + (r - y2) * sat;
      g = y2 + (g - y2) * sat;
      b = y2 + (b - y2) * sat;
    }
    px[i] += (r - px[i]) * a;
    px[i + 1] += (g - px[i + 1]) * a;
    px[i + 2] += (b - px[i + 2]) * a;
  }
}
