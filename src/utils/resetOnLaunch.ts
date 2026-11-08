/**
 * Every launch starts from the app's defaults: grid, look, ratio-related and pro settings, mirror, ghost overlay and the
 * active session are all reset until the user uses them again. This must run before anything reads storage, so it is
 * imported first in main.tsx (some services read their settings while their module loads).
 *
 * Kept on purpose: the user's own content and setup (photos and sessions, favourites, saved presets, imported LUTs,
 * the licence) and facts measured about this phone (unusable video sizes, high-speed support).
 */
export const FEATURE_STATE_KEYS = [
  'cinegrid_selected_id', // chosen grid
  'cinegrid_style', // grid appearance
  'cinegrid_secondary', // secondary guides
  'cinegrid_pro_photo_settings',
  'cinegrid_pro_video_settings',
  'cinegrid_look_state', // active LUT / filter / adjustments
  'cinegrid_ghost_overlay',
  'cinegrid_mirror_front',
  'cinegrid_mirror_rear',
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
