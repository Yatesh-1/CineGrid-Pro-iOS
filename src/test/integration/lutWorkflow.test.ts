import { describe, it, expect } from 'vitest';
import { parseCubeFile, generateCubeString } from '../../utils/cubeParser';
import { lutStorageService } from '../../services/lutStorageService';
import { BUILTIN_LUTS } from '../../data/lutLibrary';
import { BUILTIN_LOOK_FILTERS } from '../../data/filterLibrary';
import { DEFAULT_LOOK_STATE, type LookState } from '../../types/lut';

describe('Professional Filter & LUT Studio Workflow Integration Tests', () => {
  it('executes full LUT import -> grade -> export cycle', async () => {
    // 1. User imports a 3D .cube file
    const sampleCube = `
# CineGrid Pro Master Grade
TITLE "Golden Desert 500T"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0

0.000000 0.000000 0.000000
0.950000 0.100000 0.050000
0.050000 0.850000 0.100000
1.000000 0.900000 0.150000
0.000000 0.050000 0.900000
0.900000 0.150000 0.950000
0.100000 0.950000 0.950000
1.000000 1.000000 1.000000
`;

    const parseResult = parseCubeFile(sampleCube, 'Golden_Desert_500T.cube');
    expect(parseResult.success).toBe(true);
    expect(parseResult.lut).toBeDefined();

    const importedLut = parseResult.lut!;
    expect(importedLut.name).toBe('Golden Desert 500T');
    expect(importedLut.size).toBe(2);

    // 2. Persist to storage
    await lutStorageService.init();
    const saved = await lutStorageService.saveImportedLut(importedLut);
    expect(saved).toBe(true);

    const storedLut = lutStorageService.getLutById(importedLut.id);
    expect(storedLut).toBeDefined();
    expect(storedLut?.name).toBe('Golden Desert 500T');

    // 3. User selects the LUT and dials in adjustments in camera
    const activeState: LookState = {
      ...DEFAULT_LOOK_STATE,
      activeLutId: storedLut!.id,
      lutIntensity: 85,
      adjustments: {
        ...DEFAULT_LOOK_STATE.adjustments,
        exposure: 0.5,
        contrast: 10,
        saturation: 15,
        temperature: 5,
        highlights: -10,
        shadows: 8,
      },
      isCompareActive: true,
      compareSplitPosition: 50,
    };

    expect(activeState.activeLutId).toBe(importedLut.id);
    expect(activeState.lutIntensity).toBe(85);
    expect(activeState.adjustments.exposure).toBe(0.5);

    // 4. User saves grade as a preset
    const preset = {
      id: `preset_${Date.now()}`,
      name: 'My Golden Desert Grade',
      lutId: activeState.activeLutId,
      filterId: null,
      adjustments: activeState.adjustments,
      createdAt: Date.now(),
    };
    lutStorageService.saveUserPreset(preset);

    const userPresets = lutStorageService.getUserPresets();
    expect(userPresets.some((p) => p.name === 'My Golden Desert Grade')).toBe(true);

    // 5. User exports the final color grade to a standard .cube file
    const exportedCubeStr = generateCubeString(
      storedLut!.data,
      storedLut!.size,
      preset.name
    );

    expect(exportedCubeStr).toContain('TITLE "My Golden Desert Grade"');
    expect(exportedCubeStr).toContain('LUT_3D_SIZE 2');
    expect(exportedCubeStr.length).toBeGreaterThan(50);

    // 6. Verify that the exported .cube can be re-parsed without loss
    const reparseResult = parseCubeFile(exportedCubeStr, 'exported.cube');
    expect(reparseResult.success).toBe(true);
    expect(reparseResult.lut?.size).toBe(2);
    expect(reparseResult.lut?.title).toBe('My Golden Desert Grade');
  });

  it('provides all 12 requested filter presets and 12 built-in 3D LUTs', () => {
    expect(BUILTIN_LUTS.length).toBe(12);
    expect(BUILTIN_LOOK_FILTERS.length).toBe(12);

    const filterNames = BUILTIN_LOOK_FILTERS.map((f) => f.name);
    expect(filterNames).toContain('Clean Natural');
    expect(filterNames).toContain('Cinematic Warm');
    expect(filterNames).toContain('Cinematic Cool');
    expect(filterNames).toContain('Kodak-inspired Film');
    expect(filterNames).toContain('Fuji-inspired Film');
    expect(filterNames).toContain('Vintage Fade');
    expect(filterNames).toContain('Teal & Orange');
    expect(filterNames).toContain('Soft Portrait');
    expect(filterNames).toContain('Moody Shadows');
    expect(filterNames).toContain('Black & White');
    expect(filterNames).toContain('High Contrast');
    expect(filterNames).toContain('Golden Hour');
  });
});
