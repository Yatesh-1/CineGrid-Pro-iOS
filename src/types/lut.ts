// Professional 3D LUT & Filter System Types

export type LutCategory =
  | 'imported'
  | 'cinematic'
  | 'film_emulation'
  | 'vintage'
  | 'portrait'
  | 'black_white'
  | 'landscape'
  | 'favorites';

export interface LutDefinition {
  id: string;
  name: string;
  category: LutCategory;
  size: number; // 17, 33, 65
  title?: string;
  domainMin?: [number, number, number];
  domainMax?: [number, number, number];
  data: Float32Array; // Flattened size*size*size*3 RGB table (normalized 0.0 to 1.0)
  rawCube?: string; // Stored .cube string for re-export
  thumbnailGradient: string;
  isFavorite: boolean;
  isImported: boolean;
  importDate?: number;
  fileSize?: number; // In bytes
}

export interface LookFilterDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  previewGradient: string;
  previewColor: string;
  // Color matrix or adjustment offsets
  brightness: number; // percentage (default 100)
  contrast: number; // percentage (default 100)
  saturation: number; // percentage (default 100)
  sepia: number; // percentage (default 0)
  hueRotate: number; // degrees (default 0)
  temperature: number; // -100 to +100
  tint: number; // -100 to +100
  vignette: number; // 0 to 100
}

export interface ColorAdjustments {
  exposure: number;     // -2.0 to +2.0 EV
  contrast: number;     // -50 to +50
  saturation: number;   // -100 to +100
  temperature: number;  // -100 to +100
  tint: number;         // -100 to +100
  highlights: number;   // -100 to +100
  shadows: number;      // -100 to +100
  fade: number;         // 0 to 100
  sharpening: number;   // 0 to 100
}

export const DEFAULT_COLOR_ADJUSTMENTS: ColorAdjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  fade: 0,
  sharpening: 0,
};

export type LookTab = 'filters' | 'luts' | 'adjustments';

export interface LookState {
  activeLutId: string | null;
  lutIntensity: number; // 0 to 100 percentage
  activeFilterId: string | null;
  filterIntensity: number; // 0 to 100 percentage
  adjustments: ColorAdjustments;
  isCompareActive: boolean; // Before / After split or hold
  compareSplitPosition: number; // 0 to 100 percentage
}

export const DEFAULT_LOOK_STATE: LookState = {
  activeLutId: null,
  lutIntensity: 100,
  activeFilterId: null,
  filterIntensity: 100,
  adjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
  isCompareActive: false,
  compareSplitPosition: 50,
};

export interface UserLookPreset {
  id: string;
  name: string;
  category: string;
  state: LookState;
  createdAt: number;
  thumbnailGradient: string;
}

export interface LutParseResult {
  success: boolean;
  lut?: LutDefinition;
  error?: string;
  details?: {
    size: number;
    title?: string;
    pointCount: number;
    fileSize: number;
  };
}
