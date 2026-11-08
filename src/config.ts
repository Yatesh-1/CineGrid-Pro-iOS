import { Capacitor } from '@capacitor/core';

/**
 * Build-time and runtime configuration.
 *
 * VITE_LICENSE_API_BASE  Absolute URL of the license server (e.g. https://licenses.example.com).
 *                        Required for production Capacitor (iOS/Android) and remote hosting.
 * VITE_ENABLE_ADMIN      "true" exposes the admin dashboard. Always on in dev, off in production by default.
 */
const configuredBase = (import.meta.env.VITE_LICENSE_API_BASE as string | undefined)?.replace(/\/+$/, '') ?? '';

export function getApiBase(): string {
  if (configuredBase) return configuredBase;
  // Emulator-only fallback (10.0.2.2 = host PC). Never used in production builds, where it
  // is unreachable on a real phone and would only slow down startup.
  if (import.meta.env.DEV && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'http://10.0.2.2:5175';
  }
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  return `${base}${path}`;
}

/**
 * LICENSE GATE SWITCH.
 *   false = trial build: the activation screen is skipped and the app opens straight to the camera.
 *           No license session is created, and nothing pretends the device is activated.
 *   true  = real gate: a server-verified license is required (needs VITE_LICENSE_API_BASE).
 * Currently OFF for the trial APK. Set to true (or build with VITE_LICENSE_ENFORCED=true) to turn it back on.
 */
export const LICENSE_ENFORCED: boolean = import.meta.env.VITE_LICENSE_ENFORCED === 'true' || false;

export const ADMIN_ENABLED: boolean =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === 'true';
