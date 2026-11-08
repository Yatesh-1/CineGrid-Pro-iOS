import { describe, it, expect } from 'vitest';
import { GEO_GRIDS, GRID_ALIASES, getGeoGrid, withDefaults } from '../../data/geoGrids';
import { COMPREHENSIVE_GRID_LIBRARY, recommendedGridIds } from '../../data/gridLibrary';
import { circle, fitRect, spiralBuild, spiralPrims, PHI, G1, G2 } from '../../utils/gridGeometry/kit';
import type { Prim } from '../../types/gridGeometry';

const ASPECTS = [9 / 16, 3 / 4, 1, 4 / 3, 16 / 9, 2.39];

const coords = (p: Prim): number[] => {
  switch (p.t) {
    case 'l':
      return [p.x1, p.y1, p.x2, p.y2];
    case 'r':
    case 'dim':
      return [p.x, p.y, p.w, p.h];
    case 'dot':
      return [p.x, p.y];
    case 'p':
      return p.pts.flat();
  }
};

describe('geometry library accounting', () => {
  it('covers all 230 names from the brief (new overlays + aliases of existing ones)', () => {
    const fromBrief = GEO_GRIDS.filter((g) => g.section <= 12);
    expect(fromBrief.length + GRID_ALIASES.filter((a) => a.section <= 12).length).toBe(230);
    expect(GEO_GRIDS.filter((g) => g.section === 13).length).toBe(2); // extra aspect-ratio guides (2.35:1, 21:9)
    expect(GRID_ALIASES.filter((a) => a.section === 13).length).toBe(2); // 3:2 and 5:4 reuse existing geometry
  });

  it('has unique ids and names', () => {
    expect(new Set(GEO_GRIDS.map((g) => g.id)).size).toBe(GEO_GRIDS.length);
    const names = [...GEO_GRIDS.map((g) => g.name), ...GRID_ALIASES.map((a) => a.name)];
    expect(new Set(names).size).toBe(names.length);
  });

  it('every alias points at an overlay that really exists in the original library', () => {
    const ids = new Set(COMPREHENSIVE_GRID_LIBRARY.map((g) => g.id as string));
    for (const a of GRID_ALIASES) expect(ids.has(a.existingId), `${a.name} → ${a.existingId}`).toBe(true);
  });

  it('exposes every grid in the library with name, description and category', () => {
    for (const g of GEO_GRIDS) {
      const entry = COMPREHENSIVE_GRID_LIBRARY.find((e) => e.id === g.id);
      expect(entry, g.name).toBeTruthy();
      expect(entry!.description.length).toBeGreaterThan(20);
    }
  });

  it('recommended grids all exist', () => {
    const ids = new Set(COMPREHENSIVE_GRID_LIBRARY.map((g) => g.id as string));
    for (const mode of ['photo', 'portrait', 'video', 'slow_motion', 'timelapse', 'night', 'dual']) {
      for (const id of recommendedGridIds(mode)) expect(ids.has(id as string), `${mode}: ${id}`).toBe(true);
    }
  });
});

