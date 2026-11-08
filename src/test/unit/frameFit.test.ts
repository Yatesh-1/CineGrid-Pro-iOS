import { describe, it, expect } from 'vitest';
import { fitFrame, frameWidthOverHeight, framePlacement } from '../../utils/frameFit';
import type { AspectRatio } from '../../types/camera';

const ALL: AspectRatio[] = ['1:1', '4:3', '3:2', '4:5', '5:4', '9:16', '16:9', '2.35:1', '2.39:1', '21:9'];

describe('viewfinder frame ratios behave like a phone camera', () => {
  // A typical phone stage under the nav bar: 390 wide, 560 tall
  const stage = { w: 390, h: 560 };

  it('4:3 is a 3-wide by 4-tall frame, full width, with space left below', () => {
    const f = fitFrame(stage.w, stage.h, frameWidthOverHeight('4:3'));
    expect(f.width).toBe(390);
    expect(f.height).toBe(520);
    expect(f.height).toBeLessThan(stage.h);
  });

  it('1:1 is a full-width square', () => {
    expect(fitFrame(stage.w, stage.h, frameWidthOverHeight('1:1'))).toEqual({ width: 390, height: 390 });
  });

  it('16:9 (9:16 portrait) is limited by height, so it is narrower than the stage', () => {
    const f = fitFrame(stage.w, stage.h, frameWidthOverHeight('16:9'));
    expect(f.height).toBe(560);
    expect(f.width).toBe(315);
  });

  it('different ratios give different frames (the ratio control actually does something)', () => {
    const sizes = new Set(
      (['1:1', '4:3', '3:2', '16:9', '2.39:1'] as AspectRatio[]).map((r) => {
        const f = fitFrame(stage.w, stage.h, frameWidthOverHeight(r));
        return `${f.width}x${f.height}`;
      })
    );
    expect(sizes.size).toBe(5);
  });

  it('never exceeds the stage, keeps the ratio, and survives odd stages', () => {
    for (const r of ALL) {
      for (const [w, h] of [[390, 560], [320, 400], [1024, 600], [200, 900], [430, 932]]) {
        const f = fitFrame(w, h, frameWidthOverHeight(r));
        expect(f.width).toBeLessThanOrEqual(w);
        expect(f.height).toBeLessThanOrEqual(h);
        expect(Math.abs(f.width / f.height - frameWidthOverHeight(r))).toBeLessThan(0.02);
      }
    }
  });

  it('returns an empty frame for an unmeasured stage instead of NaN', () => {
    expect(fitFrame(0, 500, 0.75)).toEqual({ width: 0, height: 0 });
    expect(fitFrame(400, 0, 0.75)).toEqual({ width: 0, height: 0 });
    expect(fitFrame(400, 500, 0)).toEqual({ width: 0, height: 0 });
  });

  it('puts tall photo frames at the top and square or cinema frames in the middle', () => {
    expect(framePlacement('4:3')).toBe('start');
    expect(framePlacement('3:2')).toBe('start');
    expect(framePlacement('1:1')).toBe('center');
    expect(framePlacement('16:9')).toBe('center');
    expect(framePlacement('2.39:1')).toBe('center');
  });
});
