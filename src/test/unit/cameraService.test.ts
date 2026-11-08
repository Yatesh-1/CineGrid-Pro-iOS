import { describe, it, expect, beforeEach } from 'vitest';
import { CameraService } from '../../services/cameraService';

describe('CameraService Unit Tests', () => {
  let camera: CameraService;

  beforeEach(() => {
    camera = CameraService.getInstance();
  });

  describe('180-Degree Shutter Calculations', () => {
    it('calculates 1/48 or 1/50 for 24 fps cinema standard', () => {
      const res24 = camera.calculate180DegreeShutter(24);
      expect(res24.shutterAngle).toBe(180.0);
      expect(res24.shutterSpeed).toBe('1/50');
    });

    it('calculates 1/50 for 25 fps PAL standard', () => {
      const res25 = camera.calculate180DegreeShutter(25);
      expect(res25.shutterAngle).toBe(180.0);
      expect(res25.shutterSpeed).toBe('1/50');
    });

    it('calculates 1/60 for 30 fps standard', () => {
      const res30 = camera.calculate180DegreeShutter(30);
      expect(res30.shutterAngle).toBe(180.0);
      expect(res30.shutterSpeed).toBe('1/60');
    });

    it('calculates 1/120 for 60 fps high frame rate', () => {
      const res60 = camera.calculate180DegreeShutter(60);
      expect(res60.shutterAngle).toBe(180.0);
      expect(res60.shutterSpeed).toBe('1/120');
    });

    it('calculates 1/240 for 120 fps slow motion', () => {
      const res120 = camera.calculate180DegreeShutter(120);
      expect(res120.shutterAngle).toBe(180.0);
      expect(res120.shutterSpeed).toBe('1/240');
    });
  });

  describe('Cinema Timecode Formatter', () => {
    it('formats record_run timecode correctly for zero seconds', () => {
      const tc = camera.formatTimecode(0, 24, 'record_run');
      expect(tc).toBe('00:00:00:00');
    });

    it('formats record_run timecode with seconds and frames', () => {
      // 65.5 seconds at 24 fps -> 1 min, 5 sec, 12 frames
      const tc = camera.formatTimecode(65.5, 24, 'record_run');
      expect(tc).toBe('00:01:05:12');
    });

    it('formats hours, minutes, seconds and frame count accurately', () => {
      // 3661.25 seconds at 24 fps -> 1 hr, 1 min, 1 sec, 6 frames
      const tc = camera.formatTimecode(3661.25, 24, 'record_run');
      expect(tc).toBe('01:01:01:06');
    });

    it('formats time_of_day mode with valid HH:MM:SS:FF format', () => {
      const tc = camera.formatTimecode(0, 30, 'time_of_day');
      expect(tc).toMatch(/^\d{2}:\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('Storage Estimation', () => {
    it('computes free space and remaining recording minutes', async () => {
      const estimate = await camera.getStorageEstimate(25); // 25 Mbps
      expect(estimate.freeGb).toBeGreaterThan(0);
      expect(estimate.remainingMinutes).toBeGreaterThan(0);
    });

    it('scales remaining minutes inversely with bitrate', async () => {
      const lowEstimate = await camera.getStorageEstimate(10); // 10 Mbps
      const highEstimate = await camera.getStorageEstimate(50); // 50 Mbps
      expect(lowEstimate.remainingMinutes).toBeGreaterThan(highEstimate.remainingMinutes);
    });
  });

  describe('Resource Lifecycle and Cleanup', () => {
    it('cleans audio meter and disposes without crashing', () => {
      expect(() => {
        camera.cleanupAudioMeter();
        camera.dispose();
      }).not.toThrow();
    });
  });
});
