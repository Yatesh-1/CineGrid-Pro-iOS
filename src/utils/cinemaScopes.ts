// CineGrid Pro — Real-time Cinema Monitoring Scopes
// Real pixel-level analysis for digital cinema production
// (False Color, Waveform, RGB Parade, Vectorscope, Zebra Stripes, Focus Peaking, Histogram, Magnifier)

export interface ScopeDimensions {
  width: number;
  height: number;
}

// Helper to safely extract ImageData from canvas/video source
export const sampleSourceImageData = (
  source: CanvasImageSource,
  sampleWidth = 160,
  sampleHeight = 90
): ImageData | null => {
  if (typeof document === 'undefined') return null;
  const offscreen = document.createElement('canvas');
  offscreen.width = sampleWidth;
  offscreen.height = sampleHeight;
  const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!offCtx) {
    // Headless test environment or environment without 2d canvas bindings
    try {
      if (typeof ImageData !== 'undefined') {
        return new ImageData(sampleWidth, sampleHeight);
      }
    } catch {}
    return {
      width: sampleWidth,
      height: sampleHeight,
      data: new Uint8ClampedArray(sampleWidth * sampleHeight * 4),
      colorSpace: 'srgb',
    } as unknown as ImageData;
  }

  try {
    offCtx.drawImage(source, 0, 0, sampleWidth, sampleHeight);
    const imgData = offCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    if (imgData) return imgData;
  } catch {
    // In headless test environments or browsers where ImageData cannot be read from canvas
  }

  try {
    if (typeof ImageData !== 'undefined') {
      return new ImageData(sampleWidth, sampleHeight);
    }
  } catch {}

  return null;
};

/**
 * 1. FALSE COLOR (ARRI / RED Standard Cinema Exposure Zones)
 * Maps luminance IRE to standardized false colors:
 * - Red (>98 IRE): Highlight clipping
 * - Yellow (75-98 IRE): High highlights / near clipping
 * - Pink (52-58 IRE): Caucasian / Olive skin highlight
 * - Green (38-42 IRE): 18% Middle Grey reference
 * - Light Blue (10-25 IRE): Low shadows
 * - Purple (<3 IRE): Crushed blacks
 */
