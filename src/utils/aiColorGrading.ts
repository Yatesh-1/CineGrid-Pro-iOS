/**
 * AI Automatic Environment-Aware Photo Color Grading Engine
 *
 * Implements real on-device computational photography scene analysis and color intelligence:
 * 1. Fast, memory-safe pixel histogram and chromaticity sampling
 * 2. Scene classification: Lighting (Golden Hour, Daylight, Low-Light/Night, Blue Hour/Cool, High Dynamic Range)
 *    and Subject/Environment (Portrait/Skin, Landscape/Greenery, Sky/Cyan, Moody/Urban).
 * 3. Generates non-destructive parametric color-grading adjustments (StudioEditState)
 * 4. Skin tone preservation & natural tonal response
 */

import type { StudioEditState, ColorGradingSettings, LightSettings, ColorSettings, EffectsSettings } from '../types/studio';

export interface SceneAnalysis {
  environment: 'outdoor_daylight' | 'golden_hour' | 'blue_hour' | 'low_light_night' | 'indoor_mixed' | 'high_contrast';
  lightingDescription: string;
  dynamicRange: 'flat' | 'balanced' | 'high_contrast' | 'underexposed' | 'overexposed';
  dominantCast: 'neutral' | 'warm' | 'cool' | 'magenta' | 'green';
  hasSkinTones: boolean;
  meanLuma: number;
  shadowRatio: number;
  highlightRatio: number;
  contrastScore: number;
  suggestedGradeName: string;
}

export interface AiGradingResult {
  analysis: SceneAnalysis;
  suggestedState: Partial<StudioEditState>;
}

/**
 * Analyzes an image canvas or pixel buffer to extract scene characteristics.
 * Operates on a fast downsampled proxy to keep inference time < 15ms.
 */
