export type AspectRatio =
  | '1:1'
  | '4:3'
  | '3:2'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '2.35:1'
  | '2.39:1'
  | '21:9';

export type GridCategory =
  | 'all'
  | 'travel'
  | 'basic'
  | 'golden'
  | 'advanced'
  | 'portrait'
  | 'landscape'
  | 'architecture'
  | 'product'
  | 'street'
  | 'food'
  | 'wildlife'
  | 'technical'
  | 'cinematic'
  | 'macro'
  | 'creative'
  | 'social'
  | 'custom';

export type GridType =
  /** Overlays from the geometry engine (src/data/geoGrids). */
  | `geo_${string}`
  | 'none'
  // Basic Composition
  | 'rule_of_thirds'
  | 'golden_ratio'
  | 'golden_spiral'
  | 'fibonacci_spiral'
  | 'golden_triangles'
  | 'diagonal_composition'
  | 'center_crosshair'
  | 'center_symmetry'
  | 'dynamic_symmetry'
  | 'radial_composition'
  | 'concentric_circles'
  | 'perspective_grid'
  // Technical Grids
  | 'grid_4x4'
  | 'grid_5x5'
  | 'grid_6x6'
  | 'grid_8x8'
  | 'grid_10x10'
  | 'horizontal_alignment'
  | 'vertical_alignment'
  | 'horizon_level'
  | 'dual_axis_level'
  | 'vanishing_point_guide'
  | 'safe_area_guide'
  // Portrait Photography
  | 'portrait_eyeline'
  | 'portrait_headroom'
  | 'portrait_face_align'
  | 'portrait_head_shoulder'
  | 'portrait_full_body'
  // Landscape Photography
  | 'landscape_horizon_thirds'
  | 'landscape_golden_ratio'
  | 'landscape_foreground'
  | 'landscape_leading_lines'
  | 'landscape_mountain_align'
  | 'landscape_panoramic'
  // Architecture Photography
  | 'arch_vertical_correction'
  | 'arch_building_symmetry'
  | 'arch_perspective_align'
  | 'arch_facade_divisions'
  | 'arch_vanishing_point'
  // Product Photography
  | 'product_center'
  | 'product_safe_area'
  | 'product_symmetry'
  | 'product_negative_space'
  | 'product_flat_lay'
  // Street Photography
  | 'street_leading_lines'
  | 'street_frame_in_frame'
  | 'street_golden_triangle'
  | 'street_subject_pos'
  // Food Photography
  | 'food_overhead'
  | 'food_plate_pos'
  | 'food_flat_lay'
  | 'food_diagonal'
  // Wildlife Photography
  | 'wildlife_tracking_frame'
  | 'wildlife_eye_placement'
  | 'wildlife_motion_space'
  // Legacy aliases
  | 'rule_of_thirds_top'
  | 'rule_of_thirds_bottom'
  | 'diagonal_method';

export type CompositionCategory = GridCategory;

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export interface GridStyleOptions {
  color: string;
  opacity: number;       // 0.1 to 1.0
  strokeWidth: number;   // 0.5 to 4.0
  lineStyle: LineStyle;
  showCenterDot: boolean;
  showIntersectionNodes: boolean;
  isVisible: boolean;
  scale: number;         // 0.5 to 2.0
  rotation: number;      // 0 to 360 deg
  offsetX: number;       // -50% to +50%
  offsetY: number;       // -50% to +50%
  spiralCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  spiralDirection: 'clockwise' | 'counter-clockwise';
}

export interface SecondaryGuideOptions {
  showHorizonLevel: boolean;
  showDualAxisLevel: boolean;
  showSafeArea: boolean;
  showReferenceOverlay: boolean;
}

export type FramingShape =
  | 'circle'
  | 'rectangle'
  | 'square'
  | 'silhouette_head'
  | 'silhouette_body'
  | 'mountain_ridge';

export interface SmartFramingGuide {
  enabled: boolean;
  mode: 'auto' | 'manual';
  category: 'portrait' | 'landscape' | 'product' | 'food' | 'wildlife';
  shape: FramingShape;
  label: string;
  x: number;      // 0 to 100 percentage
  y: number;      // 0 to 100 percentage
  width: number;  // 0 to 100 percentage
  height: number; // 0 to 100 percentage
  isLocked: boolean;
  detectedBox?: { x: number; y: number; width: number; height: number };
}

export interface CompositionGridDefinition {
  id: GridType;
  name: string;
  category: GridCategory;
  description: string;
  useCase: string;
  proTip: string;
  thumbnail?: string;
  recommendedSubject?: string;
  isFavorite?: boolean;
  /** Other names this grid is known by, used by library search. */
  aliases?: string[];
}

export interface CompositionPreset {
  id: string;
  name: string;
  category: string;
  gridType: GridType;
  description: string;
  recommendedSubject: string;
  thumbnail: string;
  proTip: string;
  isFavorite?: boolean;
}

