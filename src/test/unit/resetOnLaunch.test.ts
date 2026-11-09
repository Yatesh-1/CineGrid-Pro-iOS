import { describe, it, expect } from 'vitest';
import { FEATURE_SETTING_KEYS, FEATURE_STATE_KEYS, SESSION_STATE_KEYS, RESET_FEATURES_ON_LAUNCH, resetFeatureState } from '../../utils/resetOnLaunch';

const makeStore = () => {
  const store = new Map<string, string>();
  return { store, storage: { removeItem: (k: string) => void store.delete(k) } };
};

const KEPT = [
  'cinegrid_photography_sessions',
  'cinegrid_captured_photos',
  'cinegrid_favorites',
  'cinegrid_custom_presets',
  'cinegrid_studio_custom_presets',
  'cinegrid_imported_luts_meta',
  'cinegrid_camera_profiles_v1',
  'cinegrid_camera_profile_overrides_v1',
  'cinegrid_license_entitlement_session',
  'cinegrid_unusable_video_res',
  'cinegrid_highspeed_broken',
];

describe('reset on close', () => {
  it('is switched on', () => {
    expect(RESET_FEATURES_ON_LAUNCH).toBe(true);
  });

  it('resets every feature setting on a fresh start but keeps user content and device facts', () => {
    const { store, storage } = makeStore();
    for (const k of FEATURE_STATE_KEYS) store.set(k, 'x');
    for (const k of KEPT) store.set(k, 'keep');
    resetFeatureState(storage);
    for (const k of FEATURE_STATE_KEYS) expect(store.has(k), k).toBe(false);
    for (const k of KEPT) expect(store.get(k), k).toBe('keep');
  });

  it('covers the grid, look, camera, pro, mirror, ghost and UI settings', () => {
    for (const k of ['cinegrid_selected_id', 'cinegrid_style', 'cinegrid.geoGridParams', 'cinegrid_look_state', 'cinegrid_pro_photo_settings', 'cinegrid_pro_video_settings', 'cinegrid_mirror_front', 'cinegrid_mirror_rear', 'cinegrid_ghost_overlay', 'cinegrid_active_camera_v1', 'cinegrid_ui_prefs_v1']) {
      expect(FEATURE_SETTING_KEYS as readonly string[]).toContain(k);
    }
  });

  it('with the switch off only the stale session marker is cleared (settings survive)', () => {
    const { store, storage } = makeStore();
    for (const k of FEATURE_STATE_KEYS) store.set(k, 'x');
    resetFeatureState(storage, false);
    for (const k of SESSION_STATE_KEYS) expect(store.has(k)).toBe(false);
    for (const k of FEATURE_SETTING_KEYS) expect(store.get(k), k).toBe('x');
  });
});
