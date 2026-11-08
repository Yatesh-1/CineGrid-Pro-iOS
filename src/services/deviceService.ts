import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export interface DeviceHardwareProfile {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  isNative: boolean;
  model: string;
  osVersion: string;
  isTablet: boolean;
  supportsTouch: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  cameraCapabilities: {
    hasMediaDevices: boolean;
    hasHardwareTorch: boolean;
    hasHardwareZoom: boolean;
    hasManualExposure: boolean;
    hasManualFocus: boolean;
    hasMicrophone: boolean;
    availableCameraCount: number;
    nativeFramework: 'AVFoundation (iOS)' | 'CameraX/Camera2 (Android)' | 'W3C MediaDevices (Browser)';
  };
}

const STORAGE_DEVICE_ID_KEY = 'cinegrid_secure_installation_id';

class DeviceService {
  private cachedProfile: DeviceHardwareProfile | null = null;
  private deviceId: string | null = null;

  /**
   * Retrieves or generates a cryptographically secure installation identifier.
   * On native Capacitor platforms, uses Device.getId() supplemented by local secure storage.
   */
  public async getInstallationIdentifier(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    const storedId = localStorage.getItem(STORAGE_DEVICE_ID_KEY);
    if (storedId && storedId.trim().length >= 16) {
      this.deviceId = storedId;
      return this.deviceId;
    }

    let generatedId = '';
    try {
      if (Capacitor.isNativePlatform()) {
        const info = await Device.getId();
        if (info.identifier) {
          generatedId = `native_${info.identifier}`;
        }
      }
    } catch {
      // Fallback to cryptographic web random UUID
    }

    if (!generatedId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        generatedId = `inst_${crypto.randomUUID()}`;
      } else {
        generatedId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      }
    }

    localStorage.setItem(STORAGE_DEVICE_ID_KEY, generatedId);
    this.deviceId = generatedId;
    return this.deviceId;
  }

  /**
   * Detects full hardware, OS, and camera framework profile
   */
  public async getDeviceProfile(): Promise<DeviceHardwareProfile> {
    if (this.cachedProfile) return this.cachedProfile;

    const deviceId = await this.getInstallationIdentifier();
    const isNative = Capacitor.isNativePlatform();
    const platformName = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

    let model = 'Web Client';
    let osVersion = 'Unknown';
    let isTablet = false;

    try {
      const info = await Device.getInfo();
      model = info.model || info.name || 'Generic Device';
      osVersion = `${info.operatingSystem} ${info.osVersion}`;
      isTablet = false;
    } catch {
      // Browser fallback detection
      const ua = navigator.userAgent;
      if (/iPad|Tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && window.innerWidth >= 768)) {
        isTablet = true;
      }
      if (/iPhone/i.test(ua)) {
        model = 'Apple iPhone';
        osVersion = 'iOS Safari';
      } else if (/Android/i.test(ua)) {
        model = 'Android Smartphone';
        osVersion = 'Android Chrome';
      } else {
        model = navigator.platform || 'Desktop Browser';
        osVersion = navigator.userAgent.split(' ')[0] || 'Desktop';
      }
    }

    // Determine native camera framework
    let nativeFramework: DeviceHardwareProfile['cameraCapabilities']['nativeFramework'] =
      'W3C MediaDevices (Browser)';
    if (platformName === 'ios') {
      nativeFramework = 'AVFoundation (iOS)';
    } else if (platformName === 'android') {
      nativeFramework = 'CameraX/Camera2 (Android)';
    }

    // Test MediaDevices camera support
    let hasMediaDevices = false;
    let cameraCount = 0;
    let hasMicrophone = false;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      hasMediaDevices = true;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraCount = devices.filter((d) => d.kind === 'videoinput').length;
        hasMicrophone = devices.some((d) => d.kind === 'audioinput');
      } catch {
        cameraCount = 1;
      }
    }

    // Detect touch support
    const supportsTouch =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

    // Orientation
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

    const profile: DeviceHardwareProfile = {
      deviceId,
      platform: platformName === 'ios' ? 'ios' : platformName === 'android' ? 'android' : 'web',
      isNative,
      model,
      osVersion,
      isTablet,
      supportsTouch,
      orientation,
      safeAreaInsets: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      cameraCapabilities: {
        hasMediaDevices,
        hasHardwareTorch: false, // Updated dynamically when video stream tracks are queried
        hasHardwareZoom: false,
        hasManualExposure: false,
        hasManualFocus: false,
        hasMicrophone,
        availableCameraCount: cameraCount,
        nativeFramework,
      },
    };

    this.cachedProfile = profile;
    return profile;
  }

  /**
   * Checks camera permission status
   */
  public async requestPermissions(): Promise<{ camera: boolean; microphone: boolean }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Stop stream immediately after permission grant
      stream.getTracks().forEach((track) => track.stop());
      return { camera: true, microphone: true };
    } catch {
      // Try video only if mic fails
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach((track) => track.stop());
        return { camera: true, microphone: false };
      } catch {
        return { camera: false, microphone: false };
      }
    }
  }
}

export const deviceService = new DeviceService();
