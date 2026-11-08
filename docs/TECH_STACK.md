# Technology Stack — CineGrid Pro

This document specifies the technologies, runtimes, frameworks, APIs, and dependencies **actually used** in the CineGrid Pro repository, verified against [`package.json`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/package.json), source code, and build configurations.

---

## 1. Core Architecture & Runtime Matrix

| Category | Technology | Version | Purpose | Usage Location | Essential / Optional |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **Frontend Framework** | **React** | `^19.3.1` | Component lifecycle, virtual DOM, code-splitting (`Suspense`, `lazy`) | Entire application UI ([`src/App.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/App.tsx), [`src/components/`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/)) | **Essential** |
| **DOM Renderer** | **ReactDOM** | `^19.3.1` | Mounting React component tree to DOM root | [`src/main.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/main.tsx) | **Essential** |
| **Programming Language** | **TypeScript** | `~7.0.2` | Strict static typing, interfaces, and compile-time correctness | All files in `src/` and `server/` | **Essential** |
| **Build Bundler** | **Vite** | `^8.3.5` | High-speed ESM dev server, HMR, production Rollup bundling | [`vite.config.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/vite.config.ts) | **Essential** |
| **Native Mobile Bridge** | **Capacitor Core** | `^8.6.0` | Cross-platform native runtime bridge for iOS and Android | [`capacitor.config.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/capacitor.config.ts) | **Essential for Mobile** |
| **Styling Framework** | **Tailwind CSS** | `^3.4.19` | Utility-first responsive CSS styling with dark studio aesthetic | [`tailwind.config.js`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/tailwind.config.js), [`src/index.css`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/index.css) | **Essential** |
| **Iconography** | **Lucide React** | `^1.64.0` | Studio camera, HUD, navigation, and modal iconography | Throughout UI components | **Essential** |
| **Testing Framework** | **Vitest** | `^5.0.5` | Fast unit, component, and integration test runner | [`src/test/`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/) (17 suites, 90 tests) | **Essential for QA** |
| **DOM Testing** | **@testing-library/react** | `^16.3.3` | React component rendering and interaction simulation in tests | [`src/test/components/`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/components/) | **Essential for QA** |
| **DOM Environment** | **JSDOM** | `^30.1.3` | Headless browser DOM simulation for Vitest in Node.js | Vitest test runner | **Essential for QA** |
| **Linter** | **Oxlint** | `^1.89.0` | High-performance Rust-based static code analyzer | [`.oxlintrc.json`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/.oxlintrc.json) | **Essential for QA** |

---

## 2. Browser & Hardware Native APIs

| Native API | Specification | Primary Usage Location | Purpose | Fallback Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Media Capture & Streams** | W3C `getUserMedia` | [`src/services/cameraService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts) | Captures camera sensor video feed | Pre-seeded fallback photographic scenes (`FALLBACK_SCENES`) |
| **WebGL 1.0 / 2.0** | Khronos WebGL | [`src/utils/webglLutPipeline.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/webglLutPipeline.ts) | Real-time 60 FPS 3D LUT shader grading & Before/After split wipe | 2D Canvas context with CSS tone approximation |
| **Web Audio API** | W3C AudioContext & AnalyserNode | [`src/services/cameraService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts) | Real-time audio VU meter analysis, RMS level, peak clipping in dB | Default nominal audio levels |
| **MediaStream Recording** | W3C `MediaRecorder` | [`src/services/cameraService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts) | Encodes video capture stream with negotiated codecs | Multi-codec negotiation: `H.265 ➔ H.264 ➔ VP9 ➔ WebM` |
| **Device Orientation** | W3C `DeviceOrientationEvent` | [`src/components/Viewfinder.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/Viewfinder.tsx) | Artificial horizon, dual-axis roll and pitch indicators | Centered zero orientation |
| **IndexedDB API** | W3C Indexed Database | [`src/services/mediaStorageService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/mediaStorageService.ts), [`src/services/lutStorageService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/lutStorageService.ts) | Binary persistent storage for captured photos, LUT files, user presets | In-memory cache + `localStorage` fallback |
| **Web Workers API** | W3C Dedicated Web Workers | [`src/utils/cubeParserAsync.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/cubeParserAsync.ts) | Non-blocking background thread for parsing large 33x/65x .cube files | Microtask-based non-blocking chunking |
| **Video Frame Callback** | W3C `requestVideoFrameCallback` | [`src/components/Viewfinder.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/Viewfinder.tsx) | Hardware-synchronized video frame updates to prevent frame drops | `window.requestAnimationFrame` |

---

## 3. Capacitor Native Plugins

| Plugin | Version | Platform | Purpose |
| :--- | :---: | :--- | :--- |
| **`@capacitor/camera`** | `^8.2.6` | Android, iOS | Hardware camera interface for native mobile shells |
| **`@capacitor/device`** | `^8.0.3` | Android, iOS | Battery level, memory metrics, device platform identification |
| **`@capacitor/filesystem`** | `^8.1.5` | Android, iOS | High-resolution image/video saving to native device photo library |
| **`@capacitor/status-bar`** | `^8.0.4` | Android, iOS | Sets dark immersive status bar overlay styling (`#050608`) |

---

## 4. State Management, Memory & Caching Architecture

| Subsystem | Underlying Technology | Capacity / Limits | Persistence | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Central Resource Manager** | Singleton Class ([`resourceManager.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/resourceManager.ts)) | Unbounded registry | Memory | Tracks all streams, tracks, contexts, textures, timers, and listeners with explicit `ownerId` teardown. |
| **Object URL Cache** | Generic `LRUCache<string, string>` ([`lruCache.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/lruCache.ts)) | 25 entries | Memory | Auto-invokes `URL.revokeObjectURL` on eviction to prevent GC memory leaks. |
| **3D LUT Texture Cache** | `Map<string, { texture, size }>` | 6 textures | GPU VRAM | LRU eviction calls `gl.deleteTexture` to maintain strict GPU memory limits. |
| **Binary Photo Storage** | IndexedDB (`CineGridMediaStore`) | Quota-based | Persistent | Stores binary `Blob`s in `photo_blobs` store, eliminating Base64 strings. |
| **User Preferences** | `localStorage` | < 50 KB | Persistent | Restricted strictly to lightweight primitives (grid style, favorite IDs, license session). |

---

## 5. Development & Tooling Commands

| Command | Script / Binary | Purpose | Output |
| :--- | :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts local dev server with HMR | `http://localhost:5174/` |
| `npm test` | `vitest run` | Executes all 90 automated tests | Terminal test report (17/17 passed) |
| `npm run lint` | `oxlint` | High-speed Rust linting (116 rules) | 0 errors |
| `npm run build` | `tsc -b && vite build` | Type check + production Rollup build | `dist/` bundle (403 kB entry) |
| `npm run preview` | `vite preview` | Previews production build locally | `http://localhost:4173/` |
