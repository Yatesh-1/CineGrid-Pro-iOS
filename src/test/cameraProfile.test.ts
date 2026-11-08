import { describe, it, expect } from 'vitest';
import {
  BUILTIN_PROFILES,
  NEUTRAL_PROFILE,
  applyMatrix,
  applyToneCurve,
  clampProfile,
  duplicateProfile,
  exportProfile,
  formatDateImprint,
  grainHash,
  importProfile,
  isNeutralProfile,
  mergeProfile,
  resetProfile,
  vignetteFactor,
} from '../utils/cameraProfile';

describe('cameraProfile model', () => {
  it('neutral profile is identity for matrix and tone', () => {
    expect(applyMatrix([0.2, 0.5, 0.9], NEUTRAL_PROFILE.color.matrix)).toEqual([0.2, 0.5, 0.9]);
    for (const x of [0, 0.1, 0.5, 0.9, 1]) expect(applyToneCurve(x, NEUTRAL_PROFILE.tone)).toBeCloseTo(x, 10);
    expect(isNeutralProfile(NEUTRAL_PROFILE)).toBe(true);
    expect(vignetteFactor(0, 0, 1.5, NEUTRAL_PROFILE.vignette)).toBe(1);
  });

  it('tone curve is monotonic, bounded, and applies lift, black point and shoulder', () => {
    for (const p of BUILTIN_PROFILES) {
      let prev = -1;
      for (let i = 0; i <= 100; i++) {
        const y = applyToneCurve(i / 100, p.tone);
        expect(y).toBeGreaterThanOrEqual(prev - 1e-12);
        expect(y).toBeLessThanOrEqual(1 + 1e-9);
        prev = y;
      }
    }
    expect(applyToneCurve(0, { ...NEUTRAL_PROFILE.tone, shadowLift: 0.1 })).toBeCloseTo(0.1, 10);
    expect(applyToneCurve(0.02, { ...NEUTRAL_PROFILE.tone, blackPoint: 0.05 })).toBe(0);
    // shoulder compresses highlights below the input value
    expect(applyToneCurve(0.98, { ...NEUTRAL_PROFILE.tone, highlightRolloff: 1 })).toBeLessThan(0.98);
  });

  it('vignette darkens corners more than centre and respects amount', () => {
    const vg = { amount: 0.6, roundness: 0.5, softness: 0.5 };
    expect(vignetteFactor(0.5, 0.5, 1, vg)).toBeCloseTo(1, 5);
    expect(vignetteFactor(0, 0, 1, vg)).toBeLessThan(0.6);
    expect(vignetteFactor(0, 0, 1, vg)).toBeGreaterThanOrEqual(1 - vg.amount - 1e-9);
  });

  it('grain hash is deterministic, in range, and seed-dependent', () => {
    expect(grainHash(10, 20, 1)).toBe(grainHash(10, 20, 1));
    expect(grainHash(10, 20, 1)).not.toBe(grainHash(10, 20, 2));
    for (let i = 0; i < 200; i++) {
      const h = grainHash(i, i * 3, 5);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
  });

  it('built-in cameras are genuinely distinct, not renamed filters', () => {
    expect(BUILTIN_PROFILES.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(BUILTIN_PROFILES.map((p) => p.id));
    expect(ids.size).toBe(BUILTIN_PROFILES.length);
    const sig = (p: (typeof BUILTIN_PROFILES)[number]) => JSON.stringify([p.color, p.tone, p.grain, p.vignette, p.softness]);
    expect(new Set(BUILTIN_PROFILES.map(sig)).size).toBe(BUILTIN_PROFILES.length);
    expect(new Set(BUILTIN_PROFILES.map((p) => p.kind)).size).toBeGreaterThanOrEqual(7);
    for (const p of BUILTIN_PROFILES) {
      expect(isNeutralProfile(p)).toBe(false);
      expect(clampProfile(p)).toEqual(p); // shipped values already within legal ranges
    }
  });

  it('clampProfile forces garbage into legal ranges and never throws', () => {
    const bad = mergeProfile(NEUTRAL_PROFILE, {
      grain: { amount: 99, size: -5 },
      tone: { midGamma: NaN, blackPoint: 5 },
      color: { matrix: [9, 9, 9, 9, 9, 9, 9, 9, 9], saturation: -50 },
      border: { style: 'bogus', width: 3 },
    });
    const c = clampProfile(bad);
    expect(c.grain.amount).toBe(1);
    expect(c.grain.size).toBe(0.5);
    expect(c.tone.blackPoint).toBe(0.2);
    expect(Number.isFinite(c.tone.midGamma)).toBe(true);
    expect(c.color.matrix.every((v) => v === 2)).toBe(true);
    expect(c.color.saturation).toBe(-1);
    expect(c.border.style).toBe('none');
    expect(c.border.width).toBe(0.2);
  });

  it('export/import round-trips and imported profiles are user-owned', () => {
    const src = BUILTIN_PROFILES[0];
    const r = importProfile(exportProfile(src), 'user_1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.id).toBe('user_1');
      expect(r.profile.builtIn).toBe(false);
      expect({ ...r.profile, id: src.id, builtIn: true }).toEqual(src);
    }
  });

  it('import rejects bad, oversized, foreign and future-version input', () => {
    expect(importProfile('not json', 'x').ok).toBe(false);
    expect(importProfile('{"a":1}', 'x').ok).toBe(false);
    expect(importProfile(JSON.stringify({ schema: 'other', profile: {} }), 'x').ok).toBe(false);
    expect(importProfile('x'.repeat(70000), 'x').ok).toBe(false);
    expect(importProfile(JSON.stringify({ schema: 'cinegrid.cameraProfile', version: 99, profile: {} }), 'x').ok).toBe(false);
  });

  it('import clamps hostile values from a valid-looking file', () => {
    const json = JSON.stringify({ schema: 'cinegrid.cameraProfile', version: 1, profile: { grain: { amount: 1e9 }, name: 'x'.repeat(500) } });
    const r = importProfile(json, 'u');
    expect(r.ok && r.profile.grain.amount).toBe(1);
    expect(r.ok && r.profile.name.length).toBe(60);
  });

  it('formats the date imprint in every supported style', () => {
    const d = new Date(2004, 10, 8, 9, 5, 7);
    expect(formatDateImprint(d, 'yy mm dd')).toBe("'04 11 08");
    expect(formatDateImprint(d, 'dd mm yy')).toBe("08 11 '04");
    expect(formatDateImprint(d, 'mm/dd/yy')).toBe('11/08/04');
    expect(formatDateImprint(d, 'time')).toBe('09:05:07');
  });

  it('duplicate makes an editable copy; reset restores factory values only for built-ins', () => {
    const src = BUILTIN_PROFILES[2];
    const d = duplicateProfile(src, 'dup');
    expect(d.builtIn).toBe(false);
    expect(d.id).toBe('dup');
    expect(d.name).toBe(`${src.name} copy`);
    const edited = { ...src, grain: { ...src.grain, amount: 0.99 } };
    expect(resetProfile(edited)).toEqual(src);
    expect(resetProfile(d)).toBe(d);
  });
});
