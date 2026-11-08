# Camera Engine Architecture & Lifecycle — CineGrid Pro

The camera engine in CineGrid Pro is centralized in [`src/services/cameraService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts) and orchestrated by [`src/components/Viewfinder.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/Viewfinder.tsx). It is governed by a formal 7-state finite state machine engineered to prevent race conditions, stream leaks, and UI freezes.

---

## 1. Formal 7-State Finite State Machine

```
   ┌─────────┐      acquireCameraStream()       ┌──────────────┐
   │  IDLE   ├─────────────────────────────────►│ INITIALIZING │
   └────▲────┘                                  └──────┬───────┘
        │                                              │ Hardware stream ready
        │ releaseCurrentStream()                       ▼
   ┌────┴────┐         beginCapture()           ┌──────────────┐
   │  ERROR  │◄─────────────────────────────────┤    READY     │
   └─────────┘                                  └───┬──────▲───┘
                                                    │      │
                          startVideoRecording()     │      │ endCapture()
                                 ┌──────────────────┘      │
                                 ▼                         │
                          ┌─────────────┐           ┌──────┴─────┐
                          │  RECORDING  │           │ CAPTURING  │
                          └──────┬──────┘           └────────────┘
                                 │ stopVideoRecording()
                                 ▼
                          ┌─────────────┐
                          │  STOPPING   ├───────────► (READY)
                          └─────────────┘
```

### Valid Transition Matrix

```ts
const VALID_TRANSITIONS: Record<CameraEngineState, CameraEngineState[]> = {
  idle: ['initializing', 'error'],
  initializing: ['ready', 'error', 'idle'],
  ready: ['capturing', 'recording', 'initializing', 'idle', 'error'],
  capturing: ['ready', 'error'],
  recording: ['stopping', 'error'],
  stopping: ['ready', 'idle', 'error'],
  error: ['initializing', 'idle'],
};
```

Any attempt to execute an out-of-sequence transition (such as jumping from `idle` directly to `capturing` or starting a capture while `recording`) is intercepted and rejected by `canTransition()`, guaranteeing that camera resources cannot be driven into an invalid state.

---

## 2. Stream Acquisition & Concurrency Protection

When switching lenses, flipping cameras, or requesting hardware access, rapid consecutive calls can result in race conditions where an older request completes after a newer one.

CineGrid Pro prevents this using **In-Flight Cancellation (`AbortController`)**:

```ts
public async acquireCameraStream(
  deviceId?: string,
  facingMode: 'user' | 'environment' = 'environment'
): Promise<MediaStream> {
  // 1. Abort any previous in-flight camera request
  if (this.initAbortController) {
    this.initAbortController.abort();
  }
  this.initAbortController = new AbortController();
  const signal = this.initAbortController.signal;

  // 2. Transition state
  this.transitionTo('initializing');

  // 3. Stop old tracks cleanly before opening new hardware channels
  this.releaseCurrentStream();

  const videoConstraints: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });

    // If aborted while waiting for hardware, discard stream immediately
    if (signal.aborted) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('Camera acquisition cancelled by newer request.');
    }

    this.currentStream = stream;
    this.transitionTo('ready');
    return stream;
  } catch (err) {
    if (!signal.aborted) {
      this.transitionTo('error');
    }
    throw err;
  }
}
```

---

## 3. Safe Video Element Attachment & Detachment

Dangling `HTMLVideoElement.srcObject` references cause memory leaks and prevent mobile browser engines from garbage-collecting hardware decode buffers.

CineGrid Pro enforces explicit attachment and detachment:

```ts
public async attachVideo(videoEl: HTMLVideoElement, stream: MediaStream): Promise<void> {
  this.activeVideoElement = videoEl;
  if (videoEl.srcObject !== stream) {
    videoEl.srcObject = stream;
  }
  try {
    await videoEl.play();
  } catch {
    // Handled autoplay restrictions or background tab
  }
}

public detachVideo(videoEl?: HTMLVideoElement | null): void {
  const el = videoEl || this.activeVideoElement;
  if (el) {
    try {
      el.pause();
      el.srcObject = null;
    } catch {}
  }
  if (el === this.activeVideoElement) {
    this.activeVideoElement = null;
  }
}
```

---

## 4. App Lifecycle & Visibility Management

When mobile apps are sent to the background or desktop browser tabs are minimized, continuous video rendering wastes GPU cycles and drains device battery.

`CameraService.handleVisibilityChange(isVisible: boolean)` coordinates with the W3C `visibilitychange` event:

```ts
public handleVisibilityChange(isVisible: boolean): void {
  if (!isVisible) {
    // App backgrounded: pause video playback to conserve GPU/battery
    if (this.activeVideoElement) {
      try {
        this.activeVideoElement.pause();
      } catch {}
    }
  } else {
    // App foregrounded: resume video playback
    if (this.activeVideoElement && this.currentStream) {
      this.activeVideoElement.play().catch(() => {});
    }
  }
}
```

---

## 5. Front & Rear Camera Switching & Lens Enumeration

1. **Lens Enumeration (`enumerateAvailableLenses`):**
   - Queries `navigator.mediaDevices.enumerateDevices()`.
   - Filters `videoinput` devices and inspects device labels to categorize physical lenses:
     - `front`: Self-facing cameras
     - `telephoto`: 2x, 3x, or zoom lenses
     - `ultrawide`: 0.5x or ultra-wide lenses
     - `rear`: Standard primary wide sensors
2. **Camera Switching (`handleSwitchCamera`):**
   - Toggles `isFrontCamera` state between `'user'` and `'environment'`.
   - Triggers `acquireCameraStream()` with the new facing mode constraint.
   - When front camera is active, applies CSS `scaleX(-1)` mirroring to the live preview while keeping composition grids unmirrored.

---

## 6. Photo Capture & Shutter Mutex Locking

To prevent race conditions caused by rapid double-tapping the shutter button:

```ts
public beginCapture(): boolean {
  if (this.state !== 'ready') return false;
  return this.transitionTo('capturing');
}

public endCapture(): void {
  if (this.state === 'capturing') {
    this.transitionTo('ready');
  }
}
```

In [`src/App.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/App.tsx):
```ts
const performCapture = async () => {
  if (isCapturing) return;
  if (!cameraService.beginCapture()) return;

  setIsCapturing(true);
  try {
    // Single, burst, or bracket capture logic
  } finally {
    cameraService.endCapture();
    setIsCapturing(false);
  }
};
```

---

## 7. Error Handling & Simulated Scene Fallback

If camera permissions are denied by the operating system, if no physical webcam exists, or if another application holds an exclusive lock on the camera sensor:
1. `acquireCameraStream` catches the error and transitions to `'error'`.
2. `App.tsx` catches the failure without crashing.
3. Automatically sets `useSimulatedScene = true`, mounting high-resolution pre-seeded architectural and portrait scenes (`FALLBACK_SCENES`).
4. All camera controls, composition grids, WebGL 3D LUT shaders, exposure sliders, and photo editors continue to function seamlessly, allowing complete application testing and review even without live hardware.
5. A "Retry Camera" button is provided in the viewfinder for one-click hardware re-connection once permissions are granted.
