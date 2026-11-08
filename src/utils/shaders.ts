import type { CameraFilter, ProSettings, GridType, AspectRatio } from '../types/camera';
import { effectiveTint, TINT_FILTER_REF } from './tintFilter';
import { applyPortraitBlur, type PortraitFocus } from './portraitBlur';
import { frameWidthOverHeight } from './frameFit';

// Calculate effective CSS filter string combining preset filter look and manual pro controls
export const getEffectiveCssFilter = (
  filter: CameraFilter,
  filterStrength: number = 100, // 0 to 100%
  pro: ProSettings
): string => {
  const normStrength = filterStrength / 100;

  // Base adjustments from filter multiplied by strength
  const baseBrightness = 100 + (filter.brightness - 100) * normStrength;
  const baseContrast = 100 + (filter.contrast - 100) * normStrength;
  const baseSaturation = 100 + (filter.saturation - 100) * normStrength;
  const baseSepia = filter.sepia * normStrength;
  const baseHue = filter.hueRotate * normStrength;

  // Pro exposure EV multiplier: -3EV to +3EV
  const evMultiplier = Math.pow(2, pro.ev * 0.35);
  const finalBrightness = Math.round(baseBrightness * evMultiplier);

  // Pro White balance temperature: 2800K to 7500K
  const tempDelta = (pro.whiteBalance - 5600) / 2000;
  const sepiaFromWb = tempDelta < 0 ? Math.min(35, Math.abs(tempDelta) * 20) : 0;
  const hueFromWb = tempDelta > 0 ? Math.min(25, tempDelta * 15) : (tempDelta * 10);

  const finalContrast = Math.round(baseContrast * (1 + (pro.colorContrast ?? 0) / 200));
  const finalSaturation = Math.round(baseSaturation * (1 + (pro.colorSaturation ?? 0) / 100));
  const finalSepia = Math.min(100, Math.round(baseSepia + sepiaFromWb));
  const finalHue = Math.round(baseHue + hueFromWb);

  const base = `brightness(${finalBrightness}%) contrast(${finalContrast}%) saturate(${finalSaturation}%) sepia(${finalSepia}%) hue-rotate(${finalHue}deg)`;
  // Tint goes through the shared SVG colour matrix (see utils/tintFilter.ts); omitted at 0 so nothing else changes.
  return effectiveTint(pro) !== 0 ? `${base} ${TINT_FILTER_REF}` : base;
};

// Real-time canvas RGB & Luma histogram generator for Blackmagic HUD
export const drawLiveHistogram = (
  source: CanvasImageSource,
  canvas: HTMLCanvasElement,
  sampleWidth = 160,
  sampleHeight = 90
) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = sampleWidth;
  offscreen.height = sampleHeight;
  const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return;

  offCtx.drawImage(source, 0, 0, sampleWidth, sampleHeight);
  let imgData: ImageData;
  try {
    imgData = offCtx.getImageData(0, 0, sampleWidth, sampleHeight);
  } catch {
    return;
  }

  const data = imgData.data;
  const rHist = new Uint32Array(256);
  const gHist = new Uint32Array(256);
  const bHist = new Uint32Array(256);
  const lumaHist = new Uint32Array(256);

  let maxCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    rHist[r]++;
    gHist[g]++;
    bHist[b]++;
    lumaHist[luma]++;

    if (lumaHist[luma] > maxCount) maxCount = lumaHist[luma];
  }

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = 'rgba(10, 12, 16, 0.75)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.25, 0); ctx.lineTo(w * 0.25, h);
  ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h);
  ctx.moveTo(w * 0.75, 0); ctx.lineTo(w * 0.75, h);
  ctx.stroke();

  if (maxCount === 0) return;
  const scale = (h * 0.85) / maxCount;

  // Draw Luminance curve
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * w;
    const y = h - lumaHist[i] * scale;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Draw RGB traces
  const drawTrace = (hist: Uint32Array, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * w;
      const y = h - hist[i] * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  drawTrace(rHist, 'rgba(239, 68, 68, 0.7)');
  drawTrace(gHist, 'rgba(34, 197, 94, 0.7)');
  drawTrace(bHist, 'rgba(56, 189, 248, 0.7)');

  // 18% middle grey reference marker line
  const midGreyX = Math.round((118 / 255) * w);
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(midGreyX, 0);
  ctx.lineTo(midGreyX, h);
  ctx.stroke();
  ctx.setLineDash([]);
};

// Real-time Blackmagic Cinema Exposure Waveform monitor
export const drawLiveWaveform = (
  source: CanvasImageSource,
  canvas: HTMLCanvasElement,
  sampleWidth = 80,
  sampleHeight = 60
) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = sampleWidth;
  offscreen.height = sampleHeight;
  const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return;

  offCtx.drawImage(source, 0, 0, sampleWidth, sampleHeight);
  let imgData: ImageData;
  try {
    imgData = offCtx.getImageData(0, 0, sampleWidth, sampleHeight);
  } catch {
    return;
  }

  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Clear with dark cinema background
  ctx.fillStyle = 'rgba(8, 10, 14, 0.85)';
  ctx.fillRect(0, 0, w, h);

  // Reference graticules: 100 IRE (clipping), 70 IRE (skin), 50 IRE (grey), 0 IRE (crush)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.1); ctx.lineTo(w, h * 0.1); // 100 IRE
  ctx.moveTo(0, h * 0.3); ctx.lineTo(w, h * 0.3); // 70 IRE
  ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5); // 50 IRE
  ctx.moveTo(0, h * 0.9); ctx.lineTo(w, h * 0.9); // 0 IRE
  ctx.stroke();

  // Plot pixel luminance columns
  ctx.fillStyle = 'rgba(34, 197, 94, 0.25)'; // Green phosphor trace
  for (let x = 0; x < sampleWidth; x++) {
    const canvasX = (x / sampleWidth) * w;
    for (let y = 0; y < sampleHeight; y++) {
      const idx = (y * sampleWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const canvasY = h - (luma / 255) * h;
      ctx.fillRect(canvasX, canvasY, 1.5, 1.5);
    }
  }
};

