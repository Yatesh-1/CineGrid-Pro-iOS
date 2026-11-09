# CineGrid Pro — Complete Feature Mapping Matrix (Android vs iOS)
**Generated:** November 9, 2026

---

| Feature / Subsystem | Android Implementation | iOS Native Implementation | Status | Parity Notes |
|---|---|---|---|---|
| **Gallery Photo/Video Saving** | `MediaSaverPlugin.java` (MediaStore API) | `MediaSaverPlugin.swift` (Photos `PHPhotoLibrary`) | **VERIFIED** | Dedicated "CineGrid Pro" album creation and atomic save |
| **Camera Hardware Inspection** | `NativeCameraPlugin.java` (`CameraManager`) | `NativeCameraPlugin.swift` (`AVCaptureDevice.DiscoverySession`) | **VERIFIED** | Reports sensor optics, focal lengths, aperture, ISO ranges |
| **Direct RAW DNG Capture** | `NativeCameraPlugin.java` (`DngCreator`) | `NativeCameraPlugin.swift` (`AVCapturePhotoOutput`) | **VERIFIED** | Full uncompressed Adobe DNG capture |
| **Film Shader Viewfinder** | `NativeFilmCameraPlugin.java` (OpenGL ES) | `NativeFilmCameraPlugin.swift` (AVFoundation Layer) | **VERIFIED** | Zero-latency hardware camera preview beneath transparent UI |
| **Hardware Video Recording** | `NativeFilmRecorder.java` (`MediaCodec`) | `NativeFilmCameraPlugin.swift` (`AVAssetWriter`) | **VERIFIED** | Hardware-accelerated 1080p/4K HEVC/H.264 video with AAC audio |
| **Viewfinder & HUD Controls** | `CinemaVideoHUD.tsx`, `cameraService.ts` | Safari WebKit AVFoundation MediaStream | **VERIFIED** | Identical UI, manual sliders, rotary shutter angle math |
| **Monitoring Scopes** | `cinemaScopes.ts` | HTML5 Canvas 2D / WebGL | **VERIFIED** | Waveform, RGB Parade, Vectorscope, False Color, Zebra |
| **Composition Grids** | `grid-engine/` (50+ grids) | Vector SVG Engine | **VERIFIED** | Identical SVG overlays across all aspect ratios |
| **Web Audio Intelligence** | `audioIntelligenceService.ts` | Web Audio API | **VERIFIED** | Real-time peak VU meter and DSP noise suppression presets |
| **3D LUT Grading Engine** | `webglLutPipeline.ts`, `cubeParserAsync.ts` | WebGL 1.0/2.0 Shader Pipeline | **VERIFIED** | Fast asynchronous chunked .cube parser with LRU cache |
| **Post-Capture Photo Studio** | `src/components/studio` | HTML5 2D Canvas & WebGL | **VERIFIED** | Non-destructive HSL wheel, curves, and split-screen comparison |
| **Display Sleep Prevention** | `MainActivity.java` (`FLAG_KEEP_SCREEN_ON`) | `AppDelegate.swift` (`isIdleTimerDisabled`) | **VERIFIED** | Screen kept illuminated during live camera sessions |
| **App Store Compliance** | Google Play manifest permissions | Apple Privacy Manifest (`PrivacyInfo.xcprivacy`) | **VERIFIED** | Covered APIs declared with official Apple reason codes |
