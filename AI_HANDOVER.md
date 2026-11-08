# CINEGRID PRO — MASTER AI & DEVELOPER ONBOARDING HANDOVER

> **Project:** CineGrid Pro (Zero-Crash, Low-Memory, High-Performance Camera & Cinema Engine)  
> **Status:** Production-Ready (Build Passing, Lint Passing, 633 / 633 Tests Green)  
> **Target Audience:** Next AI Coding Agent (Antigravity, Claude, Cursor, Copilot) & Human Engineers  
> **Date:** October 30, 2026  
> **Codebase Root:** `CineGrid-Pro/`  

---

## 1. Executive Summary

CineGrid Pro is a cinema-grade mobile photography and cinematography application built with **React 19, TypeScript 5.8, Tailwind CSS, and Vite**, integrated with **Capacitor** for native iOS (AVFoundation) and Android (Camera2) deployment.

The application features:
1. **Ultimate Cinematography Video Engine:** Inspired by ARRI ALEXA 35, RED V-RAPTOR, Sony VENICE 2, and Blackmagic URSA Cine. Features 180° rotary shutter angle synchronization ($t = \frac{\theta}{360 \times \text{FPS}}$), 8 real-time GPU/Canvas monitoring scopes (Waveform, False Color, RGB Parade, Vectorscope, Zebra, Peaking, Histogram, 3D LUT), automated Rack Focus transitions, digital production clapperboard slate, and 5-second circular pre-record buffer.
2. **Device Hardware Intelligence:** Discovers real camera sensors (Ultra-Wide, Wide, Telephoto, Periscope, Macro) via `navigator.mediaDevices.enumerateDevices()`, automatically switches physical lenses for requested focal lengths, and inspects ISP sensor hardware.
3. **Advanced Audio Intelligence Studio:** Web Audio DSP pipeline with 6 noise suppression modes (Off, Standard, Strong, Wind, Voice Focus, Auto) and real-time peak audio VU meter.
4. **Computational Capture Studio:**
   - **Dual Camera Mode:** Simultaneous front and rear capture with PiP and Split-Screen.
   - **Night Photography Mode:** Multi-frame long exposure with gyro stability scoring.
   - **Slow Motion Mode:** High-frame-rate capture (120fps / 240fps) with fractional playback speed.
   - **Time-Lapse Mode:** Configurable interval timer (0.5s to 60s) with automated MP4 assembly.
   - **Wide Selfie Mode:** Ultra-wide FOV optical zoom selection with interactive group framing guidelines.
5. **Blackmagic Pro Camera Controls & HUD:** Comprehensive manual ISO, Shutter, EV, Focus, White Balance Kelvin, 50+ Composition Grids carousel, Filter strip, TickDial intensity ruler, and Blackmagic Preset loader.

---

## 2. Architecture & File Structure

```
CineGrid Pro /
├── src/
│   ├── components/            # UI Components & Feature Studios
│   │   ├── cinema/            # Ultimate Cinematography Video Engine (ARRI/RED/Blackmagic)
│   │   ├── hardware/          # Hardware Intelligence & Multi-Camera Inspector
│   │   ├── audio/             # Web Audio DSP Studio & Noise Reduction
│   │   ├── dual/              # Dual Camera Split-Screen & PiP
│   │   ├── night/             # Night Photography & Multi-Frame Fusion
│   │   ├── slowmo/            # Slow Motion & High-Speed Video
│   │   ├── timelapse/         # Time-Lapse Intervalometer
│   │   ├── wideselfie/        # Wide Selfie & Group Framing Guide
│   │   ├── look/              # 3D LUT & Creative Look Studio
│   │   ├── studio/            # Post-Capture Photo Editor & HSL Color Wheel
│   │   ├── grid-engine/       # 50+ Composition Grid SVG Renderers
│   │   ├── licensing/         # Admin Licensing & HMAC Token System
│   │   └── export/            # Multi-Format Binary Export Studio
│   ├── services/              # Singleton Core Service Layer
│   │   ├── cameraService.ts   # Hardware track constraints, MediaRecorder & concurrency state machine
│   │   ├── cinemaVideoService.ts # Shutter angle math, rolling pre-record buffer & slate
│   │   ├── hardwareIntelligenceService.ts # Physical lens detection (0.5x, 1x, 3x) & ISP
│   │   ├── audioIntelligenceService.ts    # Web Audio DSP pipeline & VU meter
│   │   ├── dualCameraService.ts           # Dual sensor simultaneous capture
│   │   ├── nightCaptureService.ts         # Multi-frame long exposure
│   │   ├── slowMotionService.ts           # High-speed recording
│   │   ├── timelapseService.ts            # Time-lapse assembly
│   │   ├── wideSelfieService.ts           # Wide-angle sensor management
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
├── docs/                      # 38 Architecture Guides, ADRs, & Audits
└── scripts/backup.mjs         # Automated snapshot compression tooling
```

---

## 3. Verification & Quality Metrics

- **Unit & Component Tests:** **633 passed / 633 total across 54 test files (100% green)**
- **Static Linter (`oxlint`):** **0 errors**
- **TypeScript Compilation (`tsc -b`):** **0 errors**
- **Production Build (`vite build`):** **1.73s clean build**
- **Local Dev Server:** `http://localhost:5174/` (HTTP 200 OK)

---

## 4. Development Command Cheatsheet

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Run static analysis linter (oxlint)
npm run lint

