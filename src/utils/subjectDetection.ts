/**
 * Finds the main subject in a frame, with no network and no model download.
 *
 * Faces: when the browser offers the Shape Detection API (FaceDetector) it is used first, because a real face detector
 * beats any heuristic. Everything else (a mug, a flower, a pet, a product) goes through a saliency search:
 *
 *   1. shrink the frame to 64x64 and describe every cell by luma and two colour-opponent channels,
 *   2. a cell is salient when it differs from the frame's typical colour (centre-surround contrast), plus edge strength,
 *   3. a centre prior favours what people actually frame,
 *   4. the strongest cell is grown into a connected region and boxed,
 *   5. the box is smoothed over time so it does not jitter.
 *
 * Boxes are normalised (0..1) to the frame that was analysed.
 */
export interface SubjectBox {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'face' | 'object';
  score: number;
  /** Subject silhouette on an N x N grid over the same frame (255 = subject, 0 = background) */
  mask?: Uint8Array;
}

export const MASK_N = 64;
const N = MASK_N;

export function detectSalientSubject(rgba: Uint8ClampedArray, width: number, height: number): SubjectBox | null {
  if (width < 8 || height < 8) return null;
  // 1. sample onto an N x N grid (box average of the source pixels that fall in each cell)
  const L = new Float32Array(N * N);
  const A = new Float32Array(N * N);
  const B = new Float32Array(N * N);
  for (let cy = 0; cy < N; cy++) {
    const y0 = Math.floor((cy * height) / N);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * height) / N));
    for (let cx = 0; cx < N; cx++) {
      const x0 = Math.floor((cx * width) / N);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * width) / N));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * width + x) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
          n++;
        }
      }
      const k = cy * N + cx;
      r /= n;
      g /= n;
      b /= n;
      L[k] = 0.3 * r + 0.59 * g + 0.11 * b;
      A[k] = r - g; // red-green opponent
      B[k] = 0.5 * (r + g) - b; // yellow-blue opponent
    }
  }

  // 2. contrast against the frame's typical colour (median-ish: the mean, robust enough at this size)
  let mL = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < N * N; i++) {
    mL += L[i];
    mA += A[i];
    mB += B[i];
  }
  mL /= N * N;
  mA /= N * N;
  mB /= N * N;
  const sal = new Float32Array(N * N);
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const k = y * N + x;
      const colour = Math.hypot(L[k] - mL, 1.2 * (A[k] - mA), 1.2 * (B[k] - mB));
      const edge = Math.hypot(L[k + 1] - L[k - 1], L[k + N] - L[k - N]);
      sal[k] = colour + 0.5 * edge;
    }
  }
  // soften (3x3 box) so isolated noisy cells do not win
  const soft = new Float32Array(N * N);
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += sal[(y + dy) * N + x + dx];
      soft[y * N + x] = s / 9;
    }
  }
  // 3. centre prior
  let max = 0;
  let maxK = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x + 0.5) / N - 0.5;
      const dy = (y + 0.5) / N - 0.5;
      const prior = Math.exp(-(dx * dx + dy * dy) / (2 * 0.35 * 0.35));
      const k = y * N + x;
      soft[k] *= 0.55 + 0.45 * prior;
      if (soft[k] > max) {
        max = soft[k];
        maxK = k;
      }
    }
  }
  if (maxK < 0 || max < 6) return null; // a flat, featureless frame has no subject

  // 4. grow the region around the peak (cells above half the peak, connected to it)
  const threshold = max * 0.5;
  const seen = new Uint8Array(N * N);
  const stack = [maxK];
  seen[maxK] = 1;
  let minX = N;
  let minY = N;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  while (stack.length) {
    const k = stack.pop() as number;
    const x = k % N;
    const y = (k / N) | 0;
    count++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    for (const nk of [k - 1, k + 1, k - N, k + N]) {
      if (nk < 0 || nk >= N * N || seen[nk]) continue;
      const nx = nk % N;
      if (Math.abs(nx - x) > 1) continue; // do not wrap around a row
      if (soft[nk] >= threshold) {
        seen[nk] = 1;
        stack.push(nk);
      }
    }
  }
  const area = count / (N * N);
  if (area < 0.012 || area > 0.7) return null; // a speck, or the whole frame: nothing worth boxing
  // Silhouette: the grown region, with enclosed holes filled (a handle, a logo) and one cell of margin
  const outside = new Uint8Array(N * N);
  const flood: number[] = [];
  for (let i = 0; i < N; i++) {
    for (const k of [i, (N - 1) * N + i, i * N, i * N + N - 1]) {
      if (!seen[k] && !outside[k]) {
        outside[k] = 1;
        flood.push(k);
      }
    }
  }
  while (flood.length) {
    const k = flood.pop() as number;
    const x = k % N;
    for (const nk of [k - 1, k + 1, k - N, k + N]) {
      if (nk < 0 || nk >= N * N || outside[nk] || seen[nk]) continue;
      if (Math.abs((nk % N) - x) > 1) continue;
      outside[nk] = 1;
      flood.push(nk);
    }
  }
  const filled = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) filled[k] = outside[k] ? 0 : 1;
  const mask = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < N && xx >= 0 && xx < N && filled[yy * N + xx]) {
            on = 1;
            break;
          }
        }
      }
      mask[y * N + x] = on ? 255 : 0;
    }
  }
  const pad = 1;
  const box: SubjectBox = {
    mask,
    x: Math.max(0, minX - pad) / N,
    y: Math.max(0, minY - pad) / N,
    w: (Math.min(N - 1, maxX + pad) - Math.max(0, minX - pad) + 1) / N,
    h: (Math.min(N - 1, maxY + pad) - Math.max(0, minY - pad) + 1) / N,
    kind: 'object',
    score: Math.min(1, max / 80),
  };
  return box;
}

