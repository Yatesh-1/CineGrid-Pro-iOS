import { describe, it, expect } from 'vitest';
import { isoStops, shutterSeconds, shutterStops, softwareExposureStops, MAX_SOFTWARE_STOPS } from '../../utils/softwareExposure';
import { DEFAULT_PRO_SETTINGS } from '../../data/defaultSettings';
import type { ProSettings } from '../../types/camera';

const base = (patch: Partial<ProSettings>): ProSettings => ({ ...DEFAULT_PRO_SETTINGS, ...patch });
const none = { iso: false, shutter: false };

describe('software ISO and shutter', () => {
  it('ISO 100 is neutral; each doubling is one stop', () => {
    expect(isoStops(100)).toBeCloseTo(0);
    expect(isoStops(200)).toBeCloseTo(1);
    expect(isoStops(800)).toBeCloseTo(3);
    expect(isoStops(50)).toBeCloseTo(-1);
  });

  it('1/60 s is neutral; slower is brighter, faster is darker', () => {
    expect(shutterStops(1 / 60)).toBeCloseTo(0);
    expect(shutterStops(1 / 30)).toBeCloseTo(1);
    expect(shutterStops(1 / 120)).toBeCloseTo(-1);
  });

  it('reads speeds like "1/48", plain seconds, and shutter angle at a frame rate', () => {
    const s = (p: Partial<ProSettings>) => shutterSeconds(base(p));
    expect(s({ shutterMode: 'speed', shutterSpeed: '1/48' })).toBeCloseTo(1 / 48);
    expect(s({ shutterMode: 'speed', shutterSpeed: '0.5' })).toBe(0.5);
    expect(s({ shutterMode: 'speed', shutterSpeed: '2s' })).toBe(2);
    expect(s({ shutterMode: 'angle', shutterAngle: 180, videoFps: 24 })).toBeCloseTo(1 / 48);
    expect(s({ shutterMode: 'speed', shutterSpeed: 'junk' })).toBeNull();
  });

  it('adds ISO and shutter stops only when they are manual and the camera did not apply them', () => {
    const manual = base({ isoAuto: false, iso: 400, shutterAuto: false, shutterMode: 'speed', shutterSpeed: '1/30' });
    expect(softwareExposureStops(manual, none)).toBeCloseTo(3); // 2 stops ISO + 1 stop shutter
    expect(softwareExposureStops(manual, { iso: true, shutter: false })).toBeCloseTo(1);
    expect(softwareExposureStops(manual, { iso: false, shutter: true })).toBeCloseTo(2);
    expect(softwareExposureStops(manual, { iso: true, shutter: true })).toBe(0);
  });

  it('does nothing on AUTO', () => {
    expect(softwareExposureStops(base({ isoAuto: true, shutterAuto: true, iso: 6400 }), none)).toBe(0);
  });

  it('is limited to a sane range', () => {
    const extreme = base({ isoAuto: false, iso: 12800, shutterAuto: false, shutterMode: 'speed', shutterSpeed: '2' });
    expect(softwareExposureStops(extreme, none)).toBe(MAX_SOFTWARE_STOPS);
    const dark = base({ isoAuto: false, iso: 50, shutterAuto: false, shutterMode: 'speed', shutterSpeed: '1/8000' });
    expect(softwareExposureStops(dark, none)).toBe(-MAX_SOFTWARE_STOPS);
  });

  it('survives bad input without NaN', () => {
    expect(isoStops(0)).toBe(0);
    expect(shutterStops(null)).toBe(0);
    expect(Number.isNaN(softwareExposureStops(base({ isoAuto: false, iso: NaN, shutterAuto: false, shutterSpeed: 'x' }), none))).toBe(false);
  });
});
