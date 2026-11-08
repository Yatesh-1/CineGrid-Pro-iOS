import { describe, it, expect } from 'vitest';
import { nearestAspectRatio, validateImportFile, IMPORT_MAX_BYTES } from '../../utils/importPhoto';

describe('nearestAspectRatio', () => {
  it('recognises common camera proportions', () => {
    expect(nearestAspectRatio(4000, 3000)).toBe('4:3');
    expect(nearestAspectRatio(6000, 4000)).toBe('3:2');
    expect(nearestAspectRatio(1920, 1080)).toBe('16:9');
    expect(nearestAspectRatio(1080, 1080)).toBe('1:1');
    expect(nearestAspectRatio(1080, 1350)).toBe('4:5');
    expect(nearestAspectRatio(1080, 1920)).toBe('9:16');
    expect(nearestAspectRatio(2390, 1000)).toBe('2.39:1');
  });

  it('snaps odd sizes to the closest label', () => {
    expect(nearestAspectRatio(4032, 3024)).toBe('4:3');
    expect(nearestAspectRatio(3000, 2010)).toBe('3:2');
  });
});

describe('validateImportFile', () => {
  it('accepts images and rejects other files and oversized images with a plain message', () => {
    expect(validateImportFile({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validateImportFile({ type: 'application/pdf', size: 1024 })).toMatch(/not an image/);
    expect(validateImportFile({ type: 'image/png', size: IMPORT_MAX_BYTES + 1 })).toMatch(/40 MB/);
  });
});
