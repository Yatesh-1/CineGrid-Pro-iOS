// CineGrid Pro — Device Hardware Intelligence & Camera Abstraction Types
// Defines physical lens roles, sensor profiles, hardware capabilities, and zoom classifications.

import type { CameraMode } from './camera';

export type PhysicalLensRole =
  | 'ultrawide'        // ~0.5x, 13mm-16mm equiv
  | 'wide'             // ~1.0x, 24mm-28mm equiv (primary sensor)
  | 'telephoto'        // ~2x-3x, 50mm-85mm equiv
  | 'periscope'        // ~5x-10x, 120mm+ equiv optical folded prism
  | 'macro'            // Dedicated or ultrawide close-focus (<10cm)
  | 'front_wide'       // Standard selfie ~1x, 22mm-26mm equiv
  | 'front_ultrawide'  // Wide selfie ~0.7x/0.5x, 18mm-20mm equiv
  | 'unknown';

export type LensFacing = 'back' | 'front' | 'external';

export type ZoomMagnificationType =
  | 'optical_lens'     // Switching discrete physical sensor / lens
  | 'optical_zoom'     // Continuous physical motorized optical zoom
  | 'sensor_crop'      // High-res pixel-binning sensor crop (e.g. 2x on 48MP)
  | 'digital';         // Bilinear / GPU software interpolation

export interface ResolutionOption {
  label: string;       // e.g. '4K UHD (3840x2160)', '1080p FHD'
  width: number;
  height: number;
  aspectRatio: string; // '16:9', '4:3', etc.
}

export interface FocusCapabilities {
  hasAutoFocus: boolean;
  hasManualFocus: boolean;
  minFocusDistanceMeters?: number;
  isFixedFocus: boolean;
  supportedModes: string[];
}

export interface WhiteBalanceCapabilities {
  hasAuto: boolean;
  hasManualKelvin: boolean;
  minKelvin: number;
  maxKelvin: number;
  stepKelvin: number;
  supportedModes: string[];
}

export interface FrameRateCapabilities {
  min: number;
  max: number;
  supportedFps: number[]; // e.g. [24, 30, 60, 120, 240]
  supportsSlowMo: boolean;
}

export interface ExposureCapabilities {
  hasHardwareExposureTime: boolean;
  minExposureDurationMs: number;
  maxExposureDurationMs: number;
  hasHardwareIso: boolean;
  minIso: number;
  maxIso: number;
  stepIso: number;
  hasExposureCompensation: boolean;
  minEv: number;
  maxEv: number;
  stepEv: number;
}

export interface PhysicalCameraHardwareProfile {
  deviceId: string;
  label: string;
  role: PhysicalLensRole;
  facing: LensFacing;
  equivalentFocalLengthMm?: number;
  opticalZoomFactor: number;     // e.g. 0.5, 1.0, 2.0, 3.0, 5.0, 10.0
  nativeAperture?: string;       // e.g. 'f/1.6', 'f/2.4'
  supportedResolutions: ResolutionOption[];
  frameRate: FrameRateCapabilities;
  exposure: ExposureCapabilities;
  focus: FocusCapabilities;
  whiteBalance: WhiteBalanceCapabilities;
  hasHardwareZoom: boolean;
  minHardwareZoom: number;
  maxHardwareZoom: number;
  stepHardwareZoom: number;
  hasTorch: boolean;
  hasOpticalStabilization: boolean;
  hasElectronicStabilization: boolean;
  hasDepthCapture: boolean;
  isMacroCapable: boolean;
  isVirtualLogicalDevice: boolean;
  constituentPhysicalIds?: string[];
  rawCapabilities?: Record<string, unknown>;
}

export interface OpticalLensStep {
  factor: number;                // 0.5, 1.0, 2.0, 3.0, 5.0
  label: string;                 // '0.5x', '1x', '3x'
  focalLengthLabel: string;      // '13mm', '24mm', '77mm'
  role: PhysicalLensRole;
  deviceId: string;
  isPhysicalSwitch: boolean;
}

export interface DeviceHardwareReport {
  platform: 'ios' | 'android' | 'web' | 'desktop';
  platformDescription: string;
  isNativeBridgeActive: boolean;
  nativeFramework: 'AVFoundation' | 'Camera2' | 'W3C_MediaDevices';
  totalCameras: number;
  rearCameras: PhysicalCameraHardwareProfile[];
  frontCameras: PhysicalCameraHardwareProfile[];
  allCameras: PhysicalCameraHardwareProfile[];
  opticalLensSteps: OpticalLensStep[];
  hasConcurrentCameraSupport: boolean;
  concurrentCombinations: { primaryId: string; secondaryId: string }[];
  audioInputsCount: number;
  detectedAt: number;
  warningsAndLimitations: string[];
}

export interface LensSelectionRequest {
  targetFov?: 'ultrawide' | 'wide' | 'telephoto' | 'macro' | 'selfie' | 'wide_selfie';
  requestedZoom?: number;
  captureMode: CameraMode;
  preferHighFps?: boolean;
  preferLowLight?: boolean;
  preferMacro?: boolean;
  preferStabilization?: boolean;
  currentFacing?: LensFacing;
}

export interface AutomaticLensSelectionResult {
  selectedLens: PhysicalCameraHardwareProfile;
  selectionReason: string;
  targetZoom: number;
  zoomType: ZoomMagnificationType;
  isExactPhysicalMatch: boolean;
  alternativeLenses: PhysicalCameraHardwareProfile[];
  limitationsNotes?: string;
}
