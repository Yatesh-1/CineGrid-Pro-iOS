import { describe, it, expect, beforeEach } from 'vitest';
import { lutStorageService } from '../../services/lutStorageService';
import type { LutDefinition } from '../../types/lut';

describe('LutStorageService Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await lutStorageService.init();
  });

  it('initializes and provides built-in 3D LUTs', () => {
    const luts = lutStorageService.getAllLuts();
    expect(luts.length).toBeGreaterThanOrEqual(12);
    const tealOrange = luts.find((l) => l.id === 'cine_teal_orange');
    expect(tealOrange).toBeDefined();
    expect(tealOrange?.name).toBe('Teal & Orange Hollywood');
    expect(tealOrange?.category).toBe('cinematic');
  });

  it('saves an imported LUT, retrieves it, and handles favorites toggle', async () => {
    const mockLut: LutDefinition = {
      id: 'lut_imported_test_1',
      name: 'Custom Kodak Vision',
      category: 'imported',
      size: 2,
      data: new Float32Array(24),
      rawCube: 'LUT_3D_SIZE 2\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1\n',
      thumbnailGradient: 'linear-gradient(135deg, #000, #fff)',
      isFavorite: false,
      isImported: true,
      importDate: Date.now(),
      fileSize: 1024,
    };

    const saved = await lutStorageService.saveImportedLut(mockLut);
    expect(saved).toBe(true);

    const fetched = lutStorageService.getLutById('lut_imported_test_1');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Custom Kodak Vision');
    expect(fetched?.isImported).toBe(true);

    // Toggle favorite
    const favStatus = lutStorageService.toggleFavorite('lut_imported_test_1');
    expect(favStatus).toBe(true);
    expect(lutStorageService.isFavorite('lut_imported_test_1')).toBe(true);

    // Toggle back
    const unfavStatus = lutStorageService.toggleFavorite('lut_imported_test_1');
    expect(unfavStatus).toBe(false);
    expect(lutStorageService.isFavorite('lut_imported_test_1')).toBe(false);
  });

  it('renames an imported LUT and rejects empty names', async () => {
    const mockLut: LutDefinition = {
      id: 'lut_imported_test_rename',
      name: 'Original Name',
      category: 'imported',
      size: 2,
      data: new Float32Array(24),
      rawCube: 'LUT_3D_SIZE 2\n0 0 0\n',
      thumbnailGradient: 'linear-gradient(135deg, #222, #888)',
      isFavorite: false,
      isImported: true,
    };

    await lutStorageService.saveImportedLut(mockLut);

    const emptyRename = await lutStorageService.renameLut('lut_imported_test_rename', '   ');
    expect(emptyRename).toBe(false);

    const renameOk = await lutStorageService.renameLut('lut_imported_test_rename', 'New Master 500T');
    expect(renameOk).toBe(true);

    const updated = lutStorageService.getLutById('lut_imported_test_rename');
    expect(updated?.name).toBe('New Master 500T');
  });

  it('deletes an imported LUT', async () => {
    const mockLut: LutDefinition = {
      id: 'lut_imported_test_del',
      name: 'LUT to Delete',
      category: 'imported',
      size: 2,
      data: new Float32Array(24),
      thumbnailGradient: 'linear-gradient(135deg, #111, #444)',
      isFavorite: true,
      isImported: true,
    };

    await lutStorageService.saveImportedLut(mockLut);
    expect(lutStorageService.getLutById('lut_imported_test_del')).toBeDefined();

    const delResult = await lutStorageService.deleteLut('lut_imported_test_del');
    expect(delResult).toBe(true);
    expect(lutStorageService.getLutById('lut_imported_test_del')).toBeUndefined();
    expect(lutStorageService.isFavorite('lut_imported_test_del')).toBe(false);
  });

  it('manages custom user look presets', () => {
    const preset = {
      id: 'preset_user_1',
      name: 'Cyberpunk Moody',
      lutId: 'lut_builtin_cyber_neon',
      filterId: null,
      adjustments: {
        exposure: 0.3,
        contrast: 15,
        saturation: 25,
        temperature: -10,
        tint: 5,
        highlights: -15,
        shadows: 10,
        fade: 5,
        sharpening: 10,
      },
      createdAt: Date.now(),
    };

    lutStorageService.saveUserPreset(preset);
    const presets = lutStorageService.getUserPresets();
    expect(presets.length).toBe(1);
    expect(presets[0].name).toBe('Cyberpunk Moody');
    expect(presets[0].adjustments.exposure).toBe(0.3);

    lutStorageService.deleteUserPreset('preset_user_1');
    expect(lutStorageService.getUserPresets().length).toBe(0);
  });
});