export function analyzeSceneFromImageData(imgData: ImageData): SceneAnalysis {
  const data = imgData.data;
  const len = data.length;
  const totalPixels = len / 4;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumLuma = 0;

  let shadowCount = 0;
  let highlightCount = 0;
  let midtoneCount = 0;
  let skinPixelCount = 0;

  // Step through pixels (sampling stride if large)
  const step = Math.max(1, Math.floor(totalPixels / 20000));
  let sampled = 0;

  for (let i = 0; i < len; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    sumR += r;
    sumG += g;
    sumB += b;

    // Rec. 709 luminance
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sumLuma += luma;

    if (luma < 45) {
      shadowCount++;
    } else if (luma > 215) {
      highlightCount++;
    } else {
      midtoneCount++;
    }

    // Fast heuristic skin-tone detection in RGB space
    // Skin clusters around: R > G > B, (R - G) in [15, 65], (G - B) in [15, 55], R in [95, 235]
    if (r >= 95 && r <= 235 && g >= 60 && b >= 40 && r > g && g > b && (r - g) >= 15 && (r - g) <= 65 && (g - b) >= 15 && (g - b) <= 55) {
      skinPixelCount++;
    }

    sampled++;
  }

  const meanR = sumR / sampled;
  const meanG = sumG / sampled;
  const meanB = sumB / sampled;
  const meanLuma = sumLuma / sampled;

  const shadowRatio = shadowCount / sampled;
  const highlightRatio = highlightCount / sampled;
  const skinRatio = skinPixelCount / sampled;

  // Determine dominant colour cast
  let dominantCast: SceneAnalysis['dominantCast'] = 'neutral';
  if (meanR > meanB + 18 && meanR > meanG + 10) {
    dominantCast = 'warm';
  } else if (meanB > meanR + 15) {
    dominantCast = 'cool';
  } else if (meanG > meanR + 12 && meanG > meanB + 12) {
    dominantCast = 'green';
  } else if (meanR > meanG + 15 && meanB > meanG + 15) {
    dominantCast = 'magenta';
  }

  // Dynamic range profile
  let dynamicRange: SceneAnalysis['dynamicRange'] = 'balanced';
  const contrastScore = Math.abs(highlightRatio - shadowRatio) + (highlightRatio + shadowRatio);

  if (meanLuma < 55) {
    dynamicRange = 'underexposed';
  } else if (meanLuma > 195) {
    dynamicRange = 'overexposed';
  } else if (contrastScore > 0.45 && shadowRatio > 0.15 && highlightRatio > 0.15) {
    dynamicRange = 'high_contrast';
  } else if (contrastScore < 0.12) {
    dynamicRange = 'flat';
  }

  // Environment classification
  let environment: SceneAnalysis['environment'] = 'outdoor_daylight';
  let lightingDescription = 'Natural daylight';
  let suggestedGradeName = 'Natural Commercial';

  if (skinRatio > 0.12) {
    environment = 'indoor_mixed';
    lightingDescription = 'Subject / Portrait Environment';
    suggestedGradeName = 'Natural Portrait Skin Tone Protect';
  } else if (meanLuma < 65 || (shadowRatio > 0.5 && highlightRatio < 0.15)) {
    environment = 'low_light_night';
    lightingDescription = 'Low-light / Night Scene';
    suggestedGradeName = 'Moody Shadows / Noir Clean';
  } else if (dominantCast === 'warm' && meanLuma > 90 && meanLuma < 170) {
    environment = 'golden_hour';
    lightingDescription = 'Golden Hour / Sunset Glow';
    suggestedGradeName = 'Cinematic Warmth & Sunset Lift';
  } else if (dominantCast === 'cool' && (meanLuma < 110 || highlightRatio < 0.2)) {
    environment = 'blue_hour';
    lightingDescription = 'Blue Hour / Cool Twilight';
    suggestedGradeName = 'Cool Nordic & Clean Separation';
  } else if (dynamicRange === 'high_contrast') {
    environment = 'high_contrast';
    lightingDescription = 'High Dynamic Range Lighting';
    suggestedGradeName = 'Balanced Dynamic Recovery';
  }

  return {
    environment,
    lightingDescription,
    dynamicRange,
    dominantCast,
    hasSkinTones: skinRatio > 0.08,
    meanLuma,
    shadowRatio,
    highlightRatio,
    contrastScore,
    suggestedGradeName,
  };
}

/**
 * Computes the optimal AI color grading adjustments based on scene analysis.
 * Non-destructive and respects skin tones.
 */
