import type { GeoGridDefinition } from '../../types/gridGeometry';
import { cropGuide } from '../../utils/gridGeometry/kit';
import type { GridAlias } from '../../types/gridGeometry';
import { alias, def } from './define';

/** Aspect-ratio crop guides requested beyond the original 230-name list (exact pixel ratios). */
export const ASPECT_GUIDES: GeoGridDefinition[] = [
  def('Aspect 2.35:1 Guide', 13, 'cinematic', 'Crop guide for 2.35:1 anamorphic widescreen (the earlier scope standard).', (A) => cropGuide(2.35, A), { previewAspect: 1.2, scene: 'street' }),
  def('Aspect 21:9 Guide', 13, 'cinematic', 'Crop guide for 21:9 ultrawide (2.33:1).', (A) => cropGuide(21 / 9, A), { previewAspect: 1.2, scene: 'street' }),
];

/** Same geometry as an existing guide (3:2 = 4×6 print, 5:4 = 8×10 print), so not duplicated. */
export const ASPECT_ALIASES: GridAlias[] = [
  alias('Aspect 3:2 Guide', 13, 'geo_4x6_print_guide'),
  alias('Aspect 5:4 Guide', 13, 'geo_8x10_print_guide'),
];
