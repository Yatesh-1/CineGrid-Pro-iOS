# TypeScript API Reference

This document outlines the public interfaces, methods, parameters, and return types for CineGrid Pro's core singleton services and processing utilities.

---

## 1. `CameraService` ([`src/services/cameraService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts))

Singleton managing hardware acquisition, stream lifecycles, and track capabilities.

```typescript
export class CameraService {
  static getInstance(): CameraService;

  // Lifecycle & State
  getState(): CameraEngineState; // 'idle' | 'requesting_permission' | 'initializing' | 'running' | 'switching_facing' | 'error' | 'terminated'
  isAcquiring(): boolean; // Concurrency lock status
  startCamera(facingMode?: 'user' | 'environment', deviceId?: string): Promise<MediaStream | null>;
  stopCamera(): Promise<void>;
  switchCameraFacing(): Promise<'user' | 'environment'>;

  // Stream & Hardware
  getCurrentStream(): MediaStream | null;
  getCurrentFacing(): 'user' | 'environment';
  getAvailableCameras(): Promise<AvailableCameraDevice[]>;
  getVideoTrack(): MediaStreamTrack | null;
  getCapabilities(): MediaTrackCapabilities | null;
  getSettings(): MediaTrackSettings | null;

  // Controls
  applyTorch(enabled: boolean): Promise<boolean>;
  applyZoom(zoomLevel: number): Promise<boolean>;
  applyManualExposure(iso?: number, shutterSpeedMs?: number): Promise<boolean>;
  applyFocusMode(mode: 'continuous' | 'manual', distance?: number): Promise<boolean>;
  applyWhiteBalance(temperatureKelvin: number): Promise<boolean>;
}
```

---

## 2. `ResourceManager` ([`src/services/resourceManager.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/resourceManager.ts))

Application-wide resource audit and disposal coordinator.

```typescript
export class ResourceManager {
  static getInstance(): ResourceManager;

  getMemoryProfile(): DeviceMemoryProfile;
  isTerminating(): boolean;

  // Resource Registration & Scoped Release
  register(
    id: string,
    type: ManagedResourceType,
    ownerId: string,
    resource: unknown,
    dispose: () => void | Promise<void>
  ): string;
  release(id: string): void;
  releaseByOwner(ownerId: string): void;
  releaseByType(type: ManagedResourceType): void;
  cleanupAll(): void;

  // Managed Object URLs
  createManagedObjectURL(blob: Blob, ownerId: string): string;
  revokeManagedObjectURL(url: string): void;

  // Managed Timers & Listeners
  registerTimer(id: string, ownerId: string, timerHandle: number, isInterval?: boolean): string;
  registerEventListener(
    target: EventTarget,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    ownerId: string,
    options?: boolean | AddEventListenerOptions
  ): string;
}
```

---

## 3. `MediaStorageService` ([`src/services/mediaStorageService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/mediaStorageService.ts))

Binary-isolated IndexedDB storage and LRU object URL cache.

```typescript
export class MediaStorageService {
  static getInstance(): MediaStorageService;

  init(): Promise<void>;
  dataUrlToBlob(dataUrl: string): Blob;
  savePhoto(photo: CapturedPhoto): Promise<void>;
  getPhotoObjectUrl(photoId: string, fallbackDataUrl?: string): Promise<string>;
  deletePhoto(photoId: string): Promise<void>;
}
```

---

## 4. `LutStorageService` ([`src/services/lutStorageService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/lutStorageService.ts))

Storage coordinator for custom `.cube` definitions and user look presets.

```typescript
export class LutStorageService {
  static getInstance(): LutStorageService;

  init(): Promise<void>;
  getAllLuts(): LutDefinition[];
  getImportedLuts(): LutDefinition[];
  saveImportedLut(lut: LutDefinition, rawCubeText: string): Promise<void>;
  deleteImportedLut(lutId: string): Promise<void>;
  toggleFavorite(lutId: string): void;
  isFavorite(lutId: string): boolean;

  // User Presets
  getUserPresets(): UserLookPreset[];
  saveUserPreset(preset: UserLookPreset): void;
  deleteUserPreset(presetId: string): void;
}
```

---

## 5. `SessionService` ([`src/services/sessionService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/sessionService.ts))

Client photography session tracking and checklist engine.

```typescript
export class SessionService {
  static getInstance(): SessionService;

  getActiveSession(): PhotographySession;
  getAllSessions(): PhotographySession[];
  createSession(meta: { clientName: string; location: string; targetShots: number }): PhotographySession;
  setActiveSession(sessionId: string): boolean;
  incrementShotCount(sessionId?: string): void;
  toggleChecklistItem(sessionId: string, itemId: string): void;
  deleteSession(sessionId: string): void;
}
```

---

## 6. `LicenseService` ([`src/services/licenseService.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/licenseService.ts))

Cryptographic HMAC entitlement validation and offline grace engine.

```typescript
export class LicenseService {
  getSession(): StoredLicenseSession | null;
  checkInitialActivation(): Promise<{
    isActivated: boolean;
    session: StoredLicenseSession | null;
    warningMessage?: string;
  }>;
  activateLicenseKey(licenseKey: string): Promise<{
    success: boolean;
    session?: StoredLicenseSession;
    errorMessage?: string;
  }>;
  deactivateLicense(): Promise<{ success: boolean; errorMessage?: string }>;
}
```

---

## 7. `WebGLLutPipeline` ([`src/utils/webglLutPipeline.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/webglLutPipeline.ts))

Zero-allocation GPU color transformation pipeline.

```typescript
export class WebGLLutPipeline {
  constructor(canvas: HTMLCanvasElement);

  init(): boolean;
  isReady(): boolean;
  uploadLutAtlas(lut: LutDefinition): void;
  renderFrame(
    sourceVideo: HTMLVideoElement,
    lutIntensity?: number,
    splitPosition?: number,
    isSplitActive?: boolean
  ): void;
  dispose(): void;
}
```

---

## 8. Cube Parser Async ([`src/utils/cubeParserAsync.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/cubeParserAsync.ts))

Non-blocking background Web Worker parser.

```typescript
export function parseCubeFileAsync(
  rawCubeText: string,
  name: string
): Promise<CubeParseResult>;

export interface CubeParseResult {
  success: boolean;
  lut?: LutDefinition;
  error?: string;
}
```
