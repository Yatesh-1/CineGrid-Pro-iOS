import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cinemaVideoService } from '../../services/cinemaVideoService';
import { DEFAULT_CINEMA_CONFIG } from '../../types/cinemaVideo';

describe('CinemaVideoService Tests', () => {
  beforeEach(() => {
    cinemaVideoService.resetToDefaults();
  });

  it('initializes with cinema standard defaults', () => {
    const config = cinemaVideoService.getConfig();
    expect(config.shutterAngle).toBe(180);
    // Defaults are the formats every phone can record; higher ones are offered only where the camera reports them
    expect(config.fps).toBe(30);
    expect(config.resolution).toBe('1080p');
    expect(config.codec).toBe('h264');
    expect(config.calculatedShutterSpeed).toBe('1/60'); // 180° at 30 fps
    expect(config.colorProfile).toBe('rec709');
    expect(config.isRecording).toBe(false);
  });

  it('calculates mathematically accurate shutter speeds for standard shutter angles', () => {
    // 180° rule: Exposure Duration = Angle / (360 * FPS)
    // At 24 fps: 180 / (360 * 24) = 1/48s
    expect(cinemaVideoService.calculateShutterSpeed(180, 24)).toBe('1/48');
    // At 25 fps: 180 / (360 * 25) = 1/50s
    expect(cinemaVideoService.calculateShutterSpeed(180, 25)).toBe('1/50');
    // At 60 fps: 180 / (360 * 60) = 1/120s
    expect(cinemaVideoService.calculateShutterSpeed(180, 60)).toBe('1/120');

    // Anti-flicker angles:
    // 172.8° at 24 fps -> 1/50s (European 50Hz lighting anti-flicker)
    expect(cinemaVideoService.calculateShutterSpeed(172.8, 24)).toBe('1/50');
    // 144° at 24 fps -> 1/60s (US 60Hz lighting anti-flicker at 24fps)
    expect(cinemaVideoService.calculateShutterSpeed(144, 24)).toBe('1/60');

    // Action & high shutter:
    // 90° at 24 fps -> 1/96s
    expect(cinemaVideoService.calculateShutterSpeed(90, 24)).toBe('1/96');
    // 45° at 24 fps -> 1/192s
    expect(cinemaVideoService.calculateShutterSpeed(45, 24)).toBe('1/192');
  });

  it('updates shutter speed automatically when shutter angle or FPS changes', () => {
    cinemaVideoService.setFps(24);
    cinemaVideoService.setShutterAngle(90);
    expect(cinemaVideoService.getConfig().shutterAngle).toBe(90);
    expect(cinemaVideoService.getConfig().calculatedShutterSpeed).toBe('1/96');

    cinemaVideoService.setFps(60);
    cinemaVideoService.setShutterAngle(180);
    expect(cinemaVideoService.getConfig().calculatedShutterSpeed).toBe('1/120');
  });

  it('generates standard digital cinema clip names from production slate', () => {
    const clipName = cinemaVideoService.generateClipName();
    expect(clipName).toMatch(/^A001_S1_TK01_\d{8}\.mp4$/);

    cinemaVideoService.updateConfig({
      productionSlate: {
        ...DEFAULT_CINEMA_CONFIG.productionSlate,
        roll: 'B002',
        scene: '14B',
        take: 3,
      },
    });

    const customClipName = cinemaVideoService.generateClipName();
    expect(customClipName).toMatch(/^B002_S14B_TK03_\d{8}\.mp4$/);
  });

  it('toggles monitoring tools in active scopes set', () => {
    expect(cinemaVideoService.getConfig().activeScopes.has('false_color')).toBe(false);

    cinemaVideoService.toggleMonitoringTool('false_color');
    expect(cinemaVideoService.getConfig().activeScopes.has('false_color')).toBe(true);

    cinemaVideoService.toggleMonitoringTool('waveform');
    expect(cinemaVideoService.getConfig().activeScopes.has('waveform')).toBe(true);

    cinemaVideoService.toggleMonitoringTool('false_color');
    expect(cinemaVideoService.getConfig().activeScopes.has('false_color')).toBe(false);
  });

  it('notifies subscribers upon configuration updates', () => {
    const listener = vi.fn();
    const unsub = cinemaVideoService.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);

    cinemaVideoService.setResolution('2k');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][0].resolution).toBe('2k');

    unsub();
    cinemaVideoService.setResolution('1080p');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('handles rack focus point and duration configurations', () => {
    cinemaVideoService.setRackFocusPoint('A', 0.15, 'Actor Close');
    cinemaVideoService.setRackFocusPoint('B', 0.85, 'Background Door');
    cinemaVideoService.setRackFocusDuration(2.5);

    const config = cinemaVideoService.getConfig();
    expect(config.rackFocus.pointA.distance).toBe(0.15);
    expect(config.rackFocus.pointA.label).toBe('Actor Close');
    expect(config.rackFocus.pointB.distance).toBe(0.85);
    expect(config.rackFocus.pointB.label).toBe('Background Door');
    expect(config.rackFocus.durationSeconds).toBe(2.5);
  });
});
