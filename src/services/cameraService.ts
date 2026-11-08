// Professional Camera Hardware Service & Capabilities Detector

import { hardwareIntelligenceService } from './hardwareIntelligenceService';
import { RecordingWriter } from './recordingWriter';

/** The stream index.html opened at startup, used once and only if it is still a live rear-camera track. */
async function takeEarlyStream(): Promise<MediaStream | null> {
  const holder = window as unknown as { __earlyCam?: Promise<MediaStream | null> };
  const pending = holder.__earlyCam;
  holder.__earlyCam = undefined; // never reuse it a second time
  if (!pending) return null;
  try {
    const s = await pending;
    const track = s?.getVideoTracks()[0];
    if (s && track && track.readyState === 'live') return s;
    s?.getTracks().forEach((t) => t.stop());
  } catch {
    /* fall back to a normal request */
  }
  return null;
}
import { EXPOSURE_TIME_UNIT_SECONDS, focusAtPoint } from './cameraControlService';
import type {
  PhysicalLensRole,
  LensSelectionRequest,
  AutomaticLensSelectionResult,
  ResolutionOption,
} from '../types/hardware';

export type CameraEngineState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'capturing'
  | 'recording'
  | 'stopping'
  | 'error';

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
  // Hardware Intelligence Extensions
  opticalZoomFactor?: number;
  lensRole?: PhysicalLensRole;
  equivalentFocalLengthMm?: number;
  hasHardwareExposureTime?: boolean;
  hasHardwareIso?: boolean;
  minIso?: number;
  maxIso?: number;
  minExposureDurationMs?: number;
  maxExposureDurationMs?: number;
  isFixedFocus?: boolean;
  hasOpticalStabilization?: boolean;
  supportedFps?: number[];
  supportedResolutions?: ResolutionOption[];
}

export interface AvailableCameraDevice {
  deviceId: string;
  label: string;
  facing: 'front' | 'rear' | 'telephoto' | 'ultrawide' | 'unknown';
  role?: PhysicalLensRole;
  opticalZoomFactor?: number;
  equivalentFocalLengthMm?: number;
}

export interface AvailableAudioDevice {
  deviceId: string;
  label: string;
}

export interface AudioMeterLevel {
  leftDb: number;      // -60 dB to 0 dB
  rightDb: number;     // -60 dB to 0 dB
  peakClipping: boolean;
}

export class CameraService {
  private static instance: CameraService;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingWriter: RecordingWriter | null = null;

  // Formal Camera Engine State Machine
  private state: CameraEngineState = 'idle';
  private stateListeners: Set<(state: CameraEngineState) => void> = new Set();
  private static readonly VALID_TRANSITIONS: Record<CameraEngineState, CameraEngineState[]> = {
    idle: ['initializing', 'error'],
    initializing: ['ready', 'error', 'idle'],
    ready: ['capturing', 'recording', 'initializing', 'idle', 'error'],
    capturing: ['ready', 'error'],
    recording: ['stopping', 'error'],
    stopping: ['ready', 'idle', 'error'],
    error: ['initializing', 'idle'],
  };

  private currentStream: MediaStream | null = null;
  private activeVideoElement: HTMLVideoElement | null = null;
  private initAbortController: AbortController | null = null;
  private isAcquiringLock = false;

  public isAcquiring(): boolean {
    return this.isAcquiringLock;
  }

  // Audio Context & Analyser for real-time Blackmagic VU meter
  private audioCtx: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private audioDataArray: Uint8Array | null = null;

  static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  /**
   * Get current state of the camera state machine
   */
  public getState(): CameraEngineState {
    return this.state;
  }

  /**
   * Validate whether a transition is permitted
   */
  public canTransition(targetState: CameraEngineState): boolean {
    const valid = CameraService.VALID_TRANSITIONS[this.state];
    return valid ? valid.includes(targetState) : false;
  }

  /**
   * Transition to a new state and notify all listeners
   */
  public transitionTo(targetState: CameraEngineState): boolean {
    if (this.state === targetState) return true;
    if (!this.canTransition(targetState)) {
      console.warn(`[CameraService] Invalid state transition: ${this.state} -> ${targetState}`);
      return false;
    }

    this.state = targetState;
    for (const listener of this.stateListeners) {
      try {
        listener(targetState);
      } catch (err) {
        console.warn('[CameraService] Error in state listener:', err);
      }
    }
    return true;
  }

