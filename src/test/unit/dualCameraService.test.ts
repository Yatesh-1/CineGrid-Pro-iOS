// CineGrid Pro — Dual Camera Service Unit Tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dualCameraService } from '../../services/dualCameraService';

describe('DualCameraService Unit Tests', () => {
  beforeEach(() => {
    dualCameraService.setConfig({
      layout: 'pip',
      primaryFacing: 'environment',
      secondaryFacing: 'user',
      pipPosition: 'top_right',
      pipSize: 'small',
      enableSecondaryAudio: false,
      isSupported: false,
    });
  });

  afterEach(() => {
    dualCameraService.stopSecondaryCamera();
  });

  it('initializes with default dual camera configuration', () => {
    const config = dualCameraService.getConfig();
    expect(config.layout).toBe('pip');
    expect(config.primaryFacing).toBe('environment');
    expect(config.secondaryFacing).toBe('user');
    expect(config.pipPosition).toBe('top_right');
    expect(config.pipSize).toBe('small');
  });

  it('updates layout configurations between PIP, Split-V, and Split-H', () => {
    dualCameraService.setConfig({ layout: 'split_vertical' });
    expect(dualCameraService.getConfig().layout).toBe('split_vertical');

    dualCameraService.setConfig({ layout: 'split_horizontal' });
    expect(dualCameraService.getConfig().layout).toBe('split_horizontal');

    dualCameraService.setConfig({ pipSize: 'large', pipPosition: 'bottom_left' });
    expect(dualCameraService.getConfig().pipSize).toBe('large');
    expect(dualCameraService.getConfig().pipPosition).toBe('bottom_left');
  });

  it('swaps primary and secondary camera roles correctly', async () => {
    const swapped = await dualCameraService.swapCameras();
    expect(swapped.primary).toBe('user');
    expect(swapped.secondary).toBe('environment');

    const config = dualCameraService.getConfig();
    expect(config.primaryFacing).toBe('user');
    expect(config.secondaryFacing).toBe('environment');
  });

  it('probes concurrent hardware support safely without uncaught exceptions', async () => {
    const probe = await dualCameraService.probeDualCameraSupport();
    expect(probe).toBeDefined();
    expect(typeof probe.isSupported).toBe('boolean');
  });

  it('safely releases secondary camera resources and compositing loop', () => {
    expect(() => dualCameraService.stopSecondaryCamera()).not.toThrow();
    expect(dualCameraService.getSecondaryStream()).toBeNull();
  });
});
