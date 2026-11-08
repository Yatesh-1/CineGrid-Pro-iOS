import { describe, it, expect } from 'vitest';
import { computeCurveLut, DEFAULT_STUDIO_STATE, StudioEngine } from '../../utils/studioEngine';

describe('StudioEngine Unit Tests', () => {
  describe('Tone Curve Interpolation (Hermite Spline LUT)', () => {
    it('generates a linear 1:1 LUT for default 2-point diagonal', () => {
      const lut = computeCurveLut([
        { x: 0, y: 0 },
        { x: 255, y: 255 },
      ]);
      expect(lut.length).toBe(256);
      expect(lut[0]).toBe(0);
      expect(lut[128]).toBe(128);
      expect(lut[255]).toBe(255);
    });

    it('interpolates an S-curve (contrast boost) correctly', () => {
      const lut = computeCurveLut([
        { x: 0, y: 0 },
        { x: 64, y: 40 },   // Deeper shadows
        { x: 192, y: 215 }, // Brighter highlights
        { x: 255, y: 255 },
      ]);
      // Shadow point at x=64 should be darkened below 64
      expect(lut[64]).toBeLessThanOrEqual(45);
      // Highlight point at x=192 should be boosted above 192
      expect(lut[192]).toBeGreaterThanOrEqual(210);
      expect(lut[0]).toBe(0);
      expect(lut[255]).toBe(255);
    });

    it('handles inverted curves (negative effect)', () => {
      const lut = computeCurveLut([
        { x: 0, y: 255 },
        { x: 255, y: 0 },
      ]);
      expect(lut[0]).toBe(255);
      expect(lut[255]).toBe(0);
    });

    it('clamps values strictly within 0 to 255 range', () => {
      const lut = computeCurveLut([
        { x: 0, y: -50 },
        { x: 255, y: 300 },
      ]);
      expect(lut[0]).toBeGreaterThanOrEqual(0);
      expect(lut[255]).toBeLessThanOrEqual(255);
    });
  });

  describe('Default Studio State Integrity', () => {
    it('contains neutral light, color, and geometric attributes', () => {
      expect(DEFAULT_STUDIO_STATE.light.exposure).toBe(0);
      expect(DEFAULT_STUDIO_STATE.light.contrast).toBe(0);
      expect(DEFAULT_STUDIO_STATE.color.temperature).toBe(0);
      expect(DEFAULT_STUDIO_STATE.geometry.rotation).toBe(0);
      expect(DEFAULT_STUDIO_STATE.geometry.flipH).toBe(false);
      expect(DEFAULT_STUDIO_STATE.geometry.flipV).toBe(false);
    });
  });

  describe('Studio Engine Resource Cleanup', () => {
    it('executes cleanResources without throwing', () => {
      expect(() => {
        StudioEngine.cleanResources();
      }).not.toThrow();
    });
  });
});
