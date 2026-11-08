# CineGrid Pro — Master AI Handover & Architectural Roadmap

> **Target Audience:** Future AI coding agents (Google Antigravity, Claude, Cursor, GitHub Copilot) and human senior software engineers.
> **Date:** October 30, 2026
> **Version:** 1.3.0 (Production-Ready)
> **License:** Commercial Proprietary / CineGrid Pro Enterprise

---

## 1. Project Overview & Architecture

CineGrid Pro is a professional-grade mobile photography and cinematography application built with **React 19, TypeScript 5.8, Tailwind CSS, and Vite**. It operates as a high-performance Progressive Web Application (PWA) with native Capacitor integration for iOS (AVFoundation) and Android (Camera2).

```
CineGrid Pro /
├── src/
│   ├── components/            # UI Components & Bottom Sheets
│   │   ├── ios/               # iOS Native Camera Interface (Camera, Grid, Pro sheets)
│   │   ├── cinema/            # Ultimate Cinematography Video Engine (ARRI/RED/Blackmagic)
│   │   ├── grid-engine/       # 50+ Composition Grid SVG Renderers
│   │   ├── look/              # 3D LUT & Creative Look Studio
│   │   ├── studio/            # Post-Capture Photo Editor & HSL Color Wheel
│   │   ├── hardware/          # Hardware Intelligence & Multi-Camera Inspector
│   │   ├── audio/             # Web Audio DSP Studio & Noise Reduction
│   │   ├── licensing/         # Admin Licensing & HMAC Token System
│   │   └── export/            # Multi-Format Binary Export Studio
│   ├── services/              # Singleton Core Service Layer
│   │   ├── cameraService.ts   # Hardware track constraints, MediaRecorder & concurrency
│   │   ├── cinemaVideoService.ts # Shutter angle math, rolling pre-record buffer & slate
│   │   ├── hardwareIntelligenceService.ts # Physical lens detection (0.5x, 1x, 3x) & ISP
│   │   ├── audioIntelligenceService.ts    # Web Audio DSP pipeline & VU meter
│   │   ├── lutStorageService.ts           # IndexedDB 3D LUT management
│   │   ├── mediaStorageService.ts         # IndexedDB binary photo/video storage
│   │   ├── sessionService.ts              # Photography session tracking
│   │   └── licenseService.ts              # HMAC SHA-256 license verification
│   ├── utils/                 # Algorithms, Parsers & WebGL Pipelines
│   │   ├── cinemaScopes.ts    # Real-time GPU canvas scopes (Waveform, False Color, etc.)
│   │   ├── webglLutPipeline.ts# Hardware-accelerated 3D LUT shader pipeline
│   │   ├── cubeParserAsync.ts # Non-blocking chunked .cube parser with LRU cache
│   │   └── shaders.ts         # Live CSS filters, histogram & capture rendering
│   ├── data/                  # Preset Libraries & Constants
│   └── types/                 # Domain Type Definitions (verbatimModuleSyntax compliant)
├── docs/                      # 30+ Architecture Guides, ADRs, & Audits
└── scripts/backup.mjs         # Automated snapshot compression tooling
```

---

## 2. What Has Been Implemented (Completed Milestones)

| Milestone | Subsystem | Key Capabilities Delivered |
|---|---|---|
| **1. UI/UX Stabilization** | Camera Viewport | Corrected aspect-ratio container, safe-area insets, eliminated clipping and gaps. |
| **2. Cross-Platform** | Mobile & Desktop | Touch gesture handling, dynamic viewport units, Capacitor plugins setup. |
| **3. Ghost Overlay & Sessions**| Studio Modes | Interactive reference photo alignment with opacity, pan/zoom, session shoot tracking. |
| **4. Architecture Hardening** | Concurrency Mutex | Strict state machine (`idle` → `ready` → `capturing` / `recording` → `stopping`). |
| **5. 3D LUT Studio** | Color Science | Async `.cube` parser (17x17x17, 33x33x33, 65x65x65), WebGL 3D LUT shader pipeline. |
| **6. Performance & Memory** | Zero-Leak Engine | Canvas recycling, WebGL context disposal, LRU texture caching, requestVideoFrameCallback. |
| **7. Documentation & ADRs** | Engineering Docs | 30+ technical guides, ADR-001 through ADR-007, automated backup script. |
| **8. Advanced Capture Studio**| Capture Modes | Web Audio DSP noise reduction (6 modes), dual camera compositing, night mode, slow-mo, time-lapse. |
| **9. Hardware Intelligence** | Sensor Detection | Automatic camera selection, optical step zoom (`[0.5x]`, `[1x]`, `[3x]`), hardware inspector. |
| **10. Cinematography Engine** | Cinema Video Mode | ARRI/RED inspired: 180° rotary shutter math, 8 GPU scopes (False Color, Waveform, RGB Parade, Vectorscope, Zebra, Peaking, Histogram, LUT), rack focus automation, digital clapperboard slate, rolling pre-record buffer, Director clean feed. |

---

## 3. What is Remaining / Future AI Roadmap

The following tasks are slated for the next engineering iterations:

1. **Native Platform Shell Generation:**
   - Execute `npx cap add ios` on a macOS host to generate the Xcode workspace (`ios/App/App.xcworkspace`).
   - Execute `npx cap add android` to generate the Gradle project (`android/`).
   - Configure camera, microphone, and storage permissions in `Info.plist` and `AndroidManifest.xml`.
2. **Web Worker Offloading for LUT Parsing:**
   - The async chunked parser in `src/utils/cubeParserAsync.ts` currently uses time-sliced microtasks. Moving file parsing into a dedicated Web Worker will completely isolate the main UI thread during 65-point LUT uploads.
3. **CoreML / MediaPipe Depth Segmentation:**
   - Currently, Portrait Mode uses hardware depth data where exposed, falling back to radial depth simulation. Integrating `@mediapipe/selfie_segmentation` or CoreML on iOS will provide real-time human matting for portrait depth of field.
4. **ProRes Direct Hardware Encoding:**
   - On Apple Silicon / iPhone 15 Pro+, AVFoundation exposes native Apple ProRes 422 HQ via Capacitor native bridge.

---

## 4. Development & Testing Commands

```bash
# Start local development server
npm run dev

# Run oxlint (strict static analysis)
npm run lint

# Run all 169 unit, integration, and component tests
npm test

# Production build check
npm run build

# Create timestamped project backup
npm run backup
```

> [!IMPORTANT]
> Always maintain documentation integrity and ensure `npm run lint` and `npm test` pass before committing any changes.
