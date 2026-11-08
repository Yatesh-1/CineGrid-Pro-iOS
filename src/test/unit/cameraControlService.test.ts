import { describe, it, expect, vi } from 'vitest';
import {
  applyProSettings,
  focusAtPoint,
  readSupport,
  shutterSeconds,
  EXPOSURE_TIME_UNIT_SECONDS,
  NO_CONTROLS_APPLIED,
} from '../../services/cameraControlService';
import { DEFAULT_PRO_SETTINGS } from '../../data/defaultSettings';
import type { ProSettings } from '../../types/camera';

/** A fake track that records constraints and can reject chosen keys. */
function fakeTrack(caps: Record<string, unknown>, rejectKeys: string[] = [], honor = true) {
  const applied: Record<string, unknown>[] = [];
  const current: Record<string, unknown> = {};
  const track = {
    getCapabilities: () => caps,
    // A real camera reports back what it actually did; one that ignores constraints leaves this empty.
    getSettings: () => current,
    applyConstraints: vi.fn(async (c: { advanced?: Record<string, unknown>[] }) => {
      const set = c.advanced?.[0] ?? {};
      if (rejectKeys.some((k) => k in set)) throw new Error('OverconstrainedError');
      applied.push(set);
      if (honor) Object.assign(current, set);
    }),
  } as unknown as MediaStreamTrack;
  return { track, applied };
}

const FULL_CAPS = {
  exposureMode: ['continuous', 'manual'],
  exposureCompensation: { min: -2, max: 2, step: 0.1 },
  iso: { min: 50, max: 3200 },
  exposureTime: { min: 3, max: 2000 }, // 100 µs units
  whiteBalanceMode: ['continuous', 'manual'],
  colorTemperature: { min: 2500, max: 8000 },
  focusMode: ['continuous', 'single-shot', 'manual'],
  focusDistance: { min: 0.1, max: 10 },
  pointsOfInterest: [],
};

const settings = (patch: Partial<ProSettings>): ProSettings => ({ ...DEFAULT_PRO_SETTINGS, ...patch });

describe('readSupport', () => {
  it('reports only what the track advertises', () => {
    const s = readSupport(fakeTrack({ zoom: { min: 1, max: 4 } }).track);
    expect(s.iso).toBeNull();
    expect(s.exposureTime).toBeNull();
    expect(s.ev).toBeNull();
    expect(s.focusDistance).toBeNull();
  });

  it('handles a missing track', () => {
    expect(readSupport(null).iso).toBeNull();
  });
});

describe('shutterSeconds', () => {
  it('parses 1/N speeds', () => {
    expect(shutterSeconds(settings({ shutterMode: 'speed', shutterSpeed: '1/250' }))).toBeCloseTo(1 / 250, 8);
  });

  it('uses angle ÷ (360 × fps) in angle mode', () => {
    expect(shutterSeconds(settings({ shutterMode: 'angle', shutterAngle: 180, videoFps: 24 }))).toBeCloseTo(1 / 48, 8);
    expect(shutterSeconds(settings({ shutterMode: 'angle', shutterAngle: 172.8, videoFps: 24 }))).toBeCloseTo(172.8 / (360 * 24), 8);
  });
});

