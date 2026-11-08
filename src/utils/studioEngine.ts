import type {
  StudioEditState,
  ToneCurvePoint,
  HslColorName,
} from '../types/studio';
import {
  addGrain,
  applyMaskAdjustments,
  buildMaskAlpha,
  defringe,
  dehaze,
  gradePixel,
  localContrast,
  needsWarp,
  prepareGrade,
  reduceNoise,
  resolutionScale,
  sharpen,
  warp,
  type Pixels,
  type WarpParams,
} from './imageOps';

// Default initial state
export const DEFAULT_STUDIO_STATE: StudioEditState = {
  light: {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    brightness: 0,
  },
  curves: {
    rgb: [
      { x: 0, y: 0 },
      { x: 255, y: 255 },
    ],
    red: [
      { x: 0, y: 0 },
      { x: 255, y: 255 },
    ],
    green: [
      { x: 0, y: 0 },
      { x: 255, y: 255 },
    ],
    blue: [
      { x: 0, y: 0 },
      { x: 255, y: 255 },
    ],
  },
  color: {
    temperature: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0,
  },
  hsl: {
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    aqua: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 },
  },
  colorGrading: {
    shadows: { hue: 0, saturation: 0, luminance: 0 },
    midtones: { hue: 0, saturation: 0, luminance: 0 },
    highlights: { hue: 0, saturation: 0, luminance: 0 },
    global: { hue: 0, saturation: 0, luminance: 0 },
    blending: 50,
    balance: 0,
  },
  effects: {
    texture: 0,
    clarity: 0,
    dehaze: 0,
    vignette: 0,
    vignetteMidpoint: 50,
    vignetteFeather: 50,
    grain: 0,
    grainSize: 30,
    grainRoughness: 40,
  },
  detail: {
    sharpening: 0,
    sharpRadius: 1.0,
    sharpDetail: 25,
    sharpMasking: 0,
    noiseReduction: 0,
    noiseDetail: 50,
    colorNoiseRed: 0,
  },
  optics: {
    distortion: 0,
    chromaticAberration: 0,
    vignetteCorrection: 0,
  },
  geometry: {
    cropRatio: 'original',
    cropRect: { x: 0, y: 0, width: 100, height: 100 },
    straighten: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    verticalKeystone: 0,
    horizontalKeystone: 0,
  },
  masks: [],
  activeMaskId: null,
  presetIntensity: 100,
};

// Monotone cubic spline interpolation for tone curves
export function computeCurveLut(points: ToneCurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  if (!points || points.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  // Sort by x
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // If only 1 point
  if (sorted.length === 1) {
    lut.fill(Math.round(sorted[0].y));
    return lut;
  }

  // Prepend (0, y0) and append (255, yEnd) if missing
  const pts: ToneCurvePoint[] = [];
  if (sorted[0].x > 0) pts.push({ x: 0, y: sorted[0].y });
  pts.push(...sorted);
  if (pts[pts.length - 1].x < 255) {
    pts.push({ x: 255, y: pts[pts.length - 1].y });
  }

  // Monotone cubic Hermite interpolation (Fritsch-Carlson): passes through every point, never
  // overshoots between them, and a two-point curve is an exact straight line.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of pts) {
    if (xs.length && p.x === xs[xs.length - 1]) ys[ys.length - 1] = p.y; // duplicate x: last wins
    else {
      xs.push(p.x);
      ys.push(p.y);
    }
  }
  const n = xs.length;
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) delta.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s2 = a * a + b * b;
    if (s2 > 9) {
      const tau = 3 / Math.sqrt(s2);
      m[i] = tau * a * delta[i];
      m[i + 1] = tau * b * delta[i];
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i];
    for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) {
      if (x < 0 || x > 255) continue;
      const t = (x - xs[i]) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      const y =
        (2 * t3 - 3 * t2 + 1) * ys[i] +
        (t3 - 2 * t2 + t) * h * m[i] +
        (-2 * t3 + 3 * t2) * ys[i + 1] +
        (t3 - t2) * h * m[i + 1];
      lut[x] = Math.max(0, Math.min(255, Math.round(y)));
    }
  }
  return lut;
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

// Convert HSL back to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

