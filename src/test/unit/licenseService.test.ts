import { describe, it, expect, beforeEach, vi } from 'vitest';
import { licenseService } from '../../services/licenseService';

describe('LicenseService Unit Tests', () => {
  beforeEach(() => {
    licenseService.clearSession();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reports unactivated when no session is present', async () => {
    const res = await licenseService.checkInitialActivation();
    expect(res.isActivated).toBe(false);
    expect(res.session).toBeNull();
  });

  it('rejects malformed activation keys gracefully', async () => {
    const res = await licenseService.activate('John Doe', 'INVALID-KEY-123');
    expect(res.success).toBe(false);
    expect(res.message).toBeDefined();
  });

  it('does not activate when the license server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const res = await licenseService.activate('John Doe', 'CINE-AAAA-BBBB-CCCC');
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/could not reach/i);
    expect(licenseService.getSession()).toBeNull();
  });

  it('does not activate when the server rejects the key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Unknown license key.' }), { status: 400 }),
    );
    const res = await licenseService.activate('John Doe', 'CINE-AAAA-BBBB-CCCC');
    expect(res.success).toBe(false);
    expect(res.message).toBe('Unknown license key.');
    expect(licenseService.getSession()).toBeNull();
  });

  it('discards unverified sessions created by the old offline fallback', async () => {
    const now = Date.now();
    localStorage.setItem(
      'cinegrid_license_entitlement_session',
      JSON.stringify({
        entitlementToken: `offline_token_${now}_CINEAAAABBBBCCCC`,
        name: 'x',
        licenseKeyMasked: 'CINE-****-****-CCCC',
        type: 'lifetime',
        status: 'active',
        activatedAt: now,
        expiresAt: null,
        deviceCount: 1,
        maxDevices: 5,
        lastValidatedAt: now,
        offlineUntil: now + 1e9,
      }),
    );
    const res = await licenseService.checkInitialActivation();
    expect(res.isActivated).toBe(false);
    expect(licenseService.getSession()).toBeNull();
  });

  it('preserves valid offline entitlement sessions within grace period', async () => {
    const now = Date.now();
    const fakeSession = {
      entitlementToken: 'mock_jwt_token',
      name: 'Studio Pro',
      licenseKeyMasked: 'CINE-****-****-****',
      type: '1_year' as const,
      status: 'active' as const,
      activatedAt: now - 10000,
      expiresAt: now + 365 * 24 * 60 * 60 * 1000,
      deviceCount: 1,
      maxDevices: 3,
      lastValidatedAt: now - 5000,
      offlineUntil: now + 7 * 24 * 60 * 60 * 1000, // 7 days offline grace
    };

    localStorage.setItem('cinegrid_license_entitlement_session', JSON.stringify(fakeSession));

    // Recheck activation
    const res = await licenseService.checkInitialActivation();
    expect(res.isActivated).toBe(true);
    expect(res.session?.name).toBe('Studio Pro');
  });

  it('clears session on deactivation', async () => {
    const now = Date.now();
    const fakeSession = {
      entitlementToken: 'mock_jwt_token',
      name: 'Studio Pro',
      licenseKeyMasked: 'CINE-****-****-****',
      type: 'lifetime' as const,
      status: 'active' as const,
      activatedAt: now,
      expiresAt: null,
      deviceCount: 1,
      maxDevices: 2,
      lastValidatedAt: now,
      offlineUntil: now + 30 * 24 * 60 * 60 * 1000,
    };

    localStorage.setItem('cinegrid_license_entitlement_session', JSON.stringify(fakeSession));
    licenseService.clearSession();

    expect(licenseService.getSession()).toBeNull();
    expect(localStorage.getItem('cinegrid_license_entitlement_session')).toBeNull();
  });
});
