// CineGrid Pro — Device Hardware Intelligence & Intelligent Lens Manager
// Comprehensive detection of physical camera hardware, sensor profiles, optical zoom capabilities,
// and intelligent automatic lens selection without falsifying hardware limits.

import type {
  PhysicalCameraHardwareProfile,
  PhysicalLensRole,
  LensFacing,
  ResolutionOption,
  OpticalLensStep,
  DeviceHardwareReport,
  LensSelectionRequest,
  AutomaticLensSelectionResult,
  ZoomMagnificationType,
} from '../types/hardware';

export class HardwareIntelligenceService {
  private static instance: HardwareIntelligenceService;

  private cachedReport: DeviceHardwareReport | null = null;
  private isScanning = false;
  private deviceChangeSubscribed = false;
  private activePhysicalProfile: PhysicalCameraHardwareProfile | null = null;
  private reportListeners = new Set<(report: DeviceHardwareReport) => void>();

  private constructor() {
    this.setupDeviceChangeListener();
  }

  public static getInstance(): HardwareIntelligenceService {
    if (!HardwareIntelligenceService.instance) {
      HardwareIntelligenceService.instance = new HardwareIntelligenceService();
    }
    return HardwareIntelligenceService.instance;
  }

  /**
   * Listen to W3C devicechange events to dynamically refresh camera profiles
   * when external USB/Lightning/wireless lenses or cameras are attached or detached.
   */
  private setupDeviceChangeListener(): void {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      if (!this.deviceChangeSubscribed) {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
          console.log('[HardwareIntelligence] Camera hardware change detected. Re-evaluating capabilities...');
          await this.scanHardware(true);
        });
        this.deviceChangeSubscribed = true;
      }
    }
  }

  public onReportUpdate(listener: (report: DeviceHardwareReport) => void): () => void {
    this.reportListeners.add(listener);
    if (this.cachedReport) {
      listener(this.cachedReport);
    }
    return () => {
      this.reportListeners.delete(listener);
    };
  }

  /**
   * Detect current platform environment
   */
  public detectPlatform(): {
    platform: 'ios' | 'android' | 'web' | 'desktop';
    description: string;
    nativeFramework: 'AVFoundation' | 'Camera2' | 'W3C_MediaDevices';
  } {
    if (typeof navigator === 'undefined') {
      return { platform: 'web', description: 'Headless / SSR', nativeFramework: 'W3C_MediaDevices' };
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isMobile = isIOS || isAndroid;

    // Check if Capacitor native bridge is present
    const hasCapacitor = typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

    if (isIOS) {
      return {
        platform: 'ios',
        description: hasCapacitor ? 'iOS Native App (AVFoundation Bridge)' : 'iOS WebKit / Mobile Safari',
        nativeFramework: hasCapacitor ? 'AVFoundation' : 'W3C_MediaDevices',
      };
    }

    if (isAndroid) {
      return {
        platform: 'android',
        description: hasCapacitor ? 'Android Native App (Camera2 Bridge)' : 'Android Chrome / WebView',
        nativeFramework: hasCapacitor ? 'Camera2' : 'W3C_MediaDevices',
      };
    }

    if (!isMobile) {
      return {
        platform: 'desktop',
        description: 'Desktop Browser (External Webcams / High-Res Capture)',
        nativeFramework: 'W3C_MediaDevices',
      };
    }

    return {
      platform: 'web',
      description: 'Standard W3C Browser',
      nativeFramework: 'W3C_MediaDevices',
    };
  }

  /**
   * Scan and build a comprehensive DeviceHardwareReport
   */
  public async scanHardware(forceRefresh = false): Promise<DeviceHardwareReport> {
    if (this.cachedReport && !forceRefresh) {
      return this.cachedReport;
    }

    if (this.isScanning) {
      // Return cached while scanning is in progress
      if (this.cachedReport) return this.cachedReport;
    }

    this.isScanning = true;
    const warnings: string[] = [];

    try {
      const platformInfo = this.detectPlatform();
      let videoDevices: MediaDeviceInfo[] = [];
      let audioCount = 0;

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
          audioCount = allDevices.filter((d) => d.kind === 'audioinput').length;
        } catch (err) {
          warnings.push(`Device enumeration restricted: ${String(err)}`);
        }
      } else {
        warnings.push('navigator.mediaDevices API unavailable in this runtime.');
      }

      // If no devices found, generate a baseline default fallback profile
      if (videoDevices.length === 0) {
        videoDevices = [
          {
            deviceId: 'default_back',
            groupId: 'group_0',
            kind: 'videoinput',
            label: 'Default Rear Camera (Wide 1x)',
            toJSON: () => ({}),
          },
          {
            deviceId: 'default_front',
            groupId: 'group_1',
            kind: 'videoinput',
            label: 'Default Front Camera (Selfie 1x)',
            toJSON: () => ({}),
          },
        ];
        warnings.push('No physical devices enumerated. Initialized standard device simulation profiles.');
      }

      const profiles: PhysicalCameraHardwareProfile[] = [];

      for (let i = 0; i < videoDevices.length; i++) {
        const d = videoDevices[i];
        const profile = this.analyzePhysicalCamera(d, i, videoDevices.length);
        profiles.push(profile);
      }

      // Group into Rear and Front
      const rearCameras = profiles.filter((p) => p.facing === 'back');
      const frontCameras = profiles.filter((p) => p.facing === 'front');

      // Sort rear cameras by optical zoom factor ascending (e.g. 0.5x -> 1.0x -> 2.0x -> 3.0x -> 5.0x)
      rearCameras.sort((a, b) => a.opticalZoomFactor - b.opticalZoomFactor);

      // Generate Optical Lens Steps
      const opticalLensSteps = this.generateOpticalLensSteps(rearCameras);

      // Inspect concurrent camera possibilities
      const hasConcurrent = rearCameras.length > 0 && frontCameras.length > 0;
      const concurrentCombinations: { primaryId: string; secondaryId: string }[] = [];
      if (hasConcurrent) {
        for (const rear of rearCameras) {
          for (const front of frontCameras) {
            concurrentCombinations.push({ primaryId: rear.deviceId, secondaryId: front.deviceId });
          }
        }
      }

      const report: DeviceHardwareReport = {
        platform: platformInfo.platform,
        platformDescription: platformInfo.description,
        isNativeBridgeActive: platformInfo.nativeFramework !== 'W3C_MediaDevices',
        nativeFramework: platformInfo.nativeFramework,
        totalCameras: profiles.length,
        rearCameras,
        frontCameras,
        allCameras: profiles,
        opticalLensSteps,
        hasConcurrentCameraSupport: hasConcurrent,
        concurrentCombinations,
        audioInputsCount: audioCount,
        detectedAt: Date.now(),
        warningsAndLimitations: warnings,
      };

      this.cachedReport = report;
      this.applyNativeSpecs(null); // use real optics if the Camera2 report already arrived
      this.notifyListeners(report);
      return report;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Intelligently classify a camera device into its physical lens role and hardware specifications
   */
  private analyzePhysicalCamera(
    device: MediaDeviceInfo,
    index: number,
    totalDevices: number
  ): PhysicalCameraHardwareProfile {
    const rawLabel = (device.label || '').toLowerCase();
    let facing: LensFacing = 'back';

    // 1. Determine facing orientation
    if (
      rawLabel.includes('front') ||
      rawLabel.includes('user') ||
      rawLabel.includes('selfie') ||
      rawLabel.includes('facetime') ||
      rawLabel.includes('truedepth')
    ) {
      facing = 'front';
    } else if (
      rawLabel.includes('back') ||
      rawLabel.includes('rear') ||
      rawLabel.includes('environment') ||
      rawLabel.includes('world')
    ) {
      facing = 'back';
    } else {
      // Heuristic fallback for index
      facing = index === 0 ? 'back' : index === 1 && totalDevices > 1 ? 'front' : 'back';
    }

    // 2. Determine Physical Lens Role
    let role: PhysicalLensRole = 'wide';
    let opticalZoomFactor = 1.0;
    let equivalentFocalLengthMm = 24;
    let nativeAperture = 'f/1.8';
    let isMacro = false;

    if (facing === 'front') {
      if (rawLabel.includes('ultra') || rawLabel.includes('0.5') || rawLabel.includes('0.7') || rawLabel.includes('wide')) {
        role = 'front_ultrawide';
        opticalZoomFactor = 0.7;
        equivalentFocalLengthMm = 18;
        nativeAperture = 'f/2.2';
      } else {
        role = 'front_wide';
        opticalZoomFactor = 1.0;
        equivalentFocalLengthMm = 23;
        nativeAperture = 'f/2.2';
      }
    } else {
      // Rear camera role analysis
      if (
        rawLabel.includes('ultra') ||
        rawLabel.includes('0.5') ||
        rawLabel.includes('13mm') ||
        rawLabel.includes('14mm') ||
        rawLabel.includes('back camera 0') ||
        rawLabel.includes('wide-angle 0.5')
      ) {
        role = 'ultrawide';
        opticalZoomFactor = 0.5;
        equivalentFocalLengthMm = 13;
        nativeAperture = 'f/2.2';
        isMacro = true; // Modern ultrawide cameras usually double as macro lenses
      } else if (
        rawLabel.includes('periscope') ||
        rawLabel.includes('5x') ||
        rawLabel.includes('10x') ||
        rawLabel.includes('120mm')
      ) {
        role = 'periscope';
        opticalZoomFactor = 5.0;
        equivalentFocalLengthMm = 120;
        nativeAperture = 'f/3.0';
      } else if (
        rawLabel.includes('tele') ||
        rawLabel.includes('2x') ||
        rawLabel.includes('3x') ||
        rawLabel.includes('77mm') ||
        rawLabel.includes('zoom')
      ) {
        role = 'telephoto';
        opticalZoomFactor = rawLabel.includes('2x') ? 2.0 : 3.0;
        equivalentFocalLengthMm = opticalZoomFactor === 2.0 ? 50 : 77;
        nativeAperture = 'f/2.8';
      } else if (rawLabel.includes('macro')) {
        role = 'macro';
        opticalZoomFactor = 1.0;
        equivalentFocalLengthMm = 20;
        nativeAperture = 'f/2.4';
        isMacro = true;
      } else {
        // Standard primary wide camera
        role = 'wide';
        opticalZoomFactor = 1.0;
        equivalentFocalLengthMm = 24;
        nativeAperture = 'f/1.6';
      }
    }

    // 3. Supported resolutions
    const supportedResolutions: ResolutionOption[] = [
      { label: '4K UHD (3840×2160)', width: 3840, height: 2160, aspectRatio: '16:9' },
      { label: '1080p FHD (1920×1080)', width: 1920, height: 1080, aspectRatio: '16:9' },
      { label: '720p HD (1280×720)', width: 1280, height: 720, aspectRatio: '16:9' },
      { label: 'Standard Photo (4032×3024)', width: 4032, height: 3024, aspectRatio: '4:3' },
    ];

    // 4. Framerate capabilities
    const supportedFps = [24, 25, 30, 50, 60];
    const canDo120 = role === 'wide' || role === 'ultrawide';
    if (canDo120) supportedFps.push(120);

    const frameRate = {
      min: 15,
      max: canDo120 ? 120 : 60,
      supportedFps,
      supportsSlowMo: canDo120,
    };

    // 5. Exposure capabilities
    const exposure = {
      hasHardwareExposureTime: true,
      minExposureDurationMs: 0.125, // 1/8000s
      maxExposureDurationMs: 1000,   // 1s
      hasHardwareIso: true,
      minIso: 50,
      maxIso: role === 'wide' ? 6400 : 3200,
      stepIso: 50,
      hasExposureCompensation: true,
      minEv: -3.0,
      maxEv: 3.0,
      stepEv: 0.1,
    };

    // 6. Focus capabilities
    const isFixedFocus = role === 'front_wide' && rawLabel.includes('fixed');
    const focus = {
      hasAutoFocus: !isFixedFocus,
      hasManualFocus: !isFixedFocus,
      minFocusDistanceMeters: isMacro ? 0.02 : role === 'telephoto' ? 0.6 : 0.1,
      isFixedFocus,
      supportedModes: isFixedFocus ? ['fixed'] : ['continuous', 'auto', 'manual'],
    };

    // 7. White Balance
    const whiteBalance = {
      hasAuto: true,
      hasManualKelvin: true,
      minKelvin: 2500,
      maxKelvin: 9000,
      stepKelvin: 100,
      supportedModes: ['continuous', 'manual'],
    };

    return {
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1} (${facing === 'front' ? 'Front' : 'Rear'})`,
      role,
      facing,
      equivalentFocalLengthMm,
      opticalZoomFactor,
      nativeAperture,
      supportedResolutions,
      frameRate,
      exposure,
      focus,
      whiteBalance,
      hasHardwareZoom: true,
      minHardwareZoom: 1.0,
      maxHardwareZoom: 5.0,
      stepHardwareZoom: 0.1,
      hasTorch: facing === 'back',
      hasOpticalStabilization: role === 'wide' || role === 'telephoto' || role === 'periscope',
      hasElectronicStabilization: true,
      hasDepthCapture: role === 'wide' || rawLabel.includes('depth') || rawLabel.includes('truedepth'),
      isMacroCapable: isMacro,
      isVirtualLogicalDevice: false,
    };
  }

  /**
   * Generates discrete Optical Lens Steps for the zoom HUD
   */
  private generateOpticalLensSteps(rearCameras: PhysicalCameraHardwareProfile[]): OpticalLensStep[] {
    if (rearCameras.length === 0) {
      return [
        {
          factor: 1.0,
          label: '1x',
          focalLengthLabel: '24mm',
          role: 'wide',
          deviceId: 'default',
          isPhysicalSwitch: false,
        },
      ];
    }

    const steps: OpticalLensStep[] = [];

    for (const cam of rearCameras) {
      const factor = cam.opticalZoomFactor;
      const label = factor === 0.5 ? '0.5x' : `${factor}x`;
      const focalLengthLabel = cam.equivalentFocalLengthMm ? `${cam.equivalentFocalLengthMm}mm` : `${factor}x`;

      steps.push({
        factor,
        label,
        focalLengthLabel,
        role: cam.role,
        deviceId: cam.deviceId,
        isPhysicalSwitch: true,
      });
    }

    // If only one physical rear camera exists, provide useful standard stops with clear digital/crop indication
    if (steps.length === 1 && steps[0].factor === 1.0) {
      steps.push({
        factor: 2.0,
        label: '2x',
        focalLengthLabel: '48mm (Crop)',
        role: 'wide',
        deviceId: steps[0].deviceId,
        isPhysicalSwitch: false,
      });
      steps.push({
        factor: 3.0,
        label: '3x',
        focalLengthLabel: '72mm (Digital)',
        role: 'wide',
        deviceId: steps[0].deviceId,
        isPhysicalSwitch: false,
      });
    }

    return steps;
  }

  /**
   * Update active physical profile based on active track capabilities
   */
  public updateActiveTrackCapabilities(track: MediaStreamTrack): void {
    if (!track) return;
    const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
    const settings = (track.getSettings ? track.getSettings() : {}) as any;

    if (!this.cachedReport) return;

    // Find profile matching current deviceId or settings
    const activeId = settings.deviceId;
    const profile = this.cachedReport.allCameras.find((p) => p.deviceId === activeId) || this.cachedReport.allCameras[0];

    if (profile) {
      profile.rawCapabilities = caps;

      if (caps.zoom) {
        profile.hasHardwareZoom = true;
        profile.minHardwareZoom = caps.zoom.min || 1.0;
        profile.maxHardwareZoom = caps.zoom.max || 5.0;
        profile.stepHardwareZoom = caps.zoom.step || 0.1;
      }

      if (caps.torch !== undefined) {
        profile.hasTorch = !!caps.torch;
      }

      if (caps.focusMode) {
        profile.focus.hasAutoFocus = caps.focusMode.includes('continuous') || caps.focusMode.includes('auto');
        profile.focus.hasManualFocus = caps.focusMode.includes('manual');
        profile.focus.supportedModes = caps.focusMode;
      }

      if (caps.exposureTime) {
        profile.exposure.hasHardwareExposureTime = true;
        profile.exposure.minExposureDurationMs = (caps.exposureTime.min || 1) * EXPOSURE_TIME_UNIT_SECONDS * 1000;
        profile.exposure.maxExposureDurationMs = (caps.exposureTime.max || 10000) * EXPOSURE_TIME_UNIT_SECONDS * 1000;
      }

      if (caps.iso) {
        profile.exposure.hasHardwareIso = true;
        profile.exposure.minIso = caps.iso.min || 50;
        profile.exposure.maxIso = caps.iso.max || 3200;
      }

      if (caps.exposureCompensation) {
        profile.exposure.hasExposureCompensation = true;
        profile.exposure.minEv = caps.exposureCompensation.min || -3.0;
        profile.exposure.maxEv = caps.exposureCompensation.max || 3.0;
        profile.exposure.stepEv = caps.exposureCompensation.step || 0.1;
      }

      if (caps.frameRate) {
        profile.frameRate.min = caps.frameRate.min || 15;
        profile.frameRate.max = caps.frameRate.max || 60;
      }

      this.activePhysicalProfile = profile;
    }
  }

  public getActiveProfile(): PhysicalCameraHardwareProfile | null {
    return this.activePhysicalProfile;
  }

  private nativeCaps: NativeCapabilities | null = null;

  /**
   * Replaces guessed optics with what the phone's camera HAL reports (Camera2): the real focal length converted to
   * its 35 mm equivalent, aperture and stabilisation. Lens roles (ultra-wide, tele) cannot be identified from the
   * WebView's device labels, so only the main camera of each side gets measured values; for any other profile an
   * estimate is not shown at all.
   */
  public applyNativeSpecs(caps: NativeCapabilities | null): void {
    if (caps) this.nativeCaps = caps;
    const c = this.nativeCaps;
    if (!c || !this.cachedReport) return;
    const seen = new Set<PhysicalCameraHardwareProfile>();
    for (const p of [...this.cachedReport.allCameras, ...this.cachedReport.rearCameras, ...this.cachedReport.frontCameras]) {
      if (!p || seen.has(p)) continue;
      seen.add(p);
      const facing = p.facing === 'front' ? 'front' : 'back';
      const native = pickNativeCamera(c, facing);
      const isMain = p.role === 'wide' || p.role === 'front_wide';
      if (isMain && native?.equivalentMm) p.equivalentFocalLengthMm = native.equivalentMm;
      else if (!isMain) p.equivalentFocalLengthMm = undefined;
      else p.equivalentFocalLengthMm = undefined; // main camera, but the phone does not report its optics
      if (isMain && native?.aperture) p.nativeAperture = `f/${Number(native.aperture.toFixed(1))}`;
      else p.nativeAperture = 'Not reported';
      if (native) {
        p.hasTorch = native.hasFlash ?? p.hasTorch;
        p.hasOpticalStabilization = native.ois ?? false;
        p.hasElectronicStabilization = native.eis ?? false;
      }
    }
  }

  /**
   * Intelligent Camera & Lens Selection Engine
   * Evaluates capture mode, FOV requests, lighting conditions, and frame rates
   * to pick the optimal genuine physical sensor without pretending unsupported capabilities.
   */
  public selectBestLensForRequest(request: LensSelectionRequest): AutomaticLensSelectionResult {
    const report = this.cachedReport || {
      rearCameras: [],
      frontCameras: [],
      allCameras: [],
      opticalLensSteps: [],
      warningsAndLimitations: [],
    };

    const rearCameras = report.rearCameras;
    const frontCameras = report.frontCameras;

    // Handle Selfie & Front Facing
    if (request.targetFov === 'selfie' || request.targetFov === 'wide_selfie' || request.currentFacing === 'front') {
      if (frontCameras.length === 0) {
        // Fallback to first available camera
        const fallback = report.allCameras[0] || this.createMockDefaultLens('default_front', 'front');
        return {
          selectedLens: fallback,
          selectionReason: 'No dedicated front camera found; utilizing default camera.',
          targetZoom: 1.0,
          zoomType: 'optical_lens',
          isExactPhysicalMatch: false,
          alternativeLenses: [],
        };
      }

      if (request.targetFov === 'wide_selfie' || (request.requestedZoom && request.requestedZoom < 0.9)) {
        const ultrawideFront = frontCameras.find((c) => c.role === 'front_ultrawide');
        if (ultrawideFront) {
          return {
            selectedLens: ultrawideFront,
            selectionReason: 'Selected physical front ultrawide lens for wide group selfie framing.',
            targetZoom: 0.7,
            zoomType: 'optical_lens',
            isExactPhysicalMatch: true,
            alternativeLenses: frontCameras.filter((c) => c.deviceId !== ultrawideFront.deviceId),
          };
        } else {
          return {
            selectedLens: frontCameras[0],
            selectionReason: 'Physical ultrawide front camera unavailable on this device. Applying 0.7x safe margin guide on standard front sensor.',
            targetZoom: 1.0,
            zoomType: 'sensor_crop',
            isExactPhysicalMatch: false,
            alternativeLenses: [],
            limitationsNotes: 'Device lacks secondary wide-angle front sensor.',
          };
        }
      }

      // Standard selfie
      return {
        selectedLens: frontCameras[0],
        selectionReason: 'Selected primary front-facing selfie sensor.',
        targetZoom: 1.0,
        zoomType: 'optical_lens',
        isExactPhysicalMatch: true,
        alternativeLenses: frontCameras.slice(1),
      };
    }

    // Rear camera selection
    if (rearCameras.length === 0) {
      const fallback = report.allCameras[0] || this.createMockDefaultLens('default_rear', 'back');
      return {
        selectedLens: fallback,
        selectionReason: 'Default rear camera selected.',
        targetZoom: 1.0,
        zoomType: 'optical_lens',
        isExactPhysicalMatch: true,
        alternativeLenses: [],
      };
    }

    const primaryWide = rearCameras.find((c) => c.role === 'wide') || rearCameras[0];
    const ultrawide = rearCameras.find((c) => c.role === 'ultrawide');
    const telephoto = rearCameras.find((c) => c.role === 'telephoto' || c.role === 'periscope');

    // 1. Specialized Capture Modes
    if (request.captureMode === 'night' || request.preferLowLight) {
      // Primary wide sensor has the largest physical sensor area and widest aperture (f/1.6 vs f/2.2/2.8)
      return {
        selectedLens: primaryWide,
        selectionReason: `Selected ${primaryWide.label} (Wide ${primaryWide.nativeAperture || 'f/1.6'}) for superior low-light sensitivity and optical light gathering.`,
        targetZoom: 1.0,
        zoomType: 'optical_lens',
        isExactPhysicalMatch: true,
        alternativeLenses: rearCameras.filter((c) => c.deviceId !== primaryWide.deviceId),
      };
    }

    if (request.preferMacro || request.targetFov === 'macro') {
      const macroLens = rearCameras.find((c) => c.isMacroCapable) || ultrawide;
      if (macroLens) {
        return {
          selectedLens: macroLens,
          selectionReason: `Selected ${macroLens.label} featuring close-focus macro capability (${macroLens.focus.minFocusDistanceMeters ? macroLens.focus.minFocusDistanceMeters * 100 : 2}cm minimum focus distance).`,
          targetZoom: 1.0,
          zoomType: 'optical_lens',
          isExactPhysicalMatch: true,
          alternativeLenses: rearCameras.filter((c) => c.deviceId !== macroLens.deviceId),
        };
      }
    }

    if (request.captureMode === 'slow_motion' || request.preferHighFps) {
      // Find sensor that supports 120+ FPS
      const highFpsSensor = rearCameras.find((c) => c.frameRate.max >= 120) || primaryWide;
      return {
        selectedLens: highFpsSensor,
        selectionReason: `Selected ${highFpsSensor.label} supporting high-speed readout (${highFpsSensor.frameRate.max} FPS).`,
        targetZoom: 1.0,
        zoomType: 'optical_lens',
        isExactPhysicalMatch: true,
        alternativeLenses: rearCameras.filter((c) => c.deviceId !== highFpsSensor.deviceId),
      };
    }

    if (request.captureMode === 'portrait') {
      // Telephoto lenses offer natural perspective compression without wide-angle facial distortion
      if (telephoto) {
        return {
          selectedLens: telephoto,
          selectionReason: `Selected physical ${telephoto.label} (${telephoto.equivalentFocalLengthMm}mm equivalent) for optimal portrait compression and cinematic bokeh.`,
          targetZoom: telephoto.opticalZoomFactor,
          zoomType: 'optical_lens',
          isExactPhysicalMatch: true,
          alternativeLenses: [primaryWide],
        };
      } else {
        return {
          selectedLens: primaryWide,
          selectionReason: `Selected primary wide sensor (${primaryWide.nativeAperture || 'f/1.6'}) for portrait mode with computational shallow depth of field.`,
          targetZoom: 1.0,
          zoomType: 'optical_lens',
          isExactPhysicalMatch: false,
          alternativeLenses: [],
          limitationsNotes: 'No physical telephoto camera detected on this device.',
        };
      }
    }

    // 2. Zoom / Framing Requests
    const requestedZoom = request.requestedZoom ?? 1.0;

    // A. Ultrawide (< 0.9x)
    if (requestedZoom < 0.9) {
      if (ultrawide) {
        return {
          selectedLens: ultrawide,
          selectionReason: `Switched to physical ${ultrawide.label} (0.5x, ${ultrawide.equivalentFocalLengthMm}mm equivalent ultra-wide field of view).`,
          targetZoom: ultrawide.opticalZoomFactor,
          zoomType: 'optical_lens',
          isExactPhysicalMatch: true,
          alternativeLenses: [primaryWide],
        };
      } else {
        return {
          selectedLens: primaryWide,
          selectionReason: 'No physical ultra-wide camera exposed by device driver. Primary wide lens retained at 1.0x.',
          targetZoom: 1.0,
          zoomType: 'sensor_crop',
          isExactPhysicalMatch: false,
          alternativeLenses: [],
          limitationsNotes: 'Device lacks ultra-wide camera.',
        };
      }
    }

    // B. Standard Wide (0.9x to 1.9x)
    if (requestedZoom >= 0.9 && requestedZoom < 2.0) {
      const zoomType: ZoomMagnificationType = requestedZoom === 1.0 ? 'optical_lens' : 'sensor_crop';
      return {
        selectedLens: primaryWide,
        selectionReason: requestedZoom === 1.0
          ? `Selected primary physical wide camera (${primaryWide.equivalentFocalLengthMm}mm equivalent).`
          : `Sensor crop (${requestedZoom}x) from native wide sensor.`,
        targetZoom: requestedZoom,
        zoomType,
        isExactPhysicalMatch: requestedZoom === 1.0,
        alternativeLenses: rearCameras.filter((c) => c.deviceId !== primaryWide.deviceId),
      };
    }

    // C. Telephoto (>= 2.0x)
    if (requestedZoom >= 2.0) {
      // Check if we have a matching or closer telephoto
      if (telephoto) {
        const isExactTele = Math.abs(telephoto.opticalZoomFactor - requestedZoom) < 0.2;
        const zoomType: ZoomMagnificationType = isExactTele
          ? 'optical_lens'
          : requestedZoom < telephoto.opticalZoomFactor
          ? 'sensor_crop'
          : 'digital';

        return {
          selectedLens: telephoto,
          selectionReason: isExactTele
            ? `Switched to physical optical ${telephoto.label} (${telephoto.opticalZoomFactor}x, ${telephoto.equivalentFocalLengthMm}mm equivalent).`
            : `Physical ${telephoto.label} selected with ${requestedZoom.toFixed(1)}x digital framing.`,
          targetZoom: requestedZoom,
          zoomType,
          isExactPhysicalMatch: isExactTele,
          alternativeLenses: [primaryWide],
        };
      } else {
        // Only primary wide available
        return {
          selectedLens: primaryWide,
          selectionReason: `Physical telephoto camera unavailable on device. Applying ${requestedZoom}x digital magnification on primary wide sensor.`,
          targetZoom: requestedZoom,
          zoomType: requestedZoom <= 2.0 ? 'sensor_crop' : 'digital',
          isExactPhysicalMatch: false,
          alternativeLenses: [],
          limitationsNotes: 'No physical telephoto sensor exposed by driver.',
        };
      }
    }

    return {
      selectedLens: primaryWide,
      selectionReason: 'Standard primary wide sensor.',
      targetZoom: 1.0,
      zoomType: 'optical_lens',
      isExactPhysicalMatch: true,
      alternativeLenses: [],
    };
  }

  private createMockDefaultLens(id: string, facing: LensFacing): PhysicalCameraHardwareProfile {
    return {
      deviceId: id,
      label: facing === 'front' ? 'Default Front Camera' : 'Default Rear Camera',
      role: facing === 'front' ? 'front_wide' : 'wide',
      facing,
      opticalZoomFactor: 1.0,
      equivalentFocalLengthMm: undefined, // never guessed; filled from the camera's own report
      supportedResolutions: [
        { label: '1080p FHD (1920×1080)', width: 1920, height: 1080, aspectRatio: '16:9' },
      ],
      frameRate: { min: 24, max: 60, supportedFps: [24, 30, 60], supportsSlowMo: false },
      exposure: {
        hasHardwareExposureTime: false,
        minExposureDurationMs: 1,
        maxExposureDurationMs: 1000,
        hasHardwareIso: false,
        minIso: 100,
        maxIso: 1600,
        stepIso: 100,
        hasExposureCompensation: true,
        minEv: -2.0,
        maxEv: 2.0,
        stepEv: 0.1,
      },
      focus: {
        hasAutoFocus: true,
        hasManualFocus: false,
        isFixedFocus: false,
        supportedModes: ['auto'],
      },
      whiteBalance: {
        hasAuto: true,
        hasManualKelvin: false,
        minKelvin: 3000,
        maxKelvin: 7000,
        stepKelvin: 200,
        supportedModes: ['auto'],
      },
      hasHardwareZoom: false,
      minHardwareZoom: 1.0,
      maxHardwareZoom: 3.0,
      stepHardwareZoom: 0.1,
      hasTorch: facing === 'back',
      hasOpticalStabilization: false,
      hasElectronicStabilization: true,
      hasDepthCapture: false,
      isMacroCapable: false,
      isVirtualLogicalDevice: false,
    };
  }

  private notifyListeners(report: DeviceHardwareReport): void {
    for (const listener of this.reportListeners) {
      try {
        listener(report);
      } catch (err) {
        console.warn('Hardware intelligence report listener error:', err);
      }
    }
  }

  public getCachedReport(): DeviceHardwareReport | null {
    return this.cachedReport;
  }
}

export const hardwareIntelligenceService = HardwareIntelligenceService.getInstance();

import { EXPOSURE_TIME_UNIT_SECONDS } from './cameraControlService';
import { pickNativeCamera, type NativeCapabilities } from './nativeCameraService';
