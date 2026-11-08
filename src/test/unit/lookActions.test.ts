import { describe, it, expect } from 'vitest';
import { clearLook, hasActiveLook } from '../../utils/lookActions';
import { DEFAULT_LOOK_STATE, type LookState } from '../../types/lut';
import { FS_PRECISION_HEADER } from '../../utils/webglLutPipeline';

const withLut: LookState = {
  ...DEFAULT_LOOK_STATE,
  activeLutId: 'lut_1',
  activeFilterId: 'film',
  lutIntensity: 70,
  isCompareActive: true,
  adjustments: { ...DEFAULT_LOOK_STATE.adjustments, exposure: 0.5 },
};

describe('look removal', () => {
  it('detects an active LUT or filter', () => {
    expect(hasActiveLook(DEFAULT_LOOK_STATE)).toBe(false);
    expect(hasActiveLook({ ...DEFAULT_LOOK_STATE, activeLutId: 'x' })).toBe(true);
    expect(hasActiveLook({ ...DEFAULT_LOOK_STATE, activeFilterId: 'x' })).toBe(true);
  });

  it('clears LUT, filter and compare in one step', () => {
    const cleared = clearLook(withLut);
    expect(cleared.activeLutId).toBeNull();
    expect(cleared.activeFilterId).toBeNull();
    expect(cleared.isCompareActive).toBe(false);
    expect(hasActiveLook(cleared)).toBe(false);
  });

  it('keeps manual adjustments and does not mutate the input', () => {
    const cleared = clearLook(withLut);
    expect(cleared.adjustments.exposure).toBe(0.5);
    expect(withLut.activeLutId).toBe('lut_1');
  });
});

describe('LUT shader precision', () => {
  it('asks for highp where available so the 1089-texel atlas is addressed exactly', () => {
    expect(FS_PRECISION_HEADER).toContain('GL_FRAGMENT_PRECISION_HIGH');
    expect(FS_PRECISION_HEADER).toContain('precision highp float');
    expect(FS_PRECISION_HEADER).toContain('precision mediump float');
  });
});
