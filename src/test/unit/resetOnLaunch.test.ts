import { describe, it, expect } from 'vitest';
import { FEATURE_STATE_KEYS, resetFeatureState } from '../../utils/resetOnLaunch';

describe('resetOnLaunch', () => {
  it('clears feature settings but keeps the user content and device facts', () => {
    const store = new Map<string, string>();
    const storage = {
      removeItem: (k: string) => void store.delete(k),
    };
    for (const k of FEATURE_STATE_KEYS) store.set(k, 'x');
    const kept = ['cinegrid_photography_sessions', 'cinegrid_favorites', 'cinegrid_custom_presets', 'cinegrid_imported_luts_meta', 'cinegrid_license_entitlement_session', 'cinegrid_unusable_video_res', 'cinegrid_highspeed_broken'];
    for (const k of kept) store.set(k, 'keep');

    resetFeatureState(storage);

    for (const k of FEATURE_STATE_KEYS) expect(store.has(k)).toBe(false);
    for (const k of kept) expect(store.get(k)).toBe('keep');
  });

  it('covers the settings that used to survive a restart (grid, look, pro settings, mirror, active session)', () => {
    for (const k of ['cinegrid_selected_id', 'cinegrid_look_state', 'cinegrid_pro_photo_settings', 'cinegrid_pro_video_settings', 'cinegrid_mirror_front', 'cinegrid_mirror_rear', 'cinegrid_active_session_id']) {
      expect(FEATURE_STATE_KEYS).toContain(k);
    }
  });
});
