/**
 * Virtual camera profile model.
 *
 * A profile is a complete, independent rendering description for one simulated camera. The same
 * object drives the live GPU preview (webglLutPipeline film stage) and the saved photo, so what
 * the user frames is what is stored. The functions below are the CPU reference implementation of
 * the maths the shader uses; tests pin them so the shader can be checked against them.
 *
 * Colour operations work on display-referred (gamma-encoded) RGB in 0..1, like the existing grade
 * stage. This is a stylised look model, not a scene-referred film emulation.
 */

export type CameraKind =
  | 'film'
  | 'ccd'
  | 'disposable'
  | 'instant'
  | 'retroDigital'
  | 'camcorder'
  | 'compact'
  | 'custom';

export type BorderStyle = 'none' | 'film' | 'instant';
export type DateFormat = 'yy mm dd' | 'dd mm yy' | 'mm/dd/yy' | 'time';
export type DatePosition = 'bottomRight' | 'bottomLeft';
export type Rgb = [number, number, number];

export interface CameraProfile {
  id: string;
  name: string;
  kind: CameraKind;
  description: string;
  builtIn: boolean;

  color: {
    /** Row-major 3x3 applied to RGB. Identity = no channel mixing. */
    matrix: [number, number, number, number, number, number, number, number, number];
    saturation: number; // -1..1
    contrast: number; // -1..1 (pivot 0.5)
    temperature: number; // -1 (cool) .. 1 (warm)
    tint: number; // -1 (green) .. 1 (magenta)
  };
  tone: {
    blackPoint: number; // 0..0.2  crushed blacks
    shadowLift: number; // 0..0.25 faded blacks
    midGamma: number; // 0.6..1.6 (<1 brightens mids)
    highlightRolloff: number; // 0..1  soft shoulder amount
  };
  grain: {
    amount: number; // 0..1
    size: number; // 0.5..4 (grain cell size in px at 1080p-equivalent)
    roughness: number; // 0..1 (0 = smooth gaussian-like, 1 = hard uniform)
    chroma: number; // 0..1 colour noise share (sensor noise ~ high, film ~ low)
    shadowBias: number; // 0..1 how much stronger the noise is in shadows
  };
  halation: { amount: number; radius: number; threshold: number; color: Rgb };
  bloom: { amount: number; radius: number; threshold: number };
  vignette: { amount: number; roundness: number; softness: number }; // all 0..1
  softness: number; // 0..1 lens softness (blur mix)
  chromaticAberration: number; // 0..1 radial R/B channel shift
  lightLeak: { amount: number; hue: number; position: number }; // hue 0..360, position 0..1
  flash: { amount: number; falloff: number }; // retro on-camera flash look
  dust: number; // 0..1 dust & scratches
  border: { style: BorderStyle; width: number }; // width 0..0.2 fraction of short side
  dateImprint: {
    enabled: boolean;
    format: DateFormat;
    position: DatePosition;
    color: Rgb; // 0..1
  };
}

// Declared before BUILTIN_PROFILES: mergeProfile runs at module load to build them.
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const IDENTITY_MATRIX: CameraProfile['color']['matrix'] = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** A profile that changes nothing. Every other profile is expressed as a delta from this. */
export const NEUTRAL_PROFILE: CameraProfile = {
  id: 'neutral',
  name: 'Neutral',
  kind: 'custom',
  description: 'No rendering changes.',
  builtIn: true,
  color: { matrix: IDENTITY_MATRIX, saturation: 0, contrast: 0, temperature: 0, tint: 0 },
  tone: { blackPoint: 0, shadowLift: 0, midGamma: 1, highlightRolloff: 0 },
  grain: { amount: 0, size: 1, roughness: 0.5, chroma: 0, shadowBias: 0.5 },
  halation: { amount: 0, radius: 0.5, threshold: 0.8, color: [1, 0.35, 0.15] },
  bloom: { amount: 0, radius: 0.5, threshold: 0.75 },
  vignette: { amount: 0, roundness: 0.5, softness: 0.5 },
  softness: 0,
  chromaticAberration: 0,
  lightLeak: { amount: 0, hue: 25, position: 0.85 },
  flash: { amount: 0, falloff: 0.5 },
  dust: 0,
  border: { style: 'none', width: 0 },
  dateImprint: { enabled: false, format: 'yy mm dd', position: 'bottomRight', color: [1, 0.55, 0.1] },
};