// Render full resolution high quality photo capture
export const captureFrameToDataUrl = (
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  filter: CameraFilter,
  filterStrength: number,
  pro: ProSettings,
  cropRatio: AspectRatio,
  gridTypeToBurn?: GridType,
  skipCssFilter: boolean = false,
  /** Centre crop matching the preview's digital zoom, so the photo shows what was framed. */
  digitalScale: number = 1,
  /** Portrait mode background softening, 0 (off) to 1 (see utils/portraitBlur.ts). */
  portraitBlur: number = 0,
  /** Flip left-right so the saved photo matches a mirrored front-camera preview. */
  mirror: boolean = false,
  /** Where portrait blur keeps things sharp (detected subject); centre when null */
  portraitFocus: PortraitFocus | null = null
): string => {
  const canvas = document.createElement('canvas');
  let srcW = 1920;
  let srcH = 1080;
  if (source instanceof HTMLVideoElement) {
    srcW = source.videoWidth || 1920;
    srcH = source.videoHeight || 1080;
  } else if (source instanceof HTMLCanvasElement) {
    srcW = source.width || 1920;
    srcH = source.height || 1080;
  } else if (source instanceof HTMLImageElement) {
    srcW = source.naturalWidth || 1920;
    srcH = source.naturalHeight || 1080;
  } else if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    srcW = source.width || 1920;
    srcH = source.height || 1080;
  }

  // Crop to exactly the frame shape the viewfinder shows (portrait, like a phone camera), centred,
  // so the saved photo matches what was framed instead of a different landscape strip.
  const targetRatio = frameWidthOverHeight(cropRatio);

  let cropW = srcW;
  let cropH = srcW / targetRatio;
  if (cropH > srcH) {
    cropH = srcH;
    cropW = srcH * targetRatio;
  }

  // Output size is the full frame, whatever the zoom: a real camera app saves a normal-size photo at 3x
  // (interpolated), not a thumbnail. Capped so very large sensors cannot exhaust memory.
  const MAX_OUTPUT_SIDE = 4096;
  let outW = cropW;
  let outH = cropH;
  const longSide = Math.max(outW, outH);
  if (longSide > MAX_OUTPUT_SIDE) {
    outW = (outW * MAX_OUTPUT_SIDE) / longSide;
    outH = (outH * MAX_OUTPUT_SIDE) / longSide;
  }

  if (digitalScale > 1) {
    cropW /= digitalScale;
    cropH /= digitalScale;
  }
  const cropX = (srcW - cropW) / 2;
  const cropY = (srcH - cropH) / 2;

  canvas.width = Math.round(outW);
  canvas.height = Math.round(outH);

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply CSS color grade filter to canvas context (unless skipping because shader already graded it)
  if (!skipCssFilter) {
    ctx.filter = getEffectiveCssFilter(filter, filterStrength, pro);
  } else {
    ctx.filter = 'none';
  }

  // Draw source image with aspect ratio crop
  if (mirror) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
  if (mirror) ctx.restore();

  if (portraitBlur > 0) applyPortraitBlur(canvas, portraitBlur, portraitFocus);

  // Apply subtle analog film grain if filter specifies it
  if (filter.grain > 0 && filterStrength > 10) {
    const grainStrength = (filter.grain / 100) * (filterStrength / 100) * 0.12;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * 255 * grainStrength;
      pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise));
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noise));
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Vignette effect if specified
  if (filter.vignette > 0 && filterStrength > 10) {
    const vigStrength = (filter.vignette / 100) * (filterStrength / 100) * 0.65;
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.35,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.72
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${vigStrength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Only burn grid overlay if user explicitly toggles burnGridInExport = true!
  if (pro.burnGridInExport && gridTypeToBurn && gridTypeToBurn !== 'none') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 600));
    const W = canvas.width;
    const H = canvas.height;

    if (gridTypeToBurn === 'rule_of_thirds') {
      ctx.beginPath();
      ctx.moveTo(W / 3, 0); ctx.lineTo(W / 3, H);
      ctx.moveTo((W * 2) / 3, 0); ctx.lineTo((W * 2) / 3, H);
      ctx.moveTo(0, H / 3); ctx.lineTo(W, H / 3);
      ctx.moveTo(0, (H * 2) / 3); ctx.lineTo(W, (H * 2) / 3);
      ctx.stroke();
    } else if (gridTypeToBurn === 'golden_ratio') {
      ctx.beginPath();
      ctx.moveTo(W * 0.382, 0); ctx.lineTo(W * 0.382, H);
      ctx.moveTo(W * 0.618, 0); ctx.lineTo(W * 0.618, H);
      ctx.moveTo(0, H * 0.382); ctx.lineTo(W, H * 0.382);
      ctx.moveTo(0, H * 0.618); ctx.lineTo(W, H * 0.618);
      ctx.stroke();
    } else if (gridTypeToBurn === 'center_crosshair' || gridTypeToBurn === 'center_symmetry') {
      ctx.beginPath();
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const out = canvas.toDataURL('image/jpeg', 0.94);
  // Free the multi-megabyte pixel buffer now; waiting for GC lets captures pile up native memory.
  canvas.width = 0;
  canvas.height = 0;
  return out;
};
