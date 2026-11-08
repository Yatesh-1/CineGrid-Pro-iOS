# Known Limitations and Platform Variances

This document transparently records current browser API limitations, hardware variances, and environment constraints affecting CineGrid Pro.

---

## 1. Browser MediaStream Constraints

### A. Dual / Multi-Camera Streaming
- **Limitation:** Web browsers cannot simultaneously capture both the front and rear cameras on mobile devices.
- **Cause:** Mobile operating systems (iOS and Android) dedicate hardware ISP buses to one physical sensor at a time when running inside WebKit/Chromium sandboxes.
- **Handling:** CineGrid Pro cleanly transitions the stream state machine (`running` $\rightarrow$ `switching_facing` $\rightarrow$ `running`), stopping the prior track before requesting the alternative sensor.

### B. Direct Hardware ISO & Manual Shutter on iOS WebKit
- **Limitation:** iOS Safari WebKit does not expose `focusDistance`, `exposureTime`, or `iso` in `MediaTrackCapabilities`.
- **Cause:** Apple restricts direct sensor register control in browser sandboxes.
- **Handling:** CineGrid Pro gracefully detects feature availability. When native sensor adjustments are unavailable, the app falls back to high-precision software digital gain, gamma adjustments, and simulated exposure compensation. Full hardware exposure is unlocked when built as a native iOS app with Capacitor Camera.

---

## 2. Video Encoding & Codec Availability

### A. ProRes & H.265 (HEVC) MediaRecorder Encoding
- **Limitation:** Browser `MediaRecorder.isTypeSupported()` returns `false` for `video/quicktime; codecs=prores` and may return `false` for `video/mp4; codecs=hvc1` on budget Android devices.
- **Handling:** CineGrid Pro runs a dynamic codec capability ladder:
  $$\text{H.265 (HEVC)} \longrightarrow \text{H.264 (AVC)} \longrightarrow \text{VP9 / WebM}$$
  Video recording always succeeds using the highest available hardware-accelerated codec.

---

## 3. High-DPI Canvas Scaling on Ultra-High-Resolution Displays

### A. Canvas Backing Store Allocation
- **Limitation:** On 4K desktop screens or Retina 3× displays, scaling the WebGL canvas to native device pixels ($3840 \times 2160$ or higher) can consume excess GPU fill rate.
- **Handling:** Viewport rendering is capped at standard device pixel ratio (capped at 2.0x) for real-time 60 FPS viewport rendering. High-resolution captures render at full sensor resolution during the single capture rasterization step.

---

## 4. Local Host Environment

### A. Git Executable Absence
- **Limitation:** The host Windows development environment does not have Git installed in the system PATH.
- **Handling:** All change histories, snapshots, and release versions are tracked via structured `.checkpoints/`, automated backup scripts, and explicit documentation logs.