const make = (
  id: string,
  name: string,
  kind: CameraKind,
  description: string,
  delta: DeepPartial<CameraProfile>
): CameraProfile => mergeProfile(NEUTRAL_PROFILE, { ...delta, id, name, kind, description, builtIn: true });

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };

/** Eight cameras with deliberately different colour, tone, noise and optics, not renamed filters. */
export const BUILTIN_PROFILES: CameraProfile[] = [
  make('cam_gold400', 'Gold 400 Film', 'film', 'Warm consumer colour negative: lifted blacks, creamy highlights, visible grain.', {
    color: { matrix: [1.08, -0.04, -0.04, -0.02, 1.02, 0, -0.06, -0.02, 0.96], saturation: 0.12, contrast: 0.08, temperature: 0.22, tint: 0.04 },
    tone: { blackPoint: 0.01, shadowLift: 0.06, midGamma: 0.95, highlightRolloff: 0.75 },
    grain: { amount: 0.42, size: 1.6, roughness: 0.35, chroma: 0.08, shadowBias: 0.6 },
    halation: { amount: 0.25, radius: 0.45, threshold: 0.82, color: [1, 0.3, 0.1] },
    vignette: { amount: 0.25, roundness: 0.6, softness: 0.7 },
    softness: 0.12,
  }),
  make('cam_slide100', 'Slide 100 Chrome', 'film', 'Saturated reversal film: punchy contrast, crushed shadows, cool-green cast, fine grain.', {
    color: { matrix: [0.98, 0.04, -0.02, -0.04, 1.06, 0.02, -0.02, 0.03, 1.04], saturation: 0.32, contrast: 0.28, temperature: -0.1, tint: -0.06 },
    tone: { blackPoint: 0.03, shadowLift: 0, midGamma: 1.06, highlightRolloff: 0.35 },
    grain: { amount: 0.14, size: 1.0, roughness: 0.3, chroma: 0.04, shadowBias: 0.4 },
    vignette: { amount: 0.18, roundness: 0.5, softness: 0.6 },
  }),
  make('cam_ccd2004', 'CCD Compact 2004', 'ccd', '5-megapixel CCD point-and-shoot: clipped highlights, cool blue shadows, chroma noise.', {
    color: { matrix: [1.04, 0, -0.04, -0.03, 1.02, 0.01, 0.02, 0.06, 1.1], saturation: 0.2, contrast: 0.18, temperature: -0.12, tint: 0.02 },
    tone: { blackPoint: 0.015, shadowLift: 0.02, midGamma: 0.92, highlightRolloff: 0.05 },
    grain: { amount: 0.3, size: 1.2, roughness: 0.8, chroma: 0.75, shadowBias: 0.85 },
    bloom: { amount: 0.18, radius: 0.35, threshold: 0.85 },
    chromaticAberration: 0.28,
    softness: 0.2,
    flash: { amount: 0.3, falloff: 0.6 },
    dateImprint: { enabled: true, format: 'yy mm dd', position: 'bottomRight', color: [1, 0.55, 0.1] },
  }),
  make('cam_dispo', 'Disposable Flash 27', 'disposable', 'Plastic-lens flash camera: hot centre, dark corners, green-yellow cast, heavy grain.', {
    color: { matrix: [1.02, 0.06, -0.06, 0, 1.08, -0.04, -0.08, 0.04, 0.9], saturation: 0.18, contrast: 0.2, temperature: 0.1, tint: -0.12 },
    tone: { blackPoint: 0.02, shadowLift: 0.03, midGamma: 1.02, highlightRolloff: 0.2 },
    grain: { amount: 0.55, size: 1.8, roughness: 0.55, chroma: 0.1, shadowBias: 0.55 },
    vignette: { amount: 0.55, roundness: 0.8, softness: 0.55 },
    flash: { amount: 0.75, falloff: 0.7 },
    softness: 0.28,
    chromaticAberration: 0.18,
    lightLeak: { amount: 0.18, hue: 20, position: 0.9 },
    dust: 0.25,
    border: { style: 'film', width: 0.045 },
  }),
  make('cam_instant', 'Instant Square', 'instant', 'Instant-film look: soft, faded, magenta-leaning blacks, white frame.', {
    color: { matrix: [1.02, 0.02, -0.04, 0.02, 0.98, 0, 0.04, 0.02, 0.98], saturation: -0.08, contrast: -0.12, temperature: 0.06, tint: 0.1 },
    tone: { blackPoint: 0, shadowLift: 0.12, midGamma: 0.9, highlightRolloff: 0.6 },
    grain: { amount: 0.18, size: 2.2, roughness: 0.3, chroma: 0.2, shadowBias: 0.3 },
    vignette: { amount: 0.3, roundness: 0.9, softness: 0.8 },
    softness: 0.35,
    lightLeak: { amount: 0.08, hue: 330, position: 0.1 },
    border: { style: 'instant', width: 0.08 },
  }),
  make('cam_retrodigi', 'Early Digital 0.3MP', 'retroDigital', 'VGA-era digital camera: crushed dynamic range, strong sharpening halo look, heavy colour noise.', {
    color: { matrix: [1.1, -0.06, -0.04, -0.08, 1.14, -0.06, -0.04, -0.1, 1.14], saturation: 0.25, contrast: 0.35, temperature: -0.04, tint: 0 },
    tone: { blackPoint: 0.04, shadowLift: 0, midGamma: 0.88, highlightRolloff: 0 },
    grain: { amount: 0.45, size: 2.4, roughness: 1, chroma: 0.9, shadowBias: 0.9 },
    bloom: { amount: 0.3, radius: 0.5, threshold: 0.8 },
    softness: 0.4,
    chromaticAberration: 0.4,
    dateImprint: { enabled: true, format: 'dd mm yy', position: 'bottomRight', color: [1, 0.6, 0.15] },
  }),
  make('cam_camcorder', 'Camcorder Hi8', 'camcorder', 'Tape camcorder: desaturated, soft, strong luma noise, warm highlights, timestamp.', {
    color: { matrix: [1.04, 0.02, -0.06, 0, 1, 0, -0.02, 0.02, 0.96], saturation: -0.15, contrast: 0.05, temperature: 0.12, tint: 0.02 },
    tone: { blackPoint: 0.025, shadowLift: 0.04, midGamma: 0.96, highlightRolloff: 0.3 },
    grain: { amount: 0.38, size: 2.0, roughness: 0.7, chroma: 0.3, shadowBias: 0.7 },
    bloom: { amount: 0.22, radius: 0.6, threshold: 0.78 },
    softness: 0.55,
    chromaticAberration: 0.2,
    vignette: { amount: 0.22, roundness: 0.7, softness: 0.6 },
    dateImprint: { enabled: true, format: 'time', position: 'bottomLeft', color: [1, 1, 1] },
  }),
  make('cam_compact35', 'Compact 35mm Point&Shoot', 'compact', 'Premium 35mm compact: fine grain, neutral-warm colour, gentle vignette and flash falloff.', {
    color: { matrix: [1.04, -0.02, -0.02, -0.01, 1.02, -0.01, -0.03, -0.01, 1.04], saturation: 0.1, contrast: 0.12, temperature: 0.08, tint: 0 },
    tone: { blackPoint: 0.008, shadowLift: 0.03, midGamma: 0.97, highlightRolloff: 0.55 },
    grain: { amount: 0.22, size: 1.2, roughness: 0.3, chroma: 0.05, shadowBias: 0.55 },
    halation: { amount: 0.15, radius: 0.35, threshold: 0.85, color: [1, 0.35, 0.15] },
    vignette: { amount: 0.3, roundness: 0.65, softness: 0.7 },
    flash: { amount: 0.25, falloff: 0.5 },
    softness: 0.06,
    dateImprint: { enabled: false, format: 'yy mm dd', position: 'bottomRight', color: [1, 0.55, 0.1] },
  }),
];

// ---------------------------------------------------------------------------------------------
// Merge / validation / import-export
// ---------------------------------------------------------------------------------------------

/** Recursively overlays `over` on `base`; arrays are replaced, never merged. */
export function mergeProfile(base: CameraProfile, over: unknown): CameraProfile {
  const walk = (b: unknown, o: unknown): unknown => {
    if (!isObj(b) || !isObj(o)) return o === undefined ? b : o;
    const out: Record<string, unknown> = { ...b };
    for (const k of Object.keys(o)) out[k] = walk(b[k], o[k]);
    return out;
  };
  return walk(base, over) as CameraProfile;
}

const clamp = (v: number, lo: number, hi: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const KINDS: CameraKind[] = ['film', 'ccd', 'disposable', 'instant', 'retroDigital', 'camcorder', 'compact', 'custom'];

/** Forces every numeric parameter into its legal range. Never throws. */
export function clampProfile(p: CameraProfile): CameraProfile {
  const n = NEUTRAL_PROFILE;
  const rgb = (c: unknown, d: Rgb): Rgb =>
    Array.isArray(c) && c.length === 3 ? [clamp(num(c[0], d[0]), 0, 1), clamp(num(c[1], d[1]), 0, 1), clamp(num(c[2], d[2]), 0, 1)] : d;
  const m = Array.isArray(p.color?.matrix) && p.color.matrix.length === 9 ? p.color.matrix : n.color.matrix;
  return {
    id: String(p.id || 'custom'),
    name: String(p.name || 'Untitled').slice(0, 60),
    kind: KINDS.includes(p.kind) ? p.kind : 'custom',
    description: String(p.description ?? '').slice(0, 240),
    builtIn: Boolean(p.builtIn),
    color: {
      matrix: m.map((v, i) => clamp(num(v, n.color.matrix[i]), -2, 2)) as CameraProfile['color']['matrix'],
      saturation: clamp(num(p.color?.saturation, 0), -1, 1),
      contrast: clamp(num(p.color?.contrast, 0), -1, 1),
      temperature: clamp(num(p.color?.temperature, 0), -1, 1),
      tint: clamp(num(p.color?.tint, 0), -1, 1),
    },
    tone: {
      blackPoint: clamp(num(p.tone?.blackPoint, 0), 0, 0.2),
      shadowLift: clamp(num(p.tone?.shadowLift, 0), 0, 0.25),
      midGamma: clamp(num(p.tone?.midGamma, 1), 0.6, 1.6),
      highlightRolloff: clamp(num(p.tone?.highlightRolloff, 0), 0, 1),
    },
    grain: {
      amount: clamp(num(p.grain?.amount, 0), 0, 1),
      size: clamp(num(p.grain?.size, 1), 0.5, 4),
      roughness: clamp(num(p.grain?.roughness, 0.5), 0, 1),
      chroma: clamp(num(p.grain?.chroma, 0), 0, 1),
      shadowBias: clamp(num(p.grain?.shadowBias, 0.5), 0, 1),
    },
    halation: {
      amount: clamp(num(p.halation?.amount, 0), 0, 1),
      radius: clamp(num(p.halation?.radius, 0.5), 0, 1),
      threshold: clamp(num(p.halation?.threshold, 0.8), 0.4, 1),
      color: rgb(p.halation?.color, n.halation.color),
    },
    bloom: {
      amount: clamp(num(p.bloom?.amount, 0), 0, 1),
      radius: clamp(num(p.bloom?.radius, 0.5), 0, 1),
      threshold: clamp(num(p.bloom?.threshold, 0.75), 0.4, 1),
    },
    vignette: {
      amount: clamp(num(p.vignette?.amount, 0), 0, 1),
      roundness: clamp(num(p.vignette?.roundness, 0.5), 0, 1),
      softness: clamp(num(p.vignette?.softness, 0.5), 0, 1),
    },
    softness: clamp(num(p.softness, 0), 0, 1),
    chromaticAberration: clamp(num(p.chromaticAberration, 0), 0, 1),
    lightLeak: {
      amount: clamp(num(p.lightLeak?.amount, 0), 0, 1),
      hue: clamp(num(p.lightLeak?.hue, 25), 0, 360),
      position: clamp(num(p.lightLeak?.position, 0.85), 0, 1),
    },
    flash: { amount: clamp(num(p.flash?.amount, 0), 0, 1), falloff: clamp(num(p.flash?.falloff, 0.5), 0, 1) },
    dust: clamp(num(p.dust, 0), 0, 1),
    border: {
      style: (['none', 'film', 'instant'] as BorderStyle[]).includes(p.border?.style) ? p.border.style : 'none',
      width: clamp(num(p.border?.width, 0), 0, 0.2),
    },
    dateImprint: {
      enabled: Boolean(p.dateImprint?.enabled),
      format: (['yy mm dd', 'dd mm yy', 'mm/dd/yy', 'time'] as DateFormat[]).includes(p.dateImprint?.format)
        ? p.dateImprint.format
        : 'yy mm dd',
      position: p.dateImprint?.position === 'bottomLeft' ? 'bottomLeft' : 'bottomRight',
      color: rgb(p.dateImprint?.color, n.dateImprint.color),
    },
  };
}

export const PROFILE_SCHEMA_VERSION = 1;

export function exportProfile(p: CameraProfile): string {
  return JSON.stringify({ schema: 'cinegrid.cameraProfile', version: PROFILE_SCHEMA_VERSION, profile: p }, null, 2);
}

export type ImportResult = { ok: true; profile: CameraProfile } | { ok: false; error: string };

/** Parses untrusted JSON into a safe, clamped, user-owned (never builtIn) profile. */
export function importProfile(json: string, newId: string): ImportResult {
  if (json.length > 64 * 1024) return { ok: false, error: 'File is too large to be a camera profile.' };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }
  if (!isObj(raw) || raw.schema !== 'cinegrid.cameraProfile' || !isObj(raw.profile)) {
    return { ok: false, error: 'Not a CineGrid camera profile.' };
  }
  if (typeof raw.version === 'number' && raw.version > PROFILE_SCHEMA_VERSION) {
    return { ok: false, error: 'Profile was made by a newer app version.' };
  }
  const merged = mergeProfile(NEUTRAL_PROFILE, raw.profile);
  return { ok: true, profile: { ...clampProfile(merged), id: newId, builtIn: false } };
}

export function duplicateProfile(p: CameraProfile, newId: string): CameraProfile {
  return { ...clampProfile(mergeProfile(NEUTRAL_PROFILE, p)), id: newId, name: `${p.name} copy`.slice(0, 60), builtIn: false };
}

/** Restores a built-in profile to factory values; user profiles are returned unchanged. */
export function resetProfile(p: CameraProfile): CameraProfile {
  return BUILTIN_PROFILES.find((b) => b.id === p.id) ?? p;
}

// ---------------------------------------------------------------------------------------------
// CPU reference maths (mirrors the fragment shader)
// ---------------------------------------------------------------------------------------------

export function applyMatrix(rgb: Rgb, m: CameraProfile['color']['matrix']): Rgb {
  return [
    m[0] * rgb[0] + m[1] * rgb[1] + m[2] * rgb[2],
    m[3] * rgb[0] + m[4] * rgb[1] + m[5] * rgb[2],
    m[6] * rgb[0] + m[7] * rgb[1] + m[8] * rgb[2],
  ];
}

/** Per-channel tone curve: black point, gamma, shadow lift, then a C1 soft shoulder. */
export function applyToneCurve(x: number, t: CameraProfile['tone']): number {
  let y = Math.max(0, (x - t.blackPoint) / (1 - t.blackPoint));
  y = Math.pow(y, t.midGamma);
  if (t.highlightRolloff > 0) {
    const knee = 1 - 0.6 * t.highlightRolloff;
    if (y > knee) {
      const k = (y - knee) / (1 - knee);
      y = knee + (1 - knee) * (k / (1 + k));
    }
  }
  return t.shadowLift + y * (1 - t.shadowLift);
}

/** Multiplier (1 = untouched, <1 = darkened) at normalised position (u,v) in 0..1, aspect = w/h. */
export function vignetteFactor(u: number, v: number, aspect: number, vg: CameraProfile['vignette']): number {
  const dx = (u - 0.5) * 2 * (1 + (aspect - 1) * vg.roundness);
  const dy = (v - 0.5) * 2;
  const d = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
  const inner = 0.3 * (1 - vg.softness * 0.5);
  const t = Math.min(1, Math.max(0, (d - inner) / (1.05 - inner)));
  const s = t * t * (3 - 2 * t);
  return 1 - vg.amount * s;
}

/** Deterministic 0..1 hash for grain. Same constants as the shader. */
export function grainHash(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

export function isNeutralProfile(p: CameraProfile): boolean {
  const { id, name, kind, description, builtIn, ...rest } = p;
  const { id: _i, name: _n, kind: _k, description: _d, builtIn: _b, ...nrest } = NEUTRAL_PROFILE;
  void id; void name; void kind; void description; void builtIn; void _i; void _n; void _k; void _d; void _b;
  return JSON.stringify(rest) === JSON.stringify(nrest);
}