// Approximate HSL Color hue center definitions in degrees
const HSL_COLOR_CENTERS: Record<HslColorName, number> = {
  red: 0,
  orange: 30,
  yellow: 60,
  green: 120,
  aqua: 180,
  blue: 240,
  purple: 280,
  magenta: 320,
};

// Calculate weight of a hue in degrees for an HSL channel
function getHueWeight(hue: number, center: number): number {
  let diff = Math.abs(hue - center);
  if (diff > 180) diff = 360 - diff;
  if (diff > 45) return 0;
  return Math.cos((diff / 45) * (Math.PI / 2));
}

// Main Image Processor Pipeline
export class StudioEngine {
  private static canvas: HTMLCanvasElement | null = null;

  public static cleanResources(): void {
    if (this.canvas) {
      this.canvas.width = 1;
      this.canvas.height = 1;
      const ctx = this.canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 1, 1);
      this.canvas = null;
    }
  }

  private static getWorkingCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    return this.canvas;
  }

  /**
   * Render a photo with the full edit state. The source is never modified: every call starts again
   * from the source pixels, so edits are non-destructive and fully described by `state`.
   *
   * Pipeline order: geometry -> lens warp -> noise reduction -> dehaze -> tone and colour ->
   * selective masks -> clarity / texture -> sharpening -> grain.
   */
  public static processImage(
    sourceImg: CanvasImageSource,
    state: StudioEditState,
    targetCanvas?: HTMLCanvasElement,
    renderMaskOverlay: boolean = false
  ): HTMLCanvasElement {
    const canvas = targetCanvas || this.getWorkingCanvas();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const naturalWidth = (sourceImg as HTMLImageElement).naturalWidth || (sourceImg as HTMLVideoElement).videoWidth || (sourceImg as HTMLCanvasElement).width || 800;
    const naturalHeight = (sourceImg as HTMLImageElement).naturalHeight || (sourceImg as HTMLVideoElement).videoHeight || (sourceImg as HTMLCanvasElement).height || 600;

    // Crop rectangle (percent of the source image)
    const crop = state.geometry.cropRect;
    const cropX = Math.round((crop.x / 100) * naturalWidth);
    const cropY = Math.round((crop.y / 100) * naturalHeight);
    const cropW = Math.max(1, Math.round((crop.width / 100) * naturalWidth));
    const cropH = Math.max(1, Math.round((crop.height / 100) * naturalHeight));

    const isRotated90 = state.geometry.rotation === 90 || state.geometry.rotation === 270;
    const w = isRotated90 ? cropH : cropW;
    const h = isRotated90 ? cropW : cropH;
    canvas.width = w;
    canvas.height = h;

    // 1. Geometry: 90-degree rotation, straighten (scaled so no empty corners show), flips
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (state.geometry.rotation !== 0) ctx.rotate((state.geometry.rotation * Math.PI) / 180);
    if (state.geometry.straighten !== 0) {
      const theta = (Math.abs(state.geometry.straighten) * Math.PI) / 180;
      const fill = Math.cos(theta) + Math.sin(theta) * Math.max(w / h, h / w);
      ctx.rotate((state.geometry.straighten * Math.PI) / 180);
      ctx.scale(fill, fill);
    }
    if (state.geometry.flipH) ctx.scale(-1, 1);
    if (state.geometry.flipV) ctx.scale(1, -1);
    ctx.drawImage(sourceImg, cropX, cropY, cropW, cropH, -cropW / 2, -cropH / 2, cropW, cropH);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, w, h);

    // 2. Lens warp (keystone, distortion, lateral chromatic aberration) and defringe
    const warpParams: WarpParams = {
      keystoneV: state.geometry.verticalKeystone,
      keystoneH: state.geometry.horizontalKeystone,
      distortion: state.optics.distortion,
      chromatic: state.optics.chromaticAberration,
    };
    const px: Pixels = needsWarp(warpParams) ? warp(imgData.data, w, h, warpParams) : imgData.data;
    if (state.optics.chromaticAberration > 0) defringe(px, w, h, state.optics.chromaticAberration);

    // 3. Noise reduction (before tone edits so they do not amplify noise)
    reduceNoise(px, w, h, {
      luminance: state.detail.noiseReduction,
      detail: state.detail.noiseDetail,
      color: state.detail.colorNoiseRed,
    });

    // 4. Dehaze
    dehaze(px, w, h, state.effects.dehaze);

    // 5. Tone and colour, pixel by pixel
    const rgbCurveLut = computeCurveLut(state.curves.rgb);
    const redCurveLut = computeCurveLut(state.curves.red);
    const greenCurveLut = computeCurveLut(state.curves.green);
    const blueCurveLut = computeCurveLut(state.curves.blue);

    const exposureFactor = Math.pow(2, state.light.exposure * 0.7);
    const contrastFactor = (259 * (state.light.contrast + 255)) / (255 * (259 - state.light.contrast));
    const highlightsFactor = state.light.highlights / 100;
    const shadowsFactor = state.light.shadows / 100;
    const whitesFactor = state.light.whites / 100;
    const blacksFactor = state.light.blacks / 100;
    const brightnessDelta = (state.light.brightness * 128) / 100;

    const tempR = state.color.temperature > 0 ? 1 + (state.color.temperature / 100) * 0.25 : 1;
    const tempB = state.color.temperature < 0 ? 1 + (-state.color.temperature / 100) * 0.25 : 1;
    const tintG = state.color.tint < 0 ? 1 + (-state.color.tint / 100) * 0.2 : 1;
    const tintM = state.color.tint > 0 ? 1 + (state.color.tint / 100) * 0.2 : 1;
    const satFactor = 1 + state.color.saturation / 100;
    const vibFactor = state.color.vibrance / 100;

    const vignetteAmount = state.effects.vignette / 100;
    const vignetteMidpoint = state.effects.vignetteMidpoint / 100;
    const vignetteFeather = state.effects.vignetteFeather / 100;
    const lensVignette = state.optics.vignetteCorrection / 100;

    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    const grade = prepareGrade(state.colorGrading);
    const hslColors: HslColorName[] = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
    const hslActive =
      satFactor !== 1 ||
      vibFactor !== 0 ||
      hslColors.some((name) => state.hsl[name].hue !== 0 || state.hsl[name].saturation !== 0 || state.hsl[name].luminance !== 0);

    for (let i = 0; i < px.length; i += 4) {
      let r = px[i];
      let g = px[i + 1];
      let b = px[i + 2];

      if (exposureFactor !== 1) {
        r *= exposureFactor;
        g *= exposureFactor;
        b *= exposureFactor;
      }
      if (brightnessDelta !== 0) {
        r += brightnessDelta;
        g += brightnessDelta;
        b += brightnessDelta;
      }
      if (whitesFactor !== 0) {
        const factor = 1 + (r / 255) * whitesFactor * 0.4;
        r *= factor;
        g *= factor;
        b *= factor;
      }
      if (blacksFactor !== 0) {
        const factor = 1 + ((255 - r) / 255) * blacksFactor * 0.4;
        r *= factor;
        g *= factor;
        b *= factor;
      }
      if (contrastFactor !== 1) {
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
      }

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (highlightsFactor !== 0 && luma > 128) {
        const delta = highlightsFactor * ((luma - 128) / 127) * 40;
        r += delta;
        g += delta;
        b += delta;
      }
      if (shadowsFactor !== 0 && luma < 128) {
        const delta = shadowsFactor * ((128 - luma) / 128) * 40;
        r += delta;
        g += delta;
        b += delta;
      }

      r = Math.max(0, Math.min(255, Math.round(r)));
      g = Math.max(0, Math.min(255, Math.round(g)));
      b = Math.max(0, Math.min(255, Math.round(b)));

      // Tone curves: per-channel curve, then the composite RGB curve
      r = rgbCurveLut[redCurveLut[r]];
      g = rgbCurveLut[greenCurveLut[g]];
      b = rgbCurveLut[blueCurveLut[b]];

      // White balance
      r = r * tempR * tintM;
      g = g * tintG;
      b = b * tempB * tintM;

      // Saturation, vibrance and the 8-colour HSL mixer (skipped, losslessly, when none is in use)
      if (hslActive) {
      const [hue, sat, lum] = rgbToHsl(r, g, b);
      let newHue = hue;
      let newSat = sat;
      let newLum = lum;
      if (satFactor !== 1) newSat *= satFactor;
      if (vibFactor !== 0) newSat += (1 - sat) * vibFactor;
      for (const colorName of hslColors) {
        const ch = state.hsl[colorName];
        if (ch.hue !== 0 || ch.saturation !== 0 || ch.luminance !== 0) {
          const wgt = getHueWeight(hue, HSL_COLOR_CENTERS[colorName]);
          if (wgt > 0) {
            newHue += ch.hue * 0.4 * wgt;
            newSat += (ch.saturation / 100) * wgt * newSat;
            newLum += (ch.luminance / 100) * wgt * 0.3;
          }
        }
      }
      [r, g, b] = hslToRgb(newHue, newSat, newLum);
      }

      // Colour grading wheels (shadows / midtones / highlights / global, with blending and balance)
      if (grade.active) [r, g, b] = gradePixel(r, g, b, grade);

      // Vignette effect and lens-vignette correction
      if (vignetteAmount !== 0 || lensVignette !== 0) {
        const pi = i >> 2;
        const dx = (pi % w) - cx;
        const dy = Math.floor(pi / w) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxRadius;
        let mult = 1;
        if (vignetteAmount !== 0) {
          const innerBound = vignetteMidpoint * 0.8;
          if (dist > innerBound) {
            const vFactor = Math.min(1, (dist - innerBound) / Math.max(0.01, vignetteFeather));
            mult += vignetteAmount * vFactor * 0.8;
          }
        }
        if (lensVignette !== 0) mult *= 1 + lensVignette * dist * dist * 0.7;
        r *= mult;
        g *= mult;
        b *= mult;
      }

      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }

    // 6. Selective masks: tone and colour per mask
    const maskAlphas = new Map<string, Float32Array>();
    for (const mask of state.masks ?? []) {
      if (!mask.enabled) continue;
      const alpha = buildMaskAlpha(mask, w, h, px);
      maskAlphas.set(mask.id, alpha);
      applyMaskAdjustments(px, alpha, mask.adjustments);
    }

    // 7. Texture (fine detail) and clarity (mid-scale local contrast)
    const scale = resolutionScale(w, h);
    localContrast(px, w, h, state.effects.texture / 100, Math.max(1, 1.5 * scale), false);
    localContrast(px, w, h, state.effects.clarity / 100, Math.max(2, 9 * scale), true);

    // 8. Sharpening: global, then each mask's own sharpness weighted by that mask
    sharpen(px, w, h, {
      amount: state.detail.sharpening,
      radius: state.detail.sharpRadius,
      detail: state.detail.sharpDetail,
      masking: state.detail.sharpMasking,
    });
    for (const mask of state.masks ?? []) {
      const alpha = maskAlphas.get(mask.id);
      if (alpha && mask.adjustments.sharpness > 0) {
        sharpen(px, w, h, { amount: mask.adjustments.sharpness, radius: state.detail.sharpRadius, detail: 50, masking: 0 }, alpha);
      }
    }

    // 9. Grain last, so it is not sharpened or denoised
    addGrain(px, w, h, {
      amount: state.effects.grain,
      size: state.effects.grainSize,
      roughness: state.effects.grainRoughness,
    });

    // Optional red overlay showing the area of the active mask
    if (renderMaskOverlay && state.activeMaskId) {
      const alpha = maskAlphas.get(state.activeMaskId);
      if (alpha) {
        for (let i = 0, n = 0; i < px.length; i += 4, n++) {
          const a = alpha[n] * 0.5;
          if (a > 0) {
            px[i] += (239 - px[i]) * a;
            px[i + 1] += (68 - px[i + 1]) * a;
            px[i + 2] += (68 - px[i + 2]) * a;
          }
        }
      }
    }

    if (px !== imgData.data) imgData.data.set(px);
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }
  /**
   * Export high-resolution image data URL
   */
  public static exportHighRes(
    sourceImg: CanvasImageSource,
    state: StudioEditState,
    format: 'image/jpeg' | 'image/png' = 'image/jpeg',
    quality: number = 0.95
  ): string {
    const canvas = document.createElement('canvas');
    this.processImage(sourceImg, state, canvas, false);
    return canvas.toDataURL(format, quality);
  }
}
