import type { GeoGridDefinition, GeoParams } from '../types/gridGeometry';
import { withDefaults } from '../data/geoGrids';

const STORAGE_KEY = 'cinegrid.geoGridParams';

type Store = Record<string, GeoParams>;

let stored: Store = load();
const cache = new Map<string, GeoParams>();
const listeners = new Set<() => void>();

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable: changes still apply for this session.
  }
}

function emit() {
  cache.clear();
  listeners.forEach((l) => l());
}

/** Parameter values for a grid (defaults + saved edits). The same object is returned until it changes. */
export const geoGridParamsService = {
  get(def: GeoGridDefinition): GeoParams {
    let v = cache.get(def.id);
    if (!v) {
      v = withDefaults(def, stored[def.id]);
      cache.set(def.id, v);
    }
    return v;
  },

  set(def: GeoGridDefinition, patch: GeoParams) {
    stored = { ...stored, [def.id]: { ...stored[def.id], ...patch } };
    persist();
    emit();
  },

  reset(def: GeoGridDefinition) {
    const next = { ...stored };
    delete next[def.id];
    stored = next;
    persist();
    emit();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
