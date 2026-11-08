import type { StudioEditState } from '../types/studio';

type Json = unknown;

const isPoint = (v: Json): v is { x: number; y: number } =>
  !!v && typeof v === 'object' && typeof (v as { x?: unknown }).x === 'number' && typeof (v as { y?: unknown }).y === 'number';

function blendValue(a: Json, b: Json, t: number): Json {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;

  if (Array.isArray(a) && Array.isArray(b)) {
    // tone-curve points with matching structure blend point by point; anything else switches halfway
    if (a.length === b.length && a.every(isPoint) && b.every(isPoint)) {
      return a.map((p, i) => ({ x: p.x + ((b[i] as { x: number }).x - p.x) * t, y: p.y + ((b[i] as { y: number }).y - p.y) * t }));
    }
    return t >= 0.5 ? b : a;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out: Record<string, Json> = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const av = (a as Record<string, Json>)[key];
      const bv = (b as Record<string, Json>)[key];
      out[key] = av === undefined ? bv : bv === undefined ? av : blendValue(av, bv, t);
    }
    return out;
  }

  return t >= 0.5 ? b : a; // booleans, strings, ids
}

/**
 * State between `base` (t = 0) and `full` (t = 1). Values beyond 1 push the effect further, e.g. 1.5 = 150%.
 * Masks and the active mask are never blended: a preset does not own them.
 */
export function blendStates(base: StudioEditState, full: StudioEditState, t: number): StudioEditState {
  const blended = blendValue(base, full, t) as StudioEditState;
  return { ...blended, masks: base.masks, activeMaskId: base.activeMaskId };
}
