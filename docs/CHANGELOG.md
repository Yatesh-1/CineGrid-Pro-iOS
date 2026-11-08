# Changelog and Version History

All notable technical changes, architectural upgrades, and bug fixes for CineGrid Pro are documented below in reverse chronological order.

---

## [v1.2.0] - 2026-10-30

### Milestone 12: Device Hardware Intelligence & Intelligent Camera Selection
- **Device Hardware Intelligence Engine:** Implemented [`HardwareIntelligenceService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/hardwareIntelligenceService.ts) for full physical camera hardware introspection across iOS AVFoundation, Android Camera2, and W3C MediaDevices.
- **Physical Lens Classification:** Classifies physical sensors into roles (`ultrawide`, `wide`, `telephoto`, `periscope`, `macro`, `front_wide`, `front_ultrawide`), computing optical zoom factors and 35mm equivalent focal lengths (13mm, 24mm, 77mm, 120mm).
- **Intelligent Automatic Camera Selection:** Evaluates capture mode, requested field of view, lighting conditions, and frame rates to automatically select the genuine physical camera best equipped for the task without falsifying hardware limits.
- **Hardware-Aware Zoom System:** Replaced static zoom buttons with hardware-derived optical lens steps (`[0.5x]`, `[1x]`, `[2x]`, `[3x]`), transparently distinguishing between `OPTICAL LENS` (physical switch), `OPTICAL ZOOM` (motorized), `SENSOR CROP` (high-res crop), and `DIGITAL ZOOM` (software interpolation).
- **Dynamic Device Changes:** Subscribed to `devicechange` events to dynamically refresh camera and audio profiles when external USB, Lightning, or wireless hardware is connected or disconnected.
- **Hardware Intelligence Inspector:** Built [`HardwareInspectorModal.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/hardware/HardwareInspectorModal.tsx), an in-app diagnostic console displaying deep physical sensor matrices, format support, concurrent ISP streaming status, and driver transparency notes.
- **Hardware-Aware Pro Controls:** Updated ProHUD and ProSettingsDrawer to disable or annotate controls unsupported by the active sensor (e.g., fixed-focus ultrawide notices and driver shutter constraints).
- **Test Suite Expansion:** Added 16 new unit and component tests across 3 new test files, elevating total test coverage to 138 / 138 passing tests with 0 lint errors.

---

## [v1.1.0] - 2026-10-30

### Milestone 11: Advanced Capture Studio (Audio Intelligence, Dual Camera, Night Mode, Wide Selfie, Slow Motion, Time-lapse)
- **Capture Mode Architecture:** Expanded `CameraMode` union (`photo`, `video`, `portrait`, `night`, `dual`, `slow_motion`, `timelapse`) with a native iOS-style touch-draggable horizontal mode selector dock.
- **Advanced Audio Intelligence DSP Engine:**
  - Modular Web Audio API DSP pipeline with Highpass filter (130Hz wind cut), 60Hz Notch filter (HVAC hum), 2.5kHz Peaking filter (speech formant focus), DynamicsCompressorNode, Master Gain, and Monitor Gain.
  - Six operational audio profiles: `Off`, `Standard`, `Strong`, `Wind Reduction`, `Voice Focus`, and `Auto Adaptive`.
  - Stereo decibel VU meter (-60dB to 0dB) with peak clipping indicators and noise floor estimator.
  - Hardware microphone enumeration, categorizing USB, Bluetooth, and wireless receivers (DJI / Røde) vs built-in mics.
  - MediaStreamAudioDestinationNode sync: routes processed DSP audio directly into `MediaRecorder` for synchronized recording.
- **Dual Camera Multi-Stream Compositing:**
  - Hardware concurrent stream capability probing; gracefully prevents camera hardware crashes and alerts user if single ISP constraint is active.
  - Dual stream compositing canvas rendering with 3 layouts: Picture-in-Picture (draggable to 4 corners), Split-Screen Vertical, and Split-Screen Horizontal.
  - Secondary camera stream capture with live swapping.
- **Advanced Computational Night Mode:**
  - Hardware `exposureTime` capability detection; native hardware long exposure when supported.
  - 32-bit Float computational multi-frame stacking fallback for standard mobile browsers: accumulates frames and applies temporal noise reduction and non-linear shadow curve.
  - Live capture countdown timer, frame count tally, and stability score meter.
- **Wide Selfie & Group Framing Guides:**
  - Physical front-facing lens identification (ultrawide vs wide) with 1.0x vs 0.7x/0.5x toggle.
  - Mathematical 12% edge-distortion safe boundary overlays and group framing guidelines.
- **Slow Motion Video Engine:**
  - Sensor FPS capability querying (60, 120, 240 FPS) with dynamic constraint application.
  - High-speed video recording with post-capture playback speed multipliers (0.5x, 0.25x, 0.125x).
- **Time-lapse Video Engine:**
  - Interval stepping (0.5s, 1s, 2s, 5s, 10s, 30s) with output duration calculator.
  - Pre-capture device readiness audit (battery level and storage space checks).
  - Memory-bounded incremental canvas-to-MediaRecorder frame streaming (zero in-memory frame buffer hoarding).
