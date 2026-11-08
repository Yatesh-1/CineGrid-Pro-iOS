# Project Completion Status

Last verified state: lint 0 errors, 415 automated tests passing, production build succeeds. **No feature has been verified on a real device or in a real browser camera session** (no browser/device access in the development environment); "Implemented + tested" below means unit/component tests with fake camera tracks.

## Photography composition prompt (Parts 1–15)

| Part | Status | Notes |
|---|---|---|
| 1 Inspect | Done | Findings below. |
| 2 Viewfinder | Partial | Preview already real (`getUserMedia`, front/rear, lens list, pinch, tap-to-focus). Fixed: zoom origin no longer follows tap-to-focus; tap-to-focus no longer forces manual focus. Overlay is measured from the real frame (geo grids). Not verified on device: orientation changes, camera interruption. |
| 3 Before/After | Implemented + tested | Live-preview split (RAW/LOOK divider, shader compare) removed. Captured photo keeps 3 images: `dataUrl` untouched original, `lookDataUrl` what the viewfinder showed, `editedDataUrl` saved edit. Editor BEFORE = original, AFTER = look + edits; vertical/horizontal draggable split, side-by-side, reset, save/export already existed in `StudioWorkspace`. "Compare" in HUD and Look Studio opens the last photo in the editor and is disabled until a photo exists. |
| 4 Zoom | Implemented + tested (logic) | `zoomPlan`: hardware zoom + digital remainder, never both for the same part (previously doubled). Steps limited to what the device can reach; digital crop is labelled DIGITAL; captured photo is cropped to match the preview. Lens buttons set the lens's native factor. Not verified on a multi-lens phone. |
| 5 Pro controls | Implemented + tested (logic) | `cameraControlService` applies EV, ISO, shutter (incl. angle ÷ (360×fps)), white balance (Kelvin), focus distance only if the track advertises them and the browser accepts; otherwise controls are disabled/"N/A" and EV/WB are tagged SW (software). ISO/shutter presets now switch off auto (they did not before), AUTO chips added. Exposure-time unit is 100 µs (per W3C issue discussion; **not confirmed on hardware**). Aperture: no web API, not offered. Not done: Daylight/Cloudy/Tungsten/Fluorescent buttons mapped to Kelvin (presets exist in settings type, not verified wired), exposure lock uses `exposureMode: manual`. |
| 6 Grid engine | Done (see GRID_GEOMETRY_ENGINE.md) | Golden spiral all 4 corners × cw/ccw, Fibonacci tilings, golden triangle, root-√ armatures, dynamic symmetry, aspect guides (2.35:1, 21:9 added; 3:2 = 4×6 and 5:4 = 8×10 reuse existing geometry). 4×4…10×10, level, safe area, vanishing point already existed. |
| 7 Smart subject framing | **Not done** | The original app has manual silhouette/circle/rectangle guides (`SmartFramingOverlay`). No face/object/animal/mountain detection exists; none was added, and none is claimed. |
| 8 Grid customisation | Existing | Color palette, opacity (quick slider added to Grid sheet), thickness, solid/dashed/dotted, rotation, offsets, scale, nodes, visibility, saved presets, persisted. "Grid spacing" is not a separate control. |
| 9 Categories/presets | Partial | 16 categories incl. cinematic, macro, creative, social, custom; SVG thumbnails drawn from the same geometry as the overlay. Master presets existed; no new presets added. |
| 10 Filters/LUT | Existing | Filters, LUT import/preview/intensity existed. No new filter categories added. |
| 11 UI | Partial | Camera screen reworked earlier (clean viewfinder, Tools toggle, tray). Not matched pixel-for-pixel to a reference image. |
| 12 New features | Partial | Done: favorites, recents, grid opacity quick control, reference-image overlay (existed), custom grid builder (parametric). Not done: horizon auto-level improvements (device-orientation level existed), subject alignment assistance, composition assistant, grid metadata on captures (grid name stored as `gridUsed`; applied-controls flags not yet stored), burn-in export for the new grids (only rule of thirds / golden / centre burn-in exists). |
| 13 Architecture | Partial | New modules: `zoomPlan`, `cameraControlService`, `photoVersions`, `geoGrids/*`, `defaultSettings`. `App.tsx` is still very large. |
| 14 Testing | Partial | Automated only (see above). Camera, recording, orientation, responsive layouts not tested on devices. |

## Defects found and fixed this session
1. Live preview showed a fake BEFORE/AFTER divider (Look Studio toggle).
2. Saved "original" photo contained the applied look, filter and optionally burned-in grid.
3. Hardware zoom and CSS zoom were both applied (zoom compounded).
4. Zoom origin followed the last tap-to-focus point.
5. Photo ignored digital zoom (wider than the preview).
6. Pro controls (ISO, shutter, WB, focus, EV) never reached the camera; they only changed a CSS filter.
7. ISO/shutter presets did not switch off auto.
8. Tap-to-focus set focus mode to manual.
9. Exposure-time range was reported 100× too large (unit).
10. Licensing: committed signing secret, default admin password, wildcard CORS, always-on admin UI (see docs/AUDIT_STAGE1 notes in the session).

## Next actions
- Test the camera on a real phone (Chrome Android and Safari iOS) and record which controls report support.
- Subject detection (Part 7) needs a model decision (MediaPipe / platform Vision); not started.
- Store applied-controls flags and grid metadata on capture; generic burn-in export through the geometry engine.

## Photo Editing Studio (see docs/PHOTO_STUDIO.md)

Implemented + tested (automated): real pipeline for every listed adjustment, tone-curve identity fix, working masks (linear, radial, brush, luminance, colour, sky estimate), exact ratio and touch crop, preset intensity/reset, import, honest export formats. **Not done / not claimed:** subject, face and background selection (needs an AI model), lens-profile correction, RAW, GPU acceleration, rotate-by-touch, on-photo perspective handles. **Not verified visually or on devices.**
