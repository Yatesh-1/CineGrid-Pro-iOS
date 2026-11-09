/**
 * Reset-on-close: when the app is closed (process ended) and opened again, every camera FEATURE starts from its
 * defaults: grid and grid style, look/camera, pro photo and video settings, mirror, ghost overlay, ratio, timer, HDR,
 * flash, filter, custom-grid sliders and the active session marker. Going to Home or locking the screen does not
 * reset anything, because the page is still alive; only a fresh start runs this file.
 *
 * Never cleared (user content and facts about this phone): photos and sessions, favourites, saved presets, imported
 * LUTs, edited camera profiles, recently used grids, the licence, unusable video sizes, high-speed support.
 *
 * History: an earlier release kept settings across restarts (reported then as "settings reset" being a bug). Set
 * RESET_FEATURES_ON_LAUNCH to false to go back to that behaviour; the session marker is always cleared.
 *
 * This must run before anything reads storage, so it is imported first in main.tsx.
 */
export const RESET_FEATURES_ON_LAUNCH = true;

/** Always cleared: no session is "running" after a restart. */
export const SESSION_STATE_KEYS = ['cinegrid_active_session_id'] as const;

/** Feature settings, cleared on every fresh start while RESET_FEATURES_ON_LAUNCH is on. */
export const FEATURE_SETTING_KEYS = [
  'cinegrid_selected_id', // chosen grid
  'cinegrid_style', // grid colour, opacity, line style, scale, rotation
  'cinegrid_secondary', // secondary guides
  'cinegrid.geoGridParams', // custom-grid slider values
  'cinegrid_pro_photo_settings',
  'cinegrid_pro_video_settings',
  'cinegrid_mirror_front',
  'cinegrid_mirror_rear',
  'cinegrid_look_state', // look / LUT / filter strength
  'cinegrid_ghost_overlay',
  'cinegrid_active_camera_v1', // selected film camera
  'cinegrid_ui_prefs_v1', // ratio, legacy filter, timer, HDR, flash
] as const;

/** Everything this file may remove (kept as one list for tests and docs). */
export const FEATURE_STATE_KEYS = [...SESSION_STATE_KEYS, ...FEATURE_SETTING_KEYS] as const;

export function resetFeatureState(
  storage: Pick<Storage, 'removeItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  resetFeatures: boolean = RESET_FEATURES_ON_LAUNCH
): void {
  if (!storage) return;
  const keys = resetFeatures ? FEATURE_STATE_KEYS : SESSION_STATE_KEYS;
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}

resetFeatureState();
