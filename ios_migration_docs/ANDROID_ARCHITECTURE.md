# CineGrid Pro — Android Native Architecture & iOS Equivalent Mapping
**Generated:** November 9, 2026

---

## 1. Android Native Layer Breakdown

The Android application achieves zero-latency camera operations and hardware-level image processing via three custom Capacitor plugins:

### 1. `MediaSaverPlugin.java` (MediaStore API)
- **Purpose:** Saves high-resolution photos and recorded videos into the user's Android MediaStore (`MediaStore.Images.Media` and `MediaStore.Video.Media`) inside dedicated album folders ("CineGrid Pro").
- **Operations:**
  - Decodes base64 or reads temporary file paths.
  - Automatically identifies container format (`video/mp4`, `video/webm`, `image/jpeg`).
  - Sets `IS_PENDING` flag during stream writing and clears it upon completion for atomic media discovery.
  - Generates media URIs for gallery display.

### 2. `NativeCameraPlugin.java` (Camera2 API)
- **Purpose:** Interrogates physical camera hardware and executes low-level camera operations.
- **Operations:**
  - Camera capabilities discovery (`getCapabilities`): Iterates over all camera sensors (ultra-wide, wide, telephoto), extracts physical sensor dimensions, focal lengths, aperture, ISO ranges, exposure time ranges, available JPEG and RAW resolutions, supported high-speed FPS.
  - Direct RAW DNG capture (`captureRaw`): Acquires uncompressed RAW sensor buffers into Adobe DNG format using `DngCreator`.
  - Multi-frame burst stacking (`captureStack`): Captures HDR and Night bursts with manual exposure stepping and software frame alignment.
  - High-speed camera recording session configuration.

### 3. `NativeFilmCameraPlugin.java` & `NativeFilmRecorder.java` (Camera2 + OpenGL ES 2.0)
- **Purpose:** Full custom hardware preview layer rendering behind a transparent WebView.
- **Operations:**
  - Creates a native `SurfaceView` behind Capacitor's web view.
  - Injects camera texture via `SurfaceTexture` into a custom OpenGL ES 2.0 rendering pipeline running `film_fragment.glsl`.
  - Applies real-time film emulation (LUT, grain, tint, exposure bias) directly on GPU frames.
  - Live capture using `MediaCodec` and `MediaMuxer` hardware video encoding.

---

## 2. iOS Architectural Equivalents

| Android Component | Android Tech | iOS Production Equivalent | iOS Frameworks |
|---|---|---|---|
| **Gallery Storage** | `MediaSaverPlugin.java` (MediaStore) | `MediaSaverPlugin.swift` | `Photos` framework (`PHPhotoLibrary`, `PHAssetChangeRequest`) |
| **Hardware Inspection** | `NativeCameraPlugin.java` (`CameraManager`) | `NativeCameraPlugin.swift` | `AVFoundation` (`AVCaptureDevice.DiscoverySession`, `AVCaptureDevice.Format`) |
| **RAW DNG Capture** | `NativeCameraPlugin.java` (`DngCreator`) | `NativeCameraPlugin.swift` | `AVCapturePhotoOutput` with `AVCapturePhotoSettings(rawPhotoPixelFormatType:)` |
| **Film Shader & Viewfinder** | `NativeFilmCameraPlugin.java` (OpenGL ES) | `NativeFilmCameraPlugin.swift` | `AVFoundation` + `Metal` / `MetalKit` (`MTKView`, `CIContext`) |
| **Native Video Recording** | `NativeFilmRecorder.java` (`MediaCodec`) | `NativeFilmRecorder.swift` | `AVAssetWriter`, `AVAssetWriterInput`, `AVCaptureAudioDataOutput` |
| **Lifecycle & Windowing** | `MainActivity.java` | `AppDelegate.swift` & `SceneDelegate.swift` | `UIApplication.shared.isIdleTimerDisabled = true` |
