import { apiUrl } from '../config';
import { deviceService } from './deviceService';

export type LicenseType = '30_day' | '90_day' | '1_year' | 'lifetime';
export type LicenseStatus = 'active' | 'suspended' | 'revoked' | 'expired';

export interface StoredLicenseSession {
  entitlementToken: string;
  name: string;
  licenseKeyMasked: string;
  type: LicenseType;
  status: LicenseStatus;
  activatedAt: number;
  expiresAt: number | null;
  deviceCount: number;
  maxDevices: number;
  lastValidatedAt: number;
  offlineUntil: number;
}

const STORAGE_SESSION_KEY = 'cinegrid_license_entitlement_session';

class LicenseService {
  private currentSession: StoredLicenseSession | null = null;

  constructor() {
    this.currentSession = this.loadStoredSession();
  }

  private loadStoredSession(): StoredLicenseSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private saveSession(session: StoredLicenseSession) {
    this.currentSession = session;
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  }

  public clearSession() {
    this.currentSession = null;
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }

  public getSession(): StoredLicenseSession | null {
    if (!this.currentSession) {
      this.currentSession = this.loadStoredSession();
    }
    return this.currentSession;
  }

  /**
   * Check initial activation on app startup.
   * Handles offline entitlements gracefully.
   */
  public async checkInitialActivation(): Promise<{
    isActivated: boolean;
    session: StoredLicenseSession | null;
    warningMessage?: string;
  }> {
    const session = this.getSession();
    if (!session || !session.entitlementToken) {
      return { isActivated: false, session: null };
    }

    // Sessions minted locally by older builds (offline fallback / test unlock) were never server-verified.
    if (
      session.entitlementToken.startsWith('offline_token_') ||
      session.entitlementToken.startsWith('test_token_')
    ) {
      this.clearSession();
      return {
        isActivated: false,
        session: null,
        warningMessage: 'Please activate your license again.',
      };
    }

    const now = Date.now();

    // Check expiration date
    if (session.expiresAt !== null && now > session.expiresAt) {
      session.status = 'expired';
      this.saveSession(session);
      return {
        isActivated: false,
        session,
        warningMessage: 'Your camera license has expired.',
      };
    }

    // Try online revalidation if internet is reachable
    // Bounded wait so an unreachable server can never hold the launch screen.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const profile = await deviceService.getDeviceProfile();
      // Race as well as abort: the native HTTP bridge may ignore AbortSignal.
      const res = await Promise.race([
        fetch(apiUrl('/api/license/validate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            entitlementToken: session.entitlementToken,
            deviceId: profile.deviceId,
          }),
        }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('license validate timeout')));
        }),
      ]);

      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.licenseInfo) {
          session.name = data.licenseInfo.name;
          session.type = data.licenseInfo.type;
          session.status = data.licenseInfo.status;
          session.expiresAt = data.licenseInfo.expiresAt;
          session.deviceCount = data.licenseInfo.deviceCount;
          session.maxDevices = data.licenseInfo.maxDevices;
          session.lastValidatedAt = now;
          if (data.refreshedToken) {
            session.entitlementToken = data.refreshedToken;
          }
          this.saveSession(session);
          return { isActivated: true, session };
        }
      } else {
        const errData = await res.json().catch(() => null);
        if (errData?.errorCode === 'REVOKED') {
          session.status = 'revoked';
          this.saveSession(session);
          return {
            isActivated: false,
            session,
            warningMessage: 'License already revoked.',
          };
        }
        if (errData?.errorCode === 'EXPIRED') {
          session.status = 'expired';
          this.saveSession(session);
          return {
            isActivated: false,
            session,
            warningMessage: 'License expired.',
          };
        }
        if (errData?.errorCode === 'DEVICE_UNLINKED') {
          this.clearSession();
          return {
            isActivated: false,
            session: null,
            warningMessage: 'Device activation has been reset by the administrator.',
          };
        }
      }
    } catch {
      // Offline fallback: Check if offline grace period entitlement is valid
      if (session.offlineUntil && now < session.offlineUntil) {
        return {
          isActivated: true,
          session,
          warningMessage: 'Working in offline mode with cached entitlement.',
        };
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // If offline grace period still holds
    if (session.offlineUntil && now < session.offlineUntil) {
      return { isActivated: true, session };
    }

    return { isActivated: true, session };
  }

  /**
   * Activates a new license with user's name and key.
   * Requires the license server to verify the key; there is no offline fallback.
   */
  public async activate(name: string, licenseKey: string): Promise<{
    success: boolean;
    message: string;
    session?: StoredLicenseSession;
  }> {
    const trimmedName = name.trim() || 'Studio Pro User';
    const cleanKey = licenseKey.trim().toUpperCase();
    const rawAlphaNum = cleanKey.replace(/[^A-Z0-9]/g, '');

    // Format validation (requires key starting with CINE or standard length)
    if (!rawAlphaNum.startsWith('CINE') || rawAlphaNum.length < 12) {
      return {
        success: false,
        message: 'Invalid license key format. Expected format: CINE-XXXX-XXXX-XXXX',
      };
    }

    const maskedKey = `${cleanKey.substring(0, 4)}-****-****-${cleanKey.slice(-4)}`;

    try {
      const profile = await deviceService.getDeviceProfile();

      // Bounded wait; race as well because the native HTTP bridge may ignore AbortSignal.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let res: Response;
      try {
        res = await Promise.race([
          fetch(apiUrl('/api/license/activate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              name: trimmedName,
              licenseKey: cleanKey,
              deviceId: profile.deviceId,
              deviceName: profile.model,
              os: profile.osVersion,
              platform: profile.platform,
            }),
          }),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => reject(new Error('activation timeout')));
          }),
        ]);
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data.licenseInfo) {
        const newSession: StoredLicenseSession = {
          entitlementToken: data.entitlementToken,
          name: data.licenseInfo.name,
          licenseKeyMasked: maskedKey,
          type: data.licenseInfo.type,
          status: data.licenseInfo.status,
          activatedAt: data.licenseInfo.activatedAt,
          expiresAt: data.licenseInfo.expiresAt,
          deviceCount: data.licenseInfo.deviceCount,
          maxDevices: data.licenseInfo.maxDevices,
          lastValidatedAt: Date.now(),
          offlineUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
        };

        this.saveSession(newSession);

        return {
          success: true,
          message: 'License activated successfully.',
          session: newSession,
        };
      }

      // Server answered but refused: report its reason instead of activating anyway.
      return {
        success: false,
        message:
          data?.message ||
          `Could not verify this key with the license server (HTTP ${res.status}). Please try again later or contact support.`,
      };
    } catch {
      // Network unreachable, timed out, or blocked. Activation needs the server; never fake it.
      return {
        success: false,
        message:
          'Could not reach the license server. Check your internet connection and try again.',
      };
    }
  }

  /**
   * Deactivates current device
   */
  public async deactivate(): Promise<boolean> {
    const session = this.getSession();
    if (!session) return true;

    try {
      const profile = await deviceService.getDeviceProfile();
      await fetch(apiUrl('/api/license/deactivate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entitlementToken: session.entitlementToken,
          deviceId: profile.deviceId,
        }),
      });
    } catch {
      // Ignored
    }

    this.clearSession();
    return true;
  }
}

export const licenseService = new LicenseService();
