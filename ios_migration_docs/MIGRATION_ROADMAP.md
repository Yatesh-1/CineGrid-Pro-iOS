# CineGrid Pro — Feature Inventory & iOS Migration Roadmap
**Generated:** November 9, 2026

---

## 1. Feature Inventory & Current Status

| Module | Feature | Android Source | iOS Target | Status |
|---|---|---|---|---|
| **Storage** | System Photo & Video Saving | `MediaSaverPlugin.java` | `MediaSaverPlugin.swift` (Photos framework) | **IN PROGRESS** |
| **Hardware** | Camera & Sensor Capability Report | `NativeCameraPlugin.java` | `NativeCameraPlugin.swift` (AVFoundation) | **IN PROGRESS** |
| **RAW Capture** | Uncompressed Adobe DNG Capture | `NativeCameraPlugin.java` | `NativeCameraPlugin.swift` (`AVCapturePhotoOutput`) | **IN PROGRESS** |
| **Native Film** | Low-latency Film Shader Viewfinder | `NativeFilmCameraPlugin.java` | `NativeFilmCameraPlugin.swift` (Metal / AVFoundation) | **IN PROGRESS** |
| **Native Film** | Hardware Encoded Video Recording | `NativeFilmRecorder.java` | `NativeFilmRecorder.swift` (`AVAssetWriter`) | **IN PROGRESS** |
| **Web Viewfinder** | WebRTC/HTML5 Camera Viewfinder | `cameraService.ts` | Safari WebKit AVFoundation Passthrough | **VERIFIED** |
| **Scopes** | Waveform, RGB Parade, Vectorscope | `cinemaScopes.ts` | HTML5 Canvas 2D / WebGL | **VERIFIED** |
| **Color Engine** | 3D Cube LUT Shader Pipeline | `webglLutPipeline.ts` | WebGL 1.0/2.0 Shader Pipeline | **VERIFIED** |
| **Post-Studio** | Photo Editor, HSL Wheels, Curves | `src/components/studio` | React 19 Canvas Pipeline | **VERIFIED** |
| **Grids** | 50+ Composition Grid Overlays | `src/components/grid-engine` | SVG Vector Renderers | **VERIFIED** |
| **Audio** | Audio DSP & Peak VU Meter | `audioIntelligenceService.ts`| Web Audio API (`AudioContext`) | **VERIFIED** |
| **Computational** | Dual Camera, SlowMo, Timelapse, Night | `src/components/{dual,slowmo...}` | WebRTC + Capacitor Bridge | **VERIFIED** |
| **Packaging** | App Store Signing, Privacy Manifest | `AndroidManifest.xml` | `Info.plist`, `PrivacyInfo.xcprivacy` | **IN PROGRESS** |

---

## 2. Migration Execution Phases

1. **Phase 1: iOS Native Bridge Implementation**
   - Create `MediaSaverPlugin.swift` with `PHPhotoLibrary` support.
   - Create `NativeCameraPlugin.swift` with `AVCaptureDevice` discovery and DNG RAW capture.
   - Create `NativeFilmCameraPlugin.swift` with AVFoundation preview and hardware recording.
   - Register all plugins in `AppDelegate.swift` / Capacitor plugin registry.
2. **Phase 2: App Store & Privacy Manifest Compliance**
   - Add Apple-mandated `PrivacyInfo.xcprivacy` (NSPrivacyAccessedAPITypes, disk space, timestamp APIs).
   - Verify `Info.plist` usage descriptions (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`).
   - Configure deployment target (iOS 15.0+), orientations, status bar styles.
3. **Phase 3: TypeScript Bridge Updates**
   - Update `nativeCameraService.ts`, `nativeFilmCamera.ts`, and `deviceSaveService.ts` to enable native execution on `Capacitor.getPlatform() === 'ios'`.
4. **Phase 4: Automated Verification & Test Run**
   - Run linter and vitest test suite.
   - Run Capacitor iOS sync (`cap sync ios`).
   - Ensure clean compilation of web and native assets.
