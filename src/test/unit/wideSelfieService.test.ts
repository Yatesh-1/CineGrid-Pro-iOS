// CineGrid Pro — Wide Selfie Service Unit Tests

import { describe, it, expect, beforeEach } from 'vitest';
import { wideSelfieService } from '../../services/wideSelfieService';

describe('WideSelfieService Unit Tests', () => {
  beforeEach(() => {
    wideSelfieService.setConfig({
      framing: 'normal',
      hasHardwareUltraWide: false,
      groupGuideOverlay: true,
      frontLensZoom: 1.0,
    });
  });

  it('initializes with default wide selfie configuration', () => {
    const config = wideSelfieService.getConfig();
    expect(config.framing).toBe('normal');
    expect(config.groupGuideOverlay).toBe(true);
    expect(config.frontLensZoom).toBe(1.0);
  });

  it('updates configuration patch properly', () => {
    wideSelfieService.setConfig({ groupGuideOverlay: false });
    expect(wideSelfieService.getConfig().groupGuideOverlay).toBe(false);
  });

  it('switches between normal 1x and wide framing without error', async () => {
    const mockTrack = {
      getCapabilities: () => ({ zoom: { min: 0.5, max: 2.0 } }),
      applyConstraints: async () => {},
    } as unknown as MediaStreamTrack;

    await wideSelfieService.inspectFrontLenses(mockTrack);

    const normalRes = await wideSelfieService.setFraming('normal', mockTrack);
    expect(normalRes.appliedZoom).toBe(1.0);
    expect(wideSelfieService.getConfig().framing).toBe('normal');

    const wideRes = await wideSelfieService.setFraming('wide', mockTrack);
    expect(wideRes.appliedZoom).toBeLessThanOrEqual(0.7);
    expect(wideSelfieService.getConfig().framing).toBe('wide');
  });
});
