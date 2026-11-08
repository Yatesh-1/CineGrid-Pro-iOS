import type { LutDefinition } from '../types/lut';
import { generateCubeFile, parseCubeFile } from '../utils/cubeParser';

interface BuiltinLutBlueprint {
  id: string;
  name: string;
  category: LutDefinition['category'];
  title: string;
  colorGradeFn: (r: number, g: number, b: number) => [number, number, number];
}

const BLUEPRINTS: BuiltinLutBlueprint[] = [
  {
    id: 'cine_teal_orange',
    name: 'Teal & Orange Hollywood',
    category: 'cinematic',
    title: 'Blockbuster Teal Orange',
    colorGradeFn: (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // Push shadows toward teal (cyan-blue)
      const shadowWeight = Math.pow(1.0 - lum, 1.8);
      // Push highlights toward warm orange
      const highlightWeight = Math.pow(lum, 1.4);

      let nr = r + highlightWeight * 0.18 - shadowWeight * 0.08;
      let ng = g + highlightWeight * 0.08 + shadowWeight * 0.04;
      let nb = b - highlightWeight * 0.12 + shadowWeight * 0.24;
      return [nr, ng, nb];
    },
  },
  {
    id: 'film_kodak_vision',
    name: 'Kodak Vision 5207',
    category: 'film_emulation',
    title: 'Kodak Motion Picture Emulation',
    colorGradeFn: (r, g, b) => {
      // Warm midtones, rich organic density, slight rolled highlights
      let nr = Math.pow(r, 0.92) * 1.05 + 0.02;
      let ng = Math.pow(g, 0.98) * 0.99;
      let nb = Math.pow(b, 1.08) * 0.92;
      return [nr, ng, nb];
    },
  },
  {
    id: 'film_fuji_pro400h',
    name: 'Fuji Pro 400H Soft',
    category: 'film_emulation',
    title: 'Fujicolor Pastel Portrait',
    colorGradeFn: (r, g, b) => {
      // Soft airy pastels, cyan-green undertone in shadows, lifted blacks
      const lift = 0.04;
      let nr = lift + (1.0 - lift) * Math.pow(r, 1.04) * 0.98;
      let ng = lift + (1.0 - lift) * Math.pow(g, 0.95) * 1.02;
      let nb = lift + (1.0 - lift) * Math.pow(b, 0.98) * 1.06;
      return [nr, ng, nb];
    },
  },
  {
    id: 'cine_tokyo_cyber',
    name: 'Tokyo Cyber Neon',
    category: 'cinematic',
    title: 'Cyberpunk Magenta Cyan',
    colorGradeFn: (r, g, b) => {
      // High contrast, deep blacks, electric magenta and cyan
      let nr = Math.pow(r, 1.25) * 1.15 + (b > 0.4 ? 0.1 : 0);
      let ng = Math.pow(g, 1.3) * 0.85;
      let nb = Math.pow(b, 1.1) * 1.25 + (r > 0.4 ? 0.08 : 0);
      return [nr, ng, nb];
    },
  },
  {
    id: 'land_golden_hour',
    name: 'Golden Hour Glow',
    category: 'landscape',
    title: 'Warm Sunlight Dispersion',
    colorGradeFn: (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      let nr = r + 0.14 * Math.sin(lum * Math.PI);
      let ng = g + 0.08 * Math.sin(lum * Math.PI);
      let nb = b - 0.1 * Math.sin(lum * Math.PI);
      return [nr, ng, nb];
    },
  },
  {
    id: 'vint_polaroid_70s',
    name: '70s Instant Polaroid',
    category: 'vintage',
    title: 'Vintage Matte Film',
    colorGradeFn: (r, g, b) => {
      // Lifted faded blacks, yellow-green cast, soft contrast
      const fade = 0.08;
      let nr = fade + (1 - fade) * (r * 0.96 + 0.04);
      let ng = fade + (1 - fade) * (g * 0.98 + 0.03);
      let nb = fade + (1 - fade) * (b * 0.85);
      return [nr, ng, nb];
    },
  },
  {
    id: 'bw_film_noir',
    name: 'Film Noir Contrast',
    category: 'black_white',
    title: 'Monochrome High Dynamic',
    colorGradeFn: (r, g, b) => {
      // Panchromatic film luminance curve
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      const contrast = Math.pow(lum, 1.4);
      return [contrast, contrast, contrast];
    },
  },
  {
    id: 'port_velvet_skin',
    name: 'Velvet Skin Glow',
    category: 'portrait',
    title: 'Clean Portrait Skintone',
    colorGradeFn: (r, g, b) => {
      // Preserves skin tones while softly balancing shadows
      let nr = Math.pow(r, 0.95);
      let ng = Math.pow(g, 0.98);
      let nb = Math.pow(b, 1.05);
      return [nr, ng, nb];
    },
  },
  {
    id: 'land_moody_forest',
    name: 'Moody Forest Green',
    category: 'landscape',
    title: 'Deep Pine & Cold Sky',
    colorGradeFn: (r, g, b) => {
      let nr = Math.pow(r, 1.1) * 0.92;
      let ng = Math.pow(g, 0.94) * 1.06;
      let nb = Math.pow(b, 1.05) * 1.02;
      return [nr, ng, nb];
    },
  },
  {
    id: 'cine_bleach_bypass',
    name: 'Silver Bleach Bypass',
    category: 'cinematic',
    title: 'Desaturated Hard Contrast',
    colorGradeFn: (r, g, b) => {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sFactor = 0.45; // 55% desaturated
      const desatR = lum + (r - lum) * sFactor;
      const desatG = lum + (g - lum) * sFactor;
      const desatB = lum + (b - lum) * sFactor;
      // Hard S-curve
      const sCurve = (v: number) => (v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v));
      return [sCurve(desatR), sCurve(desatG), sCurve(desatB)];
    },
  },
  {
    id: 'land_sunset_horizon',
    name: 'Sunset Horizon Amber',
    category: 'landscape',
    title: 'Radiant Dusk Warmth',
    colorGradeFn: (r, g, b) => {
      let nr = r + 0.15;
      let ng = g + 0.05;
      let nb = b - 0.08;
      return [nr, ng, nb];
    },
  },
  {
    id: 'bw_silver_gelatin',
    name: 'Silver Gelatin Print',
    category: 'black_white',
    title: 'Fine Art Silver Halide',
    colorGradeFn: (r, g, b) => {
      const lum = 0.25 * r + 0.65 * g + 0.1 * b;
      // Slight warm sepia toning in midtones
      const cr = lum * 1.03;
      const cg = lum * 1.0;
      const cb = lum * 0.95;
      return [cr, cg, cb];
    },
  },
];

/**
 * Pre-instantiates the built-in 3D LUT collection with 17x17x17 precision
 */
export function createBuiltinLuts(): LutDefinition[] {
  const lutSize = 17;

  return BLUEPRINTS.map((bp) => {
    const rawCube = generateCubeFile(bp.title, lutSize, bp.colorGradeFn);
    const parsed = parseCubeFile(rawCube, bp.name);

    if (parsed.success && parsed.lut) {
      return {
        ...parsed.lut,
        id: bp.id,
        name: bp.name,
        category: bp.category,
        isFavorite: bp.id === 'cine_teal_orange' || bp.id === 'film_kodak_vision',
        isImported: false,
      };
    }

    // Fallback basic definition if parse fails
    const expectedPoints = lutSize * lutSize * lutSize;
    const floatData = new Float32Array(expectedPoints * 3);
    return {
      id: bp.id,
      name: bp.name,
      category: bp.category,
      size: lutSize,
      data: floatData,
      thumbnailGradient: 'linear-gradient(135deg, #18181b 0%, #3f3f46 50%, #71717a 100%)',
      isFavorite: false,
      isImported: false,
    };
  });
}

export const BUILTIN_LUTS: LutDefinition[] = createBuiltinLuts();