/** Exponential smoothing of the box between frames; a subject that jumps far is a new subject (no smoothing). */
export function smoothBox(prev: SubjectBox | null, next: SubjectBox | null, alpha = 0.35): SubjectBox | null {
  if (!next) return null;
  if (!prev) return next;
  const dist = Math.hypot(next.x + next.w / 2 - (prev.x + prev.w / 2), next.y + next.h / 2 - (prev.y + prev.h / 2));
  if (dist > 0.3 || prev.kind !== next.kind) return next;
  const mix = (a: number, b: number) => a + (b - a) * alpha;
  let mask = next.mask;
  if (next.mask && prev.mask) {
    // blend silhouettes over time so the edge does not flicker
    mask = new Uint8Array(next.mask.length);
    for (let i = 0; i < mask.length; i++) mask[i] = Math.round(prev.mask[i] * (1 - alpha) + next.mask[i] * alpha);
  }
  return { x: mix(prev.x, next.x), y: mix(prev.y, next.y), w: mix(prev.w, next.w), h: mix(prev.h, next.h), kind: next.kind, score: next.score, mask };
}

type FaceDetectorCtor = new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (src: CanvasImageSource) => Promise<{ boundingBox: DOMRectReadOnly }[]> };

let faceDetector: InstanceType<FaceDetectorCtor> | null | undefined;

/** Real face detection where the browser has it; null otherwise (then the saliency search is used). */
export async function detectFace(source: HTMLCanvasElement): Promise<SubjectBox | null> {
  if (faceDetector === undefined) {
    const Ctor = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
    try {
      faceDetector = Ctor ? new Ctor({ fastMode: true, maxDetectedFaces: 3 }) : null;
    } catch {
      faceDetector = null;
    }
  }
  if (!faceDetector) return null;
  try {
    const faces = await faceDetector.detect(source);
    if (!faces.length) return null;
    const big = faces.reduce((m, f) => (f.boundingBox.width * f.boundingBox.height > m.boundingBox.width * m.boundingBox.height ? f : m));
    const bb = big.boundingBox;
    return { x: bb.x / source.width, y: bb.y / source.height, w: bb.width / source.width, h: bb.height / source.height, kind: 'face', score: 1 };
  } catch {
    faceDetector = null; // unsupported at runtime: stop trying
    return null;
  }
}
