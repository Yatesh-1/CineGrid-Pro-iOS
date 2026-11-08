import { describe, it, expect } from 'vitest';
import { estimateShift } from '../../services/panoramaService';

// a deterministic "scene": textured stripes and blobs, wide enough to slide a window across
function scene(width: number, h: number): Uint8Array {
  const s = new Uint8Array(width * h);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const noise = new Float32Array(width * h);
  for (let i = 0; i < noise.length; i++) noise[i] = rnd();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) {
      const v = 128 + 60 * Math.sin(x / 7) * Math.cos(y / 9) + 30 * (noise[y * width + x] - 0.5) + 40 * Math.sin(x / 31 + y / 17);
      s[y * width + x] = Math.max(0, Math.min(255, v));
    }
  }
  return s;
}

function window_(s: Uint8Array, sw: number, h: number, x0: number, y0: number, w: number, hh: number): Uint8Array {
  const out = new Uint8Array(w * hh);
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) out[y * w + x] = s[(y + y0) * sw + x + x0];
  return out;
}

describe('estimateShift', () => {
  const SW = 400;
  const H = 120;
  const W = 128;
  const world = scene(SW, H + 20);

  it('measures a pan to the right as a positive dx', () => {
    const a = window_(world, SW, H + 20, 50, 10, W, H);
    const b = window_(world, SW, H + 20, 50 + 17, 10, W, H); // camera moved right by 17 px
    const r = estimateShift(a, b, W, H, 50);
    expect(r.dx).toBe(17);
    expect(r.dy).toBe(0);
    expect(r.cost).toBeLessThan(2);
  });

  it('measures a pan to the left as a negative dx', () => {
    const a = window_(world, SW, H + 20, 120, 10, W, H);
    const b = window_(world, SW, H + 20, 120 - 23, 10, W, H);
    expect(estimateShift(a, b, W, H, 50).dx).toBe(-23);
  });

  it('also finds a small vertical drift', () => {
    const a = window_(world, SW, H + 20, 80, 10, W, H);
    const b = window_(world, SW, H + 20, 80 + 9, 10 + 4, W, H);
    const r = estimateShift(a, b, W, H, 50);
    expect(r.dx).toBe(9);
    expect(r.dy).toBe(4);
  });

  it('reports a poor match for unrelated frames', () => {
    const a = window_(world, SW, H + 20, 10, 10, W, H);
    const other = scene(W, H);
    other.forEach((_, i) => (other[i] = 255 - other[i]));
    expect(estimateShift(a, other, W, H, 50).cost).toBeGreaterThan(28);
  });
});