export interface MasterPhotographyPreset {
  id: string;
  name: string;
  subtitle: string;
  category: GridCategory;
  gridType: GridType;
  aspectRatio: AspectRatio;
  filterId: FilterId;
  filterStrength: number;
  ev: number;
  shutterSpeed?: string;
  iso?: number;
  whiteBalance?: number;
  description: string;
  framingShape?: FramingShape;
}

export type FilterId = string;

export type FilmLookCategory =
  | 'All Looks'
  | 'Clean Digital'
  | 'Kodak Inspired'
  | 'Fuji Inspired'
  | 'Cinematic'
  | 'Vintage'
  | 'Black & White'
  | 'Creative';

export interface CameraFilter {
  id: string;
  name: string;
  subtitle: string;
  category: FilmLookCategory | string;
  previewColor: string;
  previewGradient?: string;
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  hueRotate: number;
  temperature: number; // K offset
  tint: number;
  vignette: number;
  grain: number;
  isFavorite?: boolean;
}

export type CameraMode =
  | 'photo'
  | 'video'
  | 'portrait'
  | 'night'
  | 'panorama'
  | 'dual'
  | 'slow_motion'
  | 'timelapse';
export type VideoResolution = '720p' | '1080p' | '4k' | '8k';
export type VideoFps = 23.98 | 24 | 25 | 29.97 | 30 | 48 | 50 | 59.94 | 60 | 100 | 120 | 240;
export type VideoCodec = 'h264' | 'h265' | 'prores' | 'vp9';
export type VideoBitrate = 'low' | 'medium' | 'high' | 'maximum';
export type ColorProfile = 'rec709' | 'rec2020' | 'hlg' | 'hdr10' | 'log';
export type ShutterMode = 'speed' | 'angle';
export type FlickerFree = 'auto' | '50hz' | '60hz';
export type PeakingColor = 'green' | 'red' | 'cyan' | 'yellow';
export type TimecodeMode = 'record_run' | 'time_of_day';
export type PhotoFormat = 'jpeg' | 'heif' | 'raw_dng' | 'raw';
export type BurstMode = 'off' | '3fps' | '5fps' | '10fps';
export type BracketingMode = 'off' | '3_shots' | '5_shots' | '3_bracket' | '5_bracket';
export type AudioChannelMode = 'mono' | 'stereo';
export type AudioSampleRate = 44100 | 48000;

// Audio Intelligence Types
export type AudioNoiseMode =
  | 'off'
  | 'standard'
  | 'strong'
  | 'wind_reduction'
  | 'voice_focus'
  | 'auto';

export interface AudioIntelligenceConfig {
  mode: AudioNoiseMode;
  noiseReductionIntensity: number; // 0 to 100
  windReduction: boolean;
  voiceEnhancement: boolean;
  monitoringEnabled: boolean;
  bypassDsp: boolean;
  selectedInputId: string;
}

// Dual Camera Types
export type DualCameraLayout = 'pip' | 'split_vertical' | 'split_horizontal' | 'floating';
export type PipPosition = 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';
export type PipSize = 'small' | 'medium' | 'large';

export interface DualCameraConfig {
  layout: DualCameraLayout;
  primaryFacing: 'user' | 'environment';
  secondaryFacing: 'user' | 'environment';
  pipPosition: PipPosition;
  pipSize: PipSize;
  pipX?: number; // 0 to 100%
  pipY?: number; // 0 to 100%
  enableSecondaryAudio: boolean;
  isSupported: boolean;
  unsupportedReason?: string;
}

// Night Mode Types
export type NightExposurePreset = 'auto' | '10s' | '30s' | 'custom';

export interface NightModeConfig {
  preset: NightExposurePreset;
  customSeconds: number; // 1 to 30s
  iso: number;
  isCapturing: boolean;
  progressPercent: number; // 0 to 100%
  remainingSeconds: number;
  isHardwareLongExposure: boolean;
  frameCount: number;
  stabilityScore: number; // 0 to 100% stability
}

// Wide Selfie Types
export type WideSelfieFraming = 'normal' | 'wide';

export interface WideSelfieConfig {
  framing: WideSelfieFraming;
  hasHardwareUltraWide: boolean;
  groupGuideOverlay: boolean;
  frontLensZoom: number; // 1.0 or 0.7 or 0.5
}

// Slow Motion Types
export type SlowMoFpsOption = 60 | 120 | 240;
export type SlowMoPlaybackSpeed = 0.5 | 0.25 | 0.125;

export interface SlowMotionConfig {
  targetFps: SlowMoFpsOption;
  supportedMaxFps: number;
  playbackSpeed: SlowMoPlaybackSpeed;
  isSlowMoRecording: boolean;
  recordingDuration: number;
  segmentStart: number; // 0.0 to 1.0
  segmentEnd: number;   // 0.0 to 1.0
}

// Time-lapse Types
export type TimelapseInterval = 0.5 | 1 | 2 | 5 | 10 | 30;