export const drawFalseColor = (
  source: CanvasImageSource,
  targetCanvas: HTMLCanvasElement,
  sampleWidth = 240,
  sampleHeight = 135
): void => {
  const imgData = sampleSourceImageData(source, sampleWidth, sampleHeight);
  if (!imgData) return;

  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec.709 Luma calculation
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ire = (luma / 255) * 100;

    if (ire >= 98) {
      // Clipping: Red
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else if (ire >= 75) {
      // Near Clipping: Yellow
      data[i] = 255;
      data[i + 1] = 230;
      data[i + 2] = 0;
    } else if (ire >= 52 && ire <= 58) {
      // Skin tone highlight: Pink
      data[i] = 255;
      data[i + 1] = 105;
      data[i + 2] = 180;
    } else if (ire >= 38 && ire <= 42) {
      // 18% Middle grey: Green
      data[i] = 0;
      data[i + 1] = 255;
      data[i + 2] = 0;
    } else if (ire >= 10 && ire <= 25) {
      // Low shadows: Light cyan/blue
      data[i] = 0;
      data[i + 1] = 191;
      data[i + 2] = 255;
    } else if (ire < 3) {
      // Crushed blacks: Purple
      data[i] = 128;
      data[i + 1] = 0;
      data[i + 2] = 128;
    } else {
      // Midtones: Monochromatic neutral grey
      const grey = Math.round(luma * 0.4);
      data[i] = grey;
      data[i + 1] = grey;
      data[i + 2] = grey;
    }
  }

  // Draw scaled to target canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sampleWidth;
  tempCanvas.height = sampleHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (tempCtx) {
    tempCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(tempCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
  }
};

/**
 * 2. LUMA WAVEFORM MONITOR
 * Shows horizontal distribution of pixel luminance with IRE graticules (0, 18, 50, 70, 100 IRE)
 */
export const drawWaveform = (
  source: CanvasImageSource,
  canvas: HTMLCanvasElement,
  sampleWidth = 120,
  sampleHeight = 80
): void => {
  const imgData = sampleSourceImageData(source, sampleWidth, sampleHeight);
  if (!imgData) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const data = imgData.data;

  // Dark cinema background
  ctx.fillStyle = 'rgba(10, 12, 16, 0.88)';
  ctx.fillRect(0, 0, w, h);

  // IRE graticule grid lines
  ctx.lineWidth = 1;
  const ireLevels = [
    { ire: 100, y: 0.08, label: '100', color: 'rgba(239, 68, 68, 0.4)' },
    { ire: 70, y: 0.32, label: '70', color: 'rgba(255, 255, 255, 0.15)' },
    { ire: 50, y: 0.50, label: '50', color: 'rgba(255, 255, 255, 0.15)' },
    { ire: 18, y: 0.76, label: '18', color: 'rgba(234, 179, 8, 0.3)' },
    { ire: 0, y: 0.92, label: '0', color: 'rgba(56, 189, 248, 0.3)' },
  ];

  for (const g of ireLevels) {
    ctx.strokeStyle = g.color;
    ctx.beginPath();
    const yPos = h * g.y;
    ctx.moveTo(24, yPos);
    ctx.lineTo(w, yPos);
    ctx.stroke();

    ctx.fillStyle = g.color;
    ctx.font = '8px monospace';
    ctx.fillText(g.label, 4, yPos + 3);
  }

  // Plot phosphor trace
  ctx.fillStyle = 'rgba(34, 197, 94, 0.28)'; // Classic cinema green phosphor
  const plotW = w - 26;

  for (let x = 0; x < sampleWidth; x++) {
    const px = 25 + (x / sampleWidth) * plotW;
    for (let y = 0; y < sampleHeight; y++) {
      const idx = (y * sampleWidth + x) * 4;
      const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      // Map 0..255 luma to graticule range (0.92h to 0.08h)
      const py = h * 0.92 - (luma / 255) * (h * 0.84);
      ctx.fillRect(px, py, 1.2, 1.2);
    }
  }
};

/**
 * 3. RGB PARADE
 * Splits frame into 3 vertical columns (Red, Green, Blue waveforms side-by-side)
 */
export const drawRgbParade = (
  source: CanvasImageSource,
  canvas: HTMLCanvasElement,
  sampleWidth = 90,
  sampleHeight = 60
): void => {
  const imgData = sampleSourceImageData(source, sampleWidth, sampleHeight);
  if (!imgData) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const colW = w / 3;
  const data = imgData.data;

  // Background
  ctx.fillStyle = 'rgba(10, 12, 16, 0.9)';
  ctx.fillRect(0, 0, w, h);

  // Column separators & graticules
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;

  for (let c = 0; c < 3; c++) {
    const colX = c * colW;
    if (c > 0) {
      ctx.beginPath();
      ctx.moveTo(colX, 0);
      ctx.lineTo(colX, h);
      ctx.stroke();
    }

    // Reference lines
    ctx.beginPath();
    ctx.moveTo(colX, h * 0.1); ctx.lineTo(colX + colW, h * 0.1);
    ctx.moveTo(colX, h * 0.5); ctx.lineTo(colX + colW, h * 0.5);
    ctx.moveTo(colX, h * 0.9); ctx.lineTo(colX + colW, h * 0.9);
    ctx.stroke();
  }

  // Column Channel headers
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.fillText('R', 6, 12);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('G', colW + 6, 12);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('B', colW * 2 + 6, 12);

  const colors = [
    'rgba(239, 68, 68, 0.35)',
    'rgba(34, 197, 94, 0.35)',
    'rgba(56, 189, 248, 0.35)',
  ];

  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = colors[c];
    const colX = c * colW;

    for (let x = 0; x < sampleWidth; x++) {
      const px = colX + (x / sampleWidth) * colW;
      for (let y = 0; y < sampleHeight; y++) {
        const idx = (y * sampleWidth + x) * 4 + c;
        const val = data[idx];
        const py = h * 0.9 - (val / 255) * (h * 0.8);
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    }
  }
};

/**
 * 4. VECTORSCOPE
 * Polar chrominance graticule with skin-tone indicator line and color targets (R, Mg, B, Cy, G, Yl)
 */
export const drawVectorscope = (
  source: CanvasImageSource,
  canvas: HTMLCanvasElement,
  sampleWidth = 100,
  sampleHeight = 65
): void => {
  const imgData = sampleSourceImageData(source, sampleWidth, sampleHeight);
  if (!imgData) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(cx, cy) * 0.82;
  const data = imgData.data;

  // Dark cinema background
  ctx.fillStyle = 'rgba(8, 10, 14, 0.92)';
  ctx.fillRect(0, 0, w, h);

  // Polar graticule circles
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
  ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  // Skin Tone Line (I-Line at ~123 degrees / -57 degrees)
  ctx.strokeStyle = 'rgba(255, 180, 140, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  const skinAngle = -57 * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(skinAngle) * radius, cy + Math.sin(skinAngle) * radius);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cinema color targets: R, Mg, B, Cy, G, Yl
  const targets = [
    { label: 'R', angle: 103, color: '#ef4444' },
    { label: 'Mg', angle: 61, color: '#ec4899' },
    { label: 'B', angle: 347, color: '#3b82f6' },
    { label: 'Cy', angle: 283, color: '#06b6d4' },
    { label: 'G', angle: 241, color: '#22c55e' },
    { label: 'Yl', angle: 167, color: '#eab308' },
  ];

  ctx.font = '7px monospace';
  for (const t of targets) {
    const rad = (t.angle * Math.PI) / 180;
    const tx = cx + Math.cos(rad) * radius * 0.75;
    const ty = cy - Math.sin(rad) * radius * 0.75;
    ctx.strokeStyle = t.color;
    ctx.strokeRect(tx - 3, ty - 3, 6, 6);
    ctx.fillStyle = t.color;
    ctx.fillText(t.label, tx + 4, ty + 2);
  }

  // Plot chrominance U/V coordinates of frame
  ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // YUV / YCbCr chrominance conversion
    const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
    const v = 0.615 * r - 0.51499 * g - 0.10001 * b;

    const px = cx + (u / 128) * radius * 0.75;
    const py = cy - (v / 128) * radius * 0.75;
    ctx.fillRect(px, py, 1.2, 1.2);
  }
};

