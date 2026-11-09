import { describe, it, expect } from 'vitest';
import { analyzeSceneFromImageData, generateAiGrade } from '../../utils/aiColorGrading';

describe('aiColorGrading', () => {
  it('correctly classifies a golden-hour warm scene', () => {
    // Construct simulated warm/golden pixels (high R, mid G, low B, good luma)
    const w = 50;
    const h = 50;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200; // R
      data[i + 1] = 140; // G
      data[i + 2] = 80; // B
      data[i + 3] = 255;
    }
    const imgData = { data, width: w, height: h } as ImageData;
    const analysis = analyzeSceneFromImageData(imgData);

    expect(analysis.dominantCast).toBe('warm');
    expect(analysis.environment).toBe('golden_hour');

    const grade = generateAiGrade(analysis, 1.0);
    expect(grade.colorGrading?.highlights.hue).toBe(42);
    expect(grade.color?.vibrance).toBeGreaterThan(0);
  });

  it('correctly classifies a low-light / night scene and lifts blacks', () => {
    const w = 50;
    const h = 50;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 15;
      data[i + 1] = 18;
      data[i + 2] = 25;
      data[i + 3] = 255;
    }
    const imgData = { data, width: w, height: h } as ImageData;
    const analysis = analyzeSceneFromImageData(imgData);

    expect(analysis.environment).toBe('low_light_night');
    expect(analysis.dynamicRange).toBe('underexposed');

    const grade = generateAiGrade(analysis, 1.0);
    expect(grade.light?.exposure).toBeGreaterThan(0);
    expect(grade.light?.shadows).toBeGreaterThan(0);
    expect(grade.light?.blacks).toBeGreaterThan(0);
  });

  it('preserves skin tones in portrait scenes', () => {
    const w = 50;
    const h = 50;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      // Skin tone values: R > G > B
      data[i] = 180;
      data[i + 1] = 130;
      data[i + 2] = 100;
      data[i + 3] = 255;
    }
    const imgData = { data, width: w, height: h } as ImageData;
    const analysis = analyzeSceneFromImageData(imgData);

    expect(analysis.hasSkinTones).toBe(true);

    const grade = generateAiGrade(analysis, 1.0);
    // Portrait skin tone protect midtones warmth
    expect(grade.colorGrading?.midtones.hue).toBe(32);
  });
});
