import type { ProSettings } from '../types/camera';

/**
 * Maps professional camera settings onto the real camera track (MediaStreamTrack constraints).
 * A control counts as "applied" only if the track advertises it AND the browser accepted the change.
 * Anything else is reported as not applied so the UI never presents a software effect as hardware control.
 */

export interface Range {
  min: number;
  max: number;
  step?: number;
}

export interface ControlSupport {
  ev: Range | null;
  iso: Range | null;
  /** Exposure time range in the browser's unit (100 microseconds). */
  exposureTime: Range | null;
  colorTemperature: Range | null;
  focusDistance: Range | null;
  exposureModes: string[];
  whiteBalanceModes: string[];
  focusModes: string[];
  tapToFocus: boolean;
}

export interface AppliedControls {
  ev: boolean;
  iso: boolean;
  shutter: boolean;
  whiteBalance: boolean;
  focus: boolean;
}

export const NO_CONTROLS_APPLIED: AppliedControls = {
  ev: false,
  iso: false,
  shutter: false,
  whiteBalance: false,
  focus: false,
};

export const EXPOSURE_TIME_UNIT_SECONDS = 1e-4; // Image Capture reports exposureTime in 100 µs units

type Caps = Record<string, unknown>;

const asRange = (v: unknown): Range | null => {
  if (!v || typeof v !== 'object') return null;
  const r = v as { min?: number; max?: number; step?: number };
  return typeof r.min === 'number' && typeof r.max === 'number' ? { min: r.min, max: r.max, step: r.step } : null;
};
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function readSupport(track: MediaStreamTrack | null | undefined): ControlSupport {
  const caps = (track && typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}) as Caps;
  return {
    ev: asRange(caps.exposureCompensation),
    iso: asRange(caps.iso),
    exposureTime: asRange(caps.exposureTime),
    colorTemperature: asRange(caps.colorTemperature),
    focusDistance: asRange(caps.focusDistance),
    exposureModes: asList(caps.exposureMode),
    whiteBalanceModes: asList(caps.whiteBalanceMode),
    focusModes: asList(caps.focusMode),
    tapToFocus: Array.isArray(caps.pointsOfInterest) || caps.pointsOfInterest === true || 'pointsOfInterest' in caps,
  };
}

/** Exposure time in seconds for the current settings: 1/N shutter speed, or angle ÷ (360 × fps) in angle mode. */
export function shutterSeconds(s: Pick<ProSettings, 'shutterMode' | 'shutterSpeed' | 'shutterAngle' | 'videoFps' | 'captureMode'>): number | null {
  if (s.shutterMode === 'angle' || (s.captureMode === 'video' && s.shutterMode !== 'speed')) {
    const fps = Number(s.videoFps) || 24;
    return s.shutterAngle > 0 ? s.shutterAngle / (360 * fps) : null;
  }
  const m = /^1\/(\d+(?:\.\d+)?)$/.exec(s.shutterSpeed.trim());
  if (m) return 1 / Number(m[1]);
  const secs = Number(s.shutterSpeed.replace(/s$/, ''));
  return Number.isFinite(secs) && secs > 0 ? secs : null;
}

const clamp = (v: number, r: Range) => Math.min(r.max, Math.max(r.min, v));

type Set = Record<string, unknown>;

/**
 * `advanced` constraints are best-effort: browsers and Android WebView resolve applyConstraints even when
 * the camera ignores them. So after applying, read track.getSettings() and only report success when every
 * numeric value actually took effect. Otherwise the software fallback must do the work, or the setting
 * (brightness, ISO, white balance...) would silently have no effect on the preview or the saved photo.
 * `tolerance` is the control's step size (hardware snaps to it).
 */
async function tryApply(track: MediaStreamTrack, set: Set, tolerance = 0): Promise<boolean> {
  if (Object.keys(set).length === 0) return false;
  try {
    await track.applyConstraints({ advanced: [set] } as MediaTrackConstraints);
  } catch {
    return false;
  }
  const numeric = Object.entries(set).filter(([, v]) => typeof v === 'number') as [string, number][];
  if (numeric.length === 0) return true; // mode-only change (e.g. continuous focus): nothing numeric to verify
  if (typeof track.getSettings !== 'function') return false;
  const got = track.getSettings() as Record<string, unknown>;
  return numeric.every(([key, want]) => {
    const have = got[key];
    if (typeof have !== 'number') return false;
    return Math.abs(have - want) <= Math.max(0.1, 0.05 * Math.abs(want), tolerance);
  });
}