describe('every grid renders valid geometry', () => {
  for (const g of GEO_GRIDS) {
    it(g.name, () => {
      for (const A of ASPECTS) {
        const prims = g.build(A, withDefaults(g));
        expect(prims.length, `${g.name} @${A}`).toBeGreaterThan(0);
        for (const p of prims) {
          for (const n of coords(p)) {
            expect(Number.isFinite(n), `${g.name} @${A}`).toBe(true);
            expect(Math.abs(n)).toBeLessThan(6);
          }
          if (p.t === 'p') expect(p.pts.length).toBeGreaterThan(1);
        }
      }
    });
  }

  it('every grid has distinct geometry at the same frame', () => {
    const seen = new Map<string, string>();
    for (const g of GEO_GRIDS) {
      const key = JSON.stringify(g.build(4 / 3, withDefaults(g)), (_k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
      expect(seen.get(key), `${g.name} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, g.name);
    }
  });
});

describe('geometry correctness', () => {
  it('circles stay round at any frame aspect', () => {
    for (const A of ASPECTS) {
      const c = circle(0.5, 0.5, 0.3, A);
      if (c.t !== 'p') throw new Error('circle is a polygon');
      const xs = c.pts.map((p) => p[0] * A); // to height units
      const ys = c.pts.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      expect(w / h).toBeCloseTo(1, 1);
    }
  });

  it('crop guides have the exact ratio in pixels', () => {
    for (const ratio of [16 / 9, 2.39, 1.85, 4 / 3, 9 / 16, 1, 0.8]) {
      for (const A of ASPECTS) {
        const r = fitRect(ratio, A);
        expect((r.w * A) / r.h).toBeCloseTo(ratio, 5);
        expect(r.w).toBeLessThanOrEqual(1.0000001);
        expect(r.h).toBeLessThanOrEqual(1.0000001);
      }
    }
  });

  it('golden section lines sit at 38.2% and 61.8%', () => {
    expect(G1).toBeCloseTo(0.382, 3);
    expect(G2).toBeCloseTo(0.618, 3);
    const vert = getGeoGrid('geo_golden_section_vertical')!.build(1, {});
    const xs = vert.filter((p) => p.t === 'l').map((p) => (p as { x1: number }).x1);
    expect(xs.map((x) => Math.round(x * 1000) / 1000).sort()).toEqual([0.382, 0.618]);
  });

  it('spiral arcs join end to start and shrink by the golden ratio', () => {
    const b = spiralBuild(PHI, 8);
    expect(b.squares[1].s / b.squares[0].s).toBeCloseTo(1 / PHI, 3);
    expect(b.squares[2].s / b.squares[1].s).toBeCloseTo(1 / PHI, 3);
    // no jump between consecutive samples larger than the biggest arc step
    for (let i = 1; i < b.path.length; i++) {
      const d = Math.hypot(b.path[i][0] - b.path[i - 1][0], b.path[i][1] - b.path[i - 1][1]);
      expect(d).toBeLessThan(0.12);
    }
  });

  it('spiral corner variants put the eye in the requested quadrant, for both directions', () => {
    for (const dir of ['cw', 'ccw'] as const) {
      for (const [corner, qx, qy] of [['tl', 0, 0], ['tr', 1, 0], ['bl', 0, 1], ['br', 1, 1]] as const) {
        const dot = spiralPrims(corner, dir).find((p) => p.t === 'dot');
        if (!dot || dot.t !== 'dot') throw new Error('no eye marker');
        expect(dot.x < 0.5 ? 0 : 1, `${corner} ${dir} x`).toBe(qx);
        expect(dot.y < 0.5 ? 0 : 1, `${corner} ${dir} y`).toBe(qy);
      }
    }
  });

  it('the eight spiral variants are all different', () => {
    const keys = new Set<string>();
    for (const dir of ['cw', 'ccw'] as const)
      for (const c of ['tl', 'tr', 'bl', 'br'] as const) keys.add(JSON.stringify(spiralPrims(c, dir).map((p) => (p.t === 'p' ? p.pts.map(([x, y]) => [Math.round(x * 100), Math.round(y * 100)]) : p))));
    expect(keys.size).toBe(8);
  });

  it('Fibonacci squares follow 8,5,3,2,1,1 on a 13:8 rectangle', () => {
    const b = spiralBuild(13 / 8, 6);
    expect(b.squares.map((s) => Math.round(s.s * 8))).toEqual([8, 5, 3, 2, 1, 1]);
  });

  it('custom grids respond to their parameters', () => {
    const builder = getGeoGrid('geo_custom_grid_builder')!;
    const six = builder.build(1, { cols: 6, rows: 2, diag: 0 });
    expect(six.filter((p) => p.t === 'l' && p.x1 === p.x2).length).toBe(5);
    expect(six.filter((p) => p.t === 'l' && p.y1 === p.y2).length).toBe(1);
    const circ = getGeoGrid('geo_custom_circle_guide')!;
    const small = circ.build(1, { cx: 50, cy: 50, size: 10 })[0];
    const large = circ.build(1, { cx: 50, cy: 50, size: 40 })[0];
    const span = (p: Prim) => (p.t === 'p' ? Math.max(...p.pts.map((q) => q[0])) - Math.min(...p.pts.map((q) => q[0])) : 0);
    expect(span(large)).toBeGreaterThan(span(small) * 3);
  });
});
