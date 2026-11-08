/**
 * Typed bridge to the native film camera (android/.../NativeFilmCameraPlugin.java).
 *
 * The native side owns the camera while it runs: Camera2 -> GPU film shader -> a view behind the transparent WebView.
 * Camera frames never cross the JS bridge. Only small control messages (profile, EV, zoom ...) and the path of a
 * saved still do. Every value reported back is what the camera actually accepted, not what was requested.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { CameraProfile } from '../utils/cameraProfile';

export interface NativeFilmInfo {
  state: string;
  /** Camera buffer used for the live preview, e.g. "1920x1440". */
  previewBuffer: string;
  /** Size of the still the camera will deliver, e.g. "3264x2448". */
  stillSize: string;
  fpsRange: string;
  /** Exposure compensation limits in camera steps; multiply by evStep for stops. */
  evMin: number;
  evMax: number;
  evStep: number;
  zoomMax: number;
  hasFlash: boolean;
  /** Hardware white-balance presets this camera lists. */
  awbModes: string[];
}

export interface NativeFilmStats {
  state: string;
  error?: string;
  previewBuffer?: string;
  surface?: string;
  renderFps?: number;
  cameraFps?: number;
  avgRenderMs?: number;
  maxRenderMs?: number;
  framesRendered?: number;
  cameraFrames?: number;
  droppedCameraFrames?: number;
}

export interface NativeStill {
  path: string;
  bytes: number;
  width: number;
  height: number;
  evStops: number;
  zoom: number;
}

export interface NativeRecording {
  path: string;
  width: number;
  height: number;
  frames: number;
  durationMs: number;
  /** Measured: (frames - 1) / time between first and last encoded frame. */
  avgFps: number;
  bytes: number;
  /** False when the microphone was unavailable: the file then has no audio track. */
  audio: boolean;
  audioNote: string;
  videoEncoder: string;
  audioEncoder: string;
}

export interface NativeFilmStartOptions {
  facing: 'back' | 'front';
  /** CSS px of the preview area, relative to the WebView. */
  x: number;
  y: number;
  width: number;
  height: number;
  profile: CameraProfile | null;
  /** Long/short side ratio of the viewfinder frame: the camera then picks the still size of that shape (16:9, 1:1, ...). */
  stillRatio?: number;
}

interface NativeFilmPluginApi {
  start(o: NativeFilmStartOptions): Promise<NativeFilmInfo>;
  stop(): Promise<void>;
  setProfile(o: { profile: CameraProfile | null }): Promise<void>;
  takePhoto(): Promise<NativeStill>;
  setEv(o: { stops: number }): Promise<{ evStops: number }>;
  setZoom(o: { ratio: number }): Promise<{ zoom: number }>;
  setTorch(o: { on: boolean }): Promise<void>;
  setWhiteBalance(o: { mode: string }): Promise<void>;
  getStats(): Promise<NativeFilmStats>;
  startRecording(o: { audio: boolean; height: number }): Promise<{ path: string; width: number; height: number }>;
  stopRecording(): Promise<NativeRecording>;
  addListener(event: 'interrupted', cb: () => void): Promise<{ remove: () => Promise<void> }>;
}

const Plugin = registerPlugin<NativeFilmPluginApi>('NativeFilmCamera');

/** True only inside the Android app, where the plugin exists. Never true in a browser or on iOS. */
export const isNativeFilmSupported = (): boolean => Capacitor.getPlatform() === 'android';

export const nativeFilm = {
  start: (o: NativeFilmStartOptions) => Plugin.start(o),
  stop: () => Plugin.stop(),
  setProfile: (profile: CameraProfile | null) => Plugin.setProfile({ profile }),
  takePhoto: () => Plugin.takePhoto(),
  setEv: (stops: number) => Plugin.setEv({ stops }),
  setZoom: (ratio: number) => Plugin.setZoom({ ratio }),
  setTorch: (on: boolean) => Plugin.setTorch({ on }),
  setWhiteBalance: (mode: string) => Plugin.setWhiteBalance({ mode }),
  getStats: () => Plugin.getStats(),
  startRecording: (audio: boolean, height: number) => Plugin.startRecording({ audio, height }),
  stopRecording: () => Plugin.stopRecording(),
  onInterrupted: (cb: () => void) => Plugin.addListener('interrupted', cb),
};

/**
 * Height of the recorded frame (3:4, so 960 = 720x960). Measured on the test phone with the film look on: 1440 (1080x1440)
 * only reached ~16 fps, 960 held 29.5 fps, so 960 is the default. See docs/PHASE3_REPORT.md.
 */
export const NATIVE_RECORD_HEIGHT = 960;

/** A saved recording as a blob URL, the form the in-app gallery and the device-save helper already work with. */
export async function nativeRecordingToBlobUrl(path: string): Promise<string> {
  const res = await fetch(Capacitor.convertFileSrc(`file://${path}`));
  if (!res.ok) throw new Error(`Could not read the recording (${res.status}).`);
  return URL.createObjectURL(await res.blob());
}

/** Loads a still saved by the native camera as a bitmap. EXIF orientation is applied, so it comes out upright. */
export async function nativeStillToBitmap(still: Pick<NativeStill, 'path'>): Promise<ImageBitmap> {
  const res = await fetch(Capacitor.convertFileSrc(`file://${still.path}`));
  if (!res.ok) throw new Error(`Could not read the saved photo (${res.status}).`);
  return createImageBitmap(await res.blob());
}
