// CineGrid Pro — Night Capture Service Unit Tests

import { describe, it, expect, beforeEach } from 'vitest';
import { nightCaptureService } from '../../services/nightCaptureService';

describe('NightCaptureService Unit Tests', () => {
  beforeEach(() => {
    nightCaptureService.cancelCapture();
  });

  it('correctly queries hardware exposureTime capabilities', () => {
    const mockTrack = {
      getCapabilities: () => ({
        exposureTime: { min: 1, max: 10000, step: 1 },
      }),
    } as unknown as MediaStreamTrack;

    const hw = nightCaptureService.queryHardwareExposureSupport(mockTrack);
    expect(hw.hasHardwareLongExposure).toBe(true);
    expect(hw.maxExposureMs).toBe(10000);
  });

  it('falls back to computational mode when exposureTime is not exposed in track capabilities', () => {
    const mockTrack = {
      getCapabilities: () => ({}),
    } as unknown as MediaStreamTrack;

    const hw = nightCaptureService.queryHardwareExposureSupport(mockTrack);
    expect(hw.hasHardwareLongExposure).toBe(false);
  });

  it('resolves night exposure presets to deterministic durations', () => {
    expect(nightCaptureService.resolveExposureDuration('auto', 0)).toBe(3);
    expect(nightCaptureService.resolveExposureDuration('10s', 0)).toBe(10);
    expect(nightCaptureService.resolveExposureDuration('30s', 0)).toBe(30);
    expect(nightCaptureService.resolveExposureDuration('custom', 15)).toBe(15);
    expect(nightCaptureService.resolveExposureDuration('custom', 100)).toBe(30); // clamped to 30s
  });

  it('correctly tracks isCapturing state and allows cancellation', () => {
    expect(nightCaptureService.getIsCapturing()).toBe(false);
    expect(() => nightCaptureService.cancelCapture()).not.toThrow();
  });
});
