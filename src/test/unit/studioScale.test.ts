import { describe, it, expect } from 'vitest';
import { isoFromPct, pctFromIso, shutterFromPct, pctFromShutter, shutterLabel, evFromPct, pctFromEv, focusFromPct, pctFromFocus, kelvinFromPct, clampPct } from '../../utils/studioScale';

describe('studioScale (1-100 sliders)', () => {
  it('maps the ends onto the camera range and never past it', () => {
    expect(isoFromPct(1, { min: 100, max: 6400 })).toBe(100);
    expect(isoFromPct(100, { min: 100, max: 6400 })).toBe(6400);
    expect(isoFromPct(0, { min: 100, max: 6400 })).toBe(100);
    expect(isoFromPct(500, { min: 100, max: 6400 })).toBe(6400);
    expect(evFromPct(1, { min: -2, max: 2 })).toBe(-2);
    expect(evFromPct(100, { min: -2, max: 2 })).toBe(2);
    expect(kelvinFromPct(1, { min: 2850, max: 7000 })).toBe(2850);
    expect(kelvinFromPct(100, { min: 2850, max: 7000 })).toBe(7000);
  });

  it('ISO is logarithmic: the middle is the geometric mean', () => {
    const mid = isoFromPct(50.5, { min: 100, max: 6400 });
    expect(mid).toBeGreaterThan(700);
    expect(mid).toBeLessThan(900);
  });

  it('round-trips value -> slider -> value', () => {
    const r = { min: 100, max: 6400 };
    for (const iso of [100, 200, 400, 800, 1600, 3200, 6400]) {
      expect(Math.abs(isoFromPct(pctFromIso(iso, r), r) - iso) / iso).toBeLessThan(0.05);
    }
    const sr = { min: 0.0001, max: 0.344 };
    for (const s of [0.001, 1 / 60, 0.1]) {
      expect(Math.abs(shutterFromPct(pctFromShutter(s, sr), sr) - s) / s).toBeLessThan(0.06);
    }
    expect(pctFromEv(0, { min: -2, max: 2 })).toBeGreaterThanOrEqual(50);
    expect(pctFromEv(0, { min: -2, max: 2 })).toBeLessThanOrEqual(51);
  });

  it('shutter slider goes from fastest to slowest and is labelled like a camera', () => {
    const r = { min: 1 / 8000, max: 1 };
    expect(shutterFromPct(1, r)).toBeCloseTo(1 / 8000, 6);
    expect(shutterFromPct(100, r)).toBeCloseTo(1, 6);
    expect(shutterLabel(1 / 250)).toBe('1/250');
    expect(shutterLabel(0.5)).toBe('0.5');
    expect(shutterLabel(2)).toBe('2.0');
  });

  it('focus is 0..1 and clamps', () => {
    expect(focusFromPct(1)).toBe(0);
    expect(focusFromPct(100)).toBe(1);
    expect(pctFromFocus(0.5)).toBeGreaterThanOrEqual(50);
    expect(clampPct(-5)).toBe(1);
    expect(clampPct(1e9)).toBe(100);
  });
});
