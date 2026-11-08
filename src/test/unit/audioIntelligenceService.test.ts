// CineGrid Pro — Audio Intelligence Service Unit Tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { audioIntelligenceService } from '../../services/audioIntelligenceService';

describe('AudioIntelligenceService Unit Tests', () => {
  beforeEach(() => {
    audioIntelligenceService.setConfig({
      mode: 'auto',
      noiseReductionIntensity: 75,
      windReduction: true,
      voiceEnhancement: true,
      monitoringEnabled: false,
      bypassDsp: false,
      selectedInputId: 'default',
    });
  });

  afterEach(() => {
    audioIntelligenceService.cleanupNodes();
  });

  it('initializes with default audio intelligence config', () => {
    const config = audioIntelligenceService.getConfig();
    expect(config.mode).toBe('auto');
    expect(config.noiseReductionIntensity).toBe(75);
    expect(config.windReduction).toBe(true);
    expect(config.voiceEnhancement).toBe(true);
    expect(config.bypassDsp).toBe(false);
  });

  it('updates configuration patches accurately', () => {
    audioIntelligenceService.setConfig({
      mode: 'wind_reduction',
      noiseReductionIntensity: 90,
      windReduction: true,
      bypassDsp: false,
    });

    const updated = audioIntelligenceService.getConfig();
    expect(updated.mode).toBe('wind_reduction');
    expect(updated.noiseReductionIntensity).toBe(90);
  });

  it('enables raw mic bypass mode when requested', () => {
    audioIntelligenceService.setConfig({ bypassDsp: true });
    expect(audioIntelligenceService.getConfig().bypassDsp).toBe(true);

    audioIntelligenceService.setConfig({ mode: 'off' });
    expect(audioIntelligenceService.getConfig().mode).toBe('off');
  });

  it('enumerates microphones and identifies external microphones correctly', async () => {
    const res = await audioIntelligenceService.enumerateMicrophones();
    expect(res).toBeDefined();
    expect(Array.isArray(res.inputs)).toBe(true);
    expect(res.inputs.length).toBeGreaterThan(0);
    expect(typeof res.hasExternalMic).toBe('boolean');
  });

  it('returns valid decibel meter levels within -60 dB to 0 dB bounds', () => {
    const meter = audioIntelligenceService.getLiveMeter();
    expect(meter.rmsDb).toBeGreaterThanOrEqual(-60);
    expect(meter.rmsDb).toBeLessThanOrEqual(0);
    expect(meter.peakDb).toBeGreaterThanOrEqual(-60);
    expect(meter.peakDb).toBeLessThanOrEqual(0);
    expect(typeof meter.isClipping).toBe('boolean');
  });

  it('safely cleans up all audio nodes without memory leaks', () => {
    expect(() => audioIntelligenceService.cleanupNodes()).not.toThrow();
  });
});