# Run entire test suite (633 tests across 54 files)
npm test

# Verify production bundle compilation
npm run build

# Generate timestamped backup snapshot in backups/
npm run backup
```

---

## 5. Camera UI Overhaul (2026-10-30)

- **Zoom:** photo reaches 24x, video 8x (`utils/zoomSlider.ts`, `maxZoomFor`). `ZoomSlider` is a log-scale slider; `ZoomControl` (photo) and `CinemaVideoHUD` (video) both use it. Beyond the hardware range the preview crops digitally (`zoomPlan`). Switching photo to video pulls an over-limit zoom back to 8x.
- **Feature rail:** `components/camera/FeatureRail.tsx` replaced `ToolTray`. One scrolling row (Pro, Grid, Look, Guide, Ghost, Favorite). Grid, Look and Ghost chips have an inline x to clear them instantly (`utils/lookActions.ts` `clearLook`). Nothing but the zoom control sits on the viewfinder; hardware inspector is reachable from the Pro drawer only.
- **Mode panels:** `ModePanel` wraps Night, Dual, Slow-mo, Time-lapse and Portrait with a close button that returns to photo. `DualCameraControls` is one scrollable row.
- **Video HUD:** battery percentage removed, PRO button added, two compact top rows that scroll instead of clipping, zoom slider moved to the bottom stack, smaller record/gallery buttons.
- **LUT:** fragment shader now uses `highp` where available (mediump mis-addressed the 1089-texel atlas on phone GPUs). `.cube` DOMAIN_MIN/MAX is still not applied as an input range (parser normalises outputs by it); creative LUTs use 0-1 so this rarely matters.
- **Type scale:** nothing below 10px; nav tab no longer scales up.
- **Not visually verified on a device:** layout was checked by tests and build only (the app sits behind a license screen).
## 6. Layout rule: nothing on the camera frame (2026-10-30, later)

- The viewfinder carries only the picture (plus user-enabled guides/grids/scopes). Every control lives in sliding rows below it: `FeatureRail` (names, no boxes), `MonitoringRail` (false colour, zebra, ...), `ZoomStrip` (0.5x to 24x photo / 8x video, no slider), then the iPhone-style `CaptureModeSelector` and the shutter.
- Video uses the same layout: `CinemaVideoHUD` is now a bottom panel (tools row, zoom strip, exposure/colour/focus/audio row, mode carousel, record). Shutter, ISO and WB readouts are buttons that open their panels.
- Zoom fix: `lensAbsorbedZoom` in `zoomPlan.ts`. Front/single-lens cameras reported an "exact match" for every zoom, which cancelled the digital crop.
- Recording bakes the look in: `gradedRecordingStream` records the LUT canvas when a look is on (photo-mode video and cinema video).
- LUT import: `.cube` and `.3dl` (`utils/lut3dlConverter.ts`). Adobe `.look` is not supported.
- Reference photos: 194 geometry grids use `data/geoGridPhotos.json` (Wikimedia Commons, credited), loaded lazily by `GeoGridInfoModal`.
## 7. Pro section owns scopes and manual exposure (2026-10-30, latest)

- Histogram/waveform/false colour/zebra/peaking switches live only in Pro > Monitoring. The live histogram and waveform are drawn inside that tab (`ProSettingsDrawer` `onScopesHost` -> `ProHUD` `toolsHost` + `scopesInHostOnly`); the main camera screen has no Scopes chip, readout bar or scope boxes. Each scope has its own x.
- Manual ISO and shutter work on every camera. Where the hardware cannot set them, `utils/softwareExposure.ts` turns them into stops added to the software EV (ISO 100 at 1/60 s is neutral, limit +/-4 stops). The UI tags them "software". It changes brightness of preview and saved photo only, not noise or motion blur.
- Viewfinder frame: `utils/frameFit.ts` measures the stage and fits the capture ratio like a phone camera.
## 8. Focus, AE/AF lock and Pro-only exposure (2026-10-30, final)

- Tap = focus square + vertical brightness slider (sun thumb, `ExposureBiasSlider`, edits `proSettings.ev`). Press and hold 550 ms = "AE/AF LOCK" pill, which stays until the next tap and sets `exposureLocked`/`focusLocked`. Maths in `utils/exposureBias.ts`.
- Video readouts (shutter, ISO, WB, AF/MF, mic) open the Pro drawer on the matching tab (`initialTab`); the old exposure/colour/focus/audio row is gone and Pro values are mirrored into the cinema config. Rack focus has no button now.
- Scrolling rows (zoom, feature rail, video tools) spread across the width and slide only when crowded.
## 9. Native projects (2026-10-30)

- `android/` and `ios/` were generated with `npx cap add`. Android manifest has camera, microphone and media permissions (camera hardware not required); iOS Info.plist has camera, microphone and photo-library usage text. Package/bundle id `com.cinegrid.procamera`. Release signing reads `android/keystore.properties` (git-ignored; not created). `cleartext` is off.
- NOT built or installed: this PC has JDK 21 but no Android SDK, adb, emulator or Gradle, and iOS needs a Mac with Xcode. No APK, AAB or iOS archive exists yet.
- Known gap: the app uses web camera APIs (getUserMedia, MediaRecorder). Saving photos and videos is a browser download link; on a phone it does not reach the gallery. Native save (Filesystem plugin or a MediaStore/Photos plugin) is not implemented.
