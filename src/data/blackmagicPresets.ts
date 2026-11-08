import type {
  ProSettings,
  VideoFps,
  VideoBitrate,
  FlickerFree,
} from '../types/camera';

export interface BlackmagicCameraPreset {
  id: string;
  name: string;
  category: 'video' | 'photo';
  subtitle: string;
  description: string;
  badge: string;
  settingsPatch: Partial<ProSettings>;
}

export const BLACKMAGIC_VIDEO_PRESETS: BlackmagicCameraPreset[] = [
  {
    id: 'bm_video_cine_24',
    name: 'Cinematic 24 FPS',
    category: 'video',
    subtitle: '180° Shutter Angle • Film Standard',
    description: 'The golden motion-picture standard: 24.00 FPS with 1/48s shutter (180° shutter angle) and flat film contrast.',
    badge: '24.00 FPS',
    settingsPatch: {
      captureMode: 'video',
      videoFps: 24,
      shutterMode: 'angle',
      shutterAngle: 180.0,
      shutterSpeed: '1/48',
      videoResolution: '1080p',
      videoAspectRatio: '16:9',
      colorProfile: 'log',
      videoBitrate: 'high',
      timecodeMode: 'record_run',
    },
  },
  {
    id: 'bm_video_std_25',
    name: 'Standard 25 FPS (PAL)',
    category: 'video',
    subtitle: '50 Hz Flicker-Free • European Broadcast',
    description: 'European PAL broadcast timing: 25.00 FPS with 1/50s shutter to eliminate 50Hz AC electrical lighting flicker.',
    badge: '25.00 FPS',
    settingsPatch: {
      captureMode: 'video',
      videoFps: 25,
      shutterMode: 'speed',
      shutterSpeed: '1/50',
      shutterAngle: 180.0,
      flickerFree: '50hz',
      videoResolution: '1080p',
      videoAspectRatio: '16:9',
      colorProfile: 'rec709',
      videoBitrate: 'high',
    },
  },
  {
    id: 'bm_video_social_30',
    name: 'Social Video 30 FPS',
    category: 'video',
    subtitle: '9:16 Vertical • Reels & Shorts',
    description: 'Optimized for TikTok, Instagram Reels, and YouTube Shorts in 9:16 vertical ratio at crisp 30 FPS.',
    badge: '9:16 • 30 FPS',
    settingsPatch: {
      captureMode: 'video',
      videoFps: 30,
      shutterMode: 'speed',
      shutterSpeed: '1/60',
      shutterAngle: 180.0,
      videoResolution: '1080p',
      videoAspectRatio: '9:16',
      colorProfile: 'rec709',
      videoBitrate: 'medium',
    },
  },
  {
    id: 'bm_video_smooth_60',
    name: 'Smooth 60 FPS',
    category: 'video',
    subtitle: '1/120s Shutter • Sports & Fast Action',
    description: 'Ultra-fluid 60.00 FPS with 1/120s shutter speed, capturing rapid kinetic movement without motion judder.',
    badge: '60.00 FPS',
    settingsPatch: {
      captureMode: 'video',
      videoFps: 60,
      shutterMode: 'speed',
      shutterSpeed: '1/120',
      shutterAngle: 180.0,
      videoResolution: '1080p',
      videoAspectRatio: '16:9',
      colorProfile: 'rec709',
      videoBitrate: 'high',
    },
  },
  {
    id: 'bm_video_slowmo_120',
    name: 'Slow Motion 120 FPS',
    category: 'video',
    subtitle: '5× Slow Motion Playback',
    description: 'High-speed 120.00 FPS capture with 1/240s shutter speed for dramatic 5x slow-motion playback at 24fps.',
    badge: '120 FPS SLOW-MO',
    settingsPatch: {
      captureMode: 'video',
      videoFps: 120,
      shutterMode: 'speed',
      shutterSpeed: '1/240',
      shutterAngle: 180.0,
      videoResolution: '1080p',
      videoAspectRatio: '16:9',
      colorProfile: 'rec709',
      videoBitrate: 'maximum',
    },
  },
  {
    id: 'bm_video_4k_master',
    name: 'High Quality 4K Master',
    category: 'video',
    subtitle: '3840×2160 • Maximum Bitrate 100 Mbps',
    description: 'Uncompromising 4K resolution at 100 Mbps maximum bitrate, preserving pristine dynamic range and fine textures.',
    badge: '4K DCI',
    settingsPatch: {
      captureMode: 'video',
      videoFps: 24,
      shutterMode: 'angle',
      shutterAngle: 180.0,
      shutterSpeed: '1/48',
      videoResolution: '4k',
      videoAspectRatio: '16:9',
      colorProfile: 'rec2020',
      videoBitrate: 'maximum',
    },
  },
  {
    id: 'bm_video_low_storage',
    name: 'Low Storage Recording',
    category: 'video',
    subtitle: '720p HD • 10 Mbps H.264',
    description: 'Maximum recording duration for documentary b-roll or rehearsal filming when SSD storage space is limited.',
    badge: 'ECONOMY',
    settingsPatch: {
      captureMode: 'video',
      videoFps: 24,
      shutterMode: 'speed',
      shutterSpeed: '1/50',
      shutterAngle: 180.0,
      videoResolution: '720p',
      videoAspectRatio: '16:9',
      colorProfile: 'rec709',
      videoBitrate: 'low',
    },
  },
];

