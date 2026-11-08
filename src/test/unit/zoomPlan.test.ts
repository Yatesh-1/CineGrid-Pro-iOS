import { describe, it, expect } from 'vitest';
import { planZoom, zoomLimits, lensAbsorbedZoom } from '../../utils/zoomPlan';

describe('lensAbsorbedZoom (zoom must actually crop on single-lens and front cameras)', () => {
  it('ignores an "exact match" whose lens factor is not the requested zoom', () => {
    // webcam / selfie camera: reported exact for every request, factor 1
    expect(lensAbsorbedZoom(true, 1, 2)).toBeNull();
    expect(lensAbsorbedZoom(true, 1, 24)).toBeNull();
    expect(lensAbsorbedZoom(true, undefined, 5)).toBeNull();
  });

  it('lets the preview crop the full way when no lens absorbs the zoom', () => {
    const base = lensAbsorbedZoom(true, 1, 8) ?? 1;
    expect(planZoom(8, null, base).digitalScale).toBe(8);
    expect(planZoom(24, null, base).digitalScale).toBe(24);
  });

  it('accepts a real lens at its own factor', () => {
    expect(lensAbsorbedZoom(true, 3, 3)).toBe(3);
    expect(lensAbsorbedZoom(true, 0.5, 0.5)).toBe(0.5);
    expect(lensAbsorbedZoom(true, 1, 1)).toBe(1);
  });

  it('rejects a non-exact match even at the same factor', () => {
    expect(lensAbsorbedZoom(false, 1, 1)).toBeNull();
  });
});
import { currentPhotoUrl, editorBaseUrl, hasCaptureLook } from '../../utils/photoVersions';

describe('planZoom: hardware and digital zoom are never both applied to the same part', () => {
  it('uses only hardware zoom when the device can do it (no double zoom)', () => {
    const p = planZoom(2, { min: 1, max: 8 });
    expect(p.hardwareZoom).toBe(2);
    expect(p.digitalScale).toBe(1);
    expect(p.isDigital).toBe(false);
  });

  it('crops only the remainder beyond the hardware maximum', () => {
    const p = planZoom(5, { min: 1, max: 3 });
    expect(p.hardwareZoom).toBe(3);
    expect(p.digitalScale).toBeCloseTo(5 / 3, 5);
    expect(p.isDigital).toBe(true);
    expect(p.hardwareZoom! * p.digitalScale).toBeCloseTo(5, 5);
  });

  it('is fully digital when the device exposes no hardware zoom', () => {
    const p = planZoom(2, null);
    expect(p.hardwareZoom).toBeNull();
    expect(p.digitalScale).toBe(2);
    expect(p.isDigital).toBe(true);
  });

  it('never crops below 1 when asked to zoom out past what the hardware allows', () => {
    expect(planZoom(0.5, null).digitalScale).toBe(1);
    const p = planZoom(0.5, { min: 1, max: 4 });
    expect(p.hardwareZoom).toBe(1);
    expect(p.digitalScale).toBe(1);
  });

  it('a hardware range that reaches below 1 (ultra-wide via zoom) is used directly', () => {
    const p = planZoom(0.6, { min: 0.6, max: 10 });
    expect(p.hardwareZoom).toBeCloseTo(0.6, 5);
    expect(p.isDigital).toBe(false);
  });

  it('is relative to the active physical lens (3x telephoto at 3x needs no zoom)', () => {
    const atNative = planZoom(3, { min: 1, max: 4 }, 3);
    expect(atNative.hardwareZoom).toBe(1);
    expect(atNative.digitalScale).toBe(1);
    const beyond = planZoom(6, { min: 1, max: 4 }, 3);
    expect(beyond.hardwareZoom).toBe(2);
    expect(beyond.digitalScale).toBe(1);
  });

  it('is monotonic: more requested zoom never means less total magnification', () => {
    let last = 0;
    for (let z = 1; z <= 8; z += 0.25) {
      const p = planZoom(z, { min: 1, max: 3 });
      const total = (p.hardwareZoom ?? 1) * p.digitalScale;
      expect(total).toBeGreaterThanOrEqual(last - 1e-9);
      last = total;
    }
  });
});

describe('zoomLimits', () => {
  it('only offers zoom-out when it really changes the picture', () => {
    // no ultra-wide lens and no hardware zoom-out: 1x is the widest real view
    expect(zoomLimits(null, 1, false).min).toBe(1);
    expect(zoomLimits({ min: 1, max: 4 }, 1, false).min).toBe(1);
    // an ultra-wide lens gives 0.5x
    expect(zoomLimits(null, 1, true).min).toBe(0.5);
    // hardware that zooms out reports it in its own range
    expect(zoomLimits({ min: 0.6, max: 10 }, 1, false).min).toBe(0.6);
    expect(zoomLimits({ min: 0.3, max: 10 }, 1, false).min).toBe(0.3);
  });

  it('never crops below 1x, so 0.5x on a camera without an ultra-wide is the widest real view', () => {
    const plan = planZoom(0.5, null);
    expect(plan.digitalScale).toBe(1);
    expect(plan.isDigital).toBe(false);
  });

  it('allows digital zoom up to the given ceiling (24x by default), or the hardware maximum if higher', () => {
    expect(zoomLimits(null, 1, false).max).toBe(24);
    expect(zoomLimits(null, 1, false, 8).max).toBe(8);
    expect(zoomLimits({ min: 1, max: 12 }, 1, false, 8).max).toBe(12);
    expect(zoomLimits({ min: 1, max: 30 }, 1, false).max).toBe(30);
  });
});

describe('photo versions keep the original untouched', () => {
  const base = { dataUrl: 'original', lookDataUrl: undefined, editedDataUrl: undefined };

  it('shows the original when nothing else exists', () => {
    expect(currentPhotoUrl(base)).toBe('original');
    expect(editorBaseUrl(base)).toBe('original');
    expect(hasCaptureLook(base)).toBe(false);
  });

  it('editor AFTER starts from the capture look while BEFORE stays the original', () => {
    const p = { ...base, lookDataUrl: 'look' };
    expect(editorBaseUrl(p)).toBe('look');
    expect(p.dataUrl).toBe('original');
    expect(hasCaptureLook(p)).toBe(true);
  });

  it('a saved edit wins for display but never replaces the original', () => {
    const p = { dataUrl: 'original', lookDataUrl: 'look', editedDataUrl: 'edited' };
    expect(currentPhotoUrl(p)).toBe('edited');
    expect(p.dataUrl).toBe('original');
  });
});
