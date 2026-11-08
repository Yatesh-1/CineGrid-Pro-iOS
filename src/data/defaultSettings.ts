import type { GridStyleOptions, ProSettings } from '../types/camera';

/** Starting values for the professional camera controls. */
export const DEFAULT_PRO_SETTINGS: ProSettings = {
  captureMode: 'photo',
  // Exposure
  isoAuto: true,
  iso: 200,
  shutterAuto: true,
  shutterMode: 'speed',
  shutterSpeed: '1/50',
  shutterAngle: 180.0,
  ev: 0.0,
  exposureLocked: false,
  flickerFree: 'auto',
  // White Balance
  wbAuto: true,
  whiteBalance: 5600,
  wbTint: 0,
  wbPreset: 'daylight',
  // Focus
  focusMode: 'auto',
  manualFocus: 0.5,
  focusLocked: false,
  focusPeaking: false,
  peakingColor: 'green',
  rackFocusPointA: 0.2,
  rackFocusPointB: 0.8,
  // Monitoring Tools
  histogram: false,
  rgbHistogram: false,
  waveform: false,
  falseColor: false,
  zebraStripes: false,
  zebraThreshold: 90,
  clippingShadows: false,
  clippingHighlights: false,
  horizonLevel: false,
  safeAreaGuide: false,
  burnGridInExport: false,
  // Video Recording Options
  videoResolution: '1080p',
  videoFps: 24,
  videoCodec: 'h264',
  videoBitrate: 'high',
  colorProfile: 'rec709',
  videoAspectRatio: '16:9',
  timecodeMode: 'record_run',
  isTimelapse: false,
  timelapseInterval: 2,
  anamorphicDeSqueeze: 1.0,
  lensCorrection: true,
  // Photo Capture Options
  photoFormat: 'jpeg',
  burstMode: 'off',
  bracketingMode: 'off',
  photoSelfTimer: 0,
  // Audio Options
  audio: {
    deviceId: 'default',
    label: 'Built-in Microphone',
    gain: 80,
    channels: 'stereo',
    sampleRate: 48000,
    isMuted: false,
  },
  referenceImage: null,
  referenceOpacity: 0.45,
};

/** Starting appearance of composition grid overlays. */
export const DEFAULT_GRID_STYLE: GridStyleOptions = {
  color: '#ffffff',
  opacity: 0.75,
  strokeWidth: 1.2,
  lineStyle: 'solid',
  showCenterDot: true,
  showIntersectionNodes: true,
  isVisible: true,
  scale: 1.0,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  spiralCorner: 'top-left',
  spiralDirection: 'clockwise',
};
