import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hardwareIntelligenceService } from '../../services/hardwareIntelligenceService';

describe('HardwareIntelligenceService — Device Hardware Intelligence & Camera Selection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('scans device hardware and returns a complete DeviceHardwareReport', async () => {
    const report = await hardwareIntelligenceService.scanHardware(true);

    expect(report).toBeDefined();
    expect(report.platform).toBeDefined();
    expect(report.totalCameras).toBeGreaterThan(0);
    expect(Array.isArray(report.rearCameras)).toBe(true);
    expect(Array.isArray(report.frontCameras)).toBe(true);
    expect(Array.isArray(report.opticalLensSteps)).toBe(true);
    expect(report.opticalLensSteps.length).toBeGreaterThan(0);
  });

  it('generates optical lens steps sorted by zoom factor', async () => {
    const report = await hardwareIntelligenceService.scanHardware(true);
    const steps = report.opticalLensSteps;

    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].factor).toBeLessThanOrEqual(steps[steps.length - 1].factor);
    expect(steps[0].label).toBeDefined();
    expect(steps[0].focalLengthLabel).toBeDefined();
  });

  it('intelligently selects ultrawide lens when zoom < 0.9x is requested', () => {
    const result = hardwareIntelligenceService.selectBestLensForRequest({
      requestedZoom: 0.5,
      captureMode: 'photo',
      currentFacing: 'back',
    });

    expect(result).toBeDefined();
    expect(result.selectedLens).toBeDefined();
    expect(result.targetZoom).toBeLessThanOrEqual(1.0);
    expect(result.selectionReason).toBeDefined();
  });

  it('intelligently selects primary wide sensor for night mode low-light light gathering', () => {
    const result = hardwareIntelligenceService.selectBestLensForRequest({
      captureMode: 'night',
      preferLowLight: true,
      currentFacing: 'back',
    });

    expect(result.selectedLens.role).toBe('wide');
    expect(result.selectionReason).toContain('low-light');
    expect(result.zoomType).toBe('optical_lens');
    expect(result.isExactPhysicalMatch).toBe(true);
  });

  it('intelligently selects telephoto or portrait lens for portrait capture mode', () => {
    const result = hardwareIntelligenceService.selectBestLensForRequest({
      captureMode: 'portrait',
      currentFacing: 'back',
    });

    expect(result.selectedLens).toBeDefined();
    expect(result.selectionReason).toMatch(/portrait|shallow depth of field/i);
  });

  it('intelligently selects high frame rate capable sensor for slow motion capture', () => {
    const result = hardwareIntelligenceService.selectBestLensForRequest({
      captureMode: 'slow_motion',
      preferHighFps: true,
      currentFacing: 'back',
    });

    expect(result.selectedLens).toBeDefined();
    expect(result.selectedLens.frameRate.max).toBeGreaterThanOrEqual(60);
    expect(result.selectionReason).toContain('high-speed');
  });

  it('accurately distinguishes between optical lens, sensor crop, and digital zoom', () => {
    // 1x = optical lens
    const opticalRes = hardwareIntelligenceService.selectBestLensForRequest({
      requestedZoom: 1.0,
      captureMode: 'photo',
      currentFacing: 'back',
    });
    expect(opticalRes.zoomType).toBe('optical_lens');

    // 1.5x = sensor crop
    const cropRes = hardwareIntelligenceService.selectBestLensForRequest({
      requestedZoom: 1.5,
      captureMode: 'photo',
      currentFacing: 'back',
    });
    expect(cropRes.zoomType).toBe('sensor_crop');

    // 6.0x = digital zoom
    const digitalRes = hardwareIntelligenceService.selectBestLensForRequest({
      requestedZoom: 6.0,
      captureMode: 'photo',
      currentFacing: 'back',
    });
    expect(digitalRes.zoomType).toBe('digital');
  });

  it('detects platform environment accurately', () => {
    const platformInfo = hardwareIntelligenceService.detectPlatform();
    expect(platformInfo.platform).toBeDefined();
    expect(platformInfo.description).toBeDefined();
    expect(platformInfo.nativeFramework).toBeDefined();
  });
});
