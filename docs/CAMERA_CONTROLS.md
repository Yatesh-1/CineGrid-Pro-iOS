# Manual Camera Controls & Hardware Capabilities — CineGrid Pro

CineGrid Pro incorporates professional cinema controls inspired by **Blackmagic Camera**, offering precision manual overrides for exposure, optics, color temperature, and focusing.

---

## 1. Hardware Capabilities Detection

When an active `MediaStreamTrack` is acquired, `CameraService.inspectCapabilities(track)` probes the browser driver using the W3C `MediaStreamTrack.getCapabilities()` and `getSettings()` APIs:

```ts
export interface HardwareCapabilities {
  hasCamera: boolean;
  canZoom: boolean;
  minZoom: number;
  maxZoom: number;
  stepZoom: number;
  canTorch: boolean;
  canFocusMode: boolean;
  supportedFocusModes: string[];
  canExposureCompensation: boolean;
  minExposureComp: number;
  maxExposureComp: number;
  stepExposureComp: number;
  canWhiteBalance: boolean;
  supportedWhiteBalanceModes: string[];
  canFrameRate: boolean;
  minFrameRate: number;
  maxFrameRate: number;
  aspectRatio: number;
  facingMode: 'user' | 'environment';
  deviceId: string;
}
```

---

## 2. Core Manual Controls & Specifications

### A. Sensitivity (ISO)
- **Range:** ISO 100 to ISO 6400 (Steps: 100, 200, 400, 800, 1600, 3200, 6400).
- **Auto Mode:** Automatically adapts sensor gain to ambient scene lux.
- **Manual Mode:** Locks sensor gain. When manual ISO is selected, digital gain mapping is applied to ensure accurate preview brightness.

### B. Shutter Speed & The 180° Cinema Shutter Rule
- **Range:** `1/8000s` to `1s` (Common stops: `1/8000`, `1/4000`, `1/2000`, `1/1000`, `1/500`, `1/250`, `1/120`, `1/60`, `1/50`, `1/48`, `1/24`, `1/10`, `1/4`, `1/2`, `1s`).
- **180-Degree Cinema Rule:**
  In motion picture cinematography, the 180° shutter rule maintains natural motion blur by keeping the exposure time equal to half the frame interval:
  $$\text{Shutter Speed} = \frac{1}{2 \times \text{FPS}}$$
  `cameraService.calculate180DegreeShutter(fps)` automatically computes the exact denominator:
  - At 24 FPS: Shutter locks to **1/48s** or **1/50s**.
  - At 25 FPS: Shutter locks to **1/50s**.
  - At 30 FPS: Shutter locks to **1/60s**.
  - At 60 FPS: Shutter locks to **1/120s**.
  - At 120 FPS: Shutter locks to **1/240s**.

### C. White Balance (Kelvin Temperature)
- **Range:** 2800K to 8000K (Standard Kelvin stops: 3200K Tungsten, 4300K Fluorescent, 5600K Daylight, 6500K Overcast, 7500K Shade).
- **Tint:** Green/Magenta chromatic offset from -50 to +50.
- **Hardware Application:** When `canWhiteBalance` is supported by the driver, constraints are applied via `track.applyConstraints({ advanced: [{ whiteBalanceMode: 'manual' }] })`. If unsupported, chromatic balance is calculated in real time via the WebGL fragment shader.

### D. Exposure Compensation (EV)
- **Range:** -3.0 EV to +3.0 EV in 0.1 EV increments.
- **Hardware Application:**
  ```ts
  await track.applyConstraints({
    advanced: [{ exposureCompensation: clampedEV }],
  });
  ```
- **Fallback:** If hardware exposure compensation is rejected, the WebGL shader applies exposure gain dynamically using the standard optical equation:
  $$\text{Color}_{\text{out}} = \text{Color}_{\text{in}} \times 2^{\text{EV}}$$

### E. Tap-to-Focus & Point of Interest
- User taps any focal point on the viewfinder.
- Normalized coordinates $(x, y) \in [0.0, 1.0]$ are computed from the bounding rect.
- If hardware supports `pointsOfInterest`:
  ```ts
  await track.applyConstraints({
    advanced: [{
      pointsOfInterest: [{ x: normX, y: normY }],
      focusMode: 'manual',
    }],
  });
  ```
- An animated focus reticle brackets the point and provides audio feedback (`cameraAudio.playFocusLock()`).

### F. Digital & Optical Zoom
- **Range:** 0.5x, 1x, 2x, 5x.
- **Pinch-to-Zoom:** Viewfinder supports multi-touch pinch gestures using Euclidean distance math (`Math.hypot(x1 - x2, y1 - y2)`).
- **Hardware Integration:** Calls `cameraService.applyHardwareZoom(stream, zoomLevel)`. If the device camera possesses an optical zoom motor (`caps.zoom`), physical focal length changes; otherwise, smooth hardware-accelerated CSS/WebGL scaling is applied.