- **Automated Test Suite Expansion:** Added 8 new test suites and 32 new unit/integration tests, bringing total test count to 122 passing tests across 25 suites with 0 lint errors and clean production build.

---

## [v1.0.0] - 2026-10-30

### Milestone 10: Technical Documentation, ADRs & AI Agent Onboarding
- **Comprehensive Documentation Suite:** Authored 30+ detailed engineering guides covering all subsystems (`CAMERA_ENGINE.md`, `FILTERS_AND_LUTS.md`, `MEMORY_MANAGEMENT.md`, etc.).
- **Architecture Decision Records:** Formatted and documented ADR-001 through ADR-007.
- **AI Agent Onboarding Guide:** Created `AI_AGENT_GUIDE.md` and `DEVELOPMENT_RULES.md` for rapid integration of autonomous coding agents.
- **Automated Backup Tooling:** Created `scripts/backup.mjs` for timestamped snapshot archiving.

### Milestone 9: Performance Engineering & Zero-Crash Architecture
- **Bundle Optimization:** Code-split heavy modals (`PhotoStudioModal`, `LutStudioModal`, `ExportStudioModal`, `AdminDashboardModal`), reducing initial entry bundle from 578 kB to 403.49 kB (108 kB gzip).
- **Zero-Allocation GPU Pipeline:** Refactored `WebGLLutPipeline` to allocate a single 2D atlas texture on startup and update via `gl.texSubImage2D()`, cutting LUT switch latency from 220ms to $< 8\text{ms}$.
- **Centralized Resource Management:** Introduced [`ResourceManager`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/resourceManager.ts) tracking 13 managed resource types and preventing memory leaks on mobile devices.
- **Sensor & Audio Throttling:** Throttled gyroscope and VU meter listeners to 30 FPS with hysteresis smoothing.
- **Full Test Verification:** Expanded test coverage to 90 passing tests across 17 test suites with 0 lint errors.

### Milestone 8: Professional 3D LUT & Filter Import System
- **Custom `.cube` Support:** Engineered parser supporting 17×17×17, 33×33×33, and 65×65×65 3D LUTs.
- **Web Worker Parser:** Implemented [`cubeParserAsync.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/cubeParserAsync.ts) to parse multi-megabyte LUTs in background threads without UI frame drops.
- **2D Atlas WebGL Shader:** Developed GPU shader mapping 3D color cubes onto 2D textures with trilinear interpolation.
- **Before/After Split Wipe:** Implemented interactive dragging split screen to compare graded vs log footage.
- **LUT Exporter:** Added in-app capability to export modified grades as downloadable `.cube` files.

### Milestone 7: Stabilization, Security & Automated Testing
- **Hardened Subsystem Error Boundaries:** Wrapped studio modals with [`ErrorBoundary.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/common/ErrorBoundary.tsx) to prevent modal crashes from affecting live video.
- **Cryptographic Licensing Engine:** Implemented HMAC-SHA256 entitlement token verification with 7-day offline grace period.
- **Rate-Limiting Protection:** Added sliding-window rate limiting on backend activation endpoints.

### Milestone 6: Ghost Overlay, Sessions & Export Studio
- **Ghost Overlay:** Developed transparent reference photo overlay with pinch-to-scale, pan, rotate, and opacity adjustments.
- **Session Organizer:** Implemented photography session tracker with client metadata and shot progress checklists.
- **Export Studio:** Built multi-format batch exporter (JPEG, PNG, WebP) with resolution scaling and watermark insertion.

### Milestone 5: Android, iOS & Safe Area Architecture
- **Safe Area System:** Implemented `.safe-top`, `.safe-bottom`, `.safe-area-container` for notch and dynamic island compatibility.
- **Haptic Tactile Engine:** Wired micro-vibrations for shutter release and tick dial adjustments.
- **Aspect Ratio Pillarboxing:** Added precision letterboxing math for `16:9`, `4:3`, `1:1`, `9:16`, and `2.39:1` ratios.

### Milestone 4: Master UI/UX Repair & Viewfinder Overhaul
- **Blackmagic-Inspired Pro HUD:** Built interactive telemetry pills for FPS, Shutter Angle, ISO, White Balance, and EV.
- **Stereo VU Meter:** Created real-time Web Audio API decibel meter with peak hold indicators.
- **Focus Ring:** Added animated tap-to-focus ring with manual distance override.

### Milestone 3: Blackmagic Photo & Video Modes
- **Dual Camera Operating Modes:** Independent PHOTO and VIDEO state pipelines.
- **Manual Shutter Angle:** Implemented $180^\circ$ shutter rule calculation ($\text{Angle} = 360 \times \text{FPS} \times \text{Exposure Time}$).

### Milestone 2: Lightroom Photo Editing Studio
- **Post-Processing Panels:** Light, Color, RGB Tone Curves, HSL Mixer (8 channels), 3-Way Color Wheels, Texture, Clarity, Dehaze, Vignette, and Film Grain synthesis.

### Milestone 1: Core Camera & 25+ Composition Grids
- **Composition Grid Engine:** SVG rendering of Rule of Thirds, Golden Ratio, Golden Spiral, Golden Triangles, Fibonacci diagonals, and Safe Areas.
- **Reference Photo System:** 3 sample photographs per grid style demonstrating practical compositional alignment.
