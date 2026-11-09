// CineGrid Pro — Slow Motion Video Recording & Playback Engine
// Hardware Sensor FPS Query, High-Speed Recording, Playback Speed Control, and Segment Trimming.

import { resourceManager } from './resourceManager';
import type { SlowMotionConfig, SlowMoFpsOption } from '../types/camera';

export interface SlowMoCapabilities {
  maxSensorFps: number;
  supportsGenuine60Fps: boolean;
  supportsGenuine120Fps: boolean;
  supportsGenuine240Fps: boolean;
  availableOptions: SlowMoFpsOption[];
  isHardwareHighSpeed: boolean;
  statusLabel: string;
}

export class SlowMotionService {
  private static instance: SlowMotionService;

  private config: SlowMotionConfig = {
    targetFps: 60,
    supportedMaxFps: 60,
    playbackSpeed: 0.5,
    isSlowMoRecording: false,
    recordingDuration: 0,
    segmentStart: 0.0,
    segmentEnd: 1.0,
  };

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private lastRecordedBlob: Blob | null = null;
  private lastRecordedUrl: string | null = null;

  public static getInstance(): SlowMotionService {
    if (!SlowMotionService.instance) {
      SlowMotionService.instance = new SlowMotionService();
    }
    return SlowMotionService.instance;
  }

  public getConfig(): SlowMotionConfig {
    return { ...this.config };
  }

  public setConfig(patch: Partial<SlowMotionConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  /**
   * Inspects hardware frame rate capabilities directly from active video track
   */
  public querySensorFpsCapabilities(track: MediaStreamTrack | null): SlowMoCapabilities {
    let maxFps = 30;
    if (track && track.getCapabilities) {
      const caps = track.getCapabilities() as any;
      if (caps.frameRate && caps.frameRate.max) {
        maxFps = caps.frameRate.max;
      }
    }

    const supports60 = maxFps >= 59;
    const supports120 = maxFps >= 119;
    const supports240 = maxFps >= 239;

    const available: SlowMoFpsOption[] = [60];
    if (supports120) available.push(120);
    if (supports240) available.push(240);

    const isHardware = supports60;
    const statusLabel = supports120
      ? `Hardware HFR Sensor (${Math.round(maxFps)} FPS Native)`
      : supports60
        ? `Hardware 60 FPS Sensor (${this.config.playbackSpeed}x Slow-Mo)`
        : `Temporal Slow-Motion (${this.config.playbackSpeed}x Playback)`;

    this.config.supportedMaxFps = maxFps;

    return {
      maxSensorFps: maxFps,
      supportsGenuine60Fps: supports60,
      supportsGenuine120Fps: supports120,
      supportsGenuine240Fps: supports240,
      availableOptions: available,
      isHardwareHighSpeed: isHardware,
      statusLabel,
    };
  }

  /**
   * Configure camera track for maximum supported frame rate
   */
  public async configureCameraForHighSpeed(
    track: MediaStreamTrack | null,
    targetFps: SlowMoFpsOption
  ): Promise<boolean> {
    if (!track || !(track as any).applyConstraints) return false;

    this.config.targetFps = targetFps;
    try {
      await (track as any).applyConstraints({
        advanced: [{ frameRate: targetFps }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start recording slow-motion clip
   */
  public startSlowMoRecording(stream: MediaStream): boolean {
    if (typeof MediaRecorder === 'undefined' || !stream) return false;

    this.recordedChunks = [];
    let mimeType = 'video/mp4;codecs=avc1';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1,mp4a.40.2'; // AAC sound plays everywhere
    } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      mimeType = 'video/webm;codecs=h264';
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 35_000_000, // 35 Mbps for high frame quality
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(200);
      this.config.isSlowMoRecording = true;
      return true;
    } catch (err) {
      console.warn('[SlowMotionService] Failed to start slow-mo recorder:', err);
      return false;
    }
  }

  /**
   * Stop recording slow-motion clip
   */
  public stopSlowMoRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder inactive.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mime = this.mediaRecorder?.mimeType || 'video/webm';
          this.lastRecordedBlob = new Blob(this.recordedChunks, { type: mime });
          this.recordedChunks = [];
          this.mediaRecorder = null;
          this.config.isSlowMoRecording = false;

          if (this.lastRecordedUrl) {
            resourceManager.revokeManagedObjectURL(this.lastRecordedUrl);
          }
          this.lastRecordedUrl = resourceManager.createManagedObjectURL(
            this.lastRecordedBlob,
            'slow_mo_video'
          );
          resolve(this.lastRecordedUrl);
        } catch (err) {
          this.config.isSlowMoRecording = false;
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  public getLastRecordedUrl(): string | null {
    return this.lastRecordedUrl;
  }

  public cleanup(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }
    this.recordedChunks = [];
    if (this.lastRecordedUrl) {
      resourceManager.revokeManagedObjectURL(this.lastRecordedUrl);
      this.lastRecordedUrl = null;
    }
  }
}

export const slowMotionService = SlowMotionService.getInstance();
