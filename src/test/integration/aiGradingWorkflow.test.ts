import { describe, it, expect } from 'vitest';
import { analyzeSceneFromImageData, generateAiGrade } from '../../utils/aiColorGrading';
import type { StudioEditState } from '../../types/studio';
import { DEFAULT_STUDIO_STATE } from '../../utils/studioEngine';

describe('AI Auto Color Grading Integration Workflow', () => {
  it('analyzes scene and applies non-destructive grading over existing state', () => {
    // Generate synthetic 64x64 RGBA ImageData (e.g. golden hour landscape)
    const w = 64;
    const h = 64;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 210;     // R
      data[i + 1] = 145; // G
      data[i + 2] = 75;  // B
      data[i + 3] = 255;
    }

    const imgData = { data, width: w, height: h } as ImageData;
    const analysis = analyzeSceneFromImageData(imgData);

    expect(analysis.dominantCast).toBe('warm');
    expect(analysis.environment).toBe('golden_hour');

    const gradePatch = generateAiGrade(analysis, 1.0);

    // Merge into StudioEditState
    const mergedState: StudioEditState = {
      ...DEFAULT_STUDIO_STATE,
      ...gradePatch,
    };

    expect(mergedState.colorGrading.highlights.hue).toBe(42);
    expect(mergedState.color.vibrance).toBeGreaterThan(0);
    expect(mergedState.light.contrast).toBeGreaterThan(0);
  });
});