/**
 * AE lock. Phones report a stale/default exposure (e.g. 50 ms, ISO 100) while metering automatically, so freezing
 * "the current values" changed the picture drastically. Instead the lock is calibrated: it finds the manual
 * time + ISO whose picture is as bright as the auto-exposed one, then holds those.
 */
let lockedExposure: { time: number; iso: number } | null = null;
export const clearExposureLock = () => {
  lockedExposure = null;
};

/** Mean brightness (0-255) of the live preview, from a tiny downscaled frame. */
export function meanLuma(video: HTMLVideoElement | null | undefined): number | null {
  if (!video || video.videoWidth === 0) return null;
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 84;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  const out = sum / (d.length / 4);
  c.width = 0;
  c.height = 0;
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Returns true when a manual exposure matching the current auto brightness was found and is held. */
export async function calibrateExposureLock(track: MediaStreamTrack | null | undefined, video: HTMLVideoElement | null | undefined): Promise<boolean> {
  clearExposureLock();
  if (!track || !video) return false;
  const sup = readSupport(track);
  if (!sup.exposureModes.includes('manual') || !sup.iso || !sup.exposureTime) return false;
  const a = meanLuma(video);
  await sleep(120);
  const b = meanLuma(video);
  if (a === null || b === null) return false;
  const target = (a + b) / 2;
  const maxTime = Math.min(sup.exposureTime.max, 667); // keep handheld-safe (no slower than 1/15 s)
  let time = clamp(333, sup.exposureTime);
  let iso = clamp(400, sup.iso);
  let best: { time: number; iso: number; err: number } | null = null;
  for (let i = 0; i < 6; i++) {
    try {
      await track.applyConstraints({ advanced: [{ exposureMode: 'manual', exposureTime: time, iso }] } as unknown as MediaTrackConstraints);
    } catch {
      return false;
    }
    await sleep(500);
    const l = meanLuma(video);
    if (l === null) return false;
    const err = Math.abs(l - target);
    if (!best || err < best.err) best = { time, iso, err };
    if (err <= 3) break;
    // luma is gamma encoded: linear light scales roughly with luma^2.2
    const gain = Math.pow(Math.max(target, 1) / Math.max(l, 1), 2.2);
    const product = clamp(time * iso * gain, { min: sup.exposureTime.min * sup.iso.min, max: maxTime * sup.iso.max });
    time = clamp(Math.min(product / sup.iso.min, 333), { min: sup.exposureTime.min, max: maxTime });
    if (product / time > sup.iso.max) time = clamp(product / sup.iso.max, { min: sup.exposureTime.min, max: maxTime });
    iso = clamp(product / time, sup.iso);
  }
  if (!best || best.err > 25) {
    lockedExposure = null;
    return false;
  }
  lockedExposure = { time: best.time, iso: best.iso };
  // hold the best match found (the last probe is not necessarily the closest)
  try {
    await track.applyConstraints({ advanced: [{ exposureMode: 'manual', exposureTime: best.time, iso: best.iso }] } as unknown as MediaTrackConstraints);
  } catch {
    lockedExposure = null;
    return false;
  }
  return true;
}

/**
 * AF lock. Phones do not report the distance autofocus is using, so a lock cannot copy "the current value".
 * Instead the lock sweeps the focus range in manual mode, measures how sharp the centre of the picture is at each
 * step, and holds the sharpest one. If no step is clearly sharper than the rest the camera cannot be locked
 * (nothing to focus on, or a fixed-focus lens) and the lock reports failure instead of pretending.
 */
let lockedFocus: number | null = null;
/** true while the lock is "the camera's own single-shot autofocus has converged and is being left alone" */
let heldSingleShot = false;
export const clearFocusLock = () => {
  lockedFocus = null;
  heldSingleShot = false;
};

/** Sharpness of the central region: mean squared luma gradient on a small crop (higher = sharper). */
/** Region of interest in raw video coordinates, each 0..1 */
export interface FocusRoi {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function centreSharpness(video: HTMLVideoElement | null | undefined, roi?: FocusRoi | null): number | null {
  if (!video || video.videoWidth === 0) return null;
  const N = 96;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const r = roi ?? { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
  const sw = Math.max(16, video.videoWidth * r.w);
  const sh = Math.max(16, video.videoHeight * r.h);
  const sx = Math.min(video.videoWidth - sw, Math.max(0, video.videoWidth * r.x));
  const sy = Math.min(video.videoHeight - sh, Math.max(0, video.videoHeight * r.y));
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;
  const l = new Float32Array(N * N);
  let mean = 0;
  for (let i = 0; i < N * N; i++) {
    l[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    mean += l[i];
  }
  mean /= N * N;
  let g = 0;
  for (let y = 0; y < N - 1; y++) {
    for (let x = 0; x < N - 1; x++) {
      const dx = l[y * N + x + 1] - l[y * N + x];
      const dy = l[(y + 1) * N + x] - l[y * N + x];
      g += dx * dx + dy * dy;
    }
  }
  c.width = 0;
  c.height = 0;
  // normalised by brightness so a changing exposure during the sweep does not look like a change in sharpness
  return g / ((N - 1) * (N - 1)) / Math.pow(mean + 12, 2);
}

/**
 * Locks focus on the subject by measuring, not guessing. Two ways to hold focus exist on a phone, and neither is
 * always better, so both are tried on the real picture (sharpness inside `roi`: the detected subject or the centre)
 * and the sharper result is kept:
 *
 *   A. the camera's own single-shot autofocus (no range limit; the lens is then left alone);
 *   B. a manual sweep of the focus range the web exposes (often only about 8 to 20 cm), coarse then fine, with a
 *      parabola through the peak, held as a fixed distance.
 *
 * On the test phone the single-shot result was far less sharp than the best manual step for a close subject, and the
 * manual range cannot reach far subjects at all, which is why one fixed method was unreliable. A lock that is not
 * clearly sharper than a typical step is refused rather than faked.
 */
export async function calibrateFocusLock(
  track: MediaStreamTrack | null | undefined,
  video: HTMLVideoElement | null | undefined,
  roi?: FocusRoi | null,
  deps?: { sharpness?: (v: HTMLVideoElement, r?: FocusRoi | null) => number | null; sleep?: (ms: number) => Promise<void> }
): Promise<boolean> {
  const sharp = deps?.sharpness ?? centreSharpness;
  const wait = deps?.sleep ?? sleep;
  lockedFocus = null;
  heldSingleShot = false;
  if (!track || !video) return false;
  const sup = readSupport(track);
  const canSingle = sup.focusModes.includes('single-shot');
  const range = sup.focusDistance;
  const canManual = sup.focusModes.includes('manual') && !!range && range.max > range.min;
  if (!canSingle && !canManual) return false;

  const grab = async (n = 3, gap = 60): Promise<number | null> => {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const s = sharp(video, roi);
      if (s === null) return null;
      sum += s;
      if (k < n - 1) await wait(gap);
    }
    return sum / n;
  };
  const triggerSingle = async (): Promise<boolean> => {
    const adv: Record<string, unknown> = { focusMode: 'single-shot' };
    // phones that cannot take a focus point still focus once on their default area (the centre)
    if (sup.tapToFocus) adv.pointsOfInterest = [{ x: roi ? roi.x + roi.w / 2 : 0.5, y: roi ? roi.y + roi.h / 2 : 0.5 }];
    try {
      await track.applyConstraints({ advanced: [adv] } as unknown as MediaTrackConstraints);
      return true;
    } catch {
      return false;
    }
  };

  // What continuous autofocus had reached before anything was touched: a lock must never leave the picture clearly
  // blurrier than this (the old lock could end on a bad step and the whole picture went soft).
  const baseline = await grab(3, 80);

  // A. the camera's own autofocus, started from continuous focus
  let single: { s: number; steady: boolean } | null = null;
  if (canSingle && (await triggerSingle())) {
    await wait(1400); // the lens hunts, then settles
    const samples: number[] = [];
    for (let i = 0; i < 4; i++) {
      const s = sharp(video, roi);
      if (s === null) break;
      samples.push(s);
      await wait(200);
    }
    if (samples.length === 4) {
      const mean = samples.reduce((a, b) => a + b, 0) / 4;
      const sd = Math.sqrt(samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / 4);
      single = { s: mean, steady: mean > 0 && sd / mean < 0.3 };
    }
  }

  // B. manual sweep
  let manual: { d: number; s: number; median: number } | null = null;
  if (canManual && range) {
    const { min, max } = range;
    const measure = async (d: number): Promise<number | null> => {
      try {
        await track.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: d }] } as unknown as MediaTrackConstraints);
      } catch {
        return null;
      }
      await wait(380); // the lens needs time to move and a fresh frame to arrive
      return grab();
    };
    const STEPS = 7;
    const coarse: { d: number; s: number }[] = [];
    let failed = false;
    for (let i = 0; i < STEPS && !failed; i++) {
      const d = min + ((max - min) * i) / (STEPS - 1);
      const s = await measure(d);
      if (s === null) failed = true;
      else coarse.push({ d, s });
    }
    if (!failed) {
      let bi = 0;
      coarse.forEach((r, i) => {
        if (r.s > coarse[bi].s) bi = i;
      });
      const step = (max - min) / (STEPS - 1);
      const lo = Math.max(min, coarse[bi].d - step);
      const hi = Math.min(max, coarse[bi].d + step);
      const fine: { d: number; s: number }[] = [];
      for (let i = 0; i < 5 && !failed; i++) {
        const d = lo + ((hi - lo) * i) / 4;
        if (Math.abs(d - coarse[bi].d) < 1e-6) continue; // already measured
        const s = await measure(d);
        if (s === null) failed = true;
        else fine.push({ d, s });
      }
      if (!failed) {
        const all = [...coarse, ...fine].sort((a, b) => a.d - b.d);
        let k = 0;
        all.forEach((r, i) => {
          if (r.s > all[k].s) k = i;
        });
        let d = all[k].d;
        if (k > 0 && k < all.length - 1) {
          // parabola through the peak and its neighbours: a position between the measured steps
          const a = all[k - 1];
          const b = all[k];
          const c = all[k + 1];
          const denom = a.s - 2 * b.s + c.s;
          if (denom < 0) {
            const t = (0.5 * (a.s - c.s)) / denom;
            d = b.d + t * (t < 0 ? b.d - a.d : c.d - b.d);
          }
        }
        d = Math.min(max, Math.max(min, d));
        const sorted = coarse.map((r) => r.s).sort((x, y) => x - y);
        manual = { d, s: all[k].s, median: sorted[Math.floor(sorted.length / 2)] };
      }
    }
  }

  const notBlurrier = (s: number) => baseline === null || baseline <= 0 || s >= 0.6 * baseline;
  const manualOk = manual !== null && manual.median > 0 && manual.s / manual.median >= 1.15 && notBlurrier(manual.s);
  const singleOk = single !== null && single.steady && single.s > 0 && notBlurrier(single.s);
  console.info(
    `[perf] focus lock: single-shot ${single ? (single.s * 1000).toFixed(1) + (single.steady ? '' : ' (unsteady)') : 'n/a'}, ` +
      `manual ${manual ? (manual.s * 1000).toFixed(1) + ' at ' + manual.d.toFixed(3) + (manualOk ? '' : ' (not clearly sharper than the rest)') : 'n/a'}`
  );

  // C. keep whichever really is sharper
  if (singleOk && single && (!manualOk || !manual || single.s >= 0.85 * manual.s)) {
    // trigger again (the sweep left the lens in manual mode) and verify that it settles about as sharp as before
    if (await triggerSingle()) {
      await wait(1400);
      const again = await grab(4, 150);
      if (again !== null && again >= 0.7 * single.s) {
        heldSingleShot = true;
        return true;
      }
    }
  }
  if (manualOk && manual) {
    const check = await (async () => {
      try {
        await track.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: manual.d }] } as unknown as MediaTrackConstraints);
      } catch {
        return null;
      }
      await wait(400);
      return grab();
    })();
    if (check !== null && check >= manual.s * 0.8) {
      lockedFocus = manual.d;
      return true;
    }
  }
  return false;
}

