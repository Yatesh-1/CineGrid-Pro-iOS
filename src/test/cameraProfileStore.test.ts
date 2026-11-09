import { describe, it, expect, beforeEach } from 'vitest';
import { cameraProfileStore as store } from '../services/cameraProfileStore';
import { BUILTIN_PROFILES } from '../utils/cameraProfile';

beforeEach(() => {
  localStorage.clear();
  store._reloadForTests();
});

describe('cameraProfileStore', () => {
  it('lists all built-ins and resolves by id; null for unknown/empty', () => {
    expect(store.list().length).toBe(BUILTIN_PROFILES.length);
    expect(store.get(BUILTIN_PROFILES[0].id)?.name).toBe(BUILTIN_PROFILES[0].name);
    expect(store.get('nope')).toBeNull();
    expect(store.get(null)).toBeNull();
  });

  it('edits a built-in as an override, persists it, and resets to factory', () => {
    const b = BUILTIN_PROFILES[0];
    const saved = store.update({ ...b, grain: { ...b.grain, amount: 0.9 } });
    expect(saved?.grain.amount).toBe(0.9);
    expect(store.isModified(b.id)).toBe(true);
    expect(store.list().length).toBe(BUILTIN_PROFILES.length); // not duplicated

    store._reloadForTests(); // simulate app restart
    expect(store.get(b.id)?.grain.amount).toBe(0.9);

    expect(store.reset(b.id)?.grain.amount).toBe(b.grain.amount);
    expect(store.isModified(b.id)).toBe(false);
  });

  it('duplicates into an editable user profile and can delete only user profiles', () => {
    const dup = store.duplicate(BUILTIN_PROFILES[1].id)!;
    expect(dup.builtIn).toBe(false);
    expect(store.list().length).toBe(BUILTIN_PROFILES.length + 1);
    expect(store.update({ ...dup, name: 'Mine' })?.name).toBe('Mine');
    expect(store.remove(BUILTIN_PROFILES[1].id)).toBe(false);
    expect(store.remove(dup.id)).toBe(true);
    expect(store.list().length).toBe(BUILTIN_PROFILES.length);
  });

  it('exports and re-imports a profile; rejects garbage without changing state', () => {
    const json = store.exportJson(BUILTIN_PROFILES[2].id)!;
    const r = store.importJson(json);
    expect(r.ok).toBe(true);
    expect(store.list().length).toBe(BUILTIN_PROFILES.length + 1);
    expect(store.importJson('garbage').ok).toBe(false);
    expect(store.list().length).toBe(BUILTIN_PROFILES.length + 1);
  });

  it('notifies subscribers and bumps the revision on change', () => {
    let calls = 0;
    const off = store.subscribe(() => calls++);
    const rev = store.getRevision();
    store.duplicate(BUILTIN_PROFILES[0].id);
    expect(calls).toBe(1);
    expect(store.getRevision()).toBe(rev + 1);
    off();
    store.duplicate(BUILTIN_PROFILES[0].id);
    expect(calls).toBe(1);
  });

  it('survives corrupt or hostile stored data', () => {
    localStorage.setItem('cinegrid_camera_profiles_v1', '{not json');
    localStorage.setItem('cinegrid_camera_profile_overrides_v1', '[1,2]');
    store._reloadForTests();
    expect(store.list().length).toBe(BUILTIN_PROFILES.length);
    localStorage.setItem('cinegrid_camera_profiles_v1', JSON.stringify([{ grain: { amount: 1e9 } }]));
    store._reloadForTests();
    const u = store.list()[BUILTIN_PROFILES.length];
    expect(u.grain.amount).toBe(1);
    expect(u.builtIn).toBe(false);
  });
});

describe('active camera persistence', () => {
  it('remembers the selection while the app stays open, and a fresh start resets it to No camera', async () => {
    const id = BUILTIN_PROFILES[0].id;
    store.setActiveId(id);
    store._reloadForTests();
    expect(store.getActiveId()).toBe(id);
    // reset-on-close clears the selected camera but must not touch the camera profiles themselves
    const { resetFeatureState } = await import('../utils/resetOnLaunch');
    resetFeatureState();
    store._reloadForTests();
    expect(store.getActiveId()).toBeNull();
    expect(store.list().length).toBeGreaterThanOrEqual(BUILTIN_PROFILES.length);
  });

  it('persists a custom camera and its settings, and null means an explicit No camera', () => {
    const dup = store.duplicate(BUILTIN_PROFILES[1].id)!;
    store.update({ ...dup, grain: { ...dup.grain, amount: 0.77 } });
    store.setActiveId(dup.id);
    store._reloadForTests();
    expect(store.getActiveId()).toBe(dup.id);
    expect(store.get(dup.id)?.grain.amount).toBe(0.77);
    store.setActiveId(null);
    expect(store.getActiveId()).toBeNull();
  });

  it('falls back to null when the remembered camera was deleted or the value is junk', () => {
    const dup = store.duplicate(BUILTIN_PROFILES[1].id)!;
    store.setActiveId(dup.id);
    store.remove(dup.id);
    expect(store.getActiveId()).toBeNull();
    localStorage.setItem('cinegrid_active_camera_v1', 'does_not_exist');
    expect(store.getActiveId()).toBeNull();
  });
});
