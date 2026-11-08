# Technical Component Inventory

**Project:** CineGrid Pro Camera Studio  
**Audit Date:** October 30, 2026  
**Focus:** Backend services, singleton modules, data pipelines, external libraries, and build dependencies.

---

## 1. Core Services Layer (`src/services/`)

| Service Name | File Location | Pattern | Core Responsibilities |
|---|---|---|---|
| `CameraService` | `src/services/cameraService.ts` | Singleton | Hardware camera initialization, MediaStream lifecycle, MediaRecorder streaming, state machine mutex (`idle`, `ready`, `capturing`, `recording`, `stopping`), audio meter analysis, capability detection. |
| `CinemaVideoService` | `src/services/cinemaVideoService.ts` | Singleton | Shutter angle math ($T = \theta / (360 \times \text{FPS})$), rolling pre-record buffer (3s/5s), rack focus animation easing, digital slate metadata, take incrementing, clip naming. |
| `HardwareIntelligenceService` | `src/services/hardwareIntelligenceService.ts` | Singleton | Platform device detection, physical camera categorization (`ultrawide`, `wide`, `telephoto`, `periscope`), 35mm equivalent focal length computation, automatic lens selection. |
| `AudioIntelligenceService` | `src/services/audioIntelligenceService.ts` | Singleton | Modular Web Audio API DSP pipeline, 6 audio processing profiles (Wind Cut, Speech Formant, Strong Hum), stereo VU meter, microphone enumeration, MediaStream destination sync. |
| `LutStorageService` | `src/services/lutStorageService.ts` | Singleton | IndexedDB database for user-imported 3D LUT `.cube` files, metadata validation, sample generation. |
| `MediaStorageService` | `src/services/mediaStorageService.ts` | Singleton | Dual-store IndexedDB binary storage (`photos` and `blobs`), keeping metadata queryable while offloading heavy binary buffers. |
| `ResourceManager` | `src/services/resourceManager.ts` | Singleton | Memory leak guard: manages explicit disposal of ObjectURLs, HTMLCanvasElements, WebGL contexts, and MediaStreams. |
| `SessionService` | `src/services/sessionService.ts` | Singleton | Photography session project management, client metadata, shot count, session export. |
| `LicenseService` | `src/services/licenseService.ts` | Singleton | Client-side HMAC SHA-256 license key generation, session validation, offline grace period tracking. |
| `NightCaptureService` | `src/services/nightCaptureService.ts` | Singleton | Hardware long exposure inspection with 32-bit Float computational multi-frame stacking fallback. |
| `DualCameraService` | `src/services/dualCameraService.ts` | Singleton | Hardware concurrent stream probing, dual-stream canvas compositor (PiP, Split-V, Split-H). |
| `SlowMotionService` | `src/services/slowMotionService.ts` | Singleton | Sensor frame rate querying (60, 120, 240 FPS), high-speed recording constraint application. |
| `TimelapseService` | `src/services/timelapseService.ts` | Singleton | Interval frame capture (0.5s to 30s), memory-bounded canvas-to-MediaRecorder streaming. |
| `WideSelfieService` | `src/services/wideSelfieService.ts` | Singleton | Front-camera focal length detection, 12% edge-distortion safe boundary management. |
| `DeviceService` | `src/services/deviceService.ts` | Singleton | Viewport dimensions, device orientation, safe area inset measurement. |

---

## 2. Utility & Algorithm Modules (`src/utils/`)

| Utility Module | File Location | Key Functions & Algorithms |
|---|---|---|
| `cinemaScopes.ts` | `src/utils/cinemaScopes.ts` | Real-time pixel analysis: `drawFalseColor` (ARRI IRE zones), `drawWaveform` (phosphor trace), `drawRgbParade` (3-channel columns), `drawVectorscope` (polar chrominance & skin line), `drawZebraOverlay` (45° hash), `drawFocusPeaking` (Sobel gradient), `drawFocusMagnifier`. |
| `webglLutPipeline.ts` | `src/utils/webglLutPipeline.ts` | WebGL2 shader pipeline applying 3D tetrahedral / trilinear LUT textures at 60 FPS directly on video canvas. |
| `cubeParserAsync.ts` | `src/utils/cubeParserAsync.ts` | Non-blocking chunked parser for 17x, 33x, 65x `.cube` LUT files with microtask scheduling and size safeguards. |
| `cubeParser.ts` | `src/utils/cubeParser.ts` | Synchronous validation and header parsing for Adobe/DaVinci 3D LUT standards. |
| `lruCache.ts` | `src/utils/lruCache.ts` | Double-linked list LRU texture cache with memory budget bounding. |
| `shaders.ts` | `src/utils/shaders.ts` | `getEffectiveCssFilter`, `drawLiveHistogram`, `captureFrameToDataUrl` with aspect ratio crop and grid burning. |
| `exportEngine.ts` | `src/utils/exportEngine.ts` | Multi-format image conversion (JPEG, WebP, PNG) with EXIF retention and client-side ZIP packaging. |
| `studioEngine.ts` | `src/utils/studioEngine.ts` | Post-capture parametric image processing: exposure, contrast, highlights, shadows, HSL adjustments. |
| `audio.ts` | `src/utils/audio.ts` | Web Audio synthesizer producing mechanical camera shutter clicks, self-timer beeps, and focus lock chimes. |

---

## 3. Third-Party Dependencies (`package.json`)

### Production Dependencies
| Package | Version | Purpose |
|---|---|---|
| `react` | `^19.3.1` | Core UI component framework (React 19 with native compiler compatibility). |
| `react-dom` | `^19.3.1` | DOM renderer for React. |
| `lucide-react` | `^1.64.0` | Production icon library (modern, consistent, lightweight SVG icons). |
| `@capacitor/core` | `^8.6.0` | Native runtime bridge for mobile deployments. |
| `@capacitor/camera` | `^8.2.6` | Native mobile camera permissions and fallback access. |
| `@capacitor/device` | `^8.0.3` | Native device battery, platform, and hardware info. |
| `@capacitor/filesystem` | `^8.1.5` | Native mobile file storage access. |
| `@capacitor/status-bar` | `^8.0.4` | Native iOS/Android status bar styling (Dark OLED mode). |

### Development & Build Dependencies
| Package | Version | Purpose |
|---|---|---|
| `vite` | `^8.3.5` | Ultra-fast build tool and development server. |
| `typescript` | `~7.0.2` | Static type system with `verbatimModuleSyntax`. |
| `tailwindcss` | `^3.4.19` | Utility-first CSS styling engine. |
| `postcss` & `autoprefixer` | Latest | CSS parsing and vendor prefix automation. |
| `oxlint` | `^1.89.0` | High-performance Rust-based linter (0 errors enforced). |
| `vitest` | `^5.0.5` | Unit and integration test runner (169 tests, 100% passing). |
| `@testing-library/react` | `^16.3.3` | React component testing harness. |
| `jsdom` | `^30.1.3` | Headless DOM environment for automated testing. |
| `@capacitor/cli` | `^8.6.0` | Command line tool for native iOS and Android compilation. |
