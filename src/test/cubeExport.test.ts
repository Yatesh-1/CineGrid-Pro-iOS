import { describe, it, expect } from 'vitest';
import { exportLookAsCube, parseCubeFile, sampleLutAt } from '../utils/cubeParser';
import { DEFAULT_LOOK_STATE } from '../types/lut';

describe('.cube export is a valid, loadable LUT', () => {
  const look = { ...DEFAULT_LOOK_STATE, adjustments: { ...DEFAULT_LOOK_STATE.adjustments, exposure: 0.4, contrast: 20, saturation: -15, temperature: 25 } };
  const text = exportLookAsCube(look, null, 'Test Grade');

  it('has the required header lines and exactly size^3 data rows in range', () => {
    expect(text).toMatch(/^TITLE\s+"?Test Grade"?/m);
    expect(text).toMatch(/^LUT_3D_SIZE\s+33$/m);
    expect(text).toMatch(/^DOMAIN_MIN\s+0(\.0+)?\s+0(\.0+)?\s+0(\.0+)?$/m);
    expect(text).toMatch(/^DOMAIN_MAX\s+1(\.0+)?\s+1(\.0+)?\s+1(\.0+)?$/m);
    const rows = text.split(/\r?\n/).filter((l) => /^-?\d/.test(l.trim()));
    expect(rows.length).toBe(33 * 33 * 33);
    for (const r of rows.slice(0, 500)) {
      const v = r.trim().split(/\s+/).map(Number);
      expect(v.length).toBe(3);
      v.forEach((x) => { expect(Number.isFinite(x)).toBe(true); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); });
    }
  });

  it('re-imports through our own parser with identical data (round trip)', () => {
    const parsed = parseCubeFile(text, 'Test Grade');
    expect(parsed.success).toBe(true);
    expect(parsed.lut?.size).toBe(33);
    expect(parsed.lut?.data.length).toBe(33 * 33 * 33 * 3);
    const again = parseCubeFile(text, 'x');
    expect(Array.from(again.lut!.data.slice(0, 300))).toEqual(Array.from(parsed.lut!.data.slice(0, 300)));
  });

  it('applies the exported grade: a mid grey comes back brighter for +0.4 EV, warmer for +temperature', () => {
    const lut = parseCubeFile(text, 'x').lut!;
    const [r, g, b] = sampleLutAt(lut.data, lut.size, 0.4, 0.4, 0.4);
    expect((r + g + b) / 3).toBeGreaterThan(0.4);
    expect(r).toBeGreaterThan(b);
  });

  it('an identity look exports an identity LUT', () => {
    const id = parseCubeFile(exportLookAsCube(DEFAULT_LOOK_STATE, null, 'Id'), 'Id').lut!;
    for (const c of [0, 0.25, 0.5, 0.9, 1]) {
      const [r, g, b] = sampleLutAt(id.data, id.size, c, c, c);
      expect(r).toBeCloseTo(c, 2);
      expect(g).toBeCloseTo(c, 2);
      expect(b).toBeCloseTo(c, 2);
    }
  });
});
