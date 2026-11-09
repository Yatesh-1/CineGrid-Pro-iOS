# CineGrid Pro — Complete Project Analysis
**Generated:** November 9, 2026  
**Application:** CineGrid Pro (Cinema-Grade Mobile Photography & Cinematography App)  
**App ID:** `com.cinegrid.procamera`  
**Current Production Build Version:** `1.0.0` (Build `1`)

---

## 1. Executive Summary & Codebase Architecture

CineGrid Pro is a cinema-tier mobile camera and post-production studio application. It unifies manual cinematography controls (ARRI ALEXA 35, RED V-RAPTOR, Sony VENICE 2, and Blackmagic URSA style) with computational photography and WebGL/GLSL real-time LUT color grading.

### Architecture Topology
- **Core UI & Logic Engine:** React 19.3.1, TypeScript 5.8 (Strict verbatimModuleSyntax), Tailwind CSS, Vite 8.3.5, Lucide React.
- **Cross-Platform Native Bridge:** Capacitor 8.6.0 (`@capacitor/core`, `@capacitor/app`, `@capacitor/camera`, `@capacitor/device`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor-community/media`).
- **Android Native Platform Layer:**
  - `MainActivity.java`: Window management (`FLAG_KEEP_SCREEN_ON`), low-memory cache reclamation (`onTrimMemory`), WebSettings config.
  - `MediaSaverPlugin.java`: Android MediaStore scoped storage integration (saving photos/videos directly to DCIM/Pictures/Movies under "CineGrid Pro").
  - `NativeCameraPlugin.java`: Camera2 API direct hardware extraction (RAW DNG capture, multi-frame burst HDR/Night, camera sensor capabilities inspection).
  - `NativeFilmCameraPlugin.java` & `NativeFilmRecorder.java`: Low-latency hardware-accelerated preview rendering with OpenGL ES GLSL shaders (`film_fragment.glsl`) positioned behind transparent WebView.
- **iOS Native Platform Layer:**
  - Standard Capacitor 8.6 iOS scaffolding with SPM (`CapApp-SPM`), `AppDelegate.swift`, `SceneDelegate.swift`, `Info.plist`.
  - **Migration Gap Identified:** Android has 3 custom native plugins (`MediaSaver`, `NativeCamera`, `NativeFilmCamera`) written in Java that must be ported to Swift / AVFoundation / Photos / Metal to achieve 100% feature parity on iOS.

---

## 2. Source Code & Package Analysis

- **Total Source Files:** 256 TypeScript/TSX source modules, 5 Java native classes, 80 test suites.
- **Tests Passing:** **863 / 863 unit and integration tests passing** across 80 test files (100% green).
- **Linter Status:** Oxlint reports 0 errors.
- **Vite Build Output:** Clean bundle in 1.45s with optimized code splitting (`geoGridPhotos`, `PhotoEditorModal`, `GridReferenceModal`, `ProSettingsDrawer`, `LookStudioModal`, etc.).

---

## 3. UI and Functionality Inventory

The application is structured into the following operational domains:
1. **Viewfinder & HUD:**
   - Real-time exposure readout bar (ISO, Shutter Angle/Speed, EV bias, Kelvin WB, FPS).
   - Dynamic 50+ Composition Grids (Fibonacci Spiral, Rule of Thirds, Golden Triangle, Dynamic Symmetry, Anamorphic frame lines, etc.).
   - Tap-to-focus & AE/AF Lock with custom focus box and exposure slider.
   - Live scopes portal: Waveform (Luma), RGB Parade, Vectorscope, False Color, Zebra stripes, Peaking filter, Histogram.
2. **Computational Capture Studios:**
   - Dual Camera (Simultaneous front/rear stream via Picture-in-Picture or Split-Screen).
   - Night Mode (Multi-frame burst capture with gyro motion stability estimation).
   - Slow Motion (High-speed capture at supported sensor frame rates with fractional playback).
   - Time-Lapse (Intervalometer from 0.5s to 60s with progressive assembly).
   - Wide Selfie Mode (Interactive framing and optical zoom calibration).
3. **Color Grading & LUT Engine:**
   - 3D Cube LUT parser (`.cube` files) running on WebGL fragment shader pipeline.
   - Real-time LUT preview and offline high-resolution still rendering.
   - 3D LUT to 3DL converter and resampler.
4. **Post-Capture Studio & Gallery:**
   - HSL color wheels, curves, exposure bias, tone adjustments.
   - Lossless and multi-format binary export (JPEG, PNG, WebP, TIFF).
   - Direct system photo library integration and album categorization.
5. **Licensing & Session Management:**
   - Production session logging, metadata tagging, HMAC-SHA256 license verification.

---

## 4. Backend & Storage Architecture

- **No Remote Backend Server Dependency:** CineGrid Pro is designed as a self-contained, privacy-first offline cinema camera. No remote database or remote authentication server is required for core recording and editing operations.
- **Storage Subsystems:**
  - `IndexedDB` (`mediaStorageService.ts`, `lutStorageService.ts`): Stores captured clips, photos, sessions, custom LUTs, and presets locally in sandboxed browser storage.
  - `Filesystem & MediaSaver`: Native device storage saving to public user galleries with proper EXIF and metadata.
  - `UserDefaults / Keychain / localStorage`: User preferences, active settings, licensing credentials.
