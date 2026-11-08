# Automated Testing and Quality Assurance

CineGrid Pro enforces a comprehensive automated testing suite built on Vitest and React Testing Library. The suite audits core state machines, memory allocators, hardware simulation fallbacks, cryptographic key algorithms, and UI components.

---

## 1. Test Suite Verification Metrics

- **Test Runner:** `Vitest v5.0.5`
- **DOM Environment:** `jsdom v30.1.3`
- **Total Test Suites:** **17 files**
- **Total Tests:** **90 passed (100%)**
- **Execution Time:** $< 6\text{ seconds}$

---

## 2. Test Suite Breakdown

### A. Unit Tests (11 Suites / 65 Tests)

| Suite File | Tests | Coverage Scope |
| :--- | :--- | :--- |
| [`cameraService.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/cameraService.test.ts) | 12 | Stream initialization, torch, zoom, manual exposure, facing switches, hardware capability queries. |
| [`cameraStateMachine.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/cameraStateMachine.test.ts) | 5 | Deterministic 7-state transitions, re-entrant lock enforcement, illegal transition rejections. |
| [`sessionService.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/sessionService.test.ts) | 7 | Session creation, active switching, shot count increments, checklist completion toggling. |
| [`cubeParser.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/cubeParser.test.ts) | 7 | Header parsing (`LUT_3D_SIZE`), dimension boundaries (17x, 33x, 65x), NaN detection, corrupted syntax rejection. |
| [`cubeParserAsync.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/cubeParserAsync.test.ts) | 2 | Web Worker background parsing, non-blocking asynchronous promise resolution. |
| [`studioEngine.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/studioEngine.test.ts) | 6 | Light, Color, Tone Curve, HSL color transforms, and grain simulation algorithms. |
| [`exportEngine.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/exportEngine.test.ts) | 6 | Multi-format rendering (JPEG, PNG, WebP), dimension scaling, watermark rendering. |
| [`resourceManager.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/resourceManager.test.ts) | 6 | Resource registration, owner-scoped disposal, Object URL tracking, device profiling. |
| [`lutStorageService.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/lutStorageService.test.ts) | 5 | IndexedDB `.cube` caching, favorite LUT flags, user preset persistence. |
| [`lruCache.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/lruCache.test.ts) | 4 | Bounded capacity eviction, size calculation, LRU re-ordering, onEvict callbacks. |
| [`licenseService.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/unit/licenseService.test.ts) | 4 | Key format validation, activation handling, offline grace period evaluation, deactivation. |

### B. Integration Tests (2 Suites / 9 Tests)

| Suite File | Tests | Coverage Scope |
| :--- | :--- | :--- |
| [`workflows.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/integration/workflows.test.ts) | 7 | End-to-end shoot flow: camera startup $\rightarrow$ manual exposure adjustment $\rightarrow$ photo capture $\rightarrow$ binary storage $\rightarrow$ gallery retrieval. |
| [`lutWorkflow.test.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/integration/lutWorkflow.test.ts) | 2 | End-to-end LUT flow: custom `.cube` file import $\rightarrow$ parsing $\rightarrow$ WebGL upload $\rightarrow$ preset save $\rightarrow$ export. |

### C. UI Component Tests (4 Suites / 17 Tests)

| Suite File | Tests | Coverage Scope |
| :--- | :--- | :--- |
| [`LookStudioModal.test.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/components/LookStudioModal.test.tsx) | 6 | Tab switching (LUTs, Filters, Presets, Custom, Export), intensity slider updates, split-screen toggle, reset. |
| [`GridRenderer.test.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/components/GridRenderer.test.tsx) | 4 | SVG path rendering, Rule of Thirds, Golden Ratio, Golden Spiral, custom color styling. |
| [`ShutterDock.test.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/components/ShutterDock.test.tsx) | 4 | Shutter button trigger, photo/video mode toggle, gallery thumbnail render, ghost button. |
| [`MainNavigationBar.test.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/test/components/MainNavigationBar.test.tsx) | 3 | Battery status, session title badge, license pill, settings button click events. |

---

## 3. Running Test Suites

Execute test suites using npm:

```bash
# Run all 90 tests once
npm test

# Run tests in watch mode during development
npx vitest

# Run a specific test suite
npx vitest run src/test/unit/cameraService.test.ts

# Run tests with code coverage report
npx vitest run --coverage
```

---

## 4. Test Environment Mocks (`src/test/setup.ts`)

To allow headless testing of native browser media hardware without physical webcams:
- **`MediaStream` & `MediaStreamTrack`:** Mocked with track settings, constraints, and capability queries.
- **`AudioContext` & `AnalyserNode`:** Mocked for stereo VU meter frequency and decibel testing.
- **`HTMLCanvasElement.getContext`:** Mocked for 2D canvas and WebGL context operations.
- **`URL.createObjectURL` & `revokeObjectURL`:** Mocked with internal tracking to audit for memory leaks.
