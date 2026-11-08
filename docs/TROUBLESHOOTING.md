# Troubleshooting and Operational Diagnostics

This guide diagnoses and resolves operational issues encountered across hardware initialization, WebGL rendering, codec negotiations, and licensing.

---

## 1. Camera & Viewfinder Diagnostics

### Symptom: Black Viewfinder Screen (No Video Stream)
- **Cause 1: Camera Permission Blocked**
  - *Fix:* Tap the browser lock icon in the URL bar (or iOS Settings $\rightarrow$ Safari $\rightarrow$ Camera) and set permissions to "Allow". Reload page.
- **Cause 2: Hardware Device Locked by Another Application**
  - *Fix:* On Windows/macOS, close background apps that lock camera sensors (Zoom, OBS Studio, Microsoft Teams, FaceTime).
- **Cause 3: Mobile WebKit Autoplay Policy**
  - *Fix:* Mobile Safari blocks video streams unless `<video>` elements have `playsInline`, `muted`, and `autoPlay` attributes set simultaneously. `CameraService` configures these automatically; if stalled, tap anywhere on the screen to trigger user activation.

---

## 2. WebGL & Color Grading Diagnostics

### Symptom: Colors Inverted or Displayed as Magenta/Black
- **Cause: Corrupt or Non-Standard `.cube` File**
  - *Diagnosis:* The imported 3D LUT may have negative values, NaN coordinates, or RGB triplets defined out of order ($R \rightarrow G \rightarrow B$ standard).
  - *Fix:* Re-import using standard Adobe/DaVinci Resolve `.cube` export. The app will reject malformed files with a descriptive toast.

### Symptom: WebGL Crashes on Mobile Phone
- **Cause: GPU Memory Reclaimed by OS**
  - *Diagnosis:* Low-RAM devices may drop WebGL contexts when battery saver mode activates.
  - *Fix:* `WebGLLutPipeline` listens to `webglcontextlost` and calls `event.preventDefault()`. On `webglcontextrestored`, shaders and LUT atlas are automatically rebuilt without losing unsaved photos.

---

## 3. Audio & Recording Diagnostics

### Symptom: No Audio in Recorded Video or Flat VU Meter
- **Cause: Microphone Permission Denied or In Use**
  - *Diagnosis:* The camera stream started successfully, but microphone tracks were muted or denied.
  - *Fix:* Open **Settings Drawer** $\rightarrow$ enable "Audio Monitoring". Verify microphone selector is mapped to the device's primary microphone.

### Symptom: Video File Won't Play on Windows/Mac After Download
- **Cause: Unsupported Codec Container**
  - *Diagnosis:* Modern WebM containers with VP9/Opus may not play in legacy QuickTime Player without Perian/VLC.
  - *Fix:* In Settings, set **Video Codec** to **H.264 (MP4)** for universal cross-platform playback.

---

## 4. Licensing Diagnostics

### Error: `ERR_RATE_LIMITED` (HTTP 429)
- **Cause:** More than 8 activation attempts were made within 60 seconds.
- **Fix:** Wait 60 seconds for the sliding rate limiter window to reset.

### Error: `MAX_DEVICES_EXCEEDED`
- **Cause:** The license key has reached its allowed device count (e.g. 2 devices for standard pro licenses).
- **Fix:** Open the Admin Dashboard (or Contact Admin modal) to revoke inactive hardware IDs or upgrade the license tier.

### Warning: "Camera License Expired Offline Grace"
- **Cause:** Device has been offline for longer than 7 consecutive days without reconnecting to the licensing server.
- **Fix:** Connect to Wi-Fi/cellular and launch the app once to automatically revalidate the cryptographic HMAC token.
