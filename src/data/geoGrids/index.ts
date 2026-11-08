import type { CompositionGridDefinition, GridCategory } from '../../types/camera';
import type { GeoCategoryId, GeoGridDefinition, GeoParams, GridAlias } from '../../types/gridGeometry';
import { SECTION1, SECTION1_ALIASES, SECTION2, SECTION2_ALIASES, SECTION3, SECTION3_ALIASES } from './sections1to3';
import { ASPECT_ALIASES, ASPECT_GUIDES } from './aspectGuides';
import { SECTION14, SECTION14_ALIASES } from './section14';
import { SECTION4, SECTION4_ALIASES, SECTION5, SECTION5_ALIASES, SECTION6, SECTION6_ALIASES } from './sections4to6';
import {
  SECTION7,
  SECTION7_ALIASES,
  SECTION8,
  SECTION8_ALIASES,
  SECTION9,
  SECTION10,
  SECTION10_ALIASES,
  SECTION11,
  SECTION12,
} from './sections7to12';

export const GEO_GRIDS: GeoGridDefinition[] = [
  ...SECTION1,
  ...SECTION2,
  ...SECTION3,
  ...SECTION4,
  ...SECTION5,
  ...SECTION6,
  ...SECTION7,
  ...SECTION8,
  ...SECTION9,
  ...SECTION10,
  ...SECTION11,
  ...SECTION12,
  ...ASPECT_GUIDES,
  ...SECTION14,
];

/** Names in the brief that map to overlays which already existed before the geometry engine. */
export const GRID_ALIASES: GridAlias[] = [
  ...SECTION1_ALIASES,
  ...SECTION2_ALIASES,
  ...SECTION3_ALIASES,
  ...SECTION4_ALIASES,
  ...SECTION5_ALIASES,
  ...SECTION6_ALIASES,
  ...SECTION7_ALIASES,
  ...SECTION8_ALIASES,
  ...SECTION10_ALIASES,
  ...ASPECT_ALIASES,
  ...SECTION14_ALIASES,
];

const byId = new Map(GEO_GRIDS.map((g) => [g.id, g]));

export const isGeoGridId = (id: string): boolean => id.startsWith('geo_') && byId.has(id);
export const getGeoGrid = (id: string): GeoGridDefinition | undefined => byId.get(id);

/** Default params merged with any stored values. */
export const withDefaults = (def: GeoGridDefinition, stored: GeoParams = {}): GeoParams => {
  const out: GeoParams = {};
  for (const p of def.params ?? []) out[p.key] = stored[p.key] ?? p.value;
  return out;
};

export const CATEGORY_LABELS: Record<GeoCategoryId, string> = {
  basic: 'Basic Composition',
  golden: 'Golden Ratio & Fibonacci',
  advanced: 'Advanced Geometry',
  portrait: 'Portrait',
  landscape: 'Landscape & Nature',
  architecture: 'Architecture',
  street: 'Street',
  cinematic: 'Cinematic',
  product: 'Product & Commercial',
  food: 'Food',
  macro: 'Macro & Close-Up',
  creative: 'Creative & Artistic',
  social: 'Social & Print',
  custom: 'Custom',
};

interface CategoryGuide {
  subjects: string[];
  steps: string[];
  tip: string;
}

