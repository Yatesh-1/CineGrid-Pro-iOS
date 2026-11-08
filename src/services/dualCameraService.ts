// CineGrid Pro — Dual Camera Recording Engine
// Concurrent Camera Hardware Inspector, Compositor & Multi-Stream Synchronizer
// Supports Picture-in-Picture, Split-Screen Vertical/Horizontal, and Floating layouts.

import { resourceManager } from './resourceManager';
import type { DualCameraConfig } from '../types/camera';

export interface DualCameraProbeResult {
  isSupported: boolean;
  reason?: string;
  frontCameraId?: string;
  rearCameraId?: string;
}

export class DualCameraService {
  private static instance: DualCameraService;

  private secondaryStream: MediaStream | null = null;
  private primaryVideoEl: HTMLVideoElement | null = null;
  private secondaryVideoEl: HTMLVideoElement | null = null;

  private compositeCanvas: HTMLCanvasElement | null = null;
  private compositeCtx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private compositeStream: MediaStream | null = null;

  private config: DualCameraConfig = {
    layout: 'pip',
    primaryFacing: 'environment',
    secondaryFacing: 'user',
    pipPosition: 'top_right',
    pipSize: 'small',
    enableSecondaryAudio: false,
    isSupported: false,
  };

  private probeResult: DualCameraProbeResult | null = null;

  public static getInstance(): DualCameraService {
    if (!DualCameraService.instance) {
      DualCameraService.instance = new DualCameraService();
    }
    return DualCameraService.instance;
  }

  public getConfig(): DualCameraConfig {
    return { ...this.config };
  }

  public setConfig(patch: Partial<DualCameraConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  /**
   * Diagnostic probe testing whether the physical device / browser supports
   * simultaneous concurrent front + rear camera MediaStreams.
   */
  public async probeDualCameraSupport(): Promise<DualCameraProbeResult> {
    if (this.probeResult) {
      return this.probeResult;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      this.probeResult = {
        isSupported: false,
        reason: 'Device does not expose MediaDevices enumeration API.',
      };
      this.config.isSupported = false;
      this.config.unsupportedReason = this.probeResult.reason;
      return this.probeResult;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      if (videoInputs.length < 2) {
        this.probeResult = {
          isSupported: false,
          reason: 'Only one physical camera sensor detected on this device.',
        };
        this.config.isSupported = false;
        this.config.unsupportedReason = this.probeResult.reason;
        return this.probeResult;
      }

      // Identify candidates for front and rear
      let frontId = videoInputs.find((v) => v.label.toLowerCase().includes('front') || v.label.toLowerCase().includes('user'))?.deviceId;
      let rearId = videoInputs.find((v) => v.label.toLowerCase().includes('back') || v.label.toLowerCase().includes('rear') || v.label.toLowerCase().includes('environment'))?.deviceId;

      if (!frontId) frontId = videoInputs[1].deviceId;
      if (!rearId) rearId = videoInputs[0].deviceId;

      // Attempt concurrent acquisition probe
      let testStream1: MediaStream | null = null;
      let testStream2: MediaStream | null = null;

      try {
        testStream1 = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: rearId }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        testStream2 = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: frontId }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        // Verify both tracks remain active simultaneously
        const track1Active = testStream1.getVideoTracks()[0]?.readyState === 'live';
        const track2Active = testStream2.getVideoTracks()[0]?.readyState === 'live';

        if (track1Active && track2Active) {
          this.probeResult = {
            isSupported: true,
            frontCameraId: frontId,
            rearCameraId: rearId,
          };
          this.config.isSupported = true;
          this.config.unsupportedReason = undefined;
        } else {
          this.probeResult = {
            isSupported: false,
            reason: 'Operating system halted secondary sensor track (Single active ISP bus limitation).',
            frontCameraId: frontId,
            rearCameraId: rearId,
          };
          this.config.isSupported = false;
          this.config.unsupportedReason = this.probeResult.reason;
        }
      } catch (err: any) {
        this.probeResult = {
          isSupported: false,
          reason: `Concurrent stream negotiation failed: ${err.name || 'Hardware lock'}. Requires iOS AVCaptureMultiCamSession / Android Camera2 concurrent hardware.`,
          frontCameraId: frontId,
          rearCameraId: rearId,
        };
        this.config.isSupported = false;
        this.config.unsupportedReason = this.probeResult.reason;
      } finally {
        testStream1?.getTracks().forEach((t) => t.stop());
        testStream2?.getTracks().forEach((t) => t.stop());
      }

      return this.probeResult;
    } catch (err: any) {
      this.probeResult = {
        isSupported: false,
        reason: err.message || 'Unknown device enumeration failure.',
      };
      this.config.isSupported = false;
      this.config.unsupportedReason = this.probeResult.reason;
      return this.probeResult;
    }
  }

  /**
   * Acquire secondary camera stream and attach to secondary video element
   */
  public async startSecondaryCamera(facing: 'user' | 'environment'): Promise<MediaStream | null> {
    this.stopSecondaryCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          // small on purpose: the second camera only fills a corner or half the frame, and two big streams
          // plus the recorder exhaust memory on a 4 GB phone
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      };

      this.secondaryStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Register secondary stream with ResourceManager
      resourceManager.register(
        'dual_camera_secondary_stream',
        'stream',
        'dual_camera_secondary',
        this.secondaryStream,
        () => {
          this.secondaryStream?.getTracks().forEach((t) => t.stop());
        }
      );

      if (!this.secondaryVideoEl) {
        this.secondaryVideoEl = document.createElement('video');
        this.secondaryVideoEl.autoplay = true;
        this.secondaryVideoEl.playsInline = true;
        this.secondaryVideoEl.muted = true;
      }

      this.secondaryVideoEl.srcObject = this.secondaryStream;
      await this.secondaryVideoEl.play().catch(() => {});

      return this.secondaryStream;
    } catch (err) {
      console.warn('[DualCamera] Could not start secondary camera:', err);
      return null;
    }
  }

  /**
   * Stop secondary camera and release hardware cleanly
   */
  public stopSecondaryCamera(): void {
    if (this.secondaryStream) {
      this.secondaryStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.secondaryStream = null;
    }
    if (this.secondaryVideoEl) {
      try {
        this.secondaryVideoEl.pause();
        this.secondaryVideoEl.srcObject = null;
      } catch {}
    }
    resourceManager.releaseByOwner('dual_camera_secondary');
    this.stopCompositing();
  }

  /**
   * Start rendering primary & secondary cameras onto composite canvas
   */
  public startCompositing(primaryVideo: HTMLVideoElement, audioTrack?: MediaStreamTrack): MediaStream {
    this.primaryVideoEl = primaryVideo;
    this.stopCompositing();

    // Match the phone's orientation (portrait feeds were being stretched into a 1920x1080 landscape canvas) and keep
    // the canvas small: two cameras plus a recorder is already heavy on a 4 GB phone.
    const portrait = (primaryVideo.videoHeight || 1) >= (primaryVideo.videoWidth || 0);
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = portrait ? 720 : 1280;
    this.compositeCanvas.height = portrait ? 1280 : 720;
    this.compositeCtx = this.compositeCanvas.getContext('2d', { alpha: false });

    let last = 0;
    const render = (now: number) => {
      // 30 frames per second is all the recorder takes; drawing at the display rate (60) just burned CPU
      if (now - last >= 32) {
        last = now;
        this.drawCompositeFrame();
      }
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);

    const stream = this.compositeCanvas.captureStream(30);
    if (audioTrack) {
      stream.addTrack(audioTrack);
    }
    this.compositeStream = stream;

    return stream;
  }

  public stopCompositing(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.compositeStream?.getVideoTracks().forEach((t) => t.stop());
    this.compositeStream = null;
    if (this.compositeCanvas) {
      // release the pixel buffer now
      this.compositeCanvas.width = 0;
      this.compositeCanvas.height = 0;
      this.compositeCanvas = null;
      this.compositeCtx = null;
    }
  }

  /** Draws a video into a box, filling it and cropping the overflow (never stretching). */
  private drawCover(video: HTMLVideoElement, x: number, y: number, w: number, h: number): void {
    const ctx = this.compositeCtx;
    if (!ctx || !video.videoWidth || !video.videoHeight) return;
    const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, x, y, w, h);
  }

  /**
   * Render single composite frame according to chosen layout (PIP, Split V, Split H)
   */
  private drawCompositeFrame(): void {
    if (!this.compositeCtx || !this.compositeCanvas || !this.primaryVideoEl) return;
    const ctx = this.compositeCtx;
    const w = this.compositeCanvas.width;
    const h = this.compositeCanvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const layout = this.config.layout;

    if (layout === 'split_vertical') {
      // Top Half / Bottom Half
      const halfH = h / 2;
      if (this.primaryVideoEl.readyState >= 2) {
        this.drawCover(this.primaryVideoEl, 0, 0, w, halfH);
      }
      if (this.secondaryVideoEl && this.secondaryVideoEl.readyState >= 2) {
        this.drawCover(this.secondaryVideoEl, 0, halfH, w, halfH);
      }
      // Divider line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(0, halfH - 1, w, 2);
    } else if (layout === 'split_horizontal') {
      // Left Half / Right Half
      const halfW = w / 2;
      if (this.primaryVideoEl.readyState >= 2) {
        this.drawCover(this.primaryVideoEl, 0, 0, halfW, h);
      }
      if (this.secondaryVideoEl && this.secondaryVideoEl.readyState >= 2) {
        this.drawCover(this.secondaryVideoEl, halfW, 0, halfW, h);
      }
      // Divider line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(halfW - 1, 0, 2, h);
    } else {
      // Default: Picture-in-Picture (PIP)
      if (this.primaryVideoEl.readyState >= 2) {
        this.drawCover(this.primaryVideoEl, 0, 0, w, h);
      }

      if (this.secondaryVideoEl && this.secondaryVideoEl.readyState >= 2) {
        // Calculate PIP box dimensions
        let pipScale = 0.28;
        if (this.config.pipSize === 'medium') pipScale = 0.35;
        if (this.config.pipSize === 'large') pipScale = 0.45;

        const pipW = w * pipScale;
        const pipH = w < h ? pipW * (16 / 9) : pipW * (9 / 16);
        const pad = Math.round(w * 0.03);

        let pipX = w - pipW - pad;
        let pipY = pad;

        if (this.config.pipPosition === 'top_left') {
          pipX = pad;
          pipY = pad;
        } else if (this.config.pipPosition === 'bottom_left') {
          pipX = pad;
          pipY = h - pipH - pad;
        } else if (this.config.pipPosition === 'bottom_right') {
          pipX = w - pipW - pad;
          pipY = h - pipH - pad;
        }

        // Draw drop shadow & border for secondary window
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f59e0b'; // Amber border

        ctx.strokeRect(pipX, pipY, pipW, pipH);
        this.drawCover(this.secondaryVideoEl, pipX, pipY, pipW, pipH);
        ctx.restore();
      }
    }
  }

  /**
   * Swap primary and secondary cameras
   */
  public async swapCameras(): Promise<{ primary: 'user' | 'environment'; secondary: 'user' | 'environment' }> {
    const nextPrimary = this.config.secondaryFacing;
    const nextSecondary = this.config.primaryFacing;

    this.config.primaryFacing = nextPrimary;
    this.config.secondaryFacing = nextSecondary;

    return { primary: nextPrimary, secondary: nextSecondary };
  }

  public getSecondaryStream(): MediaStream | null {
    return this.secondaryStream;
  }

  public getCompositeStream(): MediaStream | null {
    return this.compositeStream;
  }
}

export const dualCameraService = DualCameraService.getInstance();
