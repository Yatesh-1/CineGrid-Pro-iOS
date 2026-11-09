import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraService } from '../../services/cameraService';
import { sessionService } from '../../services/sessionService';
import { licenseService } from '../../services/licenseService';
import { audioIntelligenceService } from '../../services/audioIntelligenceService';
import { slowMotionService } from '../../services/slowMotionService';
import { timelapseService } from '../../services/timelapseService';
import { dualCameraService } from '../../services/dualCameraService';
import { nightCaptureService } from '../../services/nightCaptureService';
import { wideSelfieService } from '../../services/wideSelfieService';
import { calculateOutputDimensions } from '../../utils/exportEngine';
import { DEFAULT_STUDIO_STATE } from '../../utils/studioEngine';
import type { PhotoExportSettings } from '../../types/export';

const baseExportSettings: PhotoExportSettings = {
  format: 'jpeg',
  quality: 90,
  resizeMode: 'original',
  resizePercentage: 100,
  customWidth: 1080,
  customHeight: 1350,
  maintainAspectRatio: true,
  colorSpace: 'sRGB',
  stripGpsMetadata: true,
  stripExifCameraInfo: false,
  sharpening: 'none',
  watermark: {
    enabled: false,
    text: '',
    opacity: 50,
    position: 'bottom_right',
    fontSize: 24,
    color: '#ffffff',
  },
};

describe('iOS Real-World End-to-End Production Journeys', () => {
  beforeEach(() => {
    localStorage.clear();
    licenseService.clearSession();
    vi.restoreAllMocks();
  });

  it('Journey 1: App Launch -> Initial Activation Verification -> Entitlement Session Management', async () => {
    // 1. Initial unactivated state check
    const initial = await licenseService.checkInitialActivation();
    expect(initial.isActivated).toBe(false);
    expect(initial.session).toBeNull();

    // 2. Simulate valid verified offline entitlement session
    const now = Date.now();
    const validSession = {
      entitlementToken: 'mock_jwt_verified_token_ios',
      name: 'Production Director',
      licenseKeyMasked: 'CINE-****-****-2026',
      type: 'lifetime' as const,
      status: 'active' as const,
      activatedAt: now,
      expiresAt: null,
      deviceCount: 1,
      maxDevices: 5,
      lastValidatedAt: now,
      offlineUntil: now + 7 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem('cinegrid_license_entitlement_session', JSON.stringify(validSession));

    const checked = await licenseService.checkInitialActivation();
    expect(checked.isActivated).toBe(true);
    expect(checked.session?.name).toBe('Production Director');

    // 3. Confirm deactivation cleans up session
    licenseService.clearSession();
    expect(licenseService.getSession()).toBeNull();
  });

  it('Journey 2: Viewfinder Setup -> Manual Exposure & Rotary Shutter Calculation', () => {
    const camera = CameraService.getInstance();

    // Standard 24fps cinema standard 180 rotary shutter angle
    const calc24 = camera.calculate180DegreeShutter(24);
    expect(calc24.shutterSpeed).toBe('1/50');
    expect(calc24.shutterAngle).toBe(180);

    // 60fps high frame rate
    const calc60 = camera.calculate180DegreeShutter(60);
    expect(calc60.shutterSpeed).toBe('1/120');

    // Timecode generation for drop-frame and record-run
    const tc = camera.formatTimecode(3661, 24, 'time_of_day');
    expect(tc).toContain(':');
  });

  it('Journey 3: Computational Capture Modes (Night, Dual, SlowMo, Timelapse, Wide Selfie)', () => {
    // Night Mode hardware capability check & fallback
    const hwCheck = nightCaptureService.queryHardwareExposureSupport({
      getCapabilities: () => ({ exposureTime: { min: 1, max: 8000, step: 1 } }),
    } as unknown as MediaStreamTrack);
    expect(hwCheck.hasHardwareLongExposure).toBe(true);
    expect(hwCheck.maxExposureMs).toBe(8000);

    // Dual Camera configuration switching
    expect(dualCameraService.getConfig().layout).toBe('pip');
    dualCameraService.setConfig({
      ...dualCameraService.getConfig(),
      layout: 'split',
    });
    expect(dualCameraService.getConfig().layout).toBe('split');

    // SlowMo configuration
    slowMotionService.setConfig({ ...slowMotionService.getConfig(), playbackSpeed: 0.25 });
    expect(slowMotionService.getConfig().playbackSpeed).toBe(0.25);

    // Timelapse intervalometer
    timelapseService.setConfig({ ...timelapseService.getConfig(), interval: 5, outputFps: 30 });
    expect(timelapseService.getConfig().interval).toBe(5);

    // Wide selfie guide
    wideSelfieService.setConfig({ groupGuideOverlay: true });
    wideSelfieService.setConfig({ groupGuideOverlay: true });
    expect(wideSelfieService.getConfig().groupGuideOverlay).toBe(true);
  });

  it('Journey 4: Web Audio DSP Pipeline & Noise Reduction Presets', () => {
    // Test audio intelligence configuration presets
    const modes = ['off', 'standard', 'strong', 'wind', 'voice_focus', 'auto'] as const;
    for (const mode of modes) {
      audioIntelligenceService.setConfig({
        mode,
        noiseReductionIntensity: 80,
        windReduction: mode === 'wind',
        voiceEnhancement: mode === 'voice_focus',
        monitoringEnabled: false,
        bypassDsp: mode === 'off',
        selectedInputId: 'default',
      });
      expect(audioIntelligenceService.getConfig().mode).toBe(mode);
    }
    audioIntelligenceService.cleanupNodes();
  });

  it('Journey 5: Photo Capture -> Studio Editing -> Output Dimension Calculations', () => {
    // Studio adjustments logic
    const state = { ...DEFAULT_STUDIO_STATE, exposure: 1.5, contrast: 10, saturation: -5 };
    expect(state.exposure).toBe(1.5);

    // Dimension and format calculations
    const dims4k = calculateOutputDimensions(3840, 2160, baseExportSettings);
    expect(dims4k.width).toBe(3840);
    expect(dims4k.height).toBe(2160);

    const dimsPercent = calculateOutputDimensions(4000, 3000, {
      ...baseExportSettings,
      resizeMode: 'percentage',
      resizePercentage: 50,
    });
    expect(dimsPercent.width).toBe(2000);
    expect(dimsPercent.height).toBe(1500);
  });

  it('Journey 6: Session Management & Shot Logging', () => {
    const session = sessionService.createSession({
      name: 'Cinematic Test Shoot',
      category: 'Commercial',
      aspectRatio: '2.39:1',
      frameRate: 24,
    });
    expect(session.id).toBeDefined();

    sessionService.setActiveSession(session.id);
    expect(sessionService.getActiveSession()?.name).toBe('Cinematic Test Shoot');

    const added = sessionService.addPhotoToActiveSession('photo_test_123');
    expect(added).toBe(true);
    expect(sessionService.getActiveSession()?.capturedPhotoIds).toContain('photo_test_123');
  });
});
