import { describe, it, expect, beforeEach } from 'vitest';
import { tintMatrix, setTintFilter, effectiveTint, TINT_FILTER_REF } from '../../utils/tintFilter';
import { getEffectiveCssFilter } from '../../utils/shaders';
import { CAMERA_FILTERS } from '../../data/presets';
import { DEFAULT_PRO_SETTINGS } from '../../data/defaultSettings';

const gains = (m: string) => m.trim().split(/\s+/).map(Number);

describe('tint filter', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<svg><filter id="cg-tint"><feColorMatrix id="cg-tint-matrix" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></svg>';
  });

  it('is the identity at 0', () => {
    const v = gains(tintMatrix(0));
    expect([v[0], v[6], v[12], v[18]]).toEqual([1, 1, 1, 1]);
  });

  it('positive tint raises green and lowers red/blue; negative does the opposite', () => {
    const green = gains(tintMatrix(50));
    expect(green[6]).toBeGreaterThan(1);
    expect(green[0]).toBeLessThan(1);
    expect(green[12]).toBeLessThan(1);
    const magenta = gains(tintMatrix(-50));
    expect(magenta[6]).toBeLessThan(1);
    expect(magenta[0]).toBeGreaterThan(1);
  });

  it('clamps out-of-range values', () => {
    expect(tintMatrix(500)).toBe(tintMatrix(50));
  });

  it('writes the matrix into the shared SVG filter', () => {
    setTintFilter(30);
    expect(document.getElementById('cg-tint-matrix')?.getAttribute('values')).toBe(tintMatrix(30));
  });

  it('adds the filter reference to the CSS filter only when a tint is set', () => {
    const f = CAMERA_FILTERS[0];
    expect(getEffectiveCssFilter(f, 100, { ...DEFAULT_PRO_SETTINGS, wbTint: 0, tint: 0 })).not.toContain(TINT_FILTER_REF);
    expect(getEffectiveCssFilter(f, 100, { ...DEFAULT_PRO_SETTINGS, wbTint: 20 })).toContain(TINT_FILTER_REF);
  });

  it('reads the tint from either field', () => {
    expect(effectiveTint({ wbTint: 7 })).toBe(7);
    expect(effectiveTint({ tint: 9, wbTint: 7 })).toBe(9);
    expect(effectiveTint({})).toBe(0);
  });
});
