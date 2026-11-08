import type { LookState } from '../types/lut';

/** True when a LUT or a look filter is currently applied to the live preview. */
export function hasActiveLook(look: LookState): boolean {
  return look.activeLutId !== null || look.activeFilterId !== null;
}

/** Removes the LUT and look filter in one step; manual colour adjustments are kept. */
export function clearLook(look: LookState): LookState {
  return { ...look, activeLutId: null, activeFilterId: null, isCompareActive: false };
}
