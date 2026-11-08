import { describe, it, expect } from 'vitest';
import { sniffVideoMime, nameForMime } from '../../services/deviceSaveService';

describe('sniffVideoMime', () => {
  it('recognises WebM / Matroska by its EBML header', () => {
    expect(sniffVideoMime(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]))).toBe('video/webm');
  });

  it('recognises MP4 / MOV by the ftyp box', () => {
    expect(sniffVideoMime(new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]))).toBe('video/mp4');
  });

  it('returns null for anything else', () => {
    expect(sniffVideoMime(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull();
    expect(sniffVideoMime(new Uint8Array([]))).toBeNull();
  });
});

describe('nameForMime', () => {
  it('replaces the extension to match the real container', () => {
    expect(nameForMime('CINEGRID_VID_123.mp4', 'video/webm')).toBe('CINEGRID_VID_123.webm');
    expect(nameForMime('clip.webm', 'video/mp4')).toBe('clip.mp4');
    expect(nameForMime('noext', 'video/webm')).toBe('noext.webm');
  });
});
