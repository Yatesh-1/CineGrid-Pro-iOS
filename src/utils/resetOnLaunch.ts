/**
 * On launch only the state that is meaningless after a restart is cleared. The user's settings (grid, look and camera,
 * pro photo/video settings, mirror, ghost overlay, ...) now SURVIVE a restart: they used to be reset to defaults on
 * every launch, which the user reported as a problem.
 *
 * Still cleared: the "active session" marker, because no session is actually running after the app was closed.
 * Kept always: photos and sessions, favourites, saved presets, imported LUTs, the licence, and facts measured about this
 * phone (unusable video sizes, high-speed support).
 *
 * This must run before anything reads storage, so it is imported first in main.tsx.
 */
export const FEATURE_STATE_KEYS = [
  'cinegrid_active_session_id', // no session is "running" after a restart
] as const;
export function resetFeatureState(storage: Pick<Storage, 'removeItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): void {
  if (!storage) return;
  for (const key of FEATURE_STATE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}

resetFeatureState();
