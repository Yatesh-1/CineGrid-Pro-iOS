import { describe, it, expect } from 'vitest';
import { GRID_REFERENCES } from '../../data/gridReferences';
import { COMPREHENSIVE_GRID_LIBRARY } from '../../data/gridLibrary';
import { GEO_GRIDS } from '../../data/geoGrids';
import geoPhotos from '../../data/geoGridPhotos.json';

type Photo = { title: string; url: string; page: string; author: string; license: string; w: number; h: number };
const photos = geoPhotos as unknown as Record<string, Photo[]>;

describe('reference photos for every grid', () => {
  it('every original grid has exactly 3 reference photos with an https image URL', () => {
    const bad = COMPREHENSIVE_GRID_LIBRARY.filter((g) => !g.id.startsWith('geo_'))
      .filter((g) => {
        const refs = GRID_REFERENCES[g.id as keyof typeof GRID_REFERENCES] ?? [];
        return refs.length !== 3 || refs.some((r) => !/^https:\/\/.+/.test(r.imageUrl));
      })
      .map((g) => g.id);
    expect(bad).toEqual([]);
  });

  it('every geometry-engine grid has exactly 3 distinct photos', () => {
    const bad = GEO_GRIDS.filter((g) => {
      const list = photos[g.id] ?? [];
      return list.length !== 3 || new Set(list.map((p) => p.url)).size !== 3;
    }).map((g) => g.id);
    expect(bad).toEqual([]);
  });

  it('every photo has a Wikimedia-hosted image URL, a source page, an author and a free licence', () => {
    for (const [id, list] of Object.entries(photos)) {
      for (const p of list) {
        expect(p.url, id).toMatch(/^https:\/\/(upload|thumb)\.wikimedia\.org\//);
        expect(p.page, id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        expect(p.author.length, id).toBeGreaterThan(0);
        expect(p.license, id).toMatch(/^(CC0|CC BY|CC-BY|Public domain|PD)/i);
        expect(p.w).toBeGreaterThan(0);
        expect(p.h).toBeGreaterThan(0);
      }
    }
  });

  it('has no photo data for grids that do not exist', () => {
    const ids = new Set(GEO_GRIDS.map((g) => g.id));
    expect(Object.keys(photos).filter((id) => !ids.has(id))).toEqual([]);
  });
});
