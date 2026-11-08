/**
 * Sweep panorama, no network and no model.
 *
 * While the user pans the phone, the live video is sampled a few times a second. For each new frame the sideways (and
 * small vertical) movement since the previous frame is measured by block matching on a small greyscale copy (the shift
 * with the lowest mean difference over the overlapping area). The measured shifts are accumulated into positions in
 * one wide image, and a thin slice from the middle of each frame (where lens distortion is smallest) is placed there.
 * The result is one stitched JPEG wider than the camera can see.
 *
 * Limits, stated plainly: it assumes a mostly horizontal sweep around the phone's own position, a reasonably static
 * scene and steady exposure. Fast moves are flagged ("too fast") and skipped; there is no parallax or exposure blending.
 */

export interface ShiftResult {
  dx: number;
  dy: number;
  /** mean absolute difference at the best match (0 = identical); high means the frames did not line up */
  cost: number;
}

/**
 * Where did the scene move? Returns (dx, dy) such that cur(x, y) is about prev(x + dx, y + dy), measured in pixels of the
 * given greyscale frames. A phone panning right makes the scene move left in the picture, so dx is positive then.
 */
export function estimateShift(prev: Uint8Array, cur: Uint8Array, w: number, h: number, maxDx: number, maxDy = 6): ShiftResult {
  const y0 = Math.floor(h * 0.15);
  const y1 = Math.floor(h * 0.85);
  const step = 2;
  let best = Infinity;
  let bdx = 0;
  let bdy = 0;
  const cost = (dx: number, dy: number): number => {
    let sum = 0;
    let n = 0;
    const xa = Math.max(0, -dx);
    const xb = Math.min(w, w - dx);
    for (let y = y0; y < y1; y += step) {
      const py = y + dy;
      if (py < 0 || py >= h) continue;
      const ro = y * w;
      const po = py * w;
      for (let x = xa; x < xb; x += step) {
        sum += Math.abs(cur[ro + x] - prev[po + x + dx]);
        n++;
      }
    }
    // a tiny overlap is not evidence of a match
    return n < 80 ? Infinity : sum / n;
  };
  // coarse: whole horizontal range at a few vertical offsets, then refine around the winner
  for (let dx = -maxDx; dx <= maxDx; dx += 2) {
    for (let dy = -maxDy; dy <= maxDy; dy += 3) {
      const c = cost(dx, dy);
      if (c < best) {
        best = c;
        bdx = dx;
        bdy = dy;
      }
    }
  }
  const cx = bdx;
  const cy = bdy;
  for (let dx = cx - 1; dx <= cx + 1; dx++) {
    for (let dy = cy - 2; dy <= cy + 2; dy++) {
      if (Math.abs(dx) > maxDx || Math.abs(dy) > maxDy) continue;
      const c = cost(dx, dy);
      if (c < best) {
        best = c;
        bdx = dx;
        bdy = dy;
      }
    }
  }
  return { dx: bdx, dy: bdy, cost: best === Infinity ? 255 : best };
}

export interface PanoramaState {
  /** stitched width so far, in output pixels */
  widthPx: number;
  slices: number;
  /** -1 sweeping left, 1 sweeping right, 0 not moving yet */
  direction: -1 | 0 | 1;
  /** the last frames did not line up (moved too fast or the scene changed) */
  tooFast: boolean;
  /** reached the width limit; the caller should finish */
  full: boolean;
}

interface Slice {
  x: number;
  y: number;
  canvas: HTMLCanvasElement;
}

const ANALYSIS_W = 128;
const MAX_OUTPUT_WIDTH = 7000;
const MIN_PASTE_PX = 6;

export class PanoramaStitcher {
  private slices: Slice[] = [];
  private prevLuma: Uint8Array | null = null;
  private analysis = document.createElement('canvas');
  private frameW = 0;
  private frameH = 0;
  private scale = 1; // output pixels per analysis pixel
  private x = 0; // position of the current frame's left edge in the panorama
  private y = 0;
  private pendX = 0;
  private pendY = 0;
  private direction: -1 | 0 | 1 = 0;
  private bad = 0;
  private minX = 0;
  private maxX = 0;
  private minY = 0;
  private maxY = 0;
  private maxOutH: number;

  constructor(maxOutputHeight = 960) {
    this.maxOutH = maxOutputHeight;
  }

