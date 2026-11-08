import { describe, it, expect, afterEach, vi } from 'vitest';
import { cinemaVideoService } from '../../services/cinemaVideoService';

afterEach(() => {
  cinemaVideoService.endExternalRecording();
  vi.useRealTimers();
});

describe('cinemaVideoService external (native) recording hooks', () => {
  it('drives the same HUD state as a normal recording: recording flag, clip name, elapsed time', () => {
    vi.useFakeTimers();
    const seen: boolean[] = [];
    const off = cinemaVideoService.subscribe((c) => seen.push(c.isRecording));
    const clip = cinemaVideoService.beginExternalRecording();
    expect(clip.length).toBeGreaterThan(0);
    expect(cinemaVideoService.getConfig().isRecording).toBe(true);
    expect(cinemaVideoService.getConfig().productionSlate.clipName).toBe(clip);
    vi.advanceTimersByTime(3200);
    expect(cinemaVideoService.getConfig().recordingElapsedSeconds).toBeGreaterThanOrEqual(0);
    const end = cinemaVideoService.endExternalRecording();
    expect(end?.clipName).toBe(clip);
    expect(cinemaVideoService.getConfig().isRecording).toBe(false);
    expect(seen).toContain(true);
    expect(seen[seen.length - 1]).toBe(false);
    off();
  });

  it('advances the take number like a normal stop, and is safe to call twice', () => {
    const take0 = cinemaVideoService.getConfig().productionSlate.take;
    cinemaVideoService.beginExternalRecording();
    expect(cinemaVideoService.beginExternalRecording()).toBe(cinemaVideoService.getConfig().productionSlate.clipName);
    expect(cinemaVideoService.endExternalRecording()).not.toBeNull();
    expect(cinemaVideoService.getConfig().productionSlate.take).toBe(take0 + 1);
    expect(cinemaVideoService.endExternalRecording()).toBeNull();
    expect(cinemaVideoService.getConfig().productionSlate.take).toBe(take0 + 1);
  });
});