/** Guidance shared by every grid in a category; each grid adds its own description. */
export const CATEGORY_GUIDE: Record<GeoCategoryId, CategoryGuide> = {
  basic: {
    subjects: ['General photography', 'Landscapes', 'Everyday scenes', 'Layout checks'],
    steps: ['Pick the line or cell that should hold your main subject.', 'Place the subject on or beside the guide, not in the middle by default.', 'Use the empty cells for context or breathing room.'],
    tip: 'Turn on intersection nodes to see the strongest placement points.',
  },
  golden: {
    subjects: ['Fine art', 'Portraits', 'Spiral shapes and curves', 'Classical landscapes'],
    steps: ['Find the strongest line or curve in the scene.', 'Align it with the guide, letting the eye of the spiral land on the focal point.', 'Flip or choose another corner variant if the scene flows the other way.'],
    tip: 'Golden proportions sit closer to centre than thirds, giving a subtler balance.',
  },
  advanced: {
    subjects: ['Architecture', 'Fine art', 'Geometric scenes', 'Staged compositions'],
    steps: ['Find the dominant shape or diagonal in the scene.', 'Match it to the overlay geometry and shift or scale the grid to fit.', 'Place secondary elements where lines intersect.'],
    tip: 'Use grid rotation and scale to fit the geometry to the scene, not the other way round.',
  },
  portrait: {
    subjects: ['Headshots', 'People', 'Couples and groups', 'Fashion'],
    steps: ['Place the eyes on the guide line or marker.', 'Match the figure outline to the shot size you want.', 'Check headroom and the space in front of the face before shooting.'],
    tip: 'Eyes land best on the upper third line; leave more room in the direction they look.',
  },
  landscape: {
    subjects: ['Landscapes', 'Seascapes', 'Mountains', 'Nature'],
    steps: ['Place the horizon on the guide line that suits the sky or the ground.', 'Put the main feature on a power point or marked zone.', 'Use leading lines or depth bands to draw the eye in.'],
    tip: 'Give the more interesting half of the scene more of the frame.',
  },
  architecture: {
    subjects: ['Buildings', 'Interiors', 'Streets', 'Bridges and stairs'],
    steps: ['Level the camera so verticals match the guide.', 'Line up the vanishing point or axis with the overlay.', 'Check both edges for symmetry before shooting.'],
    tip: 'Shoot from a stable position; small tilts are obvious against straight guide lines.',
  },
  street: {
    subjects: ['Street scenes', 'Candid moments', 'Urban life', 'Movement'],
    steps: ['Decide where the subject should be and where they are heading.', 'Leave space in the direction of travel.', 'Use foreground or layers to add depth.'],
    tip: 'Pre-set the grid so you can shoot quickly when the moment arrives.',
  },
  cinematic: {
    subjects: ['Video', 'Film-style stills', 'Interviews', 'Dialogue scenes'],
    steps: ['Choose the crop or composition guide for your delivery format.', 'Keep key action inside the safe area.', 'Frame eyelines consistently across shots.'],
    tip: 'Crop guides are an on-screen aid only; they do not change the recorded sensor area.',
  },
  food: {
    subjects: ['Plated food', 'Overhead table shots', 'Drinks', 'Ingredients'],
    steps: ['Choose overhead or angled and match the guide.', 'Place the plate or hero item on the marked point or ring.', 'Leave room for garnish, props or text.'],
    tip: 'Natural window light from the side keeps food looking fresh; avoid mixed colour temperatures.',
  },
  product: {
    subjects: ['Products', 'Packaging', 'Jewelry', 'E-commerce'],
    steps: ['Centre or position the product on the guide.', 'Keep margins even so the crop works across platforms.', 'Leave a copy-space block if text will be added later.'],
    tip: 'Keep the camera parallel to the surface to avoid keystone distortion.',
  },
  macro: {
    subjects: ['Flowers', 'Insects', 'Textures', 'Eyes and small details'],
    steps: ['Set focus on the marked area first.', 'Move the subject onto the guide point or ring.', 'Check the empty space is intentional.'],
    tip: 'At macro distances, depth of field is tiny: focus on the guide point, then recompose carefully.',
  },
  creative: {
    subjects: ['Abstract scenes', 'Patterns', 'Shapes', 'Experimental work'],
    steps: ['Find the path or shape that matches the scene.', 'Let the main line carry the eye across the frame.', 'Break the pattern once for emphasis.'],
    tip: 'Rules are a starting point: break them deliberately once the shape reads clearly.',
  },
  social: {
    subjects: ['Social posts', 'Thumbnails', 'Prints', 'Albums'],
    steps: ['Select the target format.', 'Keep key content inside the lit area and clear of dashed UI zones.', 'Allow for the margin or bleed shown.'],
    tip: 'Platforms change their UI overlays; treat dashed zones as a guide and check the current spec.',
  },
  custom: {
    subjects: ['Any subject'],
    steps: ['Open the grid and adjust the sliders.', 'Check the overlay on the live preview.', 'Settings are saved on this device.'],
    tip: 'Use Reset to return to the default values.',
  },
};

const GRID_CATEGORY_MAP: Record<GeoCategoryId, GridCategory> = {
  basic: 'basic',
  golden: 'golden',
  advanced: 'advanced',
  portrait: 'portrait',
  landscape: 'landscape',
  architecture: 'architecture',
  street: 'street',
  cinematic: 'cinematic',
  product: 'product',
  food: 'food',
  macro: 'macro',
  creative: 'creative',
  social: 'social',
  custom: 'custom',
};

export const geoToLibraryEntry = (g: GeoGridDefinition): CompositionGridDefinition => {
  const guide = CATEGORY_GUIDE[g.category];
  return {
    id: g.id as CompositionGridDefinition['id'],
    name: g.name,
    category: GRID_CATEGORY_MAP[g.category],
    description: g.description,
    useCase: guide.subjects.join(', '),
    proTip: guide.tip,
    recommendedSubject: guide.subjects[0],
  };
};

export const GEO_LIBRARY_ENTRIES: CompositionGridDefinition[] = GEO_GRIDS.map(geoToLibraryEntry);

/** Alternative names per existing id, so search finds "Sixteen Section Grid" → 4×4. */
export const ALIAS_NAMES: Record<string, string[]> = GRID_ALIASES.reduce<Record<string, string[]>>((acc, a) => {
  (acc[a.existingId] ??= []).push(a.name);
  return acc;
}, {});
