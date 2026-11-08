import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Native Camera2 capture (Android only): RAW/DNG, multi-frame HDR and night stacking, and a real
 * capability report. The WebView holds the camera while the preview runs, so callers must release the
 * web camera first and re-open it afterwards (see App's withNativeCamera).
 */

export interface NativeCameraInfo {
  id: string;
  facing: 'front' | 'back' | 'external' | 'unknown';
  hardwareLevel: string;
  raw: boolean;
  manualSensor: boolean;
  burstCapture: boolean;
  backwardCompatible: boolean;
  sensorOrientation: number;
  /** Optics as the camera reports them; absent when the phone does not report them. */
  focalLengthMm?: number;
  sensorWidthMm?: number;
  sensorHeightMm?: number;
  /** 35 mm-equivalent focal length computed from the real focal length and sensor size. */
  equivalentMm?: number;
  aperture?: number;
  ois?: boolean;
  /** The camera hardware offers electronic video stabilization (the web camera cannot switch it on). */
  eis?: boolean;
  hasFlash?: boolean;
  autofocus?: boolean;
  isoMin?: number;
  isoMax?: number;
  exposureMinNs?: number;
  exposureMaxNs?: number;
  maxDigitalZoom: number;
  jpegWidth?: number;
  jpegHeight?: number;
  /** Largest JPEG sizes Android offers this app for the camera, biggest first. */
  jpegSizes?: string[];
  rawWidth?: number;
  rawHeight?: number;
  videoSizes?: { width: number; height: number; maxFps: number }[];
  highSpeedMaxFps?: number;
  maxPreviewFps?: number;
}

export interface NativeCapabilities {
  cameras: NativeCameraInfo[];
  hevcEncoder: boolean;
  heicEncoder: boolean;
  androidSdk: number;
}

export interface NativeRawResult {
  success: boolean;
  dngUri: string;
  jpegUri: string;
  fileName: string;
  rawWidth: number;
  rawHeight: number;
  /** Size the JPEG stream was configured for, and the size Android actually delivered. */
  jpegRequestedWidth?: number;
  jpegRequestedHeight?: number;
  jpegWidth?: number;
  jpegHeight?: number;
  cameraId?: string;
  jpegBase64: string;
}

export interface NativeStackResult {
  success: boolean;
  mode: 'hdr' | 'night';
  fileName: string;
  uri: string;
  width: number;
  height: number;
  framesCaptured: number;
  framesUsed: number;
  manualExposure: boolean;
  jpegBase64: string;
}

interface NativeCameraPluginApi {
  getCapabilities(): Promise<NativeCapabilities>;
  captureRaw(options: { facing: 'front' | 'back' }): Promise<NativeRawResult>;
  captureStack(options: { mode: 'hdr' | 'night'; facing: 'front' | 'back'; frames?: number }): Promise<NativeStackResult>;
  startHighSpeed(options: { facing: 'front' | 'back' }): Promise<{ success: boolean; width: number; height: number; fps: number }>;
  stopHighSpeed(): Promise<{ success: boolean; path: string; width: number; height: number; fps: number; durationMs: number; bytes: number }>;
}

const NativeCamera = registerPlugin<NativeCameraPluginApi>('NativeCamera');

export const isNativeCameraPlatform = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/** What this device can really do for the selected camera. */
export interface StillSupport {
  /** True once the capability report has been read. */
  known: boolean;
  raw: boolean;
  hdr: boolean;
  night: boolean;
  /** HEIF needs an HEVC/HEIC encoder AND a writer; not implemented yet, so never offered. */
  heif: boolean;
  heifReason: string;
  /** Max frames per second the camera can deliver for video (0 if unknown). */
  maxVideoFps: number;
  highSpeedMaxFps: number;
}

export const NO_STILL_SUPPORT: StillSupport = {
  known: false,
  raw: false,
  hdr: false,
  night: false,
  heif: false,
  heifReason: 'HEIF is not available',
  maxVideoFps: 0,
  highSpeedMaxFps: 0,
};

/** The camera Camera2 will actually use for a facing: the one with the largest JPEG, like the plugin picks. */
export function pickNativeCamera(caps: NativeCapabilities | null, facing: 'front' | 'back'): NativeCameraInfo | null {
  if (!caps) return null;
  let best: NativeCameraInfo | null = null;
  let bestArea = -1;
  for (const c of caps.cameras) {
    if (c.facing !== facing || !c.backwardCompatible) continue;
    const area = (c.jpegWidth ?? 0) * (c.jpegHeight ?? 0);
    if (area > bestArea) {
      bestArea = area;
      best = c;
    }
  }
  return best;
}

export function stillSupportFor(caps: NativeCapabilities | null, facing: 'front' | 'back'): StillSupport {
  const cam = pickNativeCamera(caps, facing);
  if (!caps || !cam) return NO_STILL_SUPPORT;
  const maxVideoFps = Math.max(0, ...(cam.videoSizes ?? []).map((v) => v.maxFps));
  return {
    known: true,
    raw: cam.raw,
    // Stacking needs several frames in quick succession and controllable exposure
    hdr: cam.burstCapture || cam.manualSensor,
    night: cam.burstCapture || cam.manualSensor,
    heif: false,
    heifReason: caps.hevcEncoder || caps.heicEncoder ? 'HEIF saving is not built into this app yet' : 'This phone has no HEIF/HEVC encoder',
    maxVideoFps,
    highSpeedMaxFps: cam.highSpeedMaxFps ?? 0,
  };
}

let capsPromise: Promise<NativeCapabilities | null> | null = null;

export function loadNativeCapabilities(): Promise<NativeCapabilities | null> {
  if (!isNativeCameraPlatform()) return Promise.resolve(null);
  if (!capsPromise) {
    capsPromise = NativeCamera.getCapabilities().then((caps) => {
      for (const c of caps.cameras) {
        console.warn(
          `[NativeCamera] camera ${c.id} ${c.facing} ${c.hardwareLevel} raw=${c.raw} burst=${c.burstCapture} manual=${c.manualSensor} ` +
            `jpegSizes=${(c.jpegSizes ?? []).join(',')} raw=${c.rawWidth}x${c.rawHeight} highSpeed=${c.highSpeedMaxFps} ` +
            `video=${(c.videoSizes ?? []).map((v) => `${v.width}x${v.height}@${v.maxFps}`).join(',')} ` +
            `focal=${c.focalLengthMm}mm sensor=${c.sensorWidthMm}x${c.sensorHeightMm}mm equiv=${c.equivalentMm}mm ` +
            `f/${c.aperture} ois=${c.ois} flash=${c.hasFlash} af=${c.autofocus}`
        );
      }
      console.warn(`[NativeCamera] hevcEncoder=${caps.hevcEncoder} heicEncoder=${caps.heicEncoder} sdk=${caps.androidSdk}`);
      return caps;
    }).catch((err) => {
      console.warn('[NativeCamera] capabilities unavailable:', err);
      capsPromise = null;
      return null;
    });
  }
  return capsPromise;
}

/** Reads the camera hardware details again (used on every camera switch and when the app returns to the front). */
export function refreshNativeCapabilities(): Promise<NativeCapabilities | null> {
  capsPromise = null;
  return loadNativeCapabilities();
}

export const nativeCapture = {
  raw: (facing: 'front' | 'back') => NativeCamera.captureRaw({ facing }),
  stack: (mode: 'hdr' | 'night', facing: 'front' | 'back', frames?: number) =>
    NativeCamera.captureStack({ mode, facing, frames }),
  startHighSpeed: (facing: 'front' | 'back') => NativeCamera.startHighSpeed({ facing }),
  stopHighSpeed: () => NativeCamera.stopHighSpeed(),
};