export const BLACKMAGIC_PHOTO_PRESETS: BlackmagicCameraPreset[] = [
  {
    id: 'bm_photo_portrait',
    name: 'Studio Portrait',
    category: 'photo',
    subtitle: '4:3 • ISO 100 • 1/120s • 5600K',
    description: 'Fine skin rendering with low sensor noise, 1/120s motion freeze, and daylight white balance.',
    badge: 'PORTRAIT',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 100,
      shutterAuto: false,
      shutterSpeed: '1/120',
      whiteBalance: 5600,
      wbTint: 0,
      photoFormat: 'jpeg',
      photoSelfTimer: 0,
      focusPeaking: true,
    },
  },
  {
    id: 'bm_photo_landscape',
    name: 'Cinematic Landscape',
    category: 'photo',
    subtitle: '16:9 • ISO 50/100 • 1/60s • 5800K',
    description: 'Base ISO for maximum sensor dynamic range, 5800K sunlight warmth, and horizon level monitoring.',
    badge: 'LANDSCAPE',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 100,
      shutterAuto: false,
      shutterSpeed: '1/60',
      whiteBalance: 5800,
      wbTint: -2,
      photoFormat: 'raw_dng',
      horizonLevel: true,
    },
  },
  {
    id: 'bm_photo_street',
    name: 'Urban Street Candid',
    category: 'photo',
    subtitle: '3:2 • ISO 400 • 1/250s • 5200K',
    description: 'Fast 1/250s shutter to freeze walking pedestrians and cyclists with ISO 400 street agility.',
    badge: 'STREET',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 400,
      shutterAuto: false,
      shutterSpeed: '1/250',
      whiteBalance: 5200,
      wbTint: 0,
      photoFormat: 'jpeg',
    },
  },
  {
    id: 'bm_photo_architecture',
    name: 'Architectural Symmetry',
    category: 'photo',
    subtitle: '4:3 • ISO 100 • 1/120s • 5200K',
    description: 'Clean sensor noise floor with strict vertical plumb alignment and dual-axis level verification.',
    badge: 'ARCHITECTURE',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 100,
      shutterAuto: false,
      shutterSpeed: '1/120',
      whiteBalance: 5200,
      horizonLevel: true,
      safeAreaGuide: true,
    },
  },
  {
    id: 'bm_photo_night',
    name: 'Night Photography',
    category: 'photo',
    subtitle: 'ISO 1600 • 1/15s • 4000K Sodium Neutral',
    description: 'High sensitivity ISO with sodium-lamp street warmth correction and highlight clipping warning.',
    badge: 'NIGHT',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 1600,
      shutterAuto: false,
      shutterSpeed: '1/15',
      whiteBalance: 4000,
      wbTint: 4,
      zebraStripes: true,
      zebraThreshold: 95,
    },
  },
  {
    id: 'bm_photo_product',
    name: 'Product Studio Hero',
    category: 'photo',
    subtitle: '1:1 Square • ISO 100 • 1/125s • 5500K',
    description: 'Pristine 1:1 e-commerce square ratio with studio flash sync speed 1/125s and calibrated white point.',
    badge: 'PRODUCT',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 100,
      shutterAuto: false,
      shutterSpeed: '1/125',
      whiteBalance: 5500,
      wbTint: 0,
      photoFormat: 'raw_dng',
      safeAreaGuide: true,
    },
  },
  {
    id: 'bm_photo_wildlife',
    name: 'Wildlife High Speed',
    category: 'photo',
    subtitle: 'ISO 800 • 1/1000s Fast Action',
    description: 'Ultra-fast 1/1000s shutter to freeze flying birds or sprinting animals, with burst capture enabled.',
    badge: 'WILDLIFE',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 800,
      shutterAuto: false,
      shutterSpeed: '1/1000',
      whiteBalance: 5600,
      burstMode: '5fps',
      focusPeaking: true,
    },
  },
  {
    id: 'bm_photo_macro',
    name: 'Macro Precision Focus',
    category: 'photo',
    subtitle: 'ISO 200 • 1/200s • Manual Focus Assist',
    description: 'Manual focus peaking in neon green for razor-sharp depth-of-field precision on tiny subjects.',
    badge: 'MACRO',
    settingsPatch: {
      captureMode: 'photo',
      isoAuto: false,
      iso: 200,
      shutterAuto: false,
      shutterSpeed: '1/200',
      whiteBalance: 5600,
      focusMode: 'manual',
      focusPeaking: true,
      peakingColor: 'green',
    },
  },
];

