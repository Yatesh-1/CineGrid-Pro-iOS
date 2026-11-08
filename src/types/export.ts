export type PhotoExportFormat = 'jpeg' | 'png' | 'webp' | 'heif' | 'raw_dng';
export type VideoExportResolution = '720p' | '1080p' | '4k' | '8k';
export type VideoExportCodec = 'h264' | 'h265' | 'prores';
export type ColorProfile = 'srgb' | 'display_p3' | 'adobe_rgb' | 'rec709' | 'rec2020';
export type OutputSharpening = 'none' | 'low' | 'medium' | 'high';
export type WatermarkPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'center'
  | 'bottom-center'
  | 'top-center';

export interface WatermarkSettings {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  fontSize: number; // 12 to 48
  opacity: number; // 0.1 to 1.0
  position: WatermarkPosition;
  color: string;
  logoDataUrl?: string;
}

export interface PhotoExportSettings {
  format: PhotoExportFormat;
  quality: number; // 25 to 100
  resizeMode: 'original' | 'percentage' | 'custom';
  resizePercentage: number; // 25, 50, 75, 100, 150, 200
  customWidth?: number;
  customHeight?: number;
  maintainAspectRatio: boolean;
  colorProfile: ColorProfile;
  sharpening: OutputSharpening;
  preserveMetadata: boolean;
  stripGpsData: boolean;
  filenameTemplate: string; // e.g. "CINE_{timestamp}"
  watermark: WatermarkSettings;
}

export interface VideoExportSettings {
  resolution: VideoExportResolution;
  fps: number; // 24, 25, 30, 60
  codec: VideoExportCodec;
  bitrate: 'low' | 'medium' | 'high' | 'maximum';
  audioQuality: '128k' | '256k' | '320k';
  colorProfile: ColorProfile;
  compressionLevel: 'fast' | 'balanced' | 'high_quality';
}

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  mediaType: 'photo' | 'video';
  icon: string;
  isBuiltIn: boolean;
  photoSettings?: Partial<PhotoExportSettings>;
  videoSettings?: Partial<VideoExportSettings>;
}

export const BUILTIN_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'ig_post_4_5',
    name: 'Instagram Post',
    description: '4:5 Vertical • 1080×1350 • High Quality sRGB',
    mediaType: 'photo',
    icon: 'instagram',
    isBuiltIn: true,
    photoSettings: {
      format: 'jpeg',
      quality: 88,
      resizeMode: 'custom',
      customWidth: 1080,
      customHeight: 1350,
      maintainAspectRatio: true,
      colorProfile: 'srgb',
      sharpening: 'low',
      stripGpsData: true,
    },
  },
  {
    id: 'ig_story_9_16',
    name: 'Instagram Story',
    description: '9:16 Full Screen • 1080×1920 • Mobile Ready',
    mediaType: 'photo',
    icon: 'instagram',
    isBuiltIn: true,
    photoSettings: {
      format: 'jpeg',
      quality: 90,
      resizeMode: 'custom',
      customWidth: 1080,
      customHeight: 1920,
      maintainAspectRatio: true,
      colorProfile: 'srgb',
      sharpening: 'low',
      stripGpsData: true,
    },
  },
  {
    id: 'ig_square_1_1',
    name: 'Instagram Square',
    description: '1:1 Square Feed • 1080×1080 • Crisp Compression',
    mediaType: 'photo',
    icon: 'instagram',
    isBuiltIn: true,
    photoSettings: {
      format: 'jpeg',
      quality: 90,
      resizeMode: 'custom',
      customWidth: 1080,
      customHeight: 1080,
      maintainAspectRatio: true,
      colorProfile: 'srgb',
      sharpening: 'low',
    },
  },
  {
    id: 'yt_thumb_16_9',
    name: 'YouTube Thumbnail',
    description: '16:9 Landscape • 1280×720 • Sharp Web Graphic',
    mediaType: 'photo',
    icon: 'youtube',
    isBuiltIn: true,
    photoSettings: {
      format: 'jpeg',
      quality: 95,
      resizeMode: 'custom',
      customWidth: 1280,
      customHeight: 720,
      maintainAspectRatio: true,
      colorProfile: 'srgb',
      sharpening: 'medium',
    },
  },
  {
    id: 'tiktok_video_9_16',
    name: 'TikTok Video',
    description: '9:16 Vertical Video • 1080×1920 • 60 FPS H.264',
    mediaType: 'video',
    icon: 'video',
    isBuiltIn: true,
    videoSettings: {
      resolution: '1080p',
      fps: 60,
      codec: 'h264',
      bitrate: 'high',
      audioQuality: '256k',
      colorProfile: 'rec709',
    },
  },
  {
    id: 'web_optimized',
    name: 'Web Optimized',
    description: 'Compact WebP/JPEG • Max 1920px • Strips GPS',
    mediaType: 'photo',
    icon: 'globe',
    isBuiltIn: true,
    photoSettings: {
      format: 'webp',
      quality: 82,
      resizeMode: 'percentage',
      resizePercentage: 75,
      colorProfile: 'srgb',
      sharpening: 'none',
      stripGpsData: true,
      preserveMetadata: false,
    },
  },
  {
    id: 'pro_print_300dpi',
    name: 'Professional Print',
    description: 'Maximum Resolution • Adobe RGB • 100% Quality',
    mediaType: 'photo',
    icon: 'printer',
    isBuiltIn: true,
    photoSettings: {
      format: 'png',
      quality: 100,
      resizeMode: 'original',
      colorProfile: 'adobe_rgb',
      sharpening: 'medium',
      preserveMetadata: true,
      stripGpsData: false,
    },
  },
  {
    id: 'original_lossless',
    name: 'Original Quality',
    description: '100% Uncompressed • All EXIF Preserved • Bit-Exact',
    mediaType: 'photo',
    icon: 'sparkles',
    isBuiltIn: true,
    photoSettings: {
      format: 'png',
      quality: 100,
      resizeMode: 'original',
      colorProfile: 'display_p3',
      sharpening: 'none',
      preserveMetadata: true,
      stripGpsData: false,
    },
  },
];
