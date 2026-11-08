// CineGrid Pro — Time-Lapse Service Unit Tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { timelapseService } from '../../services/timelapseService';

describe('TimelapseService Unit Tests', () => {
  beforeEach(() => {
    timelapseService.setConfig({
      interval: 1,
      customIntervalSeconds: 1,
      isRecording: false,
      capturedFrames: 0,
      realDurationSeconds: 0,
      outputFps: 30,
      lockExposure: true,
    });
  });

  afterEach(() => {
    timelapseService.cleanup();
  });

  it('calculates output video duration correctly at 30 FPS', () => {
    // 30 frames at 30 fps = 1.0 second
    expect(timelapseService.calculateOutputDuration(30, 30)).toBe(1.0);
    // 150 frames at 30 fps = 5.0 seconds
    expect(timelapseService.calculateOutputDuration(150, 30)).toBe(5.0);
    // 900 frames at 30 fps = 30.0 seconds
    expect(timelapseService.calculateOutputDuration(900, 30)).toBe(30.0);
  });

  it('audits device readiness and checks storage quota', async () => {
    const readiness = await timelapseService.checkDeviceReadiness();
    expect(readiness).toBeDefined();
    expect(typeof readiness.canProceed).toBe('boolean');
  });

  it('returns current time-lapse status snapshot', () => {
    timelapseService.setConfig({ capturedFrames: 45, realDurationSeconds: 90, interval: 2 });
    const status = timelapseService.getStatus();
    expect(status.capturedFrames).toBe(45);
    expect(status.realDurationSeconds).toBe(90);
    expect(status.interval).toBe(2);
    expect(status.estimatedOutputSeconds).toBe(1.5);
  });

  it('cleans up timers and media recorders safely', () => {
    expect(() => timelapseService.cleanup()).not.toThrow();
  });
});
