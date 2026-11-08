// CineGrid Pro — Wide Selfie Camera Engine
// Physical Front-Lens Inspector, Zoom / FOV Controller & Group Framing Guidance

import type { WideSelfieConfig, WideSelfieFraming } from '../types/camera';

export interface WideSelfieInspectionResult {
  hasPhysicalUltraWideFront: boolean;
  frontUltraWideDeviceId?: string;
  frontStandardDeviceId?: string;
  hardwareMinZoom: number;
  hardwareMaxZoom: number;
  label: string;
}

export class WideSelfieService {
  private static instance: WideSelfieService;

  private config: WideSelfieConfig = {
    framing: 'normal',
    hasHardwareUltraWide: false,
    groupGuideOverlay: false, // optional aid; it covers the face, so it is opt-in
    frontLensZoom: 1.0,
  };

  private inspection: WideSelfieInspectionResult | null = null;

  public static getInstance(): WideSelfieService {
    if (!WideSelfieService.instance) {
      WideSelfieService.instance = new WideSelfieService();
    }
    return WideSelfieService.instance;
  }

  public getConfig(): WideSelfieConfig {
    return { ...this.config };
  }

  public setConfig(patch: Partial<WideSelfieConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  /**
   * Inspect available physical front-facing camera lenses
   */
  public async inspectFrontLenses(currentTrack: MediaStreamTrack | null): Promise<WideSelfieInspectionResult> {
    let hasUltra = false;
    let frontUltraId: string | undefined;
    let frontStdId: string | undefined;

    let minZoom = 1.0;
    let maxZoom = 3.0;

    if (currentTrack && currentTrack.getCapabilities) {
      const caps = currentTrack.getCapabilities() as any;
      if (caps.zoom) {
        minZoom = caps.zoom.min || 1.0;
        maxZoom = caps.zoom.max || 3.0;
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const frontCameras = devices.filter(
          (d) =>
            d.kind === 'videoinput' &&
            (d.label.toLowerCase().includes('front') ||
              d.label.toLowerCase().includes('user') ||
              d.label.toLowerCase().includes('selfie'))
        );

        if (frontCameras.length > 1) {
          const ultra = frontCameras.find(
            (c) =>
              c.label.toLowerCase().includes('wide') ||
              c.label.toLowerCase().includes('ultra') ||
              c.label.toLowerCase().includes('0.5')
          );
          if (ultra) {
            hasUltra = true;
            frontUltraId = ultra.deviceId;
            frontStdId = frontCameras.find((c) => c.deviceId !== ultra.deviceId)?.deviceId;
          } else {
            hasUltra = true;
            frontUltraId = frontCameras[1].deviceId;
            frontStdId = frontCameras[0].deviceId;
          }
        } else if (frontCameras.length === 1) {
          frontStdId = frontCameras[0].deviceId;
          // Single front camera: check if hardware zoom supports < 1.0 (e.g. 0.5x or 0.7x)
          if (minZoom < 1.0) {
            hasUltra = true;
          }
        }
      } catch {}
    }

    const label = hasUltra
      ? frontUltraId
        ? 'Physical Ultra-Wide Front Sensor Available'
        : `Wide Angle Digital Framing (${minZoom < 1.0 ? minZoom : '0.7'}x)`
      : 'Standard Front Sensor (1.0x Full Sensor FOV)';

    this.inspection = {
      hasPhysicalUltraWideFront: hasUltra,
      frontUltraWideDeviceId: frontUltraId,
      frontStandardDeviceId: frontStdId,
      hardwareMinZoom: minZoom,
      hardwareMaxZoom: maxZoom,
      label,
    };

    this.config.hasHardwareUltraWide = hasUltra;
    return this.inspection;
  }

  /**
   * Toggle between Normal (1.0x) and Wide (0.7x / 0.5x)
   */
  public async setFraming(
    framing: WideSelfieFraming,
    track: MediaStreamTrack | null
  ): Promise<{ appliedZoom: number; isPhysicalLens: boolean }> {
    this.config.framing = framing;

    if (framing === 'normal') {
      this.config.frontLensZoom = 1.0;
      if (track && (track as any).applyConstraints) {
        try {
          await (track as any).applyConstraints({ advanced: [{ zoom: 1.0 }] });
        } catch {}
      }
      return { appliedZoom: 1.0, isPhysicalLens: false };
    }

    // Wide Framing
    const targetZoom = this.inspection?.hardwareMinZoom && this.inspection.hardwareMinZoom < 1.0
      ? this.inspection.hardwareMinZoom
      : 0.7;

    this.config.frontLensZoom = targetZoom;

    if (track && (track as any).applyConstraints) {
      try {
        await (track as any).applyConstraints({ advanced: [{ zoom: targetZoom }] });
      } catch {}
    }

    return {
      appliedZoom: targetZoom,
      isPhysicalLens: !!this.inspection?.frontUltraWideDeviceId,
    };
  }
}

export const wideSelfieService = WideSelfieService.getInstance();