/**
 * ISO priority / shutter priority. The web camera only has "automatic" or "everything manual", so fixing just the ISO
 * (shutter on Auto) used to leave the shutter at a stale value and the picture went black. Instead the free value is
 * calibrated: the one that makes the picture as bright as the auto-exposed one. Only meaningful when exactly one of
 * ISO / shutter is fixed.
 */
let semiFill: { key: string; time: number | null; iso: number | null } | null = null;
export const clearSemiAuto = () => {
  semiFill = null;
};
export function semiAutoKey(s: ProSettings): string | null {
  const secs = !s.shutterAuto ? shutterSeconds(s) : null;
  const isoFixed = !s.isoAuto;
  const timeFixed = secs !== null;
  if (isoFixed === timeFixed) return null; // both automatic or both fixed: nothing to balance
  return `${isoFixed ? `iso${s.iso}` : 'auto'}|${timeFixed ? `t${secs}` : 'auto'}`;
}

export async function calibrateSemiAuto(track: MediaStreamTrack | null | undefined, video: HTMLVideoElement | null | undefined, s: ProSettings): Promise<boolean> {
  semiFill = null;
  const key = semiAutoKey(s);
  if (!key || !track || !video) return false;
  const sup = readSupport(track);
  if (!sup.exposureModes.includes('manual') || !sup.iso || !sup.exposureTime) return false;
  try {
    await track.applyConstraints({ advanced: [{ exposureMode: 'continuous' }] } as unknown as MediaTrackConstraints);
  } catch {
    return false;
  }
  await sleep(900);
  const a = meanLuma(video);
  await sleep(120);
  const b = meanLuma(video);
  if (a === null || b === null) return false;
  const target = (a + b) / 2;
  const isoFixed = !s.isoAuto;
  const secs = shutterSeconds(s);
  let iso = isoFixed ? clamp(s.iso, sup.iso) : clamp(400, sup.iso);
  let time = !isoFixed && secs ? clamp(secs / EXPOSURE_TIME_UNIT_SECONDS, sup.exposureTime) : clamp(333, sup.exposureTime);
  const maxTime = Math.min(sup.exposureTime.max, 1000);
  let best: { iso: number; time: number; err: number } | null = null;
  for (let i = 0; i < 6; i++) {
    try {
      await track.applyConstraints({ advanced: [{ exposureMode: 'manual', exposureTime: time, iso }] } as unknown as MediaTrackConstraints);
    } catch {
      return false;
    }
    await sleep(500);
    const l = meanLuma(video);
    if (l === null) return false;
    const err = Math.abs(l - target);
    if (!best || err < best.err) best = { iso, time, err };
    if (err <= 3) break;
    const gain = Math.pow(Math.max(target, 1) / Math.max(l, 1), 2.2);
    const before = isoFixed ? time : iso;
    if (isoFixed) time = clamp(time * gain, { min: sup.exposureTime.min, max: maxTime });
    else iso = clamp(iso * gain, sup.iso);
    if ((isoFixed ? time : iso) === before) break; // hit the camera's limit: it is as bright as that setting allows
  }
  if (!best) return false;
  semiFill = { key, time: isoFixed ? best.time : null, iso: isoFixed ? null : best.iso };
  console.info(`[perf] ${isoFixed ? 'ISO' : 'shutter'} priority: target luma ${target.toFixed(0)}, held ISO ${best.iso} / time ${best.time} (error ${best.err.toFixed(0)})`);
  return true;
}

