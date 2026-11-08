import { describe, it, expect, beforeEach } from 'vitest';
import { loadPrefs, sanitizePrefs, savePrefs } from '../../utils/uiPrefs';

beforeEach(() => localStorage.clear());

describe('uiPrefs', () => {
  it('round-trips every persisted setting', () => {
    savePrefs({ aspectRatio: '16:9', filterId: 'none', filterStrength: 40, timer: 5, hdr: true, flashMode: 'auto' });
    expect(loadPrefs()).toEqual({ aspectRatio: '16:9', filterId: 'none', filterStrength: 40, timer: 5, hdr: true, flashMode: 'auto' });
  });

  it('returns nothing (so the defaults apply) when nothing is saved or the data is corrupt', () => {
    expect(loadPrefs()).toEqual({});
    localStorage.setItem('cinegrid_ui_prefs_v1', '{not json');
    expect(loadPrefs()).toEqual({});
    localStorage.setItem('cinegrid_ui_prefs_v1', '[1,2,3]');
    expect(loadPrefs()).toEqual({});
  });

  it('drops invalid values individually and keeps the valid ones', () => {
    const out = sanitizePrefs({ aspectRatio: '7:3', filterId: 42, filterStrength: 'high', timer: 7, hdr: 'yes', flashMode: 'strobe' });
    expect(out).toEqual({});
    expect(sanitizePrefs({ aspectRatio: '1:1', timer: 7, hdr: false })).toEqual({ aspectRatio: '1:1', hdr: false });
  });

  it('clamps filter strength and rejects non-finite numbers', () => {
    expect(sanitizePrefs({ filterStrength: 500 }).filterStrength).toBe(100);
    expect(sanitizePrefs({ filterStrength: -5 }).filterStrength).toBe(0);
    expect(sanitizePrefs({ filterStrength: Infinity }).filterStrength).toBeUndefined();
  });

  it('ignores a saved filter that no longer exists', () => {
    expect(sanitizePrefs({ filterId: 'gone' }, undefined, ['none', 'portra']).filterId).toBeUndefined();
    expect(sanitizePrefs({ filterId: 'portra' }, undefined, ['none', 'portra']).filterId).toBe('portra');
  });

  it('never throws when storage is unavailable', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      expect(() => savePrefs({ timer: 3 })).not.toThrow();
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});
