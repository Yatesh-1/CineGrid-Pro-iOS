import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraService, type CameraEngineState } from '../../services/cameraService';

describe('CameraService State Machine & Concurrency Tests', () => {
  let camera: CameraService;

  beforeEach(() => {
    camera = CameraService.getInstance();
    camera.dispose();
  });

  it('starts in idle state', () => {
    expect(camera.getState()).toBe('idle');
  });

  it('allows valid state progression: idle -> initializing -> ready', () => {
    const states: CameraEngineState[] = [];
    const unsub = camera.onStateChange((s) => states.push(s));

    expect(camera.canTransition('initializing')).toBe(true);
    expect(camera.transitionTo('initializing')).toBe(true);
    expect(camera.getState()).toBe('initializing');

    expect(camera.canTransition('ready')).toBe(true);
    expect(camera.transitionTo('ready')).toBe(true);
    expect(camera.getState()).toBe('ready');

    unsub();
    expect(states).toContain('initializing');
    expect(states).toContain('ready');
  });

  it('rejects invalid state transitions to prevent corrupted states', () => {
    // From idle, directly jumping to capturing or recording is prohibited
    expect(camera.canTransition('capturing')).toBe(false);
    expect(camera.transitionTo('capturing')).toBe(false);
    expect(camera.getState()).toBe('idle');

    expect(camera.canTransition('recording')).toBe(false);
    expect(camera.transitionTo('recording')).toBe(false);
    expect(camera.getState()).toBe('idle');
  });

  it('coordinates shutter capture lock through beginCapture and endCapture', () => {
    // Cannot capture when idle
    expect(camera.beginCapture()).toBe(false);

    // Make ready
    camera.transitionTo('initializing');
    camera.transitionTo('ready');

    // Acquire capture lock
    expect(camera.beginCapture()).toBe(true);
    expect(camera.getState()).toBe('capturing');

    // Double-tap while capturing must be rejected!
    expect(camera.beginCapture()).toBe(false);

    // End capture returns to ready
    camera.endCapture();
    expect(camera.getState()).toBe('ready');
  });

  it('handles visibility changes without crashing or leaking', () => {
    const mockVideo = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      srcObject: null,
    } as unknown as HTMLVideoElement;

    // Attach video
    const mockStream = { getTracks: () => [] } as unknown as MediaStream;
    camera.attachVideo(mockVideo, mockStream);

    // App goes to background
    camera.handleVisibilityChange(false);
    expect(mockVideo.pause).toHaveBeenCalled();

    // Detach video safely
    camera.detachVideo(mockVideo);
    expect(mockVideo.srcObject).toBeNull();
  });
});