  /**
   * Register a state change listener with automatic unsubscribe
   */
  public onStateChange(listener: (state: CameraEngineState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  public getVideoTrack(): MediaStreamTrack | null {
    return this.currentStream?.getVideoTracks()[0] || null;
  }

  /**
   * Full-resolution still from the phone's real still-capture pipeline (ImageCapture.takePhoto), instead of
   * copying a preview video frame. On Android this gives the sensor's full resolution and the camera's own
   * image processing. Returns null whenever it is unavailable, slow, or does not match the preview
   * orientation, so callers fall back to grabbing the preview frame.
   */
  public async takeFullResStill(videoEl: HTMLVideoElement | null, timeoutMs = 4000): Promise<ImageBitmap | null> {
    const track = this.getVideoTrack();
    const ImageCaptureCtor = (globalThis as { ImageCapture?: new (t: MediaStreamTrack) => any }).ImageCapture;
    if (!track || !videoEl || !ImageCaptureCtor || track.readyState !== 'live' || typeof createImageBitmap !== 'function') {
      return null;
    }
    try {
      const capture = new ImageCaptureCtor(track);
      let settings: Record<string, unknown> = { fillLightMode: 'off' };
      try {
        const caps = await capture.getPhotoCapabilities();
        // Ask for the largest size the sensor offers (capped to keep memory sane on phones)
        const w = caps?.imageWidth?.max;
        const h = caps?.imageHeight?.max;
        if (typeof w === 'number' && typeof h === 'number' && Math.max(w, h) <= 8192) {
          settings = { ...settings, imageWidth: w, imageHeight: h };
        }
      } catch {
        // capabilities unavailable: take the default still size
      }
      const blob: Blob = await Promise.race([
        capture.takePhoto(settings),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('takePhoto timeout')), timeoutMs)),
      ]);
      if (!blob || blob.size === 0) return null;
      const bitmap = await createImageBitmap(blob);
      // The still must have the same orientation as the preview, or the centre crop would pick the wrong region
      const previewPortrait = (videoEl.videoHeight || 0) >= (videoEl.videoWidth || 0);
      const stillPortrait = bitmap.height >= bitmap.width;
      if (previewPortrait !== stillPortrait) {
        bitmap.close();
        return null;
      }
      return bitmap;
    } catch (err) {
      console.warn('[CameraService] full-resolution still unavailable, using the preview frame:', err);
      return null;
    }
  }

  /**
   * Acquires camera stream safely with concurrency protection and in-flight cancellation
   */
  public async acquireCameraStream(
    deviceId?: string,
    facingMode: 'user' | 'environment' = 'environment',
    /** Video recording format; when absent the normal 1080p preview is requested. */
    format?: { height: number; fps: number }
  ): Promise<MediaStream> {
    // 1. Cancel any in-flight camera request
    if (this.initAbortController) {
      this.initAbortController.abort();
    }
    this.initAbortController = new AbortController();
    const signal = this.initAbortController.signal;

    // 2. Stop old stream if running before changing state
    this.releaseCurrentStream();

    // 3. Transition state to initializing
    this.transitionTo('initializing');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.transitionTo('error');
      throw new Error('Camera API is not supported in this browser environment.');
    }

    try {
      this.isAcquiringLock = true;
      let stream: MediaStream;

      // The camera that index.html started opening while the app was still loading (default rear camera, 1080p only)
      const early = !deviceId && !format && facingMode === 'environment' ? await takeEarlyStream() : null;
      if (early) {
        stream = early;
      } else
      try {
        const targetH = format?.height ?? 1080;
        const size: MediaTrackConstraints = {
          width: { ideal: Math.round((targetH * 16) / 9) },
          height: { ideal: targetH },
          ...(format ? { frameRate: { ideal: format.fps } } : {}),
        };
        const videoConstraints: MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId }, ...(format ? size : {}) }
          : { facingMode: { ideal: facingMode }, ...size };

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch (primaryErr) {
        console.warn('[CameraService] 1080p constraints rejected, attempting basic facing constraints...', primaryErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        } catch (secondaryErr) {
          console.warn('[CameraService] Facing mode rejected, attempting generic video fallback...', secondaryErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      // If aborted while waiting for hardware, stop tracks immediately and discard
      if (signal.aborted) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('Camera acquisition cancelled by newer request.');
      }

      this.currentStream = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        hardwareIntelligenceService.updateActiveTrackCapabilities(videoTrack);
      }
      this.transitionTo('ready');
      this.isAcquiringLock = false;
      return stream;
    } catch (err) {
      this.isAcquiringLock = false;
      if (!signal.aborted) {
        this.transitionTo('error');
      }
      throw err;
    }
  }

  /**
   * Safely stops and releases all tracks in the active stream
   */
  public releaseCurrentStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.currentStream = null;
    }
    if (this.state !== 'idle' && this.state !== 'error' && this.state !== 'initializing') {
      this.transitionTo('idle');
    }
  }

  /**
   * Safely attaches a stream to an HTMLVideoElement
   */
  public async attachVideo(videoEl: HTMLVideoElement, stream: MediaStream): Promise<void> {
    this.activeVideoElement = videoEl;
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    try {
      await videoEl.play();
    } catch {
      // Autoplay policy or hidden tab
    }
  }

  /**
   * Detaches an HTMLVideoElement without leaving dangling references
   */
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

  /**
   * Capture operation lock (prevents double-tap race conditions)
   */
  public beginCapture(): boolean {
    if (this.state !== 'ready') return false;
    return this.transitionTo('capturing');
  }

  public endCapture(): void {
    if (this.state === 'capturing') {
      this.transitionTo('ready');
    }
  }

  /**
   * App visibility lifecycle hook
   */
  public handleVisibilityChange(isVisible: boolean): void {
    if (!isVisible) {
      if (this.activeVideoElement) {
        try {
          this.activeVideoElement.pause();
        } catch {}
      }
    } else {
      if (this.activeVideoElement && this.currentStream) {
        this.activeVideoElement.play().catch(() => {});
      }
    }
  }

  // Enumerate all microphone devices (Built-in mic, USB / Bluetooth / Lightning mics)
  async enumerateAudioInputs(): Promise<AvailableAudioDevice[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [{ deviceId: 'default', label: 'Default Microphone' }];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      if (mics.length === 0) {
        return [{ deviceId: 'default', label: 'Built-in Microphone' }];
      }
      return mics.map((m, idx) => ({
        deviceId: m.deviceId,
        label: m.label || `Microphone ${idx + 1}`,
      }));
    } catch {
      return [{ deviceId: 'default', label: 'Built-in Microphone' }];
    }
  }

  // Setup Web Audio Analyser for hardware live VU meter
  setupAudioMeter(stream: MediaStream): boolean {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return false;

      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.audioAnalyser = this.audioCtx.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      this.audioAnalyser.smoothingTimeConstant = 0.4;
      this.audioDataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);

      if (this.audioSourceNode) {
        this.audioSourceNode.disconnect();
      }

      this.audioSourceNode = this.audioCtx.createMediaStreamSource(stream);
      this.audioSourceNode.connect(this.audioAnalyser);
      return true;
    } catch (err) {
      console.warn('Audio meter initialization error:', err);
      return false;
    }
  }

  // Get real-time audio levels in dB (-60 dB to 0 dB)
  getLiveAudioLevels(): AudioMeterLevel {
    if (!this.audioAnalyser || !this.audioDataArray) {
      return { leftDb: -60, rightDb: -60, peakClipping: false };
    }

    this.audioAnalyser.getByteTimeDomainData(this.audioDataArray as Uint8Array<ArrayBuffer>);

    let sumSquares = 0;
    let peak = 0;
    const len = this.audioDataArray.length;

    for (let i = 0; i < len; i++) {
      const norm = (this.audioDataArray[i] - 128) / 128;
      const absVal = Math.abs(norm);
      if (absVal > peak) peak = absVal;
      sumSquares += norm * norm;
    }

    const rms = Math.sqrt(sumSquares / len);
    // Convert RMS to decibels
    let db = 20 * Math.log10(Math.max(0.001, rms));
    db = Math.max(-60, Math.min(0, db));

    // Slight stereo variation for realistic dual-channel meter
    const leftDb = db;
    const rightDb = Math.max(-60, Math.min(0, db + (peak > 0.05 ? (Math.random() - 0.5) * 2 : 0)));
    const peakClipping = peak > 0.95;

    return { leftDb, rightDb, peakClipping };
  }

  // Estimate storage time remaining based on bitrate and quota
  async getStorageEstimate(bitrateMbps: number): Promise<{ freeGb: number; remainingMinutes: number }> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 10 * 1024 * 1024 * 1024;
        const usage = estimate.usage || 0;
        const freeBytes = Math.max(0, quota - usage);
        const freeGb = parseFloat((freeBytes / (1024 * 1024 * 1024)).toFixed(1));

        // Bitrate in Bytes per second
        const bytesPerSec = (bitrateMbps * 1000 * 1000) / 8;
        const remainingSeconds = freeBytes / Math.max(1, bytesPerSec);
        const remainingMinutes = Math.floor(remainingSeconds / 60);

        return { freeGb, remainingMinutes };
      }
    } catch {}

    // Fallback default estimation (assuming ~64GB device free space)
    const fallbackGb = 64.0;
    const bytesPerSec = (bitrateMbps * 1000 * 1000) / 8;
    const remainingMinutes = Math.floor((fallbackGb * 1024 * 1024 * 1024) / (bytesPerSec * 60));
    return { freeGb: fallbackGb, remainingMinutes };
  }

  // Calculate standard 180-degree cinema shutter angle
  calculate180DegreeShutter(fps: number): { shutterSpeed: string; shutterAngle: number } {
    const denom = Math.round(fps * 2);
    // Standard cinema shutter speed denominators
    let nearest = `1/${denom}`;
    if (denom >= 46 && denom <= 50) nearest = '1/50';
    else if (denom >= 58 && denom <= 62) nearest = '1/60';
    else if (denom >= 118 && denom <= 122) nearest = '1/120';
    else if (denom >= 238 && denom <= 242) nearest = '1/240';

    return { shutterSpeed: nearest, shutterAngle: 180.0 };
  }

  // Format professional cinema timecode HH:MM:SS:FF
  formatTimecode(elapsedSeconds: number, fps: number, mode: 'record_run' | 'time_of_day'): string {
    if (mode === 'time_of_day') {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const frames = Math.floor((now.getMilliseconds() / 1000) * fps);
      const f = String(frames).padStart(2, '0');
      return `${h}:${m}:${s}:${f}`;
    }

    // Record Run
    const totalFrames = Math.floor(elapsedSeconds * fps);
    const f = String(totalFrames % Math.round(fps)).padStart(2, '0');
    const totalSeconds = Math.floor(elapsedSeconds);
    const s = String(totalSeconds % 60).padStart(2, '0');
    const m = String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0');
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    return `${h}:${m}:${s}:${f}`;
  }

  // Test supported video codecs on this device
  getSupportedCodecs(): { h264: boolean; h265: boolean; prores: boolean; vp9: boolean } {
    if (typeof MediaRecorder === 'undefined') {
      return { h264: true, h265: false, prores: false, vp9: true };
    }
    return {
      h264: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') || MediaRecorder.isTypeSupported('video/webm;codecs=h264'),
      h265: MediaRecorder.isTypeSupported('video/mp4;codecs=hevc') || MediaRecorder.isTypeSupported('video/mp4;codecs=hvc1'),
      prores: MediaRecorder.isTypeSupported('video/quicktime;codecs=apch') || MediaRecorder.isTypeSupported('video/mp4;codecs=prores'),
      vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
    };
  }

  /** The container/codec the recorder will really produce for a requested codec on this device. */
  resolveRecordingCodec(requested?: string): { mime: string; label: string; honoured: boolean } {
    const ok = (m: string) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m);
    // AAC audio (not the browser's default Opus) so the sound plays in every gallery and player, not just in browsers
    if (requested === 'h264' && ok('video/mp4;codecs=avc1,mp4a.40.2')) return { mime: 'video/mp4;codecs=avc1,mp4a.40.2', label: 'H.264', honoured: true };
    if (requested === 'h264' && ok('video/mp4;codecs=avc1')) return { mime: 'video/mp4;codecs=avc1', label: 'H.264', honoured: true };
    if ((requested === 'h265' || requested === 'hevc') && ok('video/mp4;codecs=hevc')) return { mime: 'video/mp4;codecs=hevc', label: 'HEVC', honoured: true };
    if (ok('video/webm;codecs=vp9')) return { mime: 'video/webm;codecs=vp9', label: 'VP9', honoured: requested === 'vp9' };
    if (ok('video/webm')) return { mime: 'video/webm', label: 'WebM', honoured: false };
    return { mime: 'video/mp4', label: 'MP4', honoured: false };
  }

  // Enumerate all physical lenses on modern mobile phones (Telephoto, Ultra-wide, Wide)
  async enumerateAvailableLenses(): Promise<AvailableCameraDevice[]> {
    try {
      const report = await hardwareIntelligenceService.scanHardware();
      return report.allCameras.map((c) => ({
        deviceId: c.deviceId,
        label: c.label,
        facing: (c.facing === 'front'
          ? 'front'
          : c.role === 'ultrawide'
          ? 'ultrawide'
          : c.role === 'telephoto' || c.role === 'periscope'
          ? 'telephoto'
          : 'rear') as AvailableCameraDevice['facing'],
        role: c.role,
        opticalZoomFactor: c.opticalZoomFactor,
        equivalentFocalLengthMm: c.equivalentFocalLengthMm,
      }));
    } catch (err) {
      console.warn('Could not enumerate video devices via hardware intelligence:', err);
      return [];
    }
  }

  // Intelligent Camera & Lens Selection
  selectBestPhysicalLens(request: LensSelectionRequest): AutomaticLensSelectionResult {
    return hardwareIntelligenceService.selectBestLensForRequest(request);
  }

  // Detect detailed camera capabilities from active track
  inspectCapabilities(track: MediaStreamTrack): HardwareCapabilities {
    hardwareIntelligenceService.updateActiveTrackCapabilities(track);
    const profile = hardwareIntelligenceService.getActiveProfile();
    const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
    const settings = (track.getSettings ? track.getSettings() : {}) as any;

    return {
      hasCamera: true,
      canZoom: !!caps.zoom,
      minZoom: caps.zoom ? caps.zoom.min : 1.0,
      maxZoom: caps.zoom ? caps.zoom.max : 5.0,
      stepZoom: caps.zoom ? caps.zoom.step : 0.1,
      canTorch: caps.torch !== undefined ? !!caps.torch : settings.facingMode !== 'user',
      canFocusMode: !!caps.focusMode,
      supportedFocusModes: caps.focusMode || ['continuous', 'auto'],
      canExposureCompensation: !!caps.exposureCompensation,
      minExposureComp: caps.exposureCompensation ? caps.exposureCompensation.min : -3.0,
      maxExposureComp: caps.exposureCompensation ? caps.exposureCompensation.max : 3.0,
      stepExposureComp: caps.exposureCompensation ? caps.exposureCompensation.step : 0.1,
      canWhiteBalance: !!caps.whiteBalanceMode,
      supportedWhiteBalanceModes: caps.whiteBalanceMode || ['continuous', 'manual'],
      canFrameRate: !!caps.frameRate,
      minFrameRate: caps.frameRate ? caps.frameRate.min : 24,
      maxFrameRate: caps.frameRate ? caps.frameRate.max : 60,
      aspectRatio: settings.aspectRatio || 16 / 9,
      facingMode: settings.facingMode === 'user' ? 'user' : 'environment',
      deviceId: settings.deviceId || '',
      opticalZoomFactor: profile?.opticalZoomFactor ?? 1.0,
      lensRole: profile?.role ?? (settings.facingMode === 'user' ? 'front_wide' : 'wide'),
      equivalentFocalLengthMm: profile?.equivalentFocalLengthMm,
      hasHardwareExposureTime: !!caps.exposureTime,
      hasHardwareIso: !!caps.iso,
      minIso: caps.iso ? caps.iso.min : 50,
      maxIso: caps.iso ? caps.iso.max : 6400,
      minExposureDurationMs: caps.exposureTime ? caps.exposureTime.min * EXPOSURE_TIME_UNIT_SECONDS * 1000 : 0.125,
      maxExposureDurationMs: caps.exposureTime ? caps.exposureTime.max * EXPOSURE_TIME_UNIT_SECONDS * 1000 : 1000,
      isFixedFocus: profile?.focus.isFixedFocus ?? false,
      hasOpticalStabilization: profile?.hasOpticalStabilization ?? false,
      supportedFps: profile?.frameRate.supportedFps ?? [24, 30, 60],
      supportedResolutions: profile?.supportedResolutions,
    };
  }

  /** Hardware zoom range of the active track, or null when the device/browser exposes none. */
  getZoomRange(stream: MediaStream | null): { min: number; max: number } | null {
    const track = stream?.getVideoTracks()[0];
    const caps = (track && track.getCapabilities ? track.getCapabilities() : {}) as { zoom?: { min: number; max: number } };
    return caps.zoom ? { min: caps.zoom.min, max: caps.zoom.max } : null;
  }

  // Apply real hardware optical/digital zoom
  async applyHardwareZoom(stream: MediaStream | null, targetZoom: number): Promise<boolean> {
    if (!stream) return false;
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
    if (caps.zoom) {
      const clamped = Math.min(caps.zoom.max, Math.max(caps.zoom.min, targetZoom));
      try {
        await (track as any).applyConstraints({
          advanced: [{ zoom: clamped }],
        });
        return true;
      } catch (err) {
        console.warn('Hardware zoom application error:', err);
      }
    }
    return false;
  }

  // Apply real hardware Exposure Compensation
  async applyHardwareEV(stream: MediaStream | null, ev: number): Promise<boolean> {
    if (!stream) return false;
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
    if (caps.exposureCompensation) {
      const clamped = Math.min(caps.exposureCompensation.max, Math.max(caps.exposureCompensation.min, ev));
      try {
        await (track as any).applyConstraints({
          advanced: [{ exposureCompensation: clamped }],
        });
        return true;
      } catch (err) {
        console.warn('Hardware EV application error:', err);
      }
    }
    return false;
  }

  // Tap-to-focus: focus once at the point (never switches the camera to manual focus)
  async applyTapToFocus(stream: MediaStream | null, normX: number, normY: number): Promise<boolean> {
    return focusAtPoint(stream?.getVideoTracks()[0], normX, normY);
  }
  // Real Video Recording with MediaRecorder & custom Blackmagic Bitrate/Codec
  startVideoRecording(
    stream: MediaStream,
    options?: {
      codec?: string;
      bitrate?: 'low' | 'medium' | 'high' | 'maximum';
    }
  ): boolean {
    if (typeof MediaRecorder === 'undefined' || !stream) return false;

    this.recordedChunks = [];
    const mimeType = this.resolveRecordingCodec(options?.codec).mime;
    // Native: stream chunks to a file as they arrive instead of holding the whole clip in memory
    this.recordingWriter = RecordingWriter.available() ? new RecordingWriter(mimeType.includes('mp4') ? 'mp4' : 'webm') : null;
    const onChunk = (data: Blob) => {
      if (this.recordingWriter) this.recordingWriter.write(data);
      else this.recordedChunks.push(data);
    };

    // Bitrate calculation
    let videoBitsPerSecond = 25_000_000; // 25 Mbps default
    if (options?.bitrate === 'low') videoBitsPerSecond = 10_000_000;
    else if (options?.bitrate === 'medium') videoBitsPerSecond = 25_000_000;
    else if (options?.bitrate === 'high') videoBitsPerSecond = 50_000_000;
    else if (options?.bitrate === 'maximum') videoBitsPerSecond = 100_000_000;

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
        audioBitsPerSecond: 320_000,
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) onChunk(e.data);
      };
      this.mediaRecorder.start(1000);
      if (this.state === 'ready') {
        this.transitionTo('recording');
      }
      return true;
    } catch (err) {
      console.warn('Failed to start MediaRecorder with options, trying fallback:', err);
      try {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) onChunk(e.data);
        };
        this.mediaRecorder.start(1000);
        if (this.state === 'ready') {
          this.transitionTo('recording');
        }
        return true;
      } catch {
        return false;
      }
    }
  }

  stopVideoRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not active'));
        return;
      }

      this.transitionTo('stopping');

      this.mediaRecorder.onstop = async () => {
        try {
          const mime = this.mediaRecorder?.mimeType || 'video/webm';
          this.mediaRecorder = null;
          const writer = this.recordingWriter;
          this.recordingWriter = null;
          let videoUrl: string;
          const written = writer ? await writer.finish() : null;
          if (writer && written && !writer.failed) {
            // The whole clip is already on disk; hand back its served file URL (nothing large in memory)
            videoUrl = written.url;
          } else {
            // In-memory path (web, or the disk write failed part-way): rebuild what we have
            const parts: Blob[] = [];
            if (written) {
              try {
                parts.push(await (await fetch(written.url)).blob());
              } catch {}
            }
            parts.push(...(writer ? writer.memoryChunks : this.recordedChunks));
            videoUrl = URL.createObjectURL(new Blob(parts, { type: mime }));
          }
          this.recordedChunks = [];
          this.transitionTo('ready');
          resolve(videoUrl);
        } catch (err) {
          this.transitionTo('ready');
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cleanupAudioMeter(): void {
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect();
      } catch {}
      this.audioSourceNode = null;
    }
    if (this.audioAnalyser) {
      try {
        this.audioAnalyser.disconnect();
      } catch {}
      this.audioAnalyser = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close().catch(() => {});
      } catch {}
      this.audioCtx = null;
    }
    this.audioDataArray = null;
  }

  dispose(): void {
    this.releaseCurrentStream();
    this.detachVideo();
    this.cleanupAudioMeter();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }
    this.recordedChunks = [];
    this.stateListeners.clear();
    this.transitionTo('idle');
  }
}

export const cameraService = CameraService.getInstance();
