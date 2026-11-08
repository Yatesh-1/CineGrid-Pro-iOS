# State Management Architecture

CineGrid Pro utilizes a **Hybrid State Architecture** combining reactive React component state for UI telemetry and interactive controls, with hardened singleton domain services for hardware, storage, GPU lifecycles, and cryptographic sessions.

---

## 1. State Topology Overview

```mermaid
graph TD
    subgraph UI State Layer (React 19)
        App[App.tsx Root State] --> NavState[Navigation & Active Modals]
        App --> ProState[ProSettings State]
        App --> LookState[Look & LUT State]
        App --> GhostState[Ghost Overlay State]
    end

    subgraph Domain Services (Singletons)
        CamService[CameraService<br/>State Machine & Stream]
        MediaService[MediaStorageService<br/>IndexedDB & LRU Cache]
        LutService[LutStorageService<br/>.cube Cache & Presets]
        SessService[SessionService<br/>Shoot Metas & Checklists]
        LicService[LicenseService<br/>Entitlement & Crypto]
        ResManager[ResourceManager<br/>VRAM & Object URLs]
    end

    App -->|Command / Query| CamService
    App -->|Binary Persist| MediaService
    App -->|Load / Save LUTs| LutService
    App -->|Active Session| SessService
    App -->|Check Activation| LicService
    CamService -->|Register Tracks| ResManager
    MediaService -->|Managed URLs| ResManager
```

---

## 2. Seven State Domains

### 1. Camera Engine Domain ([`cameraService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts))
- **Responsibilities:** Hardware acquisition, stream lifecycle, track constraint management, device enumerations.
- **State Machine:** Deterministic 7-state machine (`idle` $\rightarrow$ `requesting_permission` $\rightarrow$ `initializing` $\rightarrow$ `running` $\leftrightarrow$ `switching_facing` $\rightarrow$ `error` $\rightarrow$ `terminated`).
- **Concurrency Guard:** Re-entrant lock (`isAcquiringLock`) prevents race conditions during rapid device toggling.

### 2. Camera Controls & Pro Settings Domain ([`types/camera.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/types/camera.ts))
- **Managed in `App.tsx` via `proSettings: ProSettings`:**
  - `captureMode`: `'photo' | 'video'`.
  - **Exposure:** `isoAuto`, `iso` (100–6400), `shutterAuto`, `shutterMode` (`speed` vs `angle`), `shutterSpeed` (`1/8000` to `1s`), `shutterAngle` ($11.25^\circ$ to $360^\circ$), `ev` ($-3.0$ to $+3.0$).
  - **Color / Kelvin:** `wbAuto`, `whiteBalance` (2000K–10000K), `wbTint` ($-50$ to $+50$).
  - **Video Specs:** `videoResolution` (`720p`, `1080p`, `4k`), `videoFps` (23.98 to 120), `videoCodec` (`h264`, `h265`, `prores`, `vp9`), `videoBitrate` (`low`, `medium`, `high`, `max`).

### 3. Composition & Framing Domain
- **State:** `selectedGrid: GridType`, `gridStyle: GridStyleOptions`, `secondaryGuides: SecondaryGuideOptions`.
- **Properties:** Stroke color, opacity, line width, dashed style, golden ratio diagonals, dynamic smart framing bounding boxes.

### 4. Color Grading & 3D LUT Domain ([`types/lut.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/types/lut.ts))
- **State:** `lookState: LookState`:
  ```typescript
  export interface LookState {
    activeLutId: string | null;       // Currently selected 3D LUT
    lutIntensity: number;             // 0.0 to 1.0 (blending weight)
    activeFilterId: string | null;    // Built-in preset filter
    filterIntensity: number;          // 0.0 to 1.0
    splitPosition: number;            // 0.0 to 1.0 (before/after wipe handle)
    isSplitActive: boolean;           // Split screen comparison enabled
    customLuts: LutDefinition[];      // User-imported .cube models
  }
  ```

### 5. Binary Media Storage Domain ([`mediaStorageService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/mediaStorageService.ts))
- **State:** IndexedDB `photos` metadata table and `photo_blobs` binary store.
- **Cache:** 25-entry `LRUCache<string, string>` managing active Object URLs.

### 6. Photography Session Domain ([`sessionService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/sessionService.ts))
- **State:** Active session UUID, client name, shoot location, target shot count, completed shot count, shot checklist items.

### 7. Cryptographic Licensing Domain ([`licenseService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/licenseService.ts))
- **State:** `StoredLicenseSession` holding HMAC-SHA256 entitlement token, masked key (`CGP-LIFE-****-8F2A`), expiration date, offline grace threshold (`offlineUntil`).

---

## 3. Shutter Concurrency Mutex

To prevent data corruption, double exposures, or MediaRecorder crashes during rapid shutter taps:
```typescript
const [isCapturing, setIsCapturing] = useState(false);

const handleTriggerShutter = useCallback(async () => {
  if (isCapturing) return; // Mutex lock
  setIsCapturing(true);

  try {
    if (proSettings.captureMode === 'photo') {
      await capturePhoto();
    } else {
      await toggleVideoRecording();
    }
  } finally {
    setIsCapturing(false);
  }
}, [isCapturing, proSettings.captureMode]);
```

---

## 4. Why No External State Library (Redux / Zustand)?

1. **Deterministic Latency:** Zero abstraction overhead or middleware dispatch pipelines in the 60 FPS camera preview loop.
2. **Memory Footprint:** Avoids duplicate object cloning on every telemetry frame (VU meter, gyroscopic horizon, timecode ticker).
3. **Subsystem Isolation:** Heavy studio modals (`LookStudioModal`, `PhotoEditorModal`) maintain local editing buffers and commit changes atomically upon user confirmation.
