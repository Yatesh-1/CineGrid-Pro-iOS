# Platform Compatibility & Hardware Matrix

**Project:** CineGrid Pro Camera Studio  
**Audit Date:** October 30, 2026  
**Target Environments:** iOS (iPhone/iPad), Android (Smartphones/Tablets), Desktop Browsers (Chrome, Safari, Edge, Firefox)

---

## 1. Operating System Compatibility Matrix

| Platform / Operating System | Minimum Version | Target Version | Native Runtime | Web / PWA Runtime |
|---|---|---|---|---|
| **Apple iOS (iPhone)** | iOS 15.0+ | iOS 17.0+ / 18.0+ | Capacitor WKWebView | Safari (WebKit) |
| **Apple iPadOS (iPad)** | iPadOS 15.0+ | iPadOS 17.0+ / 18.0+ | Capacitor WKWebView | Safari (WebKit) |
| **Google Android (Phones)** | Android 9.0 (API 28) | Android 14.0+ (API 34) | Capacitor Android WebView | Chrome / Chromium |
| **Google Android (Tablets)** | Android 9.0 (API 28) | Android 14.0+ (API 34) | Capacitor Android WebView | Chrome / Chromium |
| **macOS / Windows / Linux** | Current LTS | Current LTS | Electron (Optional) / Web | Chromium, Gecko, WebKit |

---

## 2. Hardware Feature Compatibility Across Platforms

| Hardware Capability | iOS (Safari / WebKit) | iOS (Capacitor Native) | Android (Chrome) | Android (Capacitor Native) | Desktop Browsers |
|---|---|---|---|---|---|
| **Rear/Front Camera Switching** | Supported | Supported | Supported | Supported | Supported |
| **Optical Lens Switching (0.5x, 1x, 3x)** | Supported (device labels) | Full AVFoundation | Supported | Full Camera2 API | Multiple webcams |
| **Digital Pinch-to-Zoom** | Supported | Supported | Supported | Supported | Supported |
| **Hardware Optical Zoom** | Hardware-restricted | Native API bridge | Supported | Camera2 zoom ratio | Unsupported |
| **LED Torch / Flashlight** | Restricted in Safari | Full AVFoundation | Supported (`torch`) | Full Camera2 API | Unsupported |
| **Manual ISO & Shutter Speed** | Simulated / EV offset | Full AVFoundation | Partial (Chrome experimental)| Full Camera2 API | Unsupported |
| **Tap to Focus (Points of Interest)**| Supported | Full AVFoundation | Supported | Full Camera2 API | Unsupported |
| **MediaRecorder Video Recording** | Supported (H.264/MP4) | Native MP4 / ProRes | Supported (VP9/H.264) | Native MP4 | Supported (VP9/H.264) |
| **Web Audio API & Microphone DSP** | Supported | Supported | Supported | Supported | Supported |
| **IndexedDB Heavy Media Storage** | Supported | Supported | Supported | Supported | Supported |
| **Device Orientation / Artificial Horizon** | Supported (Permissions) | Supported | Supported | Supported | Fallback to level 0 |

---

## 3. Responsive Breakpoints & Viewport Testing Matrix

| Device Profile | Dimensions (CSS Pixels) | Orientation | Layout Strategy |
|---|---|---|---|
| **iPhone SE (3rd Gen)** | 375 × 667 | Portrait | Compact view: Viewfinder takes maximum area, secondary controls hidden behind bottom sheet. |
| **iPhone 13 / 14 / 15 / 16 / 17** | 390 × 844 | Portrait | Standard mobile layout: Edge-to-edge dark OLED background with safe-area insets. |
| **iPhone 15/16/17 Pro Max** | 430 × 932 | Portrait | Large mobile layout: Expansive viewfinder with prominent circular shutter and lens selectors. |
| **iPad Mini / Standard iPad** | 768 × 1024 | Portrait / Landscape | Tablet layout: Centered viewfinder with maximum width constraints, keeping controls within comfortable thumb reach. |
| **Desktop / Laptop Displays** | 1280 × 800+ | Landscape | Centered professional studio enclosure with responsive letterboxing and floating monitor panels. |