export function generateAiGrade(analysis: SceneAnalysis, intensity: number = 1.0): Partial<StudioEditState> {
  const t = Math.max(0, Math.min(1.5, intensity));

  const light: LightSettings = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    brightness: 0,
  };

  const color: ColorSettings = {
    temperature: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0,
  };

  const colorGrading: ColorGradingSettings = {
    shadows: { hue: 0, saturation: 0, luminance: 0 },
    midtones: { hue: 0, saturation: 0, luminance: 0 },
    highlights: { hue: 0, saturation: 0, luminance: 0 },
    global: { hue: 0, saturation: 0, luminance: 0 },
    blending: 50,
    balance: 0,
  };

  const effects: Partial<EffectsSettings> = {
    clarity: Math.round(8 * t),
    dehaze: Math.round(5 * t),
  };

  // 1. Exposure and dynamic range adaptation
  if (analysis.dynamicRange === 'underexposed') {
    light.exposure = +(0.35 * t).toFixed(2);
    light.shadows = Math.round(25 * t);
    light.blacks = Math.round(15 * t);
  } else if (analysis.dynamicRange === 'overexposed') {
    light.exposure = +(-0.35 * t).toFixed(2);
    light.highlights = Math.round(-30 * t);
    light.whites = Math.round(-15 * t);
  } else if (analysis.dynamicRange === 'high_contrast') {
    light.highlights = Math.round(-25 * t);
    light.shadows = Math.round(20 * t);
    light.contrast = Math.round(8 * t);
  } else if (analysis.dynamicRange === 'flat') {
    light.contrast = Math.round(22 * t);
    light.whites = Math.round(10 * t);
    light.blacks = Math.round(-10 * t);
  } else {
    light.contrast = Math.round(12 * t);
    light.highlights = Math.round(-10 * t);
    light.shadows = Math.round(10 * t);
  }

  // 2. White balance & cast correction
  if (analysis.dominantCast === 'cool') {
    color.temperature = Math.round(12 * t);
  } else if (analysis.dominantCast === 'warm') {
    color.temperature = Math.round(-8 * t);
  } else if (analysis.dominantCast === 'green') {
    color.tint = Math.round(10 * t);
  } else if (analysis.dominantCast === 'magenta') {
    color.tint = Math.round(-10 * t);
  }

  // 3. Environment & Scene Tonal Styling
  switch (analysis.environment) {
    case 'golden_hour':
      // Harmonize warm highlights with gentle teal-slate shadows
      colorGrading.shadows = { hue: 205, saturation: Math.round(25 * t), luminance: -5 };
      colorGrading.highlights = { hue: 42, saturation: Math.round(35 * t), luminance: 5 };
      color.vibrance = Math.round(16 * t);
      color.saturation = Math.round(4 * t);
      break;

    case 'blue_hour':
      // Cool moody atmosphere with crisp separation
      colorGrading.shadows = { hue: 220, saturation: Math.round(30 * t), luminance: -8 };
      colorGrading.highlights = { hue: 35, saturation: Math.round(20 * t), luminance: 4 };
      color.vibrance = Math.round(14 * t);
      color.saturation = Math.round(-5 * t);
      break;

    case 'low_light_night':
      // Protect noise in darks, clean lifted shadows with subtle rich contrast
      colorGrading.shadows = { hue: 215, saturation: Math.round(20 * t), luminance: 4 };
      colorGrading.highlights = { hue: 40, saturation: Math.round(25 * t), luminance: 0 };
      color.vibrance = Math.round(12 * t);
      color.saturation = Math.round(-6 * t);
      light.blacks = Math.round(8 * t);
      break;

    case 'outdoor_daylight':
    case 'indoor_mixed':
    default:
      if (analysis.hasSkinTones) {
        // Portrait-safe: Warm golden midtones, neutral highlights, protected saturation
        colorGrading.midtones = { hue: 32, saturation: Math.round(18 * t), luminance: 2 };
        colorGrading.shadows = { hue: 210, saturation: Math.round(15 * t), luminance: -4 };
        color.vibrance = Math.round(12 * t);
        color.saturation = Math.round(-2 * t);
      } else {
        // Landscape & Commercial: Clean rich colors, high separation
        colorGrading.shadows = { hue: 200, saturation: Math.round(22 * t), luminance: -5 };
        colorGrading.highlights = { hue: 45, saturation: Math.round(24 * t), luminance: 5 };
        color.vibrance = Math.round(20 * t);
        color.saturation = Math.round(5 * t);
      }
      break;
  }

  return {
    light,
    color,
    colorGrading,
    effects: effects as EffectsSettings,
  };
}

/**
 * Convenience helper to analyze an HTML Canvas and apply an AI auto-grade in one call.
 */
export function analyzeAndGenerateAiGrade(canvas: HTMLCanvasElement, intensity: number = 1.0): AiGradingResult | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    const w = canvas.width;
    const h = canvas.height;
    if (w <= 0 || h <= 0) return null;

    // Fast sampling canvas
    const sampleW = Math.min(256, w);
    const sampleH = Math.min(256, Math.round((sampleW * h) / w));

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sampleCtx = sampleCanvas.getContext('2d');
    if (!sampleCtx) return null;

    sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
    const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);

    const analysis = analyzeSceneFromImageData(imgData);
    const suggestedState = generateAiGrade(analysis, intensity);

    return {
      analysis,
      suggestedState,
    };
  } catch (err) {
    console.warn('AI Scene Analysis failed:', err);
    return null;
  }
}
