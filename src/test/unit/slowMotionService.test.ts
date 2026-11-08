// CineGrid Pro — Slow Motion Service Unit Tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { slowMotionService } from '../../services/slowMotionService';

describe('SlowMotionService Unit Tests', () => {
  beforeEach(() => {
    slowMotionService.setConfig({
      targetFps: 60,
      supportedMaxFps: 60,
      playbackSpeed: 0.5,
      isSlowMoRecording: false,
      recordingDuration: 0,
      segmentStart: 0.0,
      segmentEnd: 1.0,
    });
  });

  afterEach(() => {
    slowMotionService.cleanup();
  });

  it('queries sensor frame rate capabilities and identifies hardware thresholds', () => {
    const mockTrack = {
      getCapabilities: () => ({ frameRate: { min: 24, max: 120 } }),
    } as unknown as MediaStreamTrack;

    const caps = slowMotionService.querySensorFpsCapabilities(mockTrack);
    expect(caps.maxSensorFps).toBe(120);
    expect(caps.supportsGenuine60Fps).toBe(true);
    expect(caps.supportsGenuine120Fps).toBe(true);
    expect(caps.supportsGenuine240Fps).toBe(false);
    expect(caps.availableOptions).toContain(60);
    expect(caps.availableOptions).toContain(120);
  });

  it('updates slow-motion playback speed configuration', () => {
    slowMotionService.setConfig({ playbackSpeed: 0.25 });
    expect(slowMotionService.getConfig().playbackSpeed).toBe(0.25);

    slowMotionService.setConfig({ segmentStart: 0.2, segmentEnd: 0.8 });
    expect(slowMotionService.getConfig().segmentStart).toBe(0.2);
    expect(slowMotionService.getConfig().segmentEnd).toBe(0.8);
  });

  it('safely cleans up slow motion recorder without leaving dangling state', () => {
    expect(() => slowMotionService.cleanup()).not.toThrow();
  });
});
