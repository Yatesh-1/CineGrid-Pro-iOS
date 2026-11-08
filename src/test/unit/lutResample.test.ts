import { describe, it, expect } from 'vitest';
import { resampleLut, maxLutSizeFor } from '../../utils/lutResample';

function identity(n: number): Float32Array {
  const d = new Float32Array(n * n * n * 3);
  let i = 0;
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    d[i++] = r / (n - 1);
    d[i++] = g / (n - 1);
    d[i++] = b / (n - 1);
  }
  return d;
}

describe('resampleLut', () => {
  it('keeps an identity LUT an identity at a smaller size', () => {
    const small = resampleLut(identity(65), 65, 33);
    const ref = identity(33);
    expect(small.length).toBe(ref.length);
    for (let i = 0; i < ref.length; i++) expect(small[i]).toBeCloseTo(ref[i], 5);
  });

  it('preserves a grade: warm gain survives the reduction', () => {
    const n = 65;
    const d = identity(n).map((v, i) => (i % 3 === 0 ? Math.min(1, v * 1.1) : v));
    const s = resampleLut(Float32Array.from(d), n, 17);
    const last = (17 * 17 * 17 - 1) * 3;
    expect(s[last]).toBeCloseTo(1, 5); // white stays at the end
    const mid = (8 + 8 * 17 + 8 * 17 * 17) * 3; // grey 0.5 -> red 0.55
    expect(s[mid]).toBeCloseTo(0.55, 2);
    expect(s[mid + 1]).toBeCloseTo(0.5, 2);
  });

  it('returns the same table when no reduction is needed', () => {
    const d = identity(17);
    expect(resampleLut(d, 17, 33)).toBe(d);
  });
});

describe('maxLutSizeFor', () => {
  it('keeps the strip within the texture limit', () => {
    expect(maxLutSizeFor(4096)).toBe(64);
    expect(maxLutSizeFor(2048)).toBe(45);
    expect(45 * 45).toBeLessThanOrEqual(2048);
    expect(maxLutSizeFor(16384)).toBe(64);
  });
});
