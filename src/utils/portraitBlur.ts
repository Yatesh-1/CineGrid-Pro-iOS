/**
 * Portrait mode background softening.
 *
 * The app has no depth sensor, so this is a subject-aware focus falloff: the sharp area is an ellipse around the detected
 * subject (the screen centre when none is found) and the blur grows smoothly outside it. Strength follows the chosen
 * aperture (f/1.4 strongest, f/8 and above off), like depth of field on a real lens.
 */
export const PORTRAIT_SHARP_RADIUS = 0.38; // fraction of the frame kept fully sharp around the centre

/** 0 (no blur) to 1 (maximum) for an f-number. */
export function portraitBlurStrength(fStop: number): number {
  if (!(fStop > 0)) return 0;
  const MIN_F = 1.4;
  const MAX_F = 8;
  if (fStop >= MAX_F) return 0;
  return Math.max(0, Math.min(1, (MAX_F - fStop) / (MAX_F - MIN_F)));
}

/** Blur radius in pixels for an image of the given width. */
export function portraitBlurPx(strength: number, imageWidth: number): number {
  return Math.round(strength * imageWidth * 0.012 * 10) / 10;
}

/** Where the sharp area sits: an ellipse (normalised to the frame), centred on the subject. */
export interface PortraitFocus {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Subject silhouette (MASK_N x MASK_N, 255 = subject). When present the blur sits behind this shape, not an ellipse. */
  mask?: Uint8Array;
}

const M = 64;

/** Head-and-shoulders silhouette for a detected face, on the same grid as object masks. */
function faceSilhouette(box: { x: number; y: number; w: number; h: number }): Uint8Array {
  const c = document.createElement('canvas');
  c.width = M;
  c.height = M;
  const g = c.getContext('2d');
  const out = new Uint8Array(M * M);
  if (!g) return out;
  g.fillStyle = '#fff';
  const ell = (cx: number, cy: number, rx: number, ry: number) => {
    g.beginPath();
    g.ellipse(cx * M, cy * M, Math.max(0.5, rx * M), Math.max(0.5, ry * M), 0, 0, Math.PI * 2);
    g.fill();
  };
  const cx = box.x + box.w / 2;
  ell(cx, box.y + box.h / 2, box.w * 0.62, box.h * 0.72); // head and hair
  ell(cx, box.y + box.h * 1.95, box.w * 1.55, box.h * 1.1); // shoulders and torso
  const px = g.getImageData(0, 0, M, M).data;
  for (let i = 0; i < M * M; i++) out[i] = px[i * 4 + 3];
  return out;
}

const maskUrlCache = new WeakMap<Uint8Array, string>();

/** Soft background mask (opaque = blurred) drawn at w x h; the subject silhouette is cut out and its edge feathered. */
function backgroundMaskCanvas(mask: Uint8Array, w: number, h: number): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = M;
  small.height = M;
  const sg = small.getContext('2d') as CanvasRenderingContext2D;
  const img = sg.createImageData(M, M);
  for (let i = 0; i < M * M; i++) {
    img.data[i * 4 + 3] = 255 - mask[i]; // background opaque, subject transparent
  }
  sg.putImageData(img, 0, 0);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const og = out.getContext('2d') as CanvasRenderingContext2D;
  og.imageSmoothingEnabled = true;
  og.imageSmoothingQuality = 'high';
  og.filter = `blur(${Math.max(1, Math.round(w * 0.012))}px)`; // feathered edge
  og.drawImage(small, 0, 0, w, h);
  og.filter = 'none';
  small.width = 0;
  return out;
}

/**
 * Sharp ellipse around a detected subject box, a little larger than the box so hair, shoulders and edges stay crisp.
 * Like the depth falloff in advanced portrait modes, the blur then ramps up smoothly outside it.
 */
export function focusFromBox(box: { x: number; y: number; w: number; h: number; kind?: string; mask?: Uint8Array }): PortraitFocus {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let mask = box.mask;
  if (!mask && box.kind === 'face' && typeof document !== 'undefined') mask = faceSilhouette(box);
  return {
    mask,
    cx: Math.min(0.9, Math.max(0.1, cx)),
    cy: Math.min(0.9, Math.max(0.1, cy)),
    rx: Math.min(0.70, Math.max(0.28, box.w * 0.95)),
    ry: Math.min(0.75, Math.max(0.35, box.h * 0.95)),
  };
}

/** CSS mask for the live preview: transparent (sharp) inside the ellipse, opaque (blurred) outside, soft in between. */
export function portraitMaskCss(focus?: PortraitFocus | null): string {
  if (!focus) return `radial-gradient(circle at center, transparent ${PORTRAIT_SHARP_RADIUS * 100}%, black 95%)`;
  if (focus.mask) {
    let url = maskUrlCache.get(focus.mask);
    if (!url) {
      url = backgroundMaskCanvas(focus.mask, 128, 128).toDataURL('image/png');
      maskUrlCache.set(focus.mask, url);
    }
    return `url(${url})`;
  }
  return `radial-gradient(ellipse ${(focus.rx * 100).toFixed(1)}% ${(focus.ry * 100).toFixed(1)}% at ${(focus.cx * 100).toFixed(1)}% ${(focus.cy * 100).toFixed(1)}%, transparent 95%, black 160%)`;
}

/**
 * Draws a blurred copy of `canvas` back onto itself, masked so the subject area stays sharp.
 * Used for the saved photo so it matches the live preview.
 */
export function applyPortraitBlur(canvas: HTMLCanvasElement, strength: number, focus?: PortraitFocus | null): void {
  const blurPx = portraitBlurPx(strength, canvas.width);
  if (blurPx <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const blurred = document.createElement('canvas');
  blurred.width = canvas.width;
  blurred.height = canvas.height;
  const bctx = blurred.getContext('2d');
  if (!bctx) return;
  bctx.filter = `blur(${blurPx}px)`;
  bctx.drawImage(canvas, 0, 0);
  bctx.filter = 'none';

  // Keep the blurred pixels only where the mask is opaque (outside the sharp area).
  bctx.globalCompositeOperation = 'destination-in';
  if (focus && focus.mask) {
    const bg = backgroundMaskCanvas(focus.mask, canvas.width, canvas.height);
    bctx.drawImage(bg, 0, 0);
    bg.width = 0;
  } else if (focus) {
    bctx.save();
    bctx.translate(focus.cx * canvas.width, focus.cy * canvas.height);
    bctx.scale(focus.rx * canvas.width, focus.ry * canvas.height);
    const grad = bctx.createRadialGradient(0, 0, 0.95, 0, 0, 1.60);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    bctx.fillStyle = grad;
    bctx.fillRect(-1000, -1000, 2000, 2000);
    bctx.restore();
  } else {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const outer = Math.hypot(cx, cy);
    const grad = bctx.createRadialGradient(cx, cy, outer * PORTRAIT_SHARP_RADIUS, cx, cy, outer * 0.95);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(blurred, 0, 0);
  blurred.width = 0;
  blurred.height = 0;
}