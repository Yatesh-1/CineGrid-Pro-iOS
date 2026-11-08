// CineGrid Pro — Professional Cinema Video Engine Service
// High-end digital cinema workflows inspired by ARRI ALEXA 35, RED V-RAPTOR, Sony VENICE 2, and Blackmagic URSA Cine

import type {
  CinemaVideoConfig,
  CinemaShutterAngle,
  CinemaFps,
  CinemaResolution,
  CinemaCodec,
  CinemaBitrate,
  CinemaColorProfile,
  CinemaMonitoringTool,
  AnamorphicDeSqueezeRatio,
} from '../types/cinemaVideo';
import { DEFAULT_CINEMA_CONFIG } from '../types/cinemaVideo';
import { cameraService } from './cameraService';
import { mediaStorageService } from './mediaStorageService';
import { saveToDevice } from './deviceSaveService';

type CinemaStateListener = (config: CinemaVideoConfig) => void;

class CinemaVideoService {
  private static instance: CinemaVideoService | null = null;
  private config: CinemaVideoConfig = { ...DEFAULT_CINEMA_CONFIG };
  private listeners: Set<CinemaStateListener> = new Set();

  // Pre-record rolling buffer
  private preRecordMediaRecorder: MediaRecorder | null = null;
  private preRecordChunks: { blob: Blob; timestamp: number }[] = [];

  // Rack Focus animation handle
  private rackFocusRaf: number | null = null;

  // Elapsed recording timer
  private recordTimer: number | null = null;
  private recordingStartTime = 0;

  private constructor() {
    this.updateCalculatedShutter();
  }

  public static getInstance(): CinemaVideoService {
    if (!CinemaVideoService.instance) {
      CinemaVideoService.instance = new CinemaVideoService();
    }
    return CinemaVideoService.instance;
  }

  public getConfig(): CinemaVideoConfig {
    return { ...this.config };
  }

  public subscribe(listener: CinemaStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getConfig());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getConfig();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('CinemaVideoService state listener error:', err);
      }
    });
  }

  public updateConfig(partial: Partial<CinemaVideoConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.shutterAngle !== undefined || partial.fps !== undefined) {
      this.updateCalculatedShutter();
    }
    this.notify();
  }

  /**
   * Calculate standard cinema shutter speed from angle & FPS:
   * Exposure Duration = Shutter Angle / (360 * FPS)
   */
  public calculateShutterSpeed(angle: CinemaShutterAngle, fps: CinemaFps): string {
    const denominator = Math.round((360 * fps) / angle);
    if (denominator <= 0) return '1/50';

    if (denominator === 48) return '1/48';
    if (denominator === 50) return '1/50';
    if (denominator === 60) return '1/60';
    if (denominator === 96) return '1/96';
    if (denominator === 100) return '1/100';
    if (denominator === 120) return '1/120';
    if (denominator === 240) return '1/240';

    return `1/${denominator}`;
  }

  private updateCalculatedShutter(): void {
    this.config.calculatedShutterSpeed = this.calculateShutterSpeed(
      this.config.shutterAngle,
      this.config.fps
    );
  }

  // Set Shutter Angle preset (180°, 172.8°, 144°, 90°, 45°)
  public setShutterAngle(angle: CinemaShutterAngle): void {
    this.config.shutterAngle = angle;
    this.updateCalculatedShutter();
    this.notify();
  }

  // Set FPS
  public setFps(fps: CinemaFps): void {
    this.config.fps = fps;
    this.updateCalculatedShutter();
    this.notify();
  }

  // Set Resolution
  public setResolution(res: CinemaResolution): void {
    this.config.resolution = res;
    this.notify();
  }

  // Set Codec & Bitrate
  public setCodec(codec: CinemaCodec, bitrate?: CinemaBitrate): void {
    this.config.codec = codec;
    if (bitrate) this.config.bitrate = bitrate;
    this.notify();
  }

  // Set Color Profile
  public setColorProfile(profile: CinemaColorProfile): void {
    this.config.colorProfile = profile;
    this.notify();
  }

  // Toggle monitoring tool in drawer
  public toggleMonitoringTool(tool: CinemaMonitoringTool): void {
    const updated = new Set(this.config.activeScopes);
    if (updated.has(tool)) {
      updated.delete(tool);
    } else {
      updated.add(tool);
    }
    this.config.activeScopes = updated;
    this.notify();
  }

  public setMonitoringToolActive(tool: CinemaMonitoringTool, active: boolean): void {
    const updated = new Set(this.config.activeScopes);
    if (active) updated.add(tool);
    else updated.delete(tool);
    this.config.activeScopes = updated;
    this.notify();
  }

  public setMonitoringDrawerOpen(isOpen: boolean): void {
    this.config.isMonitoringDrawerOpen = isOpen;
    this.notify();
  }

  public setActiveContextualTab(tab: 'exposure' | 'color' | 'focus' | 'audio' | null): void {
    this.config.activeContextualTab = tab;
    this.notify();
  }

  // Anamorphic De-Squeeze (1.0x, 1.33x, 1.5x, 1.8x, 2.0x)
  public setAnamorphicDeSqueeze(ratio: AnamorphicDeSqueezeRatio): void {
    this.config.anamorphicDeSqueeze = ratio;
    this.notify();
  }

  // LUT Monitoring vs Recording bake
  public setApplyMonitoringLut(apply: boolean): void {
    this.config.applyMonitoringLut = apply;
    this.notify();
  }

  public setBakeLutIntoRecording(bake: boolean): void {
    this.config.bakeLutIntoRecording = bake;
    this.notify();
  }

  public setLutIntensity(intensity: number): void {
    this.config.lutIntensity = Math.max(0, Math.min(1, intensity));
    this.notify();
  }

  public setActiveLut(lutId: string | null): void {
    this.config.activeLutId = lutId;
    this.notify();
  }

  // Rack Focus Automation (A -> B or B -> A)
  public setRackFocusPoint(point: 'A' | 'B', distance: number, label?: string): void {
    const clamped = Math.max(0, Math.min(1, distance));
    if (point === 'A') {
      this.config.rackFocus.pointA = {
        distance: clamped,
        label: label ?? this.config.rackFocus.pointA.label,
      };
    } else {
      this.config.rackFocus.pointB = {
        distance: clamped,
        label: label ?? this.config.rackFocus.pointB.label,
      };
    }
    this.notify();
  }

  public setRackFocusDuration(seconds: number): void {
    this.config.rackFocus.durationSeconds = Math.max(0.5, Math.min(5.0, seconds));
    this.notify();
  }

  public startRackFocusTransition(direction: 'A_to_B' | 'B_to_A'): Promise<void> {
    if (this.rackFocusRaf) {
      cancelAnimationFrame(this.rackFocusRaf);
      this.rackFocusRaf = null;
    }

    const startDist = direction === 'A_to_B'
      ? this.config.rackFocus.pointA.distance
      : this.config.rackFocus.pointB.distance;
    const endDist = direction === 'A_to_B'
      ? this.config.rackFocus.pointB.distance
      : this.config.rackFocus.pointA.distance;

    const durationMs = this.config.rackFocus.durationSeconds * 1000;
    const startTime = performance.now();

    this.config.rackFocus.isTransitioning = true;
    this.notify();

    return new Promise((resolve) => {
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);

        // Smooth cubic ease-in-out
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const currentDist = startDist + (endDist - startDist) * eased;
        this.config.manualFocusDistance = currentDist;
        this.config.rackFocus.currentProgress = progress;

        // Apply focus to hardware if supported
        const stream = cameraService.getCurrentStream();
        if (stream) {
          cameraService.applyTapToFocus(stream, 0.5, currentDist);
        }

        this.notify();

        if (progress < 1.0) {
          this.rackFocusRaf = requestAnimationFrame(step);
        } else {
          this.config.rackFocus.isTransitioning = false;
          this.rackFocusRaf = null;
          this.notify();
          resolve();
        }
      };

      this.rackFocusRaf = requestAnimationFrame(step);
    });
  }

  // Pre-recording Ring Buffer (3s / 5s rolling buffer)
  public setPreRecordSeconds(seconds: 0 | 3 | 5, stream?: MediaStream | null): void {
    this.config.preRecordSeconds = seconds;
    if (seconds === 0) {
      this.stopPreRecord();
    } else if (stream && !this.config.isRecording) {
      this.startPreRecord(stream);
    }
    this.notify();
  }

  public startPreRecord(stream: MediaStream): void {
    if (this.config.preRecordSeconds === 0 || this.config.isRecording) return;
    this.stopPreRecord();

    try {
      this.preRecordChunks = [];
      const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')
        ? 'video/mp4;codecs=avc1,mp4a.40.2'
        : MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : 'video/webm';

      this.preRecordMediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      this.preRecordMediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          const now = Date.now();
          this.preRecordChunks.push({ blob: e.data, timestamp: now });
          // Purge chunks older than configured pre-record duration
          const cutoff = now - this.config.preRecordSeconds * 1000;
          this.preRecordChunks = this.preRecordChunks.filter((c) => c.timestamp >= cutoff);
        }
      };

      this.preRecordMediaRecorder.start(500); // 500ms time slice
      this.config.isPreRecording = true;
      this.notify();
    } catch (err) {
      console.warn('Pre-record buffer initialization warning:', err);
      this.config.isPreRecording = false;
    }
  }

  public stopPreRecord(): void {
    if (this.preRecordMediaRecorder && this.preRecordMediaRecorder.state !== 'inactive') {
      try {
        this.preRecordMediaRecorder.stop();
      } catch {}
    }
    this.preRecordMediaRecorder = null;
    this.config.isPreRecording = false;
  }

  // Production Slate Clip Name Generator
  public generateClipName(): string {
    const slate = this.config.productionSlate;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const cleanScene = slate.scene.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || '1';
    const takeStr = String(slate.take).padStart(2, '0');
    return `${slate.roll}_S${cleanScene}_TK${takeStr}_${dateStr}.mp4`;
  }

  // Start Cinema Recording
  public async startCinemaRecording(stream: MediaStream): Promise<boolean> {
    if (this.config.isRecording) return false;

    // Stop pre-record recorder if active to transfer stream cleanly
    this.stopPreRecord();

    // Setup slate clip name
    const clipName = this.generateClipName();
    this.config.productionSlate.clipName = clipName;

    // Configure camera service video recording
    const success = cameraService.startVideoRecording(stream, {
      codec: this.config.codec,
      bitrate: this.config.bitrate,
    });

    if (success) {
      this.config.isRecording = true;
      this.config.recordingElapsedSeconds = 0;
      this.recordingStartTime = performance.now();

      // Track recording timer
      if (this.recordTimer) clearInterval(this.recordTimer);
      this.recordTimer = window.setInterval(() => {
        this.config.recordingElapsedSeconds = Math.floor(
          (performance.now() - this.recordingStartTime) / 1000
        );
        this.notify();
      }, 500);

      this.notify();
      return true;
    }

    return false;
  }

  // Stop Cinema Recording
  public async stopCinemaRecording(): Promise<{ url: string; clipName: string; duration: number } | null> {
    if (!this.config.isRecording) return null;

    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = null;
    }

    const duration = this.config.recordingElapsedSeconds;
    const clipName = this.config.productionSlate.clipName;

    try {
      const rawUrl = await cameraService.stopVideoRecording();

      // Auto-increment take for next shot
      this.config.productionSlate.take += 1;
      this.config.isRecording = false;
      this.config.recordingElapsedSeconds = 0;

      // Auto-save clip metadata to media storage
      try {
        await mediaStorageService.savePhoto({
          id: clipName,
          dataUrl: rawUrl,
          thumbnailUrl: rawUrl,
          timestamp: Date.now(),
          aspectRatio: '16:9',
          filterUsed: this.config.colorProfile === 'flat_log' ? 'Flat Log' : 'Rec.709 Cinema',
          gridUsed: `Cinema Scene ${this.config.productionSlate.scene}`,
          proSettings: {
            iso: this.config.iso,
            shutter: this.config.calculatedShutterSpeed,
            kelvin: this.config.whiteBalanceKelvin,
            ev: this.config.ev,
          },
        });
      } catch (saveErr) {
        console.warn('Auto save media warning:', saveErr);
      }

      // Automatically save video to native Android Gallery / MediaStore (Movies/CineGrid Pro)
      saveToDevice(rawUrl, clipName, 'video/mp4').catch((err) =>
        console.warn('Auto save to device gallery warning:', err)
      );

      // Resume pre-record if configured
      const currentStream = cameraService.getCurrentStream();
      if (this.config.preRecordSeconds > 0 && currentStream) {
        this.startPreRecord(currentStream);
      }

      this.notify();
      return { url: rawUrl, clipName, duration };
    } catch (err) {
      console.error('Stop cinema recording failed:', err);
      this.config.isRecording = false;
      this.notify();
      return null;
    }
  }

  // Storage & Audio status helpers
  public async getStorageEstimate(): Promise<{ freeGb: number; remainingMinutes: number }> {
    let mbps = 25;
    if (this.config.bitrate === 'low') mbps = 10;
    if (this.config.bitrate === 'high') mbps = 50;
    if (this.config.bitrate === 'maximum') mbps = 100;
    return cameraService.getStorageEstimate(mbps);
  }

  public getAudioLevels(): { leftDb: number; rightDb: number; peakClipping: boolean } {
    return cameraService.getLiveAudioLevels();
  }

  public resetToDefaults(): void {
    if (this.recordTimer) clearInterval(this.recordTimer);
    if (this.rackFocusRaf) cancelAnimationFrame(this.rackFocusRaf);
    this.stopPreRecord();
    this.config = { ...DEFAULT_CINEMA_CONFIG };
    this.updateCalculatedShutter();
    this.notify();
  }
}

export const cinemaVideoService = CinemaVideoService.getInstance();
