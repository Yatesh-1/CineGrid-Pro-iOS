// CineGrid Pro — Ultimate Cinematography Video Engine Types
// High-end digital cinema standards inspired by ARRI ALEXA 35, RED V-RAPTOR, Sony VENICE 2, Blackmagic URSA Cine.

export type CinemaShutterAngle = 180 | 172.8 | 144 | 90 | 45 | number;

export type CinemaResolution = '720p' | '1080p' | '2k' | '4k' | 'custom';

export type CinemaFps = 23.98 | 24 | 25 | 29.97 | 30 | 48 | 50 | 59.94 | 60 | 120 | 240;

export type CinemaCodec = 'h264' | 'hevc' | 'prores' | 'vp9';

export type CinemaBitrate = 'low' | 'medium' | 'high' | 'maximum';

export type CinemaColorProfile = 'rec709' | 'flat_log' | 'hdr10' | 'hlg';

export type CinemaStabilizationMode = 'off' | 'standard' | 'enhanced' | 'optical';

export type CinemaMonitoringTool =
  | 'false_color'
  | 'waveform'
  | 'rgb_parade'
  | 'vectorscope'
  | 'zebra'
  | 'peaking'
  | 'histogram'
  | 'lut';

export type AnamorphicDeSqueezeRatio = 1.0 | 1.33 | 1.5 | 1.8 | 2.0;

export interface ProductionSlate {
  scene: string;          // e.g. 'SCENE 14'
  take: number;           // e.g. 1, 2, 3...
  shotType: 'wide' | 'medium' | 'close_up' | 'extreme_close_up' | 'establishing';
  clipName: string;       // e.g. 'A001_C001_20261030.mp4'
  roll: string;           // e.g. 'A001'
  director: string;
  cinematographer: string;
  notes: string;
}

export interface RackFocusPoint {
  distance: number;       // 0.0 (near) to 1.0 (infinity)
  label: string;          // e.g. 'Subject (Near)', 'Background (Far)'
}

export interface RackFocusConfig {
  pointA: RackFocusPoint;
  pointB: RackFocusPoint;
  durationSeconds: number; // 0.5s to 5.0s
  isTransitioning: boolean;
  currentProgress: number; // 0.0 to 1.0
}

export interface CinemaCreativeOptics {
  filmGrain: number;          // 0 to 100%
  halation: number;           // 0 to 100%
  bloom: number;              // 0 to 100%
  highlightDiffusion: number; // 0 to 100%
  vignette: number;           // 0 to 100%
  bypassAll: boolean;
}

export interface CinemaVideoConfig {
  // Exposure & Optics
  shutterAngle: CinemaShutterAngle;
  calculatedShutterSpeed: string; // e.g. '1/48', '1/50'
  iso: number;                    // 50 to 12800
  isoAuto: boolean;
  ev: number;                     // -3.0 to +3.0
  exposureLocked: boolean;
  whiteBalanceKelvin: number;     // 2500K - 10000K
  whiteBalanceTint: number;       // -50 to +50
  whiteBalanceLocked: boolean;
  
  // Format & Codec
  resolution: CinemaResolution;
  fps: CinemaFps;
  codec: CinemaCodec;
  bitrate: CinemaBitrate;
  colorProfile: CinemaColorProfile;
  stabilization: CinemaStabilizationMode;
  anamorphicDeSqueeze: AnamorphicDeSqueezeRatio;

  // Monitoring vs Recording LUT
  applyMonitoringLut: boolean;
  bakeLutIntoRecording: boolean;
  activeLutId: string | null;
  lutIntensity: number;           // 0.0 to 1.0

  // Active Monitoring Tools (Drawer)
  activeScopes: Set<CinemaMonitoringTool>;
  isMonitoringDrawerOpen: boolean;
  activeContextualTab: 'exposure' | 'color' | 'focus' | 'audio' | null;

  // Focus
  focusMode: 'auto' | 'manual';
  manualFocusDistance: number;    // 0.0 to 1.0
  focusPeakingColor: 'red' | 'green' | 'blue' | 'amber' | 'white';
  focusMagnification: 1.0 | 2.0 | 4.0;
  focusMagnificationCenter: { x: number; y: number };
  rackFocus: RackFocusConfig;

  // Audio
  audioDevice: string;
  audioNoiseMode: 'off' | 'standard' | 'strong' | 'wind' | 'voice' | 'auto';
  audioMonitorLevel: number;      // 0 to 100
  audioMuted: boolean;

  // Production Slate & Rolling Buffer
  productionSlate: ProductionSlate;
  preRecordSeconds: 0 | 3 | 5;
  isPreRecording: boolean;
  isRecording: boolean;
  recordingElapsedSeconds: number;
  timecodeMode: 'record_run' | 'time_of_day';

  // Director Mode
  directorModeActive: boolean;

  // Creative Optics
  creativeOptics: CinemaCreativeOptics;
}

export const DEFAULT_CINEMA_CONFIG: CinemaVideoConfig = {
  shutterAngle: 180,
  calculatedShutterSpeed: '1/48',
  iso: 100,
  isoAuto: false,
  ev: 0,
  exposureLocked: false,
  whiteBalanceKelvin: 5600,
  whiteBalanceTint: 0,
  whiteBalanceLocked: false,

  // Safe everywhere: 1080p / 30 / H.264. Higher options are offered only where the phone reports them.
  resolution: '1080p',
  fps: 30,
  codec: 'h264',
  bitrate: 'medium',
  colorProfile: 'rec709',
  stabilization: 'standard',
  anamorphicDeSqueeze: 1.0,

  applyMonitoringLut: true,
  bakeLutIntoRecording: false,
  activeLutId: null,
  lutIntensity: 1.0,

  activeScopes: new Set<CinemaMonitoringTool>(),
  isMonitoringDrawerOpen: false,
  activeContextualTab: null,

  focusMode: 'auto',
  manualFocusDistance: 0.5,
  focusPeakingColor: 'green',
  focusMagnification: 1.0,
  focusMagnificationCenter: { x: 0.5, y: 0.5 },
  rackFocus: {
    pointA: { distance: 0.2, label: 'Subject A' },
    pointB: { distance: 0.8, label: 'Subject B' },
    durationSeconds: 1.5,
    isTransitioning: false,
    currentProgress: 0,
  },

  audioDevice: 'default',
  audioNoiseMode: 'standard',
  audioMonitorLevel: 100,
  audioMuted: false,

  productionSlate: {
    scene: '1',
    take: 1,
    shotType: 'wide',
    clipName: 'CINE_SC01_TK01.mp4',
    roll: 'A001',
    director: 'Director',
    cinematographer: 'DP',
    notes: 'Main camera setup',
  },
  preRecordSeconds: 0,
  isPreRecording: false,
  isRecording: false,
  recordingElapsedSeconds: 0,
  timecodeMode: 'record_run',

  directorModeActive: false,

  creativeOptics: {
    filmGrain: 0,
    halation: 0,
    bloom: 0,
    highlightDiffusion: 0,
    vignette: 0,
    bypassAll: true,
  },
};
