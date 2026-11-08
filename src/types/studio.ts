// Professional Photo Editing Studio Types

export interface ToneCurvePoint {
  x: number; // 0 to 255
  y: number; // 0 to 255
}

export interface ToneCurves {
  rgb: ToneCurvePoint[];
  red: ToneCurvePoint[];
  green: ToneCurvePoint[];
  blue: ToneCurvePoint[];
}

export type HslColorName =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'aqua'
  | 'blue'
  | 'purple'
  | 'magenta';

export interface HslChannelValue {
  hue: number;        // -100 to +100
  saturation: number; // -100 to +100
  luminance: number;  // -100 to +100
}

export type HslSettings = Record<HslColorName, HslChannelValue>;

export interface ColorWheelValue {
  hue: number;        // 0 to 360 degrees
  saturation: number; // 0 to 100%
  luminance: number;  // -100 to +100%
}

export interface ColorGradingSettings {
  shadows: ColorWheelValue;
  midtones: ColorWheelValue;
  highlights: ColorWheelValue;
  global: ColorWheelValue;
  blending: number; // 0 to 100
  balance: number;  // -100 to +100
}

export interface LightSettings {
  exposure: number;   // -5.0 to +5.0 EV
  contrast: number;   // -100 to +100
  highlights: number; // -100 to +100
  shadows: number;    // -100 to +100
  whites: number;     // -100 to +100
  blacks: number;     // -100 to +100
  brightness: number; // -100 to +100
}

export interface ColorSettings {
  temperature: number; // -100 (cool) to +100 (warm)
  tint: number;        // -100 (green) to +100 (magenta)
  vibrance: number;    // -100 to +100
  saturation: number;  // -100 to +100
}

export interface EffectsSettings {
  texture: number;         // -100 to +100
  clarity: number;         // -100 to +100
  dehaze: number;          // -100 to +100
  vignette: number;        // -100 to +100
  vignetteMidpoint: number;// 0 to 100
  vignetteFeather: number; // 0 to 100
  grain: number;           // 0 to 100
  grainSize: number;       // 10 to 100
  grainRoughness: number;  // 10 to 100
}

export interface DetailSettings {
  sharpening: number;      // 0 to 150
  sharpRadius: number;     // 0.5 to 3.0
  sharpDetail: number;     // 0 to 100
  sharpMasking: number;    // 0 to 100
  noiseReduction: number;  // 0 to 100
  noiseDetail: number;     // 0 to 100
  colorNoiseRed: number;   // 0 to 100
}

export interface OpticsSettings {
  distortion: number;      // -100 (barrel) to +100 (pincushion)
  chromaticAberration: number; // 0 to 100 defringe
  vignetteCorrection: number;  // 0 to 100
}

export type CropAspectRatio =
  | 'free'
  | 'original'
  | '1:1'
  | '4:3'
  | '3:2'
  | '4:5'
  | '9:16'
  | '16:9';

export interface GeometrySettings {
  cropRatio: CropAspectRatio;
  cropRect: { x: number; y: number; width: number; height: number }; // 0-100% normalized
  straighten: number;      // -45 to +45 degrees
  rotation: number;        // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  verticalKeystone: number;   // -100 to +100
  horizontalKeystone: number; // -100 to +100
}

/**
 * Mask kinds that really select pixels. There is deliberately no subject/face/background kind:
 * those need an on-device AI model, which this app does not include. "sky" is a colour-and-position estimate.
 */
export type MaskType = 'linear' | 'radial' | 'brush' | 'luminance' | 'color' | 'sky';

export interface MaskAdjustments {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temperature: number;
  saturation: number;
  sharpness: number;
}

export interface MaskObject {
  id: string;
  name: string;
  type: MaskType;
  enabled: boolean;
  inverted: boolean;
  // Spatial parameters (normalized 0-100)
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;       // for linear gradient
  feather: number;     // 0 to 100
  brushPoints?: { x: number; y: number; r: number }[];
  /** Luminance-range mask: 0..100 bounds. */
  lumMin?: number;
  lumMax?: number;
  /** Colour-range mask: hue centre 0..360 and half-width in degrees. */
  hue?: number;
  hueRange?: number;
  adjustments: MaskAdjustments;
}

export interface StudioEditState {
  light: LightSettings;
  curves: ToneCurves;
  color: ColorSettings;
  hsl: HslSettings;
  colorGrading: ColorGradingSettings;
  effects: EffectsSettings;
  detail: DetailSettings;
  optics: OpticsSettings;
  geometry: GeometrySettings;
  masks: MaskObject[];
  activeMaskId: string | null;
  activePresetId?: string;
  presetIntensity: number; // 0 to 200%
}

export type StudioTab =
  | 'light'
  | 'color'
  | 'effects'
  | 'detail'
  | 'optics'
  | 'geometry'
  | 'masking'
  | 'presets';

export type CompareViewMode =
  | 'after-only'
  | 'split-vertical'
  | 'split-horizontal'
  | 'side-by-side'
  | 'before-hold';

export interface StudioPresetCategory {
  id: string;
  name: string;
}

export interface StudioPreset {
  id: string;
  name: string;
  category:
    | 'Cinematic'
    | 'Natural'
    | 'Portrait'
    | 'Landscape'
    | 'Street'
    | 'Travel'
    | 'Vintage'
    | 'Film'
    | 'Black & White'
    | 'Moody'
    | 'Warm'
    | 'Cool';
  description: string;
  thumbnailColor: string;
  values: Partial<StudioEditState>;
}
