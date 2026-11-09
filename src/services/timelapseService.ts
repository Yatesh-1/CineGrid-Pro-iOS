// CineGrid Pro — Time-Lapse Video Engine
// Captures one still every `interval` seconds, then assembles the stills into a video played at the
// output frame rate, so hours of shooting become a short, fast clip (frames / outputFps seconds long).
// Frames are kept as JPEG blobs (bounded) rather than recorded in real time, which would only
// produce a slideshow as long as the shoot itself.

import { resourceManager } from './resourceManager';
import { calibrateExposureLock, calibrateFocusLock, clearExposureLock, clearFocusLock } from './cameraControlService';
import type { TimelapseConfig } from '../types/camera';

export interface TimelapseStatus {
  isRecording: boolean;
  capturedFrames: number;
  realDurationSeconds: number;
  estimatedOutputSeconds: number;
  interval: number;
  batteryWarning?: string;
  storageWarning?: string;
}

/** Upper bound on stored stills so memory stays bounded on a phone (2 minutes of output at 30 fps). */
export const MAX_TIMELAPSE_FRAMES = 3600;
const FRAME_JPEG_QUALITY = 0.9;
/** Shortest clip we assemble, so the encoder always has time to emit data. */
const MIN_CLIP_MS = 1500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class TimelapseService {
  private static instance: TimelapseService;

  private config: TimelapseConfig = {
    interval: 1,
    customIntervalSeconds: 1,
    isRecording: false,
    capturedFrames: 0,
    realDurationSeconds: 0,
    outputFps: 30,
    lockExposure: true,
  };

  private timerHandle: number | null = null;
  private durationTimerHandle: number | null = null;

  private captureCanvas: HTMLCanvasElement | null = null;
  private captureCtx: CanvasRenderingContext2D | null = null;
  private frames: (Blob | null)[] = [];
  private exposureHeld = false;
  private focusHeld = false;
  private heldTrack: MediaStreamTrack | null = null;
  private frameWidth = 0;
  private frameHeight = 0;
  private lastTimelapseUrl: string | null = null;

  public static getInstance(): TimelapseService {
    if (!TimelapseService.instance) {
      TimelapseService.instance = new TimelapseService();
    }
    return TimelapseService.instance;
  }

  public getConfig(): TimelapseConfig {
    return { ...this.config };
  }

  public setConfig(patch: Partial<TimelapseConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  /**
   * Calculate output video duration at selected output frame rate (e.g. 30 FPS)
   */
  public calculateOutputDuration(frames: number, outputFps = 30): number {
    return parseFloat((frames / outputFps).toFixed(1));
  }

  /**
   * Check battery level and disk quota before starting a multi-hour time-lapse
   */
  public async checkDeviceReadiness(): Promise<{
    canProceed: boolean;
    batteryWarning?: string;
    storageWarning?: string;
  }> {
    let batteryWarning: string | undefined;
    let storageWarning: string | undefined;

    // 1. Battery Check
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      try {
        const battery = await (navigator as any).getBattery();
        if (battery.level < 0.2 && !battery.charging) {
          batteryWarning = `Low Battery (${Math.round(battery.level * 100)}%). Connect to a power source for long time-lapses.`;
        }
      } catch {}
    }

    // 2. Storage Check
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const freeBytes = (estimate.quota || 0) - (estimate.usage || 0);
        if (freeBytes < 200 * 1024 * 1024) {
          storageWarning = 'Low Storage (<200 MB remaining). Free up space to prevent recording failure.';
        }
      } catch {}
    }

    return {
      canProceed: !storageWarning,
      batteryWarning,
      storageWarning,
    };
  }

  private clearTimers(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    if (this.durationTimerHandle) {
      clearInterval(this.durationTimerHandle);
      this.durationTimerHandle = null;
    }
  }

  /** Stores the current picture as one JPEG still. The slot is reserved first so order is kept. */
  private grabFrame(videoEl: HTMLVideoElement): void {
    if (!this.captureCtx || !this.captureCanvas) return;
    if (this.frames.length >= MAX_TIMELAPSE_FRAMES) return;
    if (videoEl.readyState < 2) return;
    this.captureCtx.drawImage(videoEl, 0, 0, this.frameWidth, this.frameHeight);
    const slot = this.frames.length;
    this.frames.push(null);
    this.config.capturedFrames = this.frames.length;
    this.captureCanvas.toBlob(
      (blob) => {
        this.frames[slot] = blob;
      },
      'image/jpeg',
      FRAME_JPEG_QUALITY
    );
  }

  /**
   * Start time-lapse capture
   */
  public async startTimelapse(
    videoEl: HTMLVideoElement,
    track: MediaStreamTrack | null
  ): Promise<boolean> {
    this.clearTimers();
    this.frames = [];

    this.frameWidth = videoEl.videoWidth || 1920;
    this.frameHeight = videoEl.videoHeight || 1080;

    this.captureCanvas = document.createElement('canvas');
    this.captureCanvas.width = this.frameWidth;
    this.captureCanvas.height = this.frameHeight;
    this.captureCtx = this.captureCanvas.getContext('2d', { alpha: false });
    if (!this.captureCtx) return false;

    // "AE Locked": hold one exposure for the whole sequence so brightness cannot flicker between stills.
    // (This used to switch metering to continuous, i.e. the opposite of a lock.)
    this.exposureHeld = false;
    if (this.config.lockExposure && track) {
      this.exposureHeld = await calibrateExposureLock(track, videoEl);
      // ...and focus, so a refocus between stills cannot make the sequence pump
      this.focusHeld = await calibrateFocusLock(track, videoEl);
      this.heldTrack = track;
    }

    this.config.isRecording = true;
    this.config.capturedFrames = 0;
    this.config.realDurationSeconds = 0;

    // First still immediately, then one per interval
    this.grabFrame(videoEl);
    const intervalMs = Math.max(100, Math.round(this.config.interval * 1000));
    this.timerHandle = window.setInterval(() => this.grabFrame(videoEl), intervalMs);

    // Elapsed duration ticker
    this.durationTimerHandle = window.setInterval(() => {
      this.config.realDurationSeconds += 1;
    }, 1000);

    return true;
  }

  /**
   * Stop capture and assemble the stills into a video at the output frame rate.
   * Resolves with an object URL, or null when there was nothing to assemble.
   */
  public async stopTimelapse(): Promise<string | null> {
    this.clearTimers();
    this.config.isRecording = false;
    // release the held exposure so the camera meters normally again
    if (this.focusHeld && this.heldTrack) {
      clearFocusLock();
      try {
        await (this.heldTrack as MediaStreamTrack).applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as unknown as MediaTrackConstraints);
      } catch {}
    }
    if (this.exposureHeld && this.heldTrack) {
      clearExposureLock();
      try {
        await (this.heldTrack as MediaStreamTrack).applyConstraints({ advanced: [{ exposureMode: 'continuous' }] } as unknown as MediaTrackConstraints);
      } catch {}
    }
    this.exposureHeld = false;
    this.focusHeld = false;
    this.heldTrack = null;

    // Let any in-flight JPEG encodes land before reading the frames
    await sleep(60);
    const stills = this.frames.filter((f): f is Blob => !!f);
    this.frames = [];
    this.captureCanvas = null;
    this.captureCtx = null;
    if (stills.length === 0) {
      console.warn('[TimelapseService] no stills were captured');
      return null;
    }

    try {
      const blob = await this.assemble(stills);
      if (!blob) {
        console.warn(`[TimelapseService] could not assemble ${stills.length} stills into a video`);
        return null;
      }
      if (this.lastTimelapseUrl) {
        resourceManager.revokeManagedObjectURL(this.lastTimelapseUrl);
      }
      this.lastTimelapseUrl = resourceManager.createManagedObjectURL(blob, 'timelapse_video');
      return this.lastTimelapseUrl;
    } catch (err) {
      console.warn('[TimelapseService] assembling the video failed:', err);
      return null;
    }
  }

  /** Plays the stills onto a canvas at outputFps while MediaRecorder records it. */
  private async assemble(stills: Blob[]): Promise<Blob | null> {
    const fps = Math.max(1, this.config.outputFps || 30);
    const canvas = document.createElement('canvas');
    canvas.width = this.frameWidth;
    canvas.height = this.frameHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx || typeof MediaRecorder === 'undefined') {
      console.warn('[TimelapseService] no canvas context or MediaRecorder available');
      return null;
    }

    const stream = canvas.captureStream(fps);
    const videoTrack = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;

    let mimeType = 'video/mp4;codecs=avc1';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    // Put the first picture on the canvas before recording so the encoder has a frame from the start
    const first = await createImageBitmap(stills[0]);
    ctx.drawImage(first, 0, 0, canvas.width, canvas.height);
    first.close();
    recorder.start(500);
    const startedAt = performance.now();

    // MediaRecorder samples the canvas at its own pace (about 10 fps on a mid-range phone). Showing each still for at
    // least 100 ms makes sure every one is encoded; at 33 ms only 4 of 13 pictures made it into the file.
    const frameMs = Math.max(1000 / fps, 100);
    for (const still of stills) {
      const bitmap = await createImageBitmap(still);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      videoTrack?.requestFrame?.();
      await sleep(frameMs);
    }
    // Very short clips: hold the last picture so the encoder has time to emit data and the file is playable
    const elapsed = performance.now() - startedAt;
    if (elapsed < MIN_CLIP_MS) await sleep(MIN_CLIP_MS - elapsed);
    await sleep(frameMs);

    recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    if (chunks.length === 0) {
      console.warn('[TimelapseService] the recorder produced no data');
      return null;
    }
    return new Blob(chunks, { type: recorder.mimeType || mimeType });
  }

  public getStatus(): TimelapseStatus {
    return {
      isRecording: this.config.isRecording,
      capturedFrames: this.config.capturedFrames,
      realDurationSeconds: this.config.realDurationSeconds,
      estimatedOutputSeconds: this.calculateOutputDuration(
        this.config.capturedFrames,
        this.config.outputFps
      ),
      interval: this.config.interval,
    };
  }

  public cleanup(): void {
    this.clearTimers();
    this.frames = [];
    this.captureCanvas = null;
    this.captureCtx = null;
    if (this.lastTimelapseUrl) {
      resourceManager.revokeManagedObjectURL(this.lastTimelapseUrl);
      this.lastTimelapseUrl = null;
    }
  }
}

export const timelapseService = TimelapseService.getInstance();