export interface TimelapseConfig {
  interval: TimelapseInterval | number;
  customIntervalSeconds: number;
  isRecording: boolean;
  capturedFrames: number;
  realDurationSeconds: number;
  outputFps: 24 | 30 | 60;
  lockExposure: boolean;
}

export interface AvailableCameraDevice {
  deviceId: string;
  label: string;
  facing: 'front' | 'rear' | 'telephoto' | 'ultrawide' | 'unknown';
  role?: import('./hardware').PhysicalLensRole;
  opticalZoomFactor?: number;
  equivalentFocalLengthMm?: number;
}

export interface AvailableAudioDevice {
  deviceId: string;
  label: string;
  isExternal?: boolean;
}

export interface AudioDeviceSettings {
  deviceId: string;
  label: string;
  gain: number; // 0 to 100
  channels: AudioChannelMode;
  sampleRate: AudioSampleRate;
  isMuted: boolean;
}

export interface ProSettings {
  captureMode: CameraMode;
  // Exposure
  isoAuto: boolean;
  iso: number;          // 50 to 12800
  shutterAuto: boolean;
  shutterMode: ShutterMode;
  shutterSpeed: string; // e.g. '1/48', '1/50', '1/120', '1/250'
  shutterAngle: number; // 1.1° to 360.0°
  ev: number;           // -3.0 to +3.0
  exposureLocked: boolean;
  exposureLock?: boolean;
  flickerFree: FlickerFree;
  // White Balance
  wbAuto: boolean;
  whiteBalance: number; // 2500K - 10000K
  wbTint: number;       // -50 to +50
  tint?: number;
  /** Studio colour: saturation and contrast, -100..+100 (0 = unchanged); applied to preview and saved photos */
  colorSaturation?: number;
  colorContrast?: number;
  wbPreset?: 'daylight' | 'cloudy' | 'shade' | 'fluorescent' | 'incandescent' | 'custom';
  // Focus
  focusMode: 'auto' | 'manual';
  manualFocus: number;  // 0.0 (near) to 1.0 (infinity)
  manualFocusDistance?: number; // 0 to 100
  focusLocked: boolean;
  focusLock?: boolean;
  focusPeaking: boolean;
  peakingColor: PeakingColor;
  rackFocusPointA: number; // 0.0 to 1.0
  rackFocusPointB: number; // 0.0 to 1.0
  // Monitoring Tools
  histogram: boolean;
  rgbHistogram: boolean;
  waveform: boolean;
  falseColor: boolean;
  zebraStripes: boolean;
  zebraThreshold: number; // 75 to 100 IRE
  clippingShadows: boolean;
  clippingHighlights: boolean;
  shadowHighlightClipping?: boolean;
  horizonLevel: boolean;
  safeAreaGuide: boolean;
  safeAreaGuides?: boolean;
  burnGridInExport: boolean;
  // Video Recording Options
  videoResolution: VideoResolution;
  videoFps: VideoFps;
  videoCodec: VideoCodec;
  videoBitrate: VideoBitrate;
  colorProfile: ColorProfile;
  videoAspectRatio: '16:9' | '9:16' | '2.39:1';
  timecodeMode: TimecodeMode;
  isTimelapse: boolean;
  timelapseInterval: number; // seconds (e.g. 1, 2, 5, 10)
  anamorphicDeSqueeze: number; // 1.0, 1.33, 1.5, 2.0
  lensCorrection: boolean;
  // Photo Capture Options
  photoFormat: PhotoFormat;
  burstMode: BurstMode;
  bracketingMode: BracketingMode;
  photoSelfTimer: number; // 0, 3, 5, 10 seconds
  // Audio Options
  audio: AudioDeviceSettings;
  // Reference & Overlay
  referenceImage: string | null;
  referenceOpacity: number;
  isRecordingVideo?: boolean;
  recordingDuration?: number;
  // Advanced Capture Studio Extensions
  portraitAperture?: number; // e.g. 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 16.0
  audioIntelligence?: AudioIntelligenceConfig;
  dualCamera?: DualCameraConfig;
  nightMode?: NightModeConfig;
  wideSelfie?: WideSelfieConfig;
  slowMotion?: SlowMotionConfig;
  timelapseConfig?: TimelapseConfig;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;           // Raw original photo captured by camera (aspect crop only; never modified)
  lookDataUrl?: string;       // What the viewfinder showed at capture: filter / LUT / adjustments / burned-in grid
  editedDataUrl?: string;     // Edited version saved from the photo editor
  thumbnailUrl: string;
  timestamp: number;
  aspectRatio: AspectRatio;
  filterUsed: string;
  gridUsed: string;
  proSettings: {
    iso: number;
    shutter: string;
    kelvin: number;
    ev: number;
  };
  mediaType?: 'photo' | 'video';
  durationSeconds?: number;
  /** Slow-motion clips: recorded frame rate and the speed the in-app viewer plays them at (0.25 = four times slower). */
  slowMotion?: { fps: number; playbackSpeed: number };
}

// Re-export Device Hardware Intelligence Types
export * from './hardware';