/**
 * 5. ZEBRA STRIPES OVERLAY
 * Highlights pixels over exposure threshold with alternating 45° diagonal zebra hash stripes
 */
export const drawZebraOverlay = (
  source: CanvasImageSource,
  targetCanvas: HTMLCanvasElement,
  thresholdIre = 85,
  sampleWidth = 320,
  sampleHeight = 180
): void => {
  const imgData = sampleSourceImageData(source, sampleWidth, sampleHeight);
  if (!imgData) return;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const data = imgData.data;
  const lumaThreshold = (thresholdIre / 100) * 255;

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  const scaleX = targetCanvas.width / sampleWidth;
  const scaleY = targetCanvas.height / sampleHeight;

  // We batch zebra regions to keep rendering 60fps fast
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  for (let y = 0; y < sampleHeight; y += 2) {
    for (let x = 0; x < sampleWidth; x += 2) {
      const idx = (y * sampleWidth + x) * 4;
      const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];

      if (luma >= lumaThreshold) {
        // Draw diagonal zebra pattern
        const tx = x * scaleX;
        const ty = y * scaleY;
        const phase = (x + y) % 8;
        if (phase < 4) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        } else {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        }
        ctx.fillRect(tx, ty, scaleX * 2, scaleY * 2);
      }
    }
  }
};

/**
 * 6. FOCUS PEAKING ASSIST
 * Detects high frequency contrast edges using Sobel / highpass operator
 * Highlights in-focus sharp detail with user-chosen assist color
 */
export const drawFocusPeaking = (
  source: CanvasImageSource,
  targetCanvas: HTMLCanvasElement,
  peakingColorHex = '#22c55e', // 'green' | 'red' | 'blue' | 'amber' | 'white'
  edgeThreshold = 28,
  sampleWidth = 320,
  sampleHeight = 180
): void => {
  const imgData = sampleSourceImageData(source, sampleWidth, sampleHeight);
  if (!imgData) return;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const data = imgData.data;
  const w = sampleWidth;
  const h = sampleHeight;

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const scaleX = targetCanvas.width / w;
  const scaleY = targetCanvas.height / h;

  ctx.fillStyle = peakingColorHex;

  // Compute horizontal and vertical gradients
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const idx = (y * w + x) * 4;
      const idxR = (y * w + (x + 1)) * 4;
      const idxD = ((y + 1) * w + x) * 4;

      const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const lumaR = 0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
      const lumaD = 0.299 * data[idxD] + 0.587 * data[idxD + 1] + 0.114 * data[idxD + 2];

      const diff = Math.abs(luma - lumaR) + Math.abs(luma - lumaD);

      if (diff > edgeThreshold) {
        ctx.fillRect(x * scaleX, y * scaleY, scaleX * 2, scaleY * 2);
      }
    }
  }
};

/**
 * 7. FOCUS MAGNIFIER (1x, 2x, 4x)
 * Crops and magnifies target area around focus point for critical manual focusing
 */
export const drawFocusMagnifier = (
  source: CanvasImageSource,
  targetCanvas: HTMLCanvasElement,
  magnification: 1.0 | 2.0 | 4.0 = 2.0,
  centerPoint: { x: number; y: number } = { x: 0.5, y: 0.5 }
): void => {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const cw = targetCanvas.width;
  const ch = targetCanvas.height;

  let sw = cw;
  let sh = ch;
  if (source instanceof HTMLVideoElement) {
    sw = source.videoWidth || cw;
    sh = source.videoHeight || ch;
  } else if (source instanceof HTMLCanvasElement) {
    sw = source.width;
    sh = source.height;
  }

  const cropW = sw / magnification;
  const cropH = sh / magnification;
  const cropX = Math.max(0, Math.min(sw - cropW, centerPoint.x * sw - cropW / 2));
  const cropY = Math.max(0, Math.min(sh - cropH, centerPoint.y * sh - cropH / 2));

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cw, ch);

  // Reticle crosshair in center
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cw / 2 - 12, ch / 2); ctx.lineTo(cw / 2 + 12, ch / 2);
  ctx.moveTo(cw / 2, ch / 2 - 12); ctx.lineTo(cw / 2, ch / 2 + 12);
  ctx.stroke();

  // Magnifier badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(8, 8, 48, 18);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`${magnification}X MAG`, 12, 21);
};