  /** Feed the current video frame. Cheap enough to call 4 to 6 times a second. */
  addFrame(video: HTMLVideoElement): PanoramaState {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return this.state();
    if (!this.frameW) {
      const k = Math.min(1, this.maxOutH / vh);
      this.frameW = Math.round(vw * k);
      this.frameH = Math.round(vh * k);
      this.scale = this.frameW / ANALYSIS_W;
      this.analysis.width = ANALYSIS_W;
      this.analysis.height = Math.max(8, Math.round((ANALYSIS_W * vh) / vw));
    }
    const aw = this.analysis.width;
    const ah = this.analysis.height;
    const actx = this.analysis.getContext('2d', { willReadFrequently: true });
    if (!actx) return this.state();
    actx.drawImage(video, 0, 0, aw, ah);
    const px = actx.getImageData(0, 0, aw, ah).data;
    const luma = new Uint8Array(aw * ah);
    for (let i = 0; i < luma.length; i++) luma[i] = (px[i * 4] * 77 + px[i * 4 + 1] * 150 + px[i * 4 + 2] * 29) >> 8;

    if (!this.prevLuma) {
      // the very first frame: its middle slice seeds the picture
      this.prevLuma = luma;
      this.paste(video, 0, 0, Math.round(this.frameW * 0.5), 0);
      return this.state();
    }

    const r = estimateShift(this.prevLuma, luma, aw, ah, Math.floor(aw * 0.4));
    if (r.cost > 28) {
      // frames did not line up: skip this one, keep the old reference so the next frame can still match it
      this.bad++;
      return this.state();
    }
    this.bad = 0;
    this.prevLuma = luma;
    this.pendX += r.dx * this.scale;
    this.pendY += r.dy * this.scale;
    if (Math.abs(this.pendX) >= MIN_PASTE_PX) {
      const dir: -1 | 1 = this.pendX > 0 ? 1 : -1;
      // one direction per panorama: the first real movement decides it; the other way is ignored
      if (this.direction === 0) this.direction = dir;
      if (dir === this.direction) {
        const dx = Math.round(this.pendX);
        const dy = Math.round(this.pendY);
        this.x += dx;
        this.y += dy;
        this.pendX = 0;
        this.pendY = 0;
        this.paste(video, this.x, this.y, Math.abs(dx), dx);
      } else {
        this.pendX = 0;
        this.pendY = 0;
      }
    }
    return this.state();
  }

  private paste(video: HTMLVideoElement, px: number, py: number, width: number, dx: number): void {
    const W = this.frameW;
    const H = this.frameH;
    const sliceW = Math.max(2, width);
    // soft seam: extend the slice over the older side and fade that margin in, so neighbours blend instead of cutting
    const ov = dx !== 0 && W / 2 - sliceW >= 16 ? 16 : 0;
    const c = document.createElement('canvas');
    c.width = sliceW + ov;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) return;
    const vw = video.videoWidth;
    const k = vw / W;
    // dx > 0: the new area lies left of the frame's centre; dx < 0 (or the seed): right of it
    const sx = dx > 0 ? W / 2 - sliceW : W / 2;
    const srcX = dx > 0 ? sx - ov : sx;
    g.drawImage(video, srcX * k, 0, (sliceW + ov) * k, video.videoHeight, 0, 0, sliceW + ov, H);
    if (ov > 0) {
      const grad = g.createLinearGradient(0, 0, sliceW + ov, 0);
      const f = ov / (sliceW + ov);
      if (dx > 0) {
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(f, 'rgba(0,0,0,1)');
      } else {
        grad.addColorStop(1 - f, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      }
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = grad;
      g.fillRect(0, 0, sliceW + ov, H);
      g.globalCompositeOperation = 'source-over';
    }
    const dstX = px + srcX;
    this.slices.push({ x: dstX, y: py, canvas: c });
    this.minX = Math.min(this.minX, dstX);
    this.maxX = Math.max(this.maxX, dstX + sliceW + ov);
    this.minY = Math.min(this.minY, py);
    this.maxY = Math.max(this.maxY, py);
  }

  state(): PanoramaState {
    const widthPx = Math.max(0, this.maxX - this.minX);
    return { widthPx, slices: this.slices.length, direction: this.direction, tooFast: this.bad >= 2, full: widthPx >= MAX_OUTPUT_WIDTH };
  }

  /** Composes the stitched picture (cropped to the area every slice covers). null when there was no real sweep. */
  finish(quality = 0.9): string | null {
    const widthPx = this.maxX - this.minX;
    // a sweep shorter than about one frame is not a panorama
    if (this.slices.length < 3 || widthPx < this.frameW * 0.8) {
      this.dispose();
      return null;
    }
    const top = this.maxY; // rows every slice has: [maxY, minY + H)
    const bottom = this.minY + this.frameH;
    const outH = Math.max(8, bottom - top);
    const out = document.createElement('canvas');
    out.width = widthPx;
    out.height = outH;
    const g = out.getContext('2d');
    if (!g) {
      this.dispose();
      return null;
    }
    for (const s of this.slices) g.drawImage(s.canvas, s.x - this.minX, s.y - top);
    const url = out.toDataURL('image/jpeg', quality);
    out.width = 0;
    this.dispose();
    return url;
  }

  dispose(): void {
    for (const s of this.slices) s.canvas.width = 0;
    this.slices = [];
    this.prevLuma = null;
    this.analysis.width = 0;
  }
}