### G. Flashlight / Torch
- Toggles hardware LED torch on supported mobile devices:
  ```ts
  await track.applyConstraints({
    advanced: [{ torch: isTorchOn }],
  });
  ```
- Gracefully handles devices without an active LED flash.

---

## 3. Supported vs Unsupported Capabilities Matrix

| Camera Control | Hardware Support | Fallback When Hardware Constraint Unsupported |
| :--- | :---: | :--- |
| **Optical Zoom** | Where supported by camera sensor | GPU hardware-accelerated viewport scale transform |
| **Torch / Flash** | Supported on Android/iOS phones | Visual flash screen overlay animation (`setScreenFlash`) |
| **Tap to Focus** | Supported on Camera2 & AVFoundation | Visual reticle lock with focus lock tone |
| **Hardware EV** | Driver-dependent | Real-time WebGL shader exposure multiplier ($2^{\text{EV}}$) |
| **Hardware White Balance** | Driver-dependent | GPU chromatic temperature matrix adjustment |
| **Continuous Auto-Focus** | Driver-dependent | Software focal plane center reticle |
| **Sensor ISO Lock** | Driver-dependent | Sensor auto lux + software gain compensation |

---

## 4. Advanced Capture Studio Modes & Controls

CineGrid Pro expands beyond standard photo/video capture with 6 specialized capture domains:

### A. Advanced Audio Intelligence Studio
- **DSP Nodes:** Highpass (130Hz wind attenuation), 60Hz Notch (mains electrical & HVAC hum), 2.5kHz Peaking (vocal intelligibility enhancement), DynamicsCompressorNode, Master Gain, and Monitor Gain.
- **6 Profiles:** `Off` (raw bypass), `Standard` (gentle 12dB compression), `Strong` (high-noise suppression), `Wind Reduction` (steep 18dB/octave highpass), `Voice Focus` (peaking mid-range boost), `Auto Adaptive` (spectral thresholding).
- **VU Telemetry:** -60 dB to 0 dB RMS and peak decibel meters with peak hold decay and clipping alerts.
- **MediaStream Destination Integration:** Audio tracks from `audioIntelligenceService.getProcessedAudioStream()` are mixed with the camera video track into a unified recording stream, guaranteeing frame-accurate A/V synchronization.

### B. Dual Camera Multi-Camera Recording
- **ISP Probing:** `dualCameraService.probeDualCameraSupport()` verifies concurrent multi-camera sensor capability across iOS AVMultiCamSession and Android multi-camera APIs.
- **Compositing Engine:** Composites primary and secondary streams to an off-screen canvas at 30/60 FPS.
- **Layouts:**
  - *Picture-in-Picture (PIP):* Draggable to 4 corners (`top_left`, `top_right`, `bottom_left`, `bottom_right`) with small (20%) and large (32%) sizing options.
  - *Split-Screen Vertical:* 50/50 vertical division with center boundary guide.
  - *Split-Screen Horizontal:* 50/50 horizontal division.
- **Live Camera Swap:** Seamlessly toggles primary and secondary camera roles without restarting the recording session.

### C. Advanced Computational Night Mode
- **Exposure Presets:** `Auto`, `10s`, `30s`, and custom slider (1s to 30s).
- **Hardware Long Exposure:** When `exposureTime` is exposed in `MediaTrackCapabilities`, native sensor exposure is locked.
- **Computational Multi-Frame Stacking:** On devices where the sensor driver locks shutter speed, `nightCaptureService` executes a 32-bit float temporal accumulation pipeline. 20 to 90 frames are sampled across the interval, accumulating pixel data into a high-precision buffer with temporal noise averaging and non-linear shadow recovery curve.
- **Real-Time Stability Meter:** Calculates scene variance between frames to estimate hand stability and provide holding guidance.

### D. Wide Selfie & Group Alignment Studio
- **Lens Detection:** Automatically distinguishes between primary and ultrawide front-facing camera sensors.
- **Framing Modes:** 1.0x (standard portrait) and 0.7x/0.5x (wide group framing).
- **Group Safe Guides:** 12% edge margin guides alerting users of lens barrel distortion on peripheral subjects.

### E. High-Speed Slow Motion
- **Sensor Query:** Inspects maximum sensor framerates (60, 120, 240 FPS) using `MediaTrackCapabilities.frameRate`.
- **Playback Multipliers:** Supports 0.5x (half-speed), 0.25x (quarter-speed), and 0.125x (eighth-speed) playback time-stretching.

