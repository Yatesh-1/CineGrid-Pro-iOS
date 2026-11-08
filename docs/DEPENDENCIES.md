# Dependencies and Third-Party Packages

This document details all runtime and development packages in CineGrid Pro, their exact versions, purposes, and security justifications.

---

## 1. Runtime Production Dependencies

| Package | Version | License | Architectural Purpose |
| :--- | :--- | :--- | :--- |
| **`react`** | `^19.3.1` | MIT | Component model, reactive state, concurrent rendering, and `Suspense` code splitting. |
| **`react-dom`** | `^19.3.1` | MIT | DOM mounting and synthetic event delegation. |
| **`lucide-react`** | `^1.64.0` | ISC | Lightweight SVG icons for camera controls, shutter icons, dials, filters, and HUD status badges. |
| **`@capacitor/core`** | `^8.6.0` | MIT | Core bridge runtime for packaging the web application to native Android and iOS wrappers. |
| **`@capacitor/camera`** | `^8.2.6` | MIT | Native camera access bridge and OS permission handling for Android & iOS. |
| **`@capacitor/device`** | `^8.0.3` | MIT | Hardware capabilities query (device model, battery percentage, OS version, UUID). |
| **`@capacitor/filesystem`** | `^8.1.5` | MIT | Native disk storage bridge for persisting raw photography batches into user photo albums. |
| **`@capacitor/status-bar`** | `^8.0.4` | MIT | Native system status bar configuration (dark mode, translucent, fullscreen immersive). |

---

## 2. Development & Tooling Dependencies

| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`vite`** | `^8.3.5` | Next-generation dev server with ESM HMR and high-speed Rollup production bundler. |
| **`@vitejs/plugin-react`** | `^6.1.2` | Fast Refresh and JSX transformation plugin. |
| **`typescript`** | `~7.0.2` | Static typing, interface definitions, and strict compiler enforcement (`tsc -b`). |
| **`oxlint`** | `^1.89.0` | High-speed Rust linter auditing syntax, unused variables, and code hygiene (~20ms execution). |
| **`vitest`** | `^5.0.5` | Vite-native test runner executing unit, integration, and UI component tests. |
| **`jsdom`** | `^30.1.3` | Headless DOM and browser global mock environment for Vitest. |
| **`@testing-library/react`** | `^16.3.3` | Component test utilities for rendering, user event simulation, and assertion. |
| **`@testing-library/jest-dom`** | `^7.0.1` | Extended matchers for DOM node assertions (`toBeInTheDocument`, etc.). |
| **`tailwindcss`** | `^3.4.19` | Utility-first CSS styling engine. |
| **`postcss`** | `^8.5.32` | Tool for transforming CSS with PostCSS plugins. |
| **`autoprefixer`** | `^10.6.2` | Vendor prefix parser for CSS rules across iOS WebKit and Android Chromium. |
| **`@capacitor/cli`** | `^8.6.0` | Command line interface for syncing web assets to native iOS and Android projects. |
| **`@capacitor/android`** | `^8.6.0` | Native Android Gradle project templates and runtime wrapper. |
| **`@capacitor/ios`** | `^8.6.0` | Native iOS Xcode project templates and runtime wrapper. |

---

## 3. Dependency Policy & Zero-Vulnerability Stance

1. **Minimal Production Surface:** Heavy image processing libraries (e.g. OpenCV, CanvasKit, ffmpeg.wasm) are deliberately avoided in production. Image filtering, 3D LUT grading, and format encoding are executed using standard WebGL shaders, Canvas 2D, and native browser `MediaRecorder` APIs.
2. **Audit Verification:** All packages have zero known vulnerabilities according to npm security advisories.
3. **No Unneeded State Managers:** Global state is coordinated through typed TypeScript singletons and React 19 primitives, eliminating megabytes of Redux/MobX boilerplate.
