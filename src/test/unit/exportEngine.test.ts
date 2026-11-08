import { describe, it, expect } from 'vitest';
import { calculateOutputDimensions } from '../../utils/exportEngine';
import type { PhotoExportSettings } from '../../types/export';

const baseSettings: PhotoExportSettings = {
  format: 'jpeg',
  quality: 90,
  resizeMode: 'original',
  resizePercentage: 100,
  customWidth: 1080,
  customHeight: 1350,
  maintainAspectRatio: true,
  colorSpace: 'sRGB',
  stripGpsMetadata: true,
  stripExifCameraInfo: false,
  sharpening: 'none',
  watermark: {
    enabled: false,
    text: '',
    opacity: 50,
    position: 'bottom_right',
    fontSize: 24,
    color: '#ffffff',
  },
};

describe('ExportEngine Unit Tests', () => {
  describe('Output Dimension Calculations', () => {
    it('returns natural dimensions when resizeMode is original', () => {
      const dims = calculateOutputDimensions(4000, 3000, {
        ...baseSettings,
        resizeMode: 'original',
      });
      expect(dims.width).toBe(4000);
      expect(dims.height).toBe(3000);
    });

    it('scales dimensions by percentage accurately', () => {
      const dims = calculateOutputDimensions(4000, 3000, {
        ...baseSettings,
        resizeMode: 'percentage',
        resizePercentage: 50,
      });
      expect(dims.width).toBe(2000);
      expect(dims.height).toBe(1500);
    });

    it('enforces minimum boundary of 100px for percentage scaling', () => {
      const dims = calculateOutputDimensions(200, 150, {
        ...baseSettings,
        resizeMode: 'percentage',
        resizePercentage: 10,
      });
      expect(dims.width).toBe(100);
      expect(dims.height).toBe(100);
    });

    it('preserves aspect ratio when scaling to custom bounding box (landscape)', () => {
      // 4000x2000 (aspect 2.0) into 1000x1000 bounding box
      const dims = calculateOutputDimensions(4000, 2000, {
        ...baseSettings,
        resizeMode: 'custom',
        customWidth: 1000,
        customHeight: 1000,
        maintainAspectRatio: true,
      });
      expect(dims.width).toBe(1000);
      expect(dims.height).toBe(500);
    });

    it('preserves aspect ratio when scaling to custom bounding box (portrait)', () => {
      // 2000x4000 (aspect 0.5) into 1000x1000 bounding box
      const dims = calculateOutputDimensions(2000, 4000, {
        ...baseSettings,
        resizeMode: 'custom',
        customWidth: 1000,
        customHeight: 1000,
        maintainAspectRatio: true,
      });
      expect(dims.width).toBe(500);
      expect(dims.height).toBe(1000);
    });

    it('stretches to custom dimensions when maintainAspectRatio is false', () => {
      const dims = calculateOutputDimensions(4000, 3000, {
        ...baseSettings,
        resizeMode: 'custom',
        customWidth: 1080,
        customHeight: 1080,
        maintainAspectRatio: false,
      });
      expect(dims.width).toBe(1080);
      expect(dims.height).toBe(1080);
    });
  });
});