### F. Time-lapse Engine
- **Interval Presets:** 0.5s, 1s, 2s, 5s, 10s, 30s intervals.
- **Output Duration Estimator:** Live calculation displaying exact final playback duration at 24/30 FPS based on captured frames.
- **Readiness Audit:** Verifies battery percentage $> 20\%$ and estimated storage space before initiating long-duration sequences.
- **Bounded-Memory Streaming:** Directly encodes captured frames to a video stream via `MediaRecorder` without keeping full-resolution bitmaps in JavaScript heap.

---

## 5. Device Hardware Intelligence & Automatic Camera Selection

### A. Device Hardware Intelligence Engine
At application launch, `HardwareIntelligenceService.scanHardware()` inspects available camera and audio capabilities across iOS AVFoundation, Android Camera2, and W3C MediaDevices:
- Enumerate all physical sensors (`videoinput`).
- Classify physical lenses into dedicated roles:
  - **Ultra Wide (`ultrawide`):** ~0.5x, 13mm–16mm equivalent focal length.
  - **Wide (`wide`):** ~1.0x, 24mm–28mm equivalent focal length (primary sensor).
  - **Telephoto (`telephoto`):** ~2x–3x, 50mm–85mm equivalent focal length.
  - **Periscope (`periscope`):** ~5x–10x, 120mm+ folded optical prism.
  - **Macro (`macro`):** Close-focus distance $< 10$cm.
  - **Front Wide (`front_wide`):** Standard selfie ~1.0x, 22mm–26mm equivalent.
  - **Front Ultra Wide (`front_ultrawide`):** Wide selfie ~0.7x/0.5x, 18mm–20mm equivalent.
- Extract hardware limits: ISO sensitivity range, shutter duration range, focal lengths, native aperture, supported resolutions, framerates, autofocus vs fixed focus, and optical image stabilization (OIS).
- Subscribe to `devicechange` events to dynamically update profiles when external lenses, webcams, or microphones are attached or disconnected.

### B. Intelligent Zoom System
The zoom selector adapts directly to the hardware's genuine physical lenses:
- Displays physical optical stops (e.g., `0.5x (13mm)`, `1x (24mm)`, `3x (77mm)`).
- Distinct magnification classification badges:
  - **`OPTICAL LENS` (Amber):** Discrete physical camera sensor switch.
  - **`OPTICAL ZOOM` (Sky-Blue):** Continuous motorized optical zoom mechanism.
  - **`SENSOR CROP` (Emerald):** Lossless high-resolution sensor center crop.
  - **`DIGITAL ZOOM` (Purple):** Bilinear/GPU software interpolation.
- Seamless virtual device switching avoiding jarring preview restarts or orientation flips.

### C. Automatic Best Camera Selection Engine
When a capture mode is selected, `selectBestLensForRequest(...)` automatically evaluates the optimal genuine physical camera:
- **Night Mode:** Prefers the sensor with the widest native aperture (e.g. f/1.6 primary wide) and largest physical pixel pitch for superior optical light gathering.
- **Portrait Mode:** Prefers physical telephoto (2x/3x, 50–77mm equivalent) to achieve flattering natural facial perspective compression and avoid wide-angle facial distortion.
- **Macro Photography:** Selects the sensor with the closest minimum focus distance (e.g., modern ultrawides with $< 3$cm close-focus capability).
- **Slow Motion Video:** Selects the camera with high-speed sensor readout supporting $\ge 120$ FPS.
- **Wide Selfie:** Selects the physical front-facing ultrawide sensor (18mm equivalent).

### D. Hardware-Aware Pro Controls & Transparency Policy
Controls dynamically adapt to the active physical camera:
- **Fixed-Focus Sensors:** When a fixed-focus lens is active (common on ultrawide and front sensors), manual focus distance sliders are marked as physically fixed, explaining that the lens is hyperfocaled beyond 30cm, with focus peaking active for verification.
- **Driver Shutter Locks:** When platform drivers do not expose direct shutter registers, transparency banners inform the user that simulated 180° motion blur calculation is applied.
- **Unsupported Capabilities:** Controls that cannot change hardware are never faked as functional sliders. Clear explanatory badges communicate the hardware limitation.

### E. Diagnostic Hardware Intelligence Inspector
Users and engineers can launch the in-app hardware diagnostic console (`HardwareInspectorModal.tsx`) from the `HW INFO` pill or the Pro Settings Drawer to audit:
- Platform environment and active native bridge (iOS AVFoundation vs Android Camera2 vs W3C).
- Complete physical camera list with live `ACTIVE` stream indicator.
- Concurrent multi-camera ISP session availability.
- Full capability matrix (Aperture, FPS, ISO, Shutter, Focus, Macro, OIS, Flash, Depth, Kelvin).
- Raw `MediaTrackCapabilities` dictionary.
