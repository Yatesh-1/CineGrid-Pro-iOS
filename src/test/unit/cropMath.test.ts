import { describe, it, expect } from 'vitest';
import { centeredCropRect, dragCrop, rectAspect, ratioValue, refitCrop, FULL_CROP } from '../../utils/cropMath';

const IMG = 1.5; // a 3:2 photograph

describe('centeredCropRect', () => {
  it('produces a rectangle of exactly the requested pixel ratio on any image', () => {
    for (const aspect of [0.5625, 0.75, 1, 1.5, 1.7778, 2.39]) {
      for (const [id, value] of [['1:1', 1], ['4:3', 4 / 3], ['3:2', 1.5], ['4:5', 0.8], ['9:16', 9 / 16], ['16:9', 16 / 9]] as const) {
        const r = centeredCropRect(id, aspect);
        expect(rectAspect(r, aspect), `${id} on ${aspect}`).toBeCloseTo(value, 5);
        expect(r.x).toBeGreaterThanOrEqual(-1e-9);
        expect(r.y).toBeGreaterThanOrEqual(-1e-9);
        expect(r.x + r.width).toBeLessThanOrEqual(100 + 1e-9);
        expect(r.y + r.height).toBeLessThanOrEqual(100 + 1e-9);
      }
    }
  });

  it('uses the largest possible area and stays centred', () => {
    const r = centeredCropRect('1:1', IMG); // landscape photo: full height, narrower width
    expect(r.height).toBeCloseTo(100, 5);
    expect(r.width).toBeCloseTo(100 / 1.5, 5);
    expect(r.x).toBeCloseTo((100 - r.width) / 2, 5);
  });

  it('original and free return the full image', () => {
    expect(centeredCropRect('original', IMG)).toEqual(FULL_CROP);
    expect(centeredCropRect('free', IMG)).toEqual(FULL_CROP);
    expect(ratioValue('free', IMG)).toBeNull();
    expect(ratioValue('original', IMG)).toBe(IMG);
  });
});

describe('dragCrop', () => {
  const start = { x: 20, y: 20, width: 40, height: 40 };

  it('free crop: a corner follows the pointer and the opposite corner stays', () => {
    const r = dragCrop('se', start, 80, 90, IMG, null);
    expect(r).toEqual({ x: 20, y: 20, width: 60, height: 70 });
    const nw = dragCrop('nw', start, 10, 5, IMG, null);
    expect(nw.x + nw.width).toBeCloseTo(60, 5);
    expect(nw.y + nw.height).toBeCloseTo(60, 5);
  });

  it('free crop: an edge handle changes only one side', () => {
    const r = dragCrop('e', start, 90, 50, IMG, null);
    expect(r).toEqual({ x: 20, y: 20, width: 70, height: 40 });
  });

  it('locked ratio is held while dragging any corner, and stays inside the image', () => {
    const lock = 1; // square
    for (const handle of ['nw', 'ne', 'se', 'sw'] as const) {
      for (const [px, py] of [[95, 95], [5, 5], [50, 99], [1, 60]]) {
        const sq = { x: 30, y: 10, width: 100 / 1.5 / 2, height: 50 }; // a square on a 3:2 image
        const r = dragCrop(handle, sq, px, py, IMG, lock);
        expect(rectAspect(r, IMG), `${handle} ${px},${py}`).toBeCloseTo(lock, 4);
        expect(r.x).toBeGreaterThanOrEqual(-1e-9);
        expect(r.y).toBeGreaterThanOrEqual(-1e-9);
        expect(r.x + r.width).toBeLessThanOrEqual(100 + 1e-6);
        expect(r.y + r.height).toBeLessThanOrEqual(100 + 1e-6);
      }
    }
  });

  it('never collapses below the minimum size', () => {
    const r = dragCrop('se', start, 21, 21, IMG, null);
    expect(r.width).toBeGreaterThanOrEqual(5);
    expect(r.height).toBeGreaterThanOrEqual(5);
  });

  it('moving keeps the size and stops at the image edge', () => {
    const grab = { x: 10, y: 10 };
    expect(dragCrop('move', start, 50, 50, IMG, null, grab)).toEqual({ x: 40, y: 40, width: 40, height: 40 });
    const edge = dragCrop('move', start, 200, 200, IMG, null, grab);
    expect(edge.x + edge.width).toBe(100);
    expect(edge.y + edge.height).toBe(100);
    const other = dragCrop('move', start, -50, -50, IMG, null, grab);
    expect(other.x).toBe(0);
    expect(other.y).toBe(0);
  });
});

describe('refitCrop', () => {
  it('changing the ratio keeps the centre and gives the exact ratio', () => {
    const r = refitCrop({ x: 10, y: 10, width: 60, height: 60 }, '16:9', IMG);
    expect(rectAspect(r, IMG)).toBeCloseTo(16 / 9, 5);
    expect(r.x + r.width / 2).toBeGreaterThan(30);
    expect(r.x + r.width).toBeLessThanOrEqual(100 + 1e-9);
  });
});