describe('applyProSettings on a fully capable camera', () => {
  it('applies manual ISO and shutter, converting seconds to 100 µs units', async () => {
    const { track, applied } = fakeTrack(FULL_CAPS);
    const res = await applyProSettings(track, settings({ isoAuto: false, iso: 800, shutterAuto: false, shutterMode: 'speed', shutterSpeed: '1/500' }));
    expect(res.iso).toBe(true);
    expect(res.shutter).toBe(true);
    const set = applied.find((a) => a.exposureMode === 'manual')!;
    expect(set.iso).toBe(800);
    expect(set.exposureTime).toBeCloseTo(1 / 500 / EXPOSURE_TIME_UNIT_SECONDS, 6); // 20 units
  });

  it('clamps values to the hardware range', async () => {
    const { track, applied } = fakeTrack(FULL_CAPS);
    await applyProSettings(track, settings({ isoAuto: false, iso: 12800, shutterAuto: false, shutterMode: 'speed', shutterSpeed: '1/60' }));
    expect(applied.find((a) => 'iso' in a)!.iso).toBe(3200);
  });

  it('applies exposure compensation only while metering automatically', async () => {
    const auto = fakeTrack(FULL_CAPS);
    const resAuto = await applyProSettings(auto.track, settings({ isoAuto: true, shutterAuto: true, ev: 1.3 }));
    expect(resAuto.ev).toBe(true);
    expect(auto.applied.some((a) => a.exposureCompensation === 1.3)).toBe(true);

    const manual = fakeTrack(FULL_CAPS);
    const resManual = await applyProSettings(manual.track, settings({ isoAuto: false, iso: 400, shutterAuto: false, shutterMode: 'speed', shutterSpeed: '1/60', ev: 1.3 }));
    expect(resManual.ev).toBe(false);
  });

  it('keeps the camera automatic when only ISO is fixed, until the shutter has been balanced (no black picture)', async () => {
    const half = fakeTrack(FULL_CAPS);
    await applyProSettings(half.track, settings({ isoAuto: false, iso: 400, shutterAuto: true }));
    expect(half.applied.some((a) => a.exposureMode === 'manual')).toBe(false);
  });

  it('applies manual white balance in Kelvin and returns to continuous when auto', async () => {
    const m = fakeTrack(FULL_CAPS);
    const r = await applyProSettings(m.track, settings({ wbAuto: false, whiteBalance: 3200 }));
    expect(r.whiteBalance).toBe(true);
    expect(m.applied.some((a) => a.whiteBalanceMode === 'manual' && a.colorTemperature === 3200)).toBe(true);

    const a = fakeTrack(FULL_CAPS);
    await applyProSettings(a.track, settings({ wbAuto: true }));
    expect(a.applied.some((x) => x.whiteBalanceMode === 'continuous')).toBe(true);
  });

  it('maps manual focus 0..1 onto the focus distance range', async () => {
    const near = fakeTrack(FULL_CAPS);
    await applyProSettings(near.track, settings({ focusMode: 'manual', manualFocus: 0 }));
    expect(near.applied.find((x) => x.focusMode === 'manual')!.focusDistance).toBeCloseTo(0.1, 6);
    const far = fakeTrack(FULL_CAPS);
    const r = await applyProSettings(far.track, settings({ focusMode: 'manual', manualFocus: 1 }));
    expect(r.focus).toBe(true);
    expect(far.applied.find((x) => x.focusMode === 'manual')!.focusDistance).toBeCloseTo(10, 6);
  });
});

describe('honest reporting when the camera cannot do it', () => {
  it('a camera with no manual controls reports nothing applied', async () => {
    const { track, applied } = fakeTrack({ zoom: { min: 1, max: 4 } });
    const res = await applyProSettings(track, settings({ isoAuto: false, iso: 800, shutterAuto: false, wbAuto: false, focusMode: 'manual', ev: 1 }));
    expect(res).toEqual(NO_CONTROLS_APPLIED);
    expect(applied).toHaveLength(0);
  });

  it('if the browser rejects a constraint it is NOT reported as applied', async () => {
    const { track } = fakeTrack(FULL_CAPS, ['iso']);
    const res = await applyProSettings(track, settings({ isoAuto: false, iso: 800 }));
    expect(res.iso).toBe(false);
  });

  it('a camera that accepts constraints but ignores them is NOT reported as applied (software must take over)', async () => {
    const { track } = fakeTrack(FULL_CAPS, [], false);
    const res = await applyProSettings(track, settings({ isoAuto: true, shutterAuto: true, ev: 1.5, wbAuto: false, whiteBalance: 3200 }));
    expect(res.ev).toBe(false);
    expect(res.whiteBalance).toBe(false);
  });

  it('survives a missing track', async () => {
    expect(await applyProSettings(null, settings({}))).toEqual(NO_CONTROLS_APPLIED);
  });
});

describe('focusAtPoint (tap to focus)', () => {
  it('focuses once at the point and never switches to manual focus', async () => {
    const { track, applied } = fakeTrack(FULL_CAPS);
    expect(await focusAtPoint(track, 0.3, 0.7)).toBe(true);
    expect(applied[0].pointsOfInterest).toEqual([{ x: 0.3, y: 0.7 }]);
    expect(applied[0].focusMode).toBe('single-shot');
  });

  it('returns false where tap-to-focus is unsupported', async () => {
    const { track } = fakeTrack({ zoom: { min: 1, max: 2 } });
    expect(await focusAtPoint(track, 0.5, 0.5)).toBe(false);
    expect(await focusAtPoint(null, 0.5, 0.5)).toBe(false);
  });
});
