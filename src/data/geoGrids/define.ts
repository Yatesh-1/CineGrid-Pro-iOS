import type {
  GeoBuilder,
  GeoCategoryId,
  GeoGridDefinition,
  GeoParamSpec,
  GridAlias,
  SceneKind,
} from '../../types/gridGeometry';

export const slug = (name: string): string =>
  'geo_' +
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

interface Extra {
  previewAspect?: number;
  params?: GeoParamSpec[];
  scene?: SceneKind;
}

/** Define a new overlay; its id is derived from the name. */
export const def = (
  name: string,
  section: number,
  category: GeoCategoryId,
  description: string,
  build: GeoBuilder,
  extra: Extra = {}
): GeoGridDefinition => ({ id: slug(name), name, section, category, description, build, ...extra });

/** A name from the brief that is already provided by an existing overlay. */
export const alias = (name: string, section: number, existingId: string): GridAlias => ({
  name,
  section,
  existingId,
});
