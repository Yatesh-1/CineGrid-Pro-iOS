import { describe, it, expect } from 'vitest';
import {
  pickNativeCamera,
  stillSupportFor,
  NO_STILL_SUPPORT,
  type NativeCapabilities,
  type NativeCameraInfo,
} from '../../services/nativeCameraService';

const cam = (patch: Partial<NativeCameraInfo>): NativeCameraInfo => ({
  id: '0',
  facing: 'back',
  hardwareLevel: 'FULL',
  raw: true,
  manualSensor: true,
  burstCapture: true,
  backwardCompatible: true,
  sensorOrientation: 90,
  maxDigitalZoom: 4,
  jpegWidth: 4000,
  jpegHeight: 3000,
  ...patch,
});

const caps = (cameras: NativeCameraInfo[], enc = false): NativeCapabilities => ({
  cameras,
  hevcEncoder: enc,
  heicEncoder: enc,
  androidSdk: 30,
});

describe('native camera capability decisions', () => {
  it('reports nothing supported until capabilities are known', () => {
    expect(stillSupportFor(null, 'back')).toEqual(NO_STILL_SUPPORT);
    expect(stillSupportFor(caps([]), 'back').known).toBe(false);
  });

  it('enables RAW, HDR and night only where the camera reports them', () => {
    const full = stillSupportFor(caps([cam({})]), 'back');
    expect(full).toMatchObject({ known: true, raw: true, hdr: true, night: true });
    const limited = stillSupportFor(caps([cam({ raw: false, manualSensor: false, burstCapture: false })]), 'back');
    expect(limited).toMatchObject({ raw: false, hdr: false, night: false });
  });

  it('never offers HEIF (not implemented), and says why', () => {
    expect(stillSupportFor(caps([cam({})], false), 'back').heifReason).toMatch(/no HEIF\/HEVC encoder/i);
    const withEncoder = stillSupportFor(caps([cam({})], true), 'back');
    expect(withEncoder.heif).toBe(false);
    expect(withEncoder.heifReason).toMatch(/not built into this app/i);
  });

  it('picks the camera for the requested facing with the largest JPEG, ignoring non-colour cameras', () => {
    const c = caps([
      cam({ id: '0', facing: 'back', jpegWidth: 3000, jpegHeight: 2000 }),
      cam({ id: '2', facing: 'back', jpegWidth: 4000, jpegHeight: 3000 }),
      cam({ id: '3', facing: 'back', jpegWidth: 6000, jpegHeight: 4000, backwardCompatible: false }),
      cam({ id: '1', facing: 'front', jpegWidth: 2000, jpegHeight: 1500 }),
    ]);
    expect(pickNativeCamera(c, 'back')?.id).toBe('2');
    expect(pickNativeCamera(c, 'front')?.id).toBe('1');
  });

  it('reports video frame-rate limits so unsupported rates are not offered', () => {
    const s = stillSupportFor(
      caps([cam({ videoSizes: [{ width: 3840, height: 2160, maxFps: 30 }], highSpeedMaxFps: 120 })]),
      'back'
    );
    expect(s.maxVideoFps).toBe(30);
    expect(s.highSpeedMaxFps).toBe(120);
  });
});
