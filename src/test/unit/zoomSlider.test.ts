import { describe, it, expect } from 'vitest';
import {
  PHOTO_MAX_ZOOM,
  VIDEO_MAX_ZOOM,
  formatZoom,
  maxZoomFor,
  ratioToZoom,
  snapZoom,
  zoomStops,
  zoomToRatio,
} from '../../utils/zoomSlider';
import { planZoom, zoomLimits } from '../../utils/zoomPlan';

describe('zoom ceilings', () => {
  it('gives stills 24x and video 8x', () => {
    expect(PHOTO_MAX_ZOOM).toBe(24);
    expect(VIDEO_MAX_ZOOM).toBe(8);
    expect(maxZoomFor('photo')).toBe(24);
    expect(maxZoomFor('night')).toBe(24);
    expect(maxZoomFor('video')).toBe(8);
  });

  it('flows into the zoom limits used by the app', () => {
    expect(zoomLimits(null, 1, false, maxZoomFor('video'))).toEqual({ min: 1, max: 8 });
    expect(zoomLimits(null, 1, false, maxZoomFor('photo'))).toEqual({ min: 1, max: 24 });
    expect(zoomLimits(null, 1, true, maxZoomFor('video'))).toEqual({ min: 0.5, max: 8 });
    expect(zoomLimits(null, 1, true, maxZoomFor('photo'))).toEqual({ min: 0.5, max: 24 });
  });

  it('crops digitally for everything beyond the hardware range', () => {
    const plan = planZoom(24, { min: 1, max: 4 });
    expect(plan.hardwareZoom).toBe(4);
    expect(plan.digitalScale).toBeCloseTo(6);
    expect(plan.isDigital).toBe(true);
  });
});

describe('log zoom slider mapping', () => {
  it('maps the ends of the range to 0 and 1', () => {
    expect(zoomToRatio(0.5, 0.5, 24)).toBeCloseTo(0);
    expect(zoomToRatio(24, 0.5, 24)).toBeCloseTo(1);
  });

  it('round-trips values', () => {
    for (const z of [0.5, 1, 2, 3, 7.5, 12, 24]) {
      expect(ratioToZoom(zoomToRatio(z, 0.5, 24), 0.5, 24)).toBeCloseTo(z, 6);
    }
  });

  it('gives equal travel to equal magnification steps', () => {
    const a = zoomToRatio(2, 1, 16) - zoomToRatio(1, 1, 16);
    const b = zoomToRatio(16, 1, 16) - zoomToRatio(8, 1, 16);
    expect(a).toBeCloseTo(b, 6);
  });

  it('clamps out-of-range input', () => {
    expect(zoomToRatio(100, 1, 8)).toBe(1);
    expect(zoomToRatio(0.1, 1, 8)).toBe(0);
    expect(ratioToZoom(2, 1, 8)).toBeCloseTo(8);
    expect(ratioToZoom(-1, 1, 8)).toBeCloseTo(1);
  });

  it('survives a degenerate range', () => {
    expect(zoomToRatio(1, 1, 1)).toBe(0);
  });
});

describe('zoom formatting and stops', () => {
  it('snaps to 0.1x below 10x and whole numbers above', () => {
    expect(snapZoom(2.04)).toBe(2);
    expect(snapZoom(7.26)).toBe(7.3);
    expect(snapZoom(12.6)).toBe(13);
  });

  it('formats consistently with a lowercase x', () => {
    expect(formatZoom(1)).toBe('1x');
    expect(formatZoom(0.5)).toBe('0.5x');
    expect(formatZoom(7.3)).toBe('7.3x');
    expect(formatZoom(24)).toBe('24x');
  });

  it('only offers stops that fit the range', () => {
    expect(zoomStops(0.5, 8)).toEqual([0.5, 1, 2, 3, 5, 8]);
    expect(zoomStops(1, 24)).toEqual([1, 2, 3, 5, 8, 10, 15, 24]);
    expect(zoomStops(1, 1)).toEqual([1]);
  });
});