// Smart Dependency Helpers
export const SMART_DEPENDENCIES = {
  // Suggest 180 degree shutter speed for a given FPS
  getSuggestedShutterForFps(fps: VideoFps): { speed: string; angle: number } {
    const table: Record<number, string> = {
      23.98: '1/48',
      24: '1/48',
      25: '1/50',
      29.97: '1/60',
      30: '1/60',
      48: '1/100',
      50: '1/100',
      59.94: '1/120',
      60: '1/120',
      100: '1/200',
      120: '1/240',
      240: '1/480',
    };
    return {
      speed: table[fps] || `1/${Math.round(fps * 2)}`,
      angle: 180.0,
    };
  },

  // Calculate shutter angle in degrees from shutter speed denominator and FPS
  // Angle = 360 * FPS * ExposureTime
  calculateAngleFromSpeed(shutterSpeed: string, fps: VideoFps): number {
    const match = shutterSpeed.match(/1\/(\d+)/);
    if (!match) return 180.0;
    const denom = parseInt(match[1]);
    if (denom <= 0) return 180.0;
    const angle = 360 * fps * (1 / denom);
    return Math.round(Math.max(1.1, Math.min(360.0, angle)) * 10) / 10;
  },

  // Suggest flicker-free shutter speeds for electrical grid
  getFlickerFreeShutters(flickerFree: FlickerFree): string[] {
    if (flickerFree === '50hz') {
      return ['1/25', '1/50', '1/100', '1/150', '1/200', '1/250'];
    }
    if (flickerFree === '60hz') {
      return ['1/30', '1/60', '1/120', '1/180', '1/240', '1/300'];
    }
    return ['1/24', '1/48', '1/50', '1/60', '1/100', '1/120', '1/240'];
  },

  // Bitrate in Mbps
  getBitrateMbps(bitrate: VideoBitrate): number {
    switch (bitrate) {
      case 'low': return 10;
      case 'medium': return 25;
      case 'high': return 50;
      case 'maximum': return 100;
      default: return 25;
    }
  },
};
