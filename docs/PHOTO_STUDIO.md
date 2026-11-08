# Photo Editing Studio

The studio opens from the gallery (**Edit in Studio**), automatically after a capture, from Look Studio / HUD **Compare**, and after **Import photo** in the gallery. Code: `src/components/studio/*`, pipeline in `src/utils/studioEngine.ts`, pixel operations in `src/utils/imageOps.ts`.

## Non-destructive model
Each photo keeps up to three images (`src/utils/photoVersions.ts`): `dataUrl` (untouched original, never overwritten), `lookDataUrl` (capture-time look) and `editedDataUrl` (saved edit). All edits are a `StudioEditState` (plain numbers) applied to the source on every render; undo/redo is a history of those states (rapid same-section changes, e.g. dragging one slider, share one undo step; 50 steps). Imported files are stored byte-for-byte.

## Pipeline order
geometry (crop, 90° rotation, straighten with auto-zoom, flips) → lens warp (keystone, distortion, lateral chromatic aberration) + defringe → noise reduction → dehaze → tone & colour per pixel (exposure, brightness, whites, blacks, contrast, highlights, shadows, tone curves RGB/R/G/B, white balance, saturation, vibrance, 8-colour HSL, 3-way colour grading with global wheel, blending and balance, vignette, lens-vignette correction) → selective masks → texture & clarity → sharpening → grain.

Size-dependent values (blur radii, grain size) scale with the long edge, so the 1600 px on-screen preview and the full-resolution export look the same. Dragging uses the 1600 px preview; Save/Export render the full-resolution source.

## Every control changes the picture
`src/test/unit/studioPipeline.test.ts` renders the real pipeline on real pixels and fails if any slider (including dependent ones such as grain size, sharpen radius, grading balance) leaves the image unchanged, if a default state does not return the source, or if rendering modifies the source. Pure operations are tested in `imageOps.test.ts`.

## Defects found and fixed in the existing studio
- Tone curves: the default two-point curve was an S-curve (smoothstep), so every photo got extra contrast. Now monotone cubic; a default curve is an exact identity.
- Texture, clarity, sharpening (amount/radius/detail/masking), luminance and colour noise reduction, distortion, chromatic aberration, vignette correction, keystone, grain size/roughness, grading global/blending/balance had UI but no effect. Now implemented.
- Selective masks never applied their adjustments (the code set a canvas filter and drew nothing). Now real, including highlights, shadows and sharpness.
- "Smart Subject" / "Smart Sky" were a fixed blurred oval. Replaced with luminance range, colour range, brush and an honest sky *estimate*.
- Dehaze positive lifted shadows (adding haze). Now a dark-channel dehaze.
- Straighten left empty corners; keystone/straighten now zoom to fill.
- Ratio crops used fixed percentages (a "1:1" crop was not square). Now exact for the photo.
- Preset intensity only stored a number and Reset preset did not undo the preset. Now blends and restores.
- BEFORE canvas in split compare was squeezed rather than clipped, so halves did not line up.
- Export offered RAW DNG (PNG bytes in a .dng file) and HEIF (silently PNG). Only formats the browser can really encode are enabled.

## Known limits
- **No subject, face, background or person detection.** That needs an on-device AI model that is not in the project; the masking panel says so. Sky is estimated from colour and position.
- **No lens-profile correction** (no lens database). Distortion, chromatic aberration and vignetting are manual. Lateral CA correction is a symmetric red/blue realignment, not a measured profile.
- **No RAW processing or RAW export.** JPEG, PNG and (where the browser allows) WebP.
- **CPU processing** (canvas pixel loops). WebGL/WebGPU acceleration is not implemented; large noise-reduction/clarity edits on big photos can be slow.
- Crop is edited on the unrotated photo; rotation is by 90° buttons plus the straighten slider (no rotate-by-touch). Perspective uses sliders, not on-photo handles. Brush strokes are capped at 400 dabs.
- HEIC imports fail in browsers that cannot decode HEIC; the dialog says so.
- Preset intensity re-blends from the state before the preset was chosen, so tweaks made after choosing a preset are replaced when intensity is moved.
- **Not verified in a browser or on a device**: layouts on mobile/tablet/desktop, touch behaviour of the crop and mask tools, and processing speed on real photos. Automated tests only.
