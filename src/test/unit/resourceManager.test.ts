import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resourceManager } from '../../services/resourceManager';

describe('Central ResourceManager Tests', () => {
  beforeEach(() => {
    resourceManager.cleanupAll();
  });

  it('registers and releases individual resources cleanly', () => {
    const mockDispose = vi.fn();
    const resId = resourceManager.register('tex_1', 'gpu_texture', 'owner_viewfinder', {}, mockDispose);

    expect(resourceManager.getResourceCount()).toBe(1);
    expect(resId).toBe('tex_1');

    resourceManager.release('tex_1');
    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(resourceManager.getResourceCount()).toBe(0);
  });

  it('releases all resources belonging to a specific owner on unmount', () => {
    const dispose1 = vi.fn();
    const dispose2 = vi.fn();
    const disposeOther = vi.fn();

    resourceManager.register('canvas_a', 'canvas_element', 'modal_editor', {}, dispose1);
    resourceManager.register('timer_a', 'timer', 'modal_editor', 123, dispose2);
    resourceManager.register('stream_main', 'stream', 'camera_viewfinder', {}, disposeOther);

    expect(resourceManager.getResourceCount()).toBe(3);

    // Release modal_editor owner resources
    resourceManager.releaseByOwner('modal_editor');

    expect(dispose1).toHaveBeenCalledTimes(1);
    expect(dispose2).toHaveBeenCalledTimes(1);
    expect(disposeOther).not.toHaveBeenCalled();
    expect(resourceManager.getResourceCount()).toBe(1);
  });

  it('releases resources by type', () => {
    const disposeTex1 = vi.fn();
    const disposeTex2 = vi.fn();
    const disposeStream = vi.fn();

    resourceManager.register('t1', 'gpu_texture', 'o1', {}, disposeTex1);
    resourceManager.register('t2', 'gpu_texture', 'o2', {}, disposeTex2);
    resourceManager.register('s1', 'stream', 'o1', {}, disposeStream);

    resourceManager.releaseByType('gpu_texture');

    expect(disposeTex1).toHaveBeenCalledTimes(1);
    expect(disposeTex2).toHaveBeenCalledTimes(1);
    expect(disposeStream).not.toHaveBeenCalled();
  });

  it('manages Object URLs safely and revokes on release', () => {
    const mockBlob = new Blob(['sample data'], { type: 'image/jpeg' });
    const url = resourceManager.createManagedObjectURL(mockBlob, 'test_gallery');

    expect(typeof url).toBe('string');
    expect(resourceManager.getResourceCount()).toBe(1);

    resourceManager.revokeManagedObjectURL(url);
    expect(resourceManager.getResourceCount()).toBe(0);
  });

  it('manages timer registration and clears on release', () => {
    vi.useFakeTimers();
    const timerCallback = vi.fn();
    const timerId = window.setTimeout(timerCallback, 1000);

    resourceManager.registerTimer('capture_timer', 'shutter_dock', timerId, false);
    resourceManager.release('capture_timer');

    vi.advanceTimersByTime(2000);
    expect(timerCallback).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('detects device memory profile with conservative defaults', () => {
    const profile = resourceManager.getMemoryProfile();
    expect(profile.deviceMemoryGb).toBeGreaterThanOrEqual(1);
    expect(profile.hardwareConcurrency).toBeGreaterThanOrEqual(1);
    expect(profile.maxLutCacheCount).toBeGreaterThanOrEqual(4);
    expect(profile.maxImageCacheMb).toBeGreaterThanOrEqual(64);
  });
});
