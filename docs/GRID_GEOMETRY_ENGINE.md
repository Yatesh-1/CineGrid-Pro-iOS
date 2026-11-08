# Grid Geometry Engine

Extends the original composition grids (61 hand-coded SVG overlays in `GridRenderer.tsx`) with a data-driven engine. The original overlays are untouched.

## How it works
- A grid is a function `(frameAspect, params) => Prim[]` in `src/data/geoGrids/sections*.ts`. Primitives (line, rect, polyline/polygon, dim-outside, node dot) use **fractions of the frame (0..1)**, defined in `src/types/gridGeometry.ts`.
- `src/utils/gridGeometry/kit.ts` holds the maths: true circles/ellipses for any aspect, crop rectangles of an exact pixel ratio, golden/Fibonacci spiral construction (8 orientations: 4 eye corners × clockwise/counter-clockwise), square tilings, perpendicular (reciprocal) armatures, figure outlines.
- `GeoGridOverlay` measures the preview frame (`ResizeObserver`) and draws primitives in a pixel-sized SVG, so shapes stay true when the aspect ratio, lens or orientation changes. The same geometry drives the live overlay, the library thumbnail and the info-screen examples.
- User style options (colour, opacity, thickness, solid/dashed/dotted, scale, rotation, offset, node visibility, visibility toggle) are applied from the existing `GridStyleOptions`.
- Ids are `geo_<slug of name>`. Adding a grid = one `def(...)` call; it appears in the library, search and thumbnails automatically.

## The 230 names
`GEO_GRIDS` (193 new overlays) + `GRID_ALIASES` (37 names that already existed as overlays, mapped to their existing id and findable by search) = 230. `geoGrids.test.ts` asserts this and that every alias target exists.

Aliases that are the *same geometry* as another listed name: "Nine Section Grid" = "Rule of Thirds" (both map to `rule_of_thirds`).

## Library UI
`CompositionPicker`: search (names, descriptions, aliases), category chips (5 new categories), Favorites, Recent (last 12, stored locally), Suggested (per capture mode, `recommendedGridIds`). Info button opens `GeoGridInfoModal`: purpose, recommended subjects, how-to steps, tip, three examples, Favorite, Activate, and sliders for the Custom grids (values saved per grid in `localStorage`, Reset restores defaults).

## Known limits (be aware before shipping)
- **Examples are illustrations, not photographs.** No licensed or original photo assets exist in the project. The three examples per grid are vector scenes drawn in the app (`GeoGridScenes.tsx`), with different compositions per kind, with the real grid drawn over them. The original 61 grids keep their existing photo references.
- Recommended subjects, steps and tips are written per category; each grid has its own description. They are not individually authored per grid.
- A3 vs A4 and 16×20 vs 8×10 share proportions by definition; they differ only in the margin shown (stated in their descriptions). Custom grid defaults are chosen so they do not duplicate a preset, but they start close to related presets.
- Figure/scene silhouettes (portrait guides) are simplified outlines, not measured human proportions for every body type.
- "Multiple compatible overlays": only one grid at a time plus the existing secondary guides (horizon level, safe area). Not implemented.
- "Save custom grid presets": each Custom grid saves one parameter set; named multi-preset saving is not implemented.
- The library is a horizontal list of ~254 cards (not virtualised).
- Overlays are tied to the preview frame. They do not move with digital zoom (composition guides describe the frame you are shooting).
- Verified by automated tests (geometry validity at six aspect ratios, uniqueness, spiral/crop/circle maths, search, parameters) and a production build. **Not yet verified visually in a browser or on a device.**