/** Applies exposure, white balance and focus; resolves with exactly what the hardware accepted. */
export async function applyProSettings(track: MediaStreamTrack | null | undefined, s: ProSettings): Promise<AppliedControls> {
  const applied: AppliedControls = { ...NO_CONTROLS_APPLIED };
  if (!track || typeof track.applyConstraints !== 'function') return applied;
  const sup = readSupport(track);

  // --- Exposure -------------------------------------------------------------------------------
  // A locked exposure only holds once calibration has found its manual values (until then the camera stays automatic).
  const lockHolds = Boolean(s.exposureLocked) && lockedExposure !== null;
  const semiKey = semiAutoKey(s);
  const semiReady = semiKey !== null && semiFill?.key === semiKey;
  const fullManual = !s.isoAuto && !s.shutterAuto && shutterSeconds(s) !== null;
  const manualExposure = (fullManual || semiReady || lockHolds) && sup.exposureModes.includes('manual');
  if (manualExposure) {
    const set: Set = { exposureMode: 'manual' };
    const curIso = lockedExposure ? lockedExposure.iso : null;
    const curTime = lockedExposure ? lockedExposure.time : null;
    const freeze = lockHolds;
    const isoValue = !s.isoAuto ? s.iso : freeze ? curIso : semiReady ? semiFill!.iso : null;
    const wantIso = isoValue !== null && sup.iso ? sup.iso : null;
    const secs = !s.shutterAuto ? shutterSeconds(s) : null;
    const timeValue = secs ? secs / EXPOSURE_TIME_UNIT_SECONDS : s.shutterAuto && freeze ? curTime : semiReady ? semiFill!.time : null;
    const wantTime = timeValue !== null && sup.exposureTime ? sup.exposureTime : null;
    if (wantIso) set.iso = clamp(isoValue as number, wantIso);
    if (wantTime) set.exposureTime = clamp(timeValue as number, wantTime);
    if (await tryApply(track, set)) {
      applied.iso = Boolean(wantIso);
      applied.shutter = Boolean(wantTime);
    }
  } else if (sup.exposureModes.includes('continuous')) {
    await tryApply(track, { exposureMode: 'continuous' });
  }
  // Exposure compensation only has an effect while the camera is metering automatically.
  if (sup.ev && !manualExposure) {
    applied.ev = await tryApply(track, { exposureCompensation: clamp(s.ev, sup.ev) }, sup.ev.step ?? 0);
  }

  // --- White balance --------------------------------------------------------------------------
  if (s.wbAuto) {
    if (sup.whiteBalanceModes.includes('continuous')) await tryApply(track, { whiteBalanceMode: 'continuous' });
  } else if (sup.whiteBalanceModes.includes('manual') && sup.colorTemperature) {
    applied.whiteBalance = await tryApply(track, {
      whiteBalanceMode: 'manual',
      colorTemperature: clamp(s.whiteBalance, sup.colorTemperature),
    });
  }

  // --- Focus ----------------------------------------------------------------------------------
  if (s.focusMode === 'manual' || s.focusLocked || s.focusLock) {
    if (s.focusMode === 'manual' && sup.focusModes.includes('manual') && sup.focusDistance) {
      const d = sup.focusDistance;
      // manualFocus: 0 = nearest, 1 = infinity (the far end of the range)
      applied.focus = await tryApply(track, { focusMode: 'manual', focusDistance: d.min + (d.max - d.min) * s.manualFocus });
    } else if (s.focusMode !== 'manual' && heldSingleShot) {
      // AF lock by single-shot: the lens already sits where autofocus put it; sending another focus constraint would
      // re-trigger autofocus and lose the lock, so nothing is applied here.
      applied.focus = true;
    } else if (s.focusMode !== 'manual' && lockedFocus !== null && sup.focusModes.includes('manual')) {
      // AF lock: hold the focus position found by calibrateFocusLock (the sharpest one measured from the picture)
      applied.focus = await tryApply(track, { focusMode: 'manual', focusDistance: lockedFocus });
    } else if (s.focusMode !== 'manual' && sup.focusModes.includes('continuous')) {
      // lock requested but not calibrated (yet, or not possible): keep autofocus running rather than a fake lock
      await tryApply(track, { focusMode: 'continuous' });
    }
  } else if (sup.focusModes.includes('continuous')) {
    applied.focus = await tryApply(track, { focusMode: 'continuous' });
  }

  return applied;
}

/** Tap-to-focus: set the point of interest and let the camera focus there once (never switches to manual). */
export async function focusAtPoint(track: MediaStreamTrack | null | undefined, x: number, y: number): Promise<boolean> {
  if (!track) return false;
  const sup = readSupport(track);
  if (!sup.tapToFocus) return false;
  const set: Set = { pointsOfInterest: [{ x, y }] };
  if (sup.focusModes.includes('single-shot')) set.focusMode = 'single-shot';
  return tryApply(track, set);
}
