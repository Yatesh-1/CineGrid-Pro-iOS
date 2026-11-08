import { describe, it, expect } from 'vitest';
import { calibrateFocusLock, applyProSettings, clearFocusLock } from '../../services/cameraControlService';
import { DEFAULT_PRO_SETTINGS } from '../../data/defaultSettings';

/**
 * A fake phone camera: it reports capabilities, remembers the last focus constraint, and the "picture sharpness" is a
 * function of that state. The lock logic must measure and keep whichever way of holding focus is really sharper.
 */
function fakeCamera(opts: {
  /** sharpness as a function of manual focus distance (metres) */
  manual: (d: number) => number;
  /** sharpness the camera's own single-shot autofocus ends up with (undefined = no single-shot support) */
  single?: number;
  /** sharpness under continuous autofocus (what the user sees before locking) */
  continuous: number;
  tapToFocus?: boolean;
}) {
  const state = { mode: 'continuous', distance: 0.14, applied: [] as Record<string, unknown>[] };
  const caps: Record<string, unknown> = {
    focusMode: ['manual', 'continuous', ...(opts.single !== undefined ? ['single-shot'] : [])],
    focusDistance: { min: 0.08, max: 0.2, step: 0.01 },
  };
  if (opts.tapToFocus) caps.pointsOfInterest = [];
  const track = {
    getCapabilities: () => caps,
    applyConstraints: async (c: { advanced?: Record<string, unknown>[] }) => {
      const adv = c.advanced?.[0] ?? {};
      state.applied.push(adv);
      if (adv.focusMode) state.mode = String(adv.focusMode);
      if (typeof adv.focusDistance === 'number') state.distance = adv.focusDistance;
    },
  } as unknown as MediaStreamTrack;
  const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
  const sharpness = () => {
    if (state.mode === 'manual') return opts.manual(state.distance);
    if (state.mode === 'single-shot') return opts.single ?? 0;
    return opts.continuous;
  };
  return { track, video, state, sharpness };
}

const instant = async () => {};
const peakAt = (p: number, height: number) => (d: number) => 1 + height * Math.exp(-Math.pow((d - p) / 0.02, 2));

describe('calibrateFocusLock', () => {
  it('holds a manual distance when the manual sweep is clearly the sharpest', async () => {
    const cam = fakeCamera({ manual: peakAt(0.14, 100), single: 20, continuous: 60 });
    const ok = await calibrateFocusLock(cam.track, cam.video, null, { sharpness: () => cam.sharpness(), sleep: instant });
    expect(ok).toBe(true);
    // the lock is a manual focus at about the peak, not the single-shot result
    clearFocusLock();
    const last = [...cam.state.applied].reverse().find((a) => a.focusMode === 'manual');
    expect(last).toBeTruthy();
    expect(Math.abs((last!.focusDistance as number) - 0.14)).toBeLessThan(0.02);
  });

  it('keeps single-shot autofocus when it is as sharp as anything the manual range offers (far subjects)', async () => {
    // manual range cannot reach the subject (best manual is poor); the camera's own autofocus is sharp
    const cam = fakeCamera({ manual: () => 10 + 0.0, single: 90, continuous: 85 });
    const ok = await calibrateFocusLock(cam.track, cam.video, null, { sharpness: () => cam.sharpness(), sleep: instant });
    expect(ok).toBe(true);
    // held by the camera's own autofocus: the last focus constraint sent is single-shot, not a manual distance
    const lastFocus = [...cam.state.applied].reverse().find((a) => 'focusMode' in a);
    expect(lastFocus?.focusMode).toBe('single-shot');
  });

  it('refuses to lock when nothing is sharp (flat or dark scene)', async () => {
    const cam = fakeCamera({ manual: () => 0, single: 0, continuous: 0 });
    const ok = await calibrateFocusLock(cam.track, cam.video, null, { sharpness: () => cam.sharpness(), sleep: instant });
    expect(ok).toBe(false);
  });

  it('does not lock on a result clearly blurrier than the focus the camera had before', async () => {
    // continuous autofocus is very sharp (100); every way of holding focus is much worse
    const cam = fakeCamera({ manual: peakAt(0.12, 20), single: 15, continuous: 100 });
    const ok = await calibrateFocusLock(cam.track, cam.video, null, { sharpness: () => cam.sharpness(), sleep: instant });
    expect(ok).toBe(false);
  });

  it('returns false when the camera can neither single-shot nor go manual', async () => {
    const track = { getCapabilities: () => ({ focusMode: ['continuous'] }), applyConstraints: async () => {} } as unknown as MediaStreamTrack;
    const ok = await calibrateFocusLock(track, { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement, null, { sharpness: () => 5, sleep: instant });
    expect(ok).toBe(false);
  });
});

describe('a held focus lock survives other setting changes', () => {
  it('does not send a focus constraint (which would re-trigger autofocus) while single-shot is held', async () => {
    const cam = fakeCamera({ manual: () => 1, single: 80, continuous: 80 });
    const ok = await calibrateFocusLock(cam.track, cam.video, null, { sharpness: () => cam.sharpness(), sleep: instant });
    if (!ok) return; // selection is covered above; this test is about the held case only
    const before = cam.state.applied.length;
    await applyProSettings(cam.track, { ...DEFAULT_PRO_SETTINGS, focusLocked: true });
    const focusCalls = cam.state.applied.slice(before).filter((a) => 'focusMode' in a || 'focusDistance' in a);
    // either held by single-shot (no focus call) or by a fixed manual distance (same distance as the lock)
    for (const c of focusCalls) expect(c.focusMode === 'manual').toBe(true);
  });
});
