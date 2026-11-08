import { describe, it, expect } from 'vitest';
import { blendStates } from '../../utils/studioBlend';
import { DEFAULT_STUDIO_STATE } from '../../utils/studioEngine';
import { STUDIO_PRESETS, STUDIO_PRESET_CATEGORIES } from '../../utils/studioPresets';
import type { StudioEditState } from '../../types/studio';

const clone = (s: StudioEditState): StudioEditState => JSON.parse(JSON.stringify(s));

describe('blendStates (preset intensity)', () => {
  const full = clone(DEFAULT_STUDIO_STATE);
  full.light.exposure = 1;
  full.light.contrast = 40;
  full.color.temperature = -30;
  full.curves.rgb = [{ x: 0, y: 0 }, { x: 128, y: 160 }, { x: 255, y: 255 }];
  full.colorGrading.shadows = { hue: 200, saturation: 60, luminance: 0 };
  full.activePresetId = 'p';

  it('0% gives the base, 100% gives the preset, 50% is halfway', () => {
    expect(blendStates(DEFAULT_STUDIO_STATE, full, 0).light.exposure).toBe(0);
    expect(blendStates(DEFAULT_STUDIO_STATE, full, 1).light.contrast).toBe(40);
    const half = blendStates(DEFAULT_STUDIO_STATE, full, 0.5);
    expect(half.light.exposure).toBeCloseTo(0.5);
    expect(half.color.temperature).toBeCloseTo(-15);
    expect(half.colorGrading.shadows.saturation).toBeCloseTo(30);
  });

  it('blends tone-curve points', () => {
    const half = blendStates(DEFAULT_STUDIO_STATE, full, 0.5);
    // base curve has only two points, preset has three: structure differs, so it switches halfway
    expect(half.curves.rgb).toEqual(full.curves.rgb);
    const base3 = clone(DEFAULT_STUDIO_STATE);
    base3.curves.rgb = [{ x: 0, y: 0 }, { x: 128, y: 128 }, { x: 255, y: 255 }];
    expect(blendStates(base3, full, 0.5).curves.rgb[1].y).toBeCloseTo(144);
  });

  it('values above 100% push the effect further', () => {
    expect(blendStates(DEFAULT_STUDIO_STATE, full, 1.5).light.exposure).toBeCloseTo(1.5);
  });

  it('never blends away the user\'s masks', () => {
    const withMask = clone(DEFAULT_STUDIO_STATE);
    withMask.masks = [{ id: 'm', name: 'm', type: 'radial', enabled: true, inverted: false, x: 1, y: 1, width: 1, height: 1, angle: 0, feather: 0, adjustments: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, saturation: 0, sharpness: 0 } }];
    expect(blendStates(withMask, full, 0.5).masks).toBe(withMask.masks);
  });
});

describe('preset library', () => {
  it('has presets in every requested category', () => {
    const wanted = ['Cinematic', 'Natural', 'Portrait', 'Landscape', 'Street', 'Travel', 'Vintage', 'Film', 'Black & White', 'Moody', 'Warm', 'Cool'];
    for (const cat of wanted) {
      expect(STUDIO_PRESETS.some((p) => p.category === cat), cat).toBe(true);
    }
    expect(STUDIO_PRESET_CATEGORIES.length).toBeGreaterThan(0);
  });

  it('every preset sets real editing values (not an empty or no-op preset)', () => {
    for (const p of STUDIO_PRESETS) {
      const applied = { ...clone(DEFAULT_STUDIO_STATE), ...p.values } as StudioEditState;
      expect(JSON.stringify(applied.light) + JSON.stringify(applied.color) + JSON.stringify(applied.hsl) + JSON.stringify(applied.colorGrading) + JSON.stringify(applied.curves) + JSON.stringify(applied.effects) + JSON.stringify(applied.detail), p.name)
        .not.toBe(JSON.stringify(DEFAULT_STUDIO_STATE.light) + JSON.stringify(DEFAULT_STUDIO_STATE.color) + JSON.stringify(DEFAULT_STUDIO_STATE.hsl) + JSON.stringify(DEFAULT_STUDIO_STATE.colorGrading) + JSON.stringify(DEFAULT_STUDIO_STATE.curves) + JSON.stringify(DEFAULT_STUDIO_STATE.effects) + JSON.stringify(DEFAULT_STUDIO_STATE.detail));
    }
  });

  it('has unique ids', () => {
    expect(new Set(STUDIO_PRESETS.map((p) => p.id)).size).toBe(STUDIO_PRESETS.length);
  });
});
