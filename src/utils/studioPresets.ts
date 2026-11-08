import type { StudioPreset, StudioPresetCategory } from '../types/studio';

export const STUDIO_PRESET_CATEGORIES: StudioPresetCategory[] = [
  { id: 'all', name: 'All Presets' },
  { id: 'Cinematic', name: 'Cinematic' },
  { id: 'Natural', name: 'Natural' },
  { id: 'Portrait', name: 'Portrait' },
  { id: 'Landscape', name: 'Landscape' },
  { id: 'Street', name: 'Street' },
  { id: 'Travel', name: 'Travel' },
  { id: 'Vintage', name: 'Vintage' },
  { id: 'Film', name: 'Film Emulation' },
  { id: 'Black & White', name: 'Black & White' },
  { id: 'Moody', name: 'Moody Noir' },
  { id: 'Warm', name: 'Golden Warm' },
  { id: 'Cool', name: 'Cool Nordic' },
];

export const STUDIO_PRESETS: StudioPreset[] = [
  // ==================== CINEMATIC ====================
  {
    id: 'cine_teal_orange',
    name: 'Teal & Orange Blockbuster',
    category: 'Cinematic',
    description: 'Classic Hollywood look with teal shadows and warm golden skin highlights.',
    thumbnailColor: '#f97316',
    values: {
      light: { exposure: 0.1, contrast: 24, highlights: -20, shadows: 15, whites: 10, blacks: -15, brightness: 0 },
      color: { temperature: 12, tint: -4, vibrance: 18, saturation: -5 },
      colorGrading: {
        shadows: { hue: 195, saturation: 45, luminance: -10 },
        midtones: { hue: 35, saturation: 20, luminance: 0 },
        highlights: { hue: 38, saturation: 50, luminance: 5 },
        global: { hue: 0, saturation: 0, luminance: 0 },
        blending: 50,
        balance: 10,
      },
      effects: { texture: 10, clarity: 15, dehaze: 8, vignette: -20, vignetteMidpoint: 45, vignetteFeather: 60, grain: 12, grainSize: 25, grainRoughness: 35 },
    },
  },
  {
    id: 'cine_anamorphic',
    name: 'Anamorphic Horizon',
    category: 'Cinematic',
    description: 'High contrast cinematic grade with lifted blacks and deep cyan tones.',
    thumbnailColor: '#0284c7',
    values: {
      light: { exposure: -0.1, contrast: 30, highlights: -15, shadows: -10, whites: 8, blacks: 12, brightness: 0 },
      color: { temperature: -8, tint: 6, vibrance: 15, saturation: -10 },
      colorGrading: {
        shadows: { hue: 210, saturation: 40, luminance: 5 },
        midtones: { hue: 185, saturation: 15, luminance: 0 },
        highlights: { hue: 45, saturation: 35, luminance: 0 },
        global: { hue: 0, saturation: 0, luminance: 0 },
        blending: 55,
        balance: -5,
      },
      effects: { texture: 12, clarity: 20, dehaze: 10, vignette: -30, vignetteMidpoint: 40, vignetteFeather: 70, grain: 18, grainSize: 30, grainRoughness: 45 },
    },
  },

  // ==================== NATURAL ====================
  {
    id: 'nat_clean',
    name: 'Clean Neutral Raw',
    category: 'Natural',
    description: 'Gentle dynamic range optimization with pristine natural color fidelity.',
    thumbnailColor: '#10b981',
    values: {
      light: { exposure: 0.15, contrast: 8, highlights: -25, shadows: 20, whites: 5, blacks: -5, brightness: 0 },
      color: { temperature: 2, tint: 0, vibrance: 10, saturation: 5 },
      effects: { texture: 5, clarity: 5, dehaze: 0, vignette: 0, vignetteMidpoint: 50, vignetteFeather: 50, grain: 0, grainSize: 30, grainRoughness: 40 },
    },
  },

  // ==================== PORTRAIT ====================
  {
    id: 'port_soft_skin',
    name: 'Editorial Soft Skin',
    category: 'Portrait',
    description: 'Smooth, flattering skin tones with rich soft highlight rolloff.',
    thumbnailColor: '#fb7185',
    values: {
      light: { exposure: 0.25, contrast: -6, highlights: -30, shadows: 15, whites: -10, blacks: 5, brightness: 5 },
      color: { temperature: 8, tint: 2, vibrance: 14, saturation: -6 },
      hsl: {
        red: { hue: 0, saturation: -5, luminance: 8 },
        orange: { hue: -2, saturation: -8, luminance: 16 },
        yellow: { hue: 5, saturation: -10, luminance: 10 },
        green: { hue: 0, saturation: 0, luminance: 0 },
        aqua: { hue: 0, saturation: 0, luminance: 0 },
        blue: { hue: 0, saturation: 0, luminance: 0 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 0, saturation: 0, luminance: 0 },
      },
      effects: { texture: -12, clarity: -10, dehaze: 0, vignette: -15, vignetteMidpoint: 60, vignetteFeather: 65, grain: 8, grainSize: 20, grainRoughness: 30 },
    },
  },

  // ==================== LANDSCAPE ====================
  {
    id: 'land_golden_valley',
    name: 'Alpine Golden Valley',
    category: 'Landscape',
    description: 'Deep sky recovery, punchy foliage greens, and raking sunset warmth.',
    thumbnailColor: '#ca8a04',
    values: {
      light: { exposure: 0, contrast: 22, highlights: -45, shadows: 35, whites: 15, blacks: -12, brightness: 0 },
      color: { temperature: 15, tint: -2, vibrance: 30, saturation: 10 },
      effects: { texture: 25, clarity: 22, dehaze: 18, vignette: -12, vignetteMidpoint: 50, vignetteFeather: 50, grain: 0, grainSize: 30, grainRoughness: 40 },
    },
  },

  // ==================== STREET ====================
  {
    id: 'street_urban_grit',
    name: 'Urban Street Grit',
    category: 'Street',
    description: 'Hard-hitting asphalt contrast with desaturated colors and sharp micro-texture.',
    thumbnailColor: '#64748b',
    values: {
      light: { exposure: -0.15, contrast: 35, highlights: -10, shadows: -25, whites: 20, blacks: -30, brightness: 0 },
      color: { temperature: -4, tint: 0, vibrance: -15, saturation: -25 },
      effects: { texture: 35, clarity: 30, dehaze: 15, vignette: -28, vignetteMidpoint: 35, vignetteFeather: 60, grain: 24, grainSize: 35, grainRoughness: 50 },
    },
  },

  // ==================== TRAVEL ====================
  {
    id: 'trav_coastal_azure',
    name: 'Mediterranean Azure Coast',
    category: 'Travel',
    description: 'Vibrant turquoise waters, warm golden sand, and sun-drenched clarity.',
    thumbnailColor: '#06b6d4',
    values: {
      light: { exposure: 0.2, contrast: 16, highlights: -25, shadows: 20, whites: 12, blacks: -8, brightness: 0 },
      color: { temperature: 6, tint: -6, vibrance: 28, saturation: 14 },
      hsl: {
        red: { hue: 0, saturation: 10, luminance: 0 },
        orange: { hue: 0, saturation: 15, luminance: 5 },
        yellow: { hue: -5, saturation: 18, luminance: 8 },
        green: { hue: 10, saturation: 20, luminance: -5 },
        aqua: { hue: -5, saturation: 35, luminance: 12 },
        blue: { hue: -8, saturation: 25, luminance: 6 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 0, saturation: 0, luminance: 0 },
      },
      effects: { texture: 15, clarity: 18, dehaze: 12, vignette: -15, vignetteMidpoint: 50, vignetteFeather: 50, grain: 5, grainSize: 20, grainRoughness: 30 },
    },
  },

  // ==================== VINTAGE ====================
  {
    id: 'vin_70s_nostalgia',
    name: 'Faded 70s Nostalgia',
    category: 'Vintage',
    description: 'Muted faded shadows, gentle yellow-green cast, and authentic film roll character.',
    thumbnailColor: '#b45309',
    values: {
      light: { exposure: 0.1, contrast: -12, highlights: -20, shadows: 10, whites: -15, blacks: 28, brightness: 0 },
      color: { temperature: 24, tint: 10, vibrance: -10, saturation: -18 },
      colorGrading: {
        shadows: { hue: 75, saturation: 25, luminance: 8 },
        midtones: { hue: 45, saturation: 15, luminance: 0 },
        highlights: { hue: 55, saturation: 20, luminance: -5 },
        global: { hue: 0, saturation: 0, luminance: 0 },
        blending: 60,
        balance: 15,
      },
      effects: { texture: -5, clarity: -8, dehaze: -5, vignette: -25, vignetteMidpoint: 45, vignetteFeather: 65, grain: 32, grainSize: 45, grainRoughness: 60 },
    },
  },

  // ==================== FILM EMULATION ====================
  {
    id: 'film_portra_400',
    name: 'Portra 400 Film Emulation',
    category: 'Film',
    description: 'Subtle pastel tones, organic fine grain, and renowned warm skin tone rendering.',
    thumbnailColor: '#d97706',
    values: {
      light: { exposure: 0.15, contrast: 10, highlights: -18, shadows: 8, whites: 6, blacks: 4, brightness: 0 },
      color: { temperature: 10, tint: -2, vibrance: 12, saturation: 4 },
      effects: { texture: 8, clarity: 4, dehaze: 0, vignette: -12, vignetteMidpoint: 55, vignetteFeather: 60, grain: 16, grainSize: 22, grainRoughness: 35 },
    },
  },
  {
    id: 'film_cinestill_800t',
    name: 'CineStill 800T Tungsten',
    category: 'Film',
    description: 'Tungsten-balanced cinematic film with signature cyan-blue cast and red halation warmth.',
    thumbnailColor: '#38bdf8',
    values: {
      light: { exposure: 0, contrast: 26, highlights: -10, shadows: 15, whites: 14, blacks: -10, brightness: 0 },
      color: { temperature: -24, tint: 14, vibrance: 20, saturation: 8 },
      colorGrading: {
        shadows: { hue: 205, saturation: 42, luminance: 0 },
        midtones: { hue: 190, saturation: 18, luminance: 0 },
        highlights: { hue: 25, saturation: 35, luminance: 5 },
        global: { hue: 0, saturation: 0, luminance: 0 },
        blending: 50,
        balance: -10,
      },
      effects: { texture: 14, clarity: 12, dehaze: 6, vignette: -22, vignetteMidpoint: 40, vignetteFeather: 60, grain: 26, grainSize: 32, grainRoughness: 48 },
    },
  },

  // ==================== BLACK & WHITE ====================
  {
    id: 'bw_trix_contrast',
    name: 'Tri-X 400 Deep B&W',
    category: 'Black & White',
    description: 'Legendary high-contrast monochrome with silver gelatin depth and rich blacks.',
    thumbnailColor: '#27272a',
    values: {
      light: { exposure: 0.1, contrast: 42, highlights: 15, shadows: -30, whites: 25, blacks: -35, brightness: 0 },
      color: { temperature: 0, tint: 0, vibrance: -100, saturation: -100 },
      effects: { texture: 28, clarity: 25, dehaze: 14, vignette: -30, vignetteMidpoint: 45, vignetteFeather: 65, grain: 38, grainSize: 36, grainRoughness: 55 },
    },
  },

  // ==================== MOODY ====================
  {
    id: 'moody_dark_nordic',
    name: 'Dark Nordic Moody',
    category: 'Moody',
    description: 'Desaturated greens, crushed deep shadows, and introspective Scandinavian atmosphere.',
    thumbnailColor: '#1e293b',
    values: {
      light: { exposure: -0.35, contrast: 28, highlights: -25, shadows: -15, whites: -5, blacks: 15, brightness: -5 },
      color: { temperature: -10, tint: 4, vibrance: -25, saturation: -30 },
      colorGrading: {
        shadows: { hue: 215, saturation: 30, luminance: 5 },
        midtones: { hue: 195, saturation: 15, luminance: -5 },
        highlights: { hue: 40, saturation: 18, luminance: 0 },
        global: { hue: 0, saturation: 0, luminance: 0 },
        blending: 55,
        balance: -15,
      },
      effects: { texture: 18, clarity: 20, dehaze: 10, vignette: -35, vignetteMidpoint: 35, vignetteFeather: 70, grain: 20, grainSize: 28, grainRoughness: 42 },
    },
  },

  // ==================== WARM ====================
  {
    id: 'warm_golden_hour',
    name: 'Golden Hour Radiance',
    category: 'Warm',
    description: 'Enveloping 5:00 PM sunset magic with soft amber bloom and creamy highlights.',
    thumbnailColor: '#eab308',
    values: {
      light: { exposure: 0.2, contrast: 12, highlights: -25, shadows: 25, whites: 10, blacks: -5, brightness: 0 },
      color: { temperature: 35, tint: 6, vibrance: 25, saturation: 10 },
      colorGrading: {
        shadows: { hue: 35, saturation: 35, luminance: 0 },
        midtones: { hue: 42, saturation: 25, luminance: 5 },
        highlights: { hue: 48, saturation: 45, luminance: 10 },
        global: { hue: 0, saturation: 0, luminance: 0 },
        blending: 65,
        balance: 20,
      },
      effects: { texture: -5, clarity: 8, dehaze: -4, vignette: -18, vignetteMidpoint: 50, vignetteFeather: 65, grain: 10, grainSize: 20, grainRoughness: 30 },
    },
  },

  // ==================== COOL ====================
  {
    id: 'cool_glacier_blue',
    name: 'Glacial Ice Cool',
    category: 'Cool',
    description: 'Crisp arctic blues, clean white highlights, and crystalline clarity.',
    thumbnailColor: '#38bdf8',
    values: {
      light: { exposure: 0.15, contrast: 18, highlights: 10, shadows: -8, whites: 20, blacks: -10, brightness: 0 },
      color: { temperature: -32, tint: -8, vibrance: 22, saturation: 5 },
      colorGrading: {
        shadows: { hue: 220, saturation: 38, luminance: 0 },
        midtones: { hue: 200, saturation: 20, luminance: 5 },
        highlights: { hue: 190, saturation: 30, luminance: 10 },
        global: { hue: 0, saturation: 0, luminance: 0 },
        blending: 50,
        balance: -20,
      },
      effects: { texture: 22, clarity: 25, dehaze: 15, vignette: -12, vignetteMidpoint: 50, vignetteFeather: 50, grain: 8, grainSize: 20, grainRoughness: 35 },
    },
  },
];
