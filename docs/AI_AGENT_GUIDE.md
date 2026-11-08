# AI Coding Agent Onboarding Guide

Welcome to **CineGrid Pro**. This document is an onboarding manual written specifically for AI coding agents and human engineers joining this project. Follow these conventions and architectural principles to maintain code quality, avoid regressions, and keep the application zero-crash.

---

## 1. Quick Project Summary

- **Product:** CineGrid Pro — Professional Camera Studio & Photography Engine.
- **Tech Stack:** React 19.3.1, TypeScript 7.0.2, Vite 8.3.5, Tailwind CSS 3.4.19, Capacitor 8.
- **Rendering Engines:** Real-time WebGL 3D LUT shader pipeline, SVG composition grid engine, Canvas 2D capture rasterizer.
- **Hardware Integrations:** WebRTC MediaStream, Web Audio API stereo VU meter, DeviceOrientation gyroscope sensor.
- **Testing & Quality:** Vitest 5.0.5 (90 tests across 17 test suites), Oxlint (~20ms linting).
- **Current Production Build:** 1.19s build time, entry bundle 403 kB (108 kB gzip).

---

## 2. Five Golden Architectural Rules

When modifying CineGrid Pro, you must uphold these five rules at all times:

### Rule 1: Never Touch Hardware MediaStreams Directly
Always interact through [`CameraService`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts). Direct invocations of `navigator.mediaDevices.getUserMedia` or manual track stopping will bypass the 7-state camera engine, causing race conditions and black screens.

### Rule 2: Never Retain Unmanaged Allocations
Never allocate `URL.createObjectURL()`, WebGL textures, Web Audio nodes, window listeners, or intervals without registering them with [`ResourceManager`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/resourceManager.ts) and assigning an `ownerId`.

### Rule 3: Zero Base64 in React State or LocalStorage
High-resolution images must never be kept in memory as multi-megabyte Base64 strings. Always route image saving through [`MediaStorageService.savePhoto()`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/mediaStorageService.ts), which separates metadata from raw binary Blobs in IndexedDB and dispenses temporary Object URLs via a 25-entry LRU cache.

### Rule 4: Wrap Subsystems with Error Boundaries
Whenever you add or modify a modal dialog, drawer, or heavy post-processing workspace, ensure it is wrapped with [`ErrorBoundary`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/common/ErrorBoundary.tsx) and code-split via `lazy()` to isolate failures from the live camera viewport.

### Rule 5: Run the Triple Validation Gate
Before completing any turn or commit, execute and verify:
1. `npm run lint` — Must report 0 errors (`oxlint`).
2. `npm test` — All 90 tests across 17 test suites must pass (`vitest run`).
3. `npm run build` — TypeScript check and Vite production bundle must compile cleanly (`tsc -b && vite build`).

---

## 3. Directory Map & Key Files

```
cinegrid-cam/
├── src/
│   ├── App.tsx                    # Root UI component, active modals, and proSettings state
│   ├── index.css                  # Safe areas (.safe-top, .safe-bottom) and tick-dial styles
│   ├── components/                # Modular UI components
│   │   ├── Viewfinder.tsx         # Camera viewport & touch focus
│   │   ├── ProHUD.tsx             # Blackmagic telemetry pills & popovers
│   │   ├── ShutterDock.tsx        # Capture button & mode switcher
│   │   ├── common/ErrorBoundary.tsx
│   │   ├── look/LookStudioModal.tsx
│   │   ├── studio/StudioWorkspace.tsx
│   │   └── export/ExportStudioModal.tsx
│   ├── services/                  # Singleton domain engines
│   │   ├── cameraService.ts       # 7-state camera engine & hardware tracks
│   │   ├── resourceManager.ts     # Allocation tracker & memory profiles
│   │   ├── mediaStorageService.ts # Binary IndexedDB & LRU Object URLs
│   │   ├── lutStorageService.ts   # .cube storage & user presets
│   │   ├── sessionService.ts      # Photography session tracking
│   │   └── licenseService.ts      # Cryptographic HMAC licensing
│   ├── utils/
│   │   ├── webglLutPipeline.ts    # Zero-allocation 2D atlas shader
│   │   ├── cubeParserAsync.ts     # Non-blocking Web Worker parser
│   │   └── lruCache.ts            # Memory-budgeted LRU cache
│   └── test/                      # 17 test suites (90 tests)
├── server/                        # Standalone HMAC licensing REST server
├── docs/                          # Comprehensive technical documentation
└── capacitor.config.ts            # Android & iOS native configuration
```

---

## 4. Common Recipes for AI Agents

### Recipe A: Adding a New Composition Grid
1. Define the grid identifier in [`src/types/camera.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/types/camera.ts) under the `GridType` union.
2. Add the title, category, and metadata to [`src/data/gridLibrary.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/data/gridLibrary.ts).
3. Add the SVG rendering path in [`src/components/grid-engine/GridRenderer.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/grid-engine/GridRenderer.tsx).
4. Run `npm test` to verify `GridRenderer.test.tsx` passes.

### Recipe B: Adding a New Camera Control Pill to ProHUD
1. Add the property to `ProSettings` in [`src/types/camera.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/types/camera.ts).
2. Set its initial value in `DEFAULT_PRO_SETTINGS` in [`src/App.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/App.tsx).
3. Add the telemetry pill to [`src/components/ProHUD.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/ProHUD.tsx).
4. Add the adjustment options to [`src/components/hud/BlackmagicPillPopover.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/hud/BlackmagicPillPopover.tsx).
5. Run `npm test` and `npm run build`.

### Recipe C: Modifying Post-Processing Image Filters
1. Locate the adjustment panel in [`src/components/studio/panels/`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/studio/panels/).
2. Adjust the processing logic in [`src/utils/studioEngine.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/studioEngine.ts).
3. Run `npm test` to verify `studioEngine.test.ts` passes.
