import { describe, it, expect } from 'vitest';
import { portraitBlurStrength, portraitBlurPx } from '../../utils/portraitBlur';
import { frameWidthOverHeight } from '../../utils/frameFit';

describe('portrait blur strength', () => {
  it('is strongest at f/1.4 and off at f/8 and wider', () => {
    expect(portraitBlurStrength(1.4)).toBe(1);
    expect(portraitBlurStrength(8)).toBe(0);
    expect(portraitBlurStrength(16)).toBe(0);
  });

  it('falls as the aperture closes', () => {
    const s = [1.4, 2, 2.8, 4, 5.6].map(portraitBlurStrength);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThan(s[i - 1]);
  });

  it('ignores invalid f-numbers', () => {
    expect(portraitBlurStrength(0)).toBe(0);
    expect(portraitBlurStrength(NaN)).toBe(0);
  });

  it('scales the pixel radius with image width and strength', () => {
    expect(portraitBlurPx(0, 1000)).toBe(0);
    expect(portraitBlurPx(1, 2000)).toBeGreaterThan(portraitBlurPx(1, 1000));
    expect(portraitBlurPx(0.5, 1000)).toBeLessThan(portraitBlurPx(1, 1000));
  });
});

describe('photo frame matches the viewfinder frame', () => {
  it('4:3 and 16:9 are portrait frames, 1:1 is square', () => {
    expect(frameWidthOverHeight('4:3')).toBeLessThan(1);
    expect(frameWidthOverHeight('16:9')).toBeCloseTo(9 / 16, 5);
    expect(frameWidthOverHeight('1:1')).toBe(1);
  });
});
