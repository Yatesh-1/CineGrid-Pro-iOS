import { describe, it, expect } from 'vitest';
import { convert3dlToCube } from '../../utils/lut3dlConverter';
import { parseCubeFile, sampleLutAt } from '../../utils/cubeParser';

/** Identity 3DL: red changes slowest, blue fastest, 10-bit values. */
function identity3dl(size: number, maxVal = 1023): string {
  const mesh = Array.from({ length: size }, (_, i) => Math.round((i * maxVal) / (size - 1))).join(' ');
  const rows: string[] = [mesh];
  for (let r = 0; r < size; r++)
    for (let g = 0; g < size; g++)
      for (let b = 0; b < size; b++) {
        const v = (i: number) => Math.round((i * maxVal) / (size - 1));
        rows.push(`${v(r)} ${v(g)} ${v(b)}`);
      }
  return rows.join('\n');
}

describe('.3dl to .cube conversion', () => {
  it('converts an identity LUT so every lookup returns its input', () => {
    const res = convert3dlToCube(identity3dl(5), 'Identity');
    expect(res.success).toBe(true);
    expect(res.size).toBe(5);

    const parsed = parseCubeFile(res.cube!, 'identity.cube');
    expect(parsed.success).toBe(true);
    const { data, size } = parsed.lut!;
    for (const [r, g, b] of [[0, 0, 0], [1, 1, 1], [0.25, 0.5, 0.75], [1, 0, 0.5]]) {
      const [or, og, ob] = sampleLutAt(data, size, r, g, b);
      expect(or).toBeCloseTo(r, 2);
      expect(og).toBeCloseTo(g, 2);
      expect(ob).toBeCloseTo(b, 2);
    }
  });

  it('puts red/green/blue on the right axes (a red-only ramp stays red)', () => {
    // output = (r, 0, 0)
    const size = 3;
    const rows: string[] = [];
    for (let r = 0; r < size; r++) for (let g = 0; g < size; g++) for (let b = 0; b < size; b++) rows.push(`${r * 511} 0 0`);
    const res = convert3dlToCube(rows.join('\n'));
    const { data, size: s } = parseCubeFile(res.cube!, 'x.cube').lut!;
    const [or, og, ob] = sampleLutAt(data, s, 1, 0.3, 0.9);
    expect(or).toBeCloseTo(1, 2);
    expect(og).toBeCloseTo(0, 2);
    expect(ob).toBeCloseTo(0, 2);
  });

  it('detects 8, 10 and 12-bit scales', () => {
    for (const bits of [255, 1023, 4095]) {
      const res = convert3dlToCube(identity3dl(3, bits));
      const last = res.cube!.trim().split('\n').pop()!;
      expect(last).toBe('1.000000 1.000000 1.000000');
    }
  });

  it('rejects files that are not a cube, are empty, or are malformed', () => {
    expect(convert3dlToCube('').success).toBe(false);
    expect(convert3dlToCube('1 2 3\n4 5 6\n7 8 9').success).toBe(false);
    expect(convert3dlToCube('a b c').success).toBe(false);
    expect(convert3dlToCube('0 1 2 3\n0 0 0\n1 1 1').error).toBeTruthy();
  });
});
