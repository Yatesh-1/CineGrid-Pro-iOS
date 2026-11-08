import type { PhotoExportSettings, OutputSharpening } from '../types/export';

// Convolution Filter for Sharpening
function applySharpeningKernel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  level: OutputSharpening
) {
  if (level === 'none') return;

  const weights =
    level === 'low'
      ? [0, -0.2, 0, -0.2, 1.8, -0.2, 0, -0.2, 0]
      : level === 'medium'
      ? [0, -0.4, 0, -0.4, 2.6, -0.4, 0, -0.4, 0]
      : [-0.1, -0.5, -0.1, -0.5, 3.4, -0.5, -0.1, -0.5, -0.1];

  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const output = ctx.createImageData(width, height);
  const dst = output.data;

  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
          const srcIdx = (scy * width + scx) * 4;
          const wt = weights[cy * side + cx];

          r += src[srcIdx] * wt;
          g += src[srcIdx + 1] * wt;
          b += src[srcIdx + 2] * wt;
        }
      }

      dst[dstIdx] = Math.min(255, Math.max(0, r));
      dst[dstIdx + 1] = Math.min(255, Math.max(0, g));
      dst[dstIdx + 2] = Math.min(255, Math.max(0, b));
      dst[dstIdx + 3] = src[dstIdx + 3]; // Preserve alpha
    }
  }

  ctx.putImageData(output, 0, 0);
}

// Draw Watermark
function applyWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: PhotoExportSettings['watermark']
) {
  if (!settings.enabled || (!settings.text && !settings.logoDataUrl)) return;

  ctx.save();
  ctx.globalAlpha = settings.opacity;

  if (settings.type === 'text' && settings.text) {
    const fontSize = Math.max(14, Math.round((settings.fontSize / 1000) * width));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = settings.color || '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const metrics = ctx.measureText(settings.text);
    const textWidth = metrics.width;
    const padding = Math.round(width * 0.03);

    let x = padding;
    let y = height - padding;

    switch (settings.position) {
      case 'bottom-right':
        x = width - textWidth - padding;
        y = height - padding;
        break;
      case 'bottom-left':
        x = padding;
        y = height - padding;
        break;
      case 'top-right':
        x = width - textWidth - padding;
        y = padding + fontSize;
        break;
      case 'top-left':
        x = padding;
        y = padding + fontSize;
        break;
      case 'center':
        x = (width - textWidth) / 2;
        y = height / 2 + fontSize / 2;
        break;
      case 'bottom-center':
        x = (width - textWidth) / 2;
        y = height - padding;
        break;
      case 'top-center':
        x = (width - textWidth) / 2;
        y = padding + fontSize;
        break;
    }

    ctx.fillText(settings.text, x, y);
  }

  ctx.restore();
}

/**
 * Calculates final output dimensions based on resize mode
 */
export function calculateOutputDimensions(
  naturalWidth: number,
  naturalHeight: number,
  settings: PhotoExportSettings
): { width: number; height: number } {
  if (settings.resizeMode === 'percentage') {
    const scale = settings.resizePercentage / 100;
    return {
      width: Math.max(100, Math.round(naturalWidth * scale)),
      height: Math.max(100, Math.round(naturalHeight * scale)),
    };
  }

  if (settings.resizeMode === 'custom' && settings.customWidth && settings.customHeight) {
    if (settings.maintainAspectRatio) {
      const aspect = naturalWidth / naturalHeight;
      const targetAspect = settings.customWidth / settings.customHeight;
      if (aspect > targetAspect) {
        return {
          width: settings.customWidth,
          height: Math.round(settings.customWidth / aspect),
        };
      } else {
        return {
          width: Math.round(settings.customHeight * aspect),
          height: settings.customHeight,
        };
      }
    }
    return {
      width: settings.customWidth,
      height: settings.customHeight,
    };
  }

  return { width: naturalWidth, height: naturalHeight };
}

/**
 * Renders the photo with all export transformations applied (resizing, sharpening, watermark)
 */
export async function renderProcessedExport(
  sourceImageUrl: string,
  settings: PhotoExportSettings
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number; estimatedSizeKb: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const { width, height } = calculateOutputDimensions(img.naturalWidth, img.naturalHeight, settings);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // Draw resized image
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Apply sharpening if configured
      if (settings.sharpening !== 'none') {
        applySharpeningKernel(ctx, width, height, settings.sharpening);
      }

      // Apply watermark if configured
      if (settings.watermark.enabled) {
        applyWatermark(ctx, width, height, settings.watermark);
      }

      // Output MIME type
      let mimeType = 'image/jpeg';
      if (settings.format === 'png' || settings.format === 'raw_dng') {
        mimeType = 'image/png';
      } else if (settings.format === 'webp') {
        mimeType = 'image/webp';
      }

      const qualityFloat = Math.max(0.1, Math.min(1.0, settings.quality / 100));

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create image blob'));
            return;
          }
          const dataUrl = canvas.toDataURL(mimeType, qualityFloat);
          const estimatedSizeKb = Math.round(blob.size / 1024);

          resolve({
            dataUrl,
            blob,
            width,
            height,
            estimatedSizeKb,
          });
        },
        mimeType,
        qualityFloat
      );
    };

    img.onerror = (err) => reject(err);
    img.src = sourceImageUrl;
  });
}

/** MIME type the browser would have to encode, or null when the format cannot be produced here. */
export const EXPORT_MIME: Record<string, string | null> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heif: 'image/heif',
  raw_dng: null, // a browser cannot create RAW files, and edited photos are not RAW sensor data
};

/** True only if this browser can really encode the format (otherwise it silently falls back to PNG). */
export function isExportFormatSupported(format: string): boolean {
  const mime = EXPORT_MIME[format];
  if (!mime) return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL(mime).startsWith(`data:${mime}`);
  } catch {
    return false;
  }
}