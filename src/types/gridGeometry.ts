/**
 * Declarative overlay geometry. All coordinates are fractions of the preview frame
 * (0..1 on both axes), so an overlay stays aligned at any size. Builders receive the
 * frame aspect (width / height) so circles and squares are true shapes, not ellipses.
 */
export type StrokeKind = 'minor' | 'accent' | 'dash';

export type Pt = [number, number];

export type Prim =
  | { t: 'l'; x1: number; y1: number; x2: number; y2: number; k?: StrokeKind }
  | { t: 'p'; pts: Pt[]; closed?: boolean; k?: StrokeKind }
  | { t: 'r'; x: number; y: number; w: number; h: number; k?: StrokeKind }
  /** Shades everything outside the rectangle (crop / safe-area guides). */
  | { t: 'dim'; x: number; y: number; w: number; h: number }
  /** Handwritten-style caption. x,y = text centre (frame fractions); size = font height as a fraction of frame height. */
  | { t: 'txt'; x: number; y: number; text: string; size?: number; rot?: number }
  /** Node marker, drawn only when "intersection nodes" is on. */
  | { t: 'dot'; x: number; y: number };

export interface GeoParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export type GeoParams = Record<string, number>;

export type GeoBuilder = (aspect: number, params: GeoParams) => Prim[];

export type GeoCategoryId =
  | 'basic'
  | 'golden'
  | 'advanced'
  | 'portrait'
  | 'landscape'
  | 'architecture'
  | 'street'
  | 'cinematic'
  | 'product'
  | 'food'
  | 'macro'
  | 'creative'
  | 'social'
  | 'custom';

export interface GeoGridDefinition {
  /** Always `geo_*`. */
  id: string;
  name: string;
  /** User-facing section from the brief (1..12). */
  section: number;
  category: GeoCategoryId;
  description: string;
  build: GeoBuilder;
  /** Frame aspect used for the thumbnail; defaults by category. */
  previewAspect?: number;
  /** Editable parameters (custom grids). */
  params?: GeoParamSpec[];
  /** Which scene illustration to use for the three examples. */
  scene?: SceneKind;
}

export type SceneKind =
  | 'portrait'
  | 'landscape'
  | 'street'
  | 'architecture'
  | 'product'
  | 'food'
  | 'macro'
  | 'abstract';

/** Section → existing/alias entry: names from the brief that already exist as overlays. */
export interface GridAlias {
  name: string;
  section: number;
  existingId: string;
}
