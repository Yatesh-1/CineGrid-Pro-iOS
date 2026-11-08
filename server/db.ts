import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type LicenseType = '30_day' | '90_day' | '1_year' | 'lifetime';
export type LicenseStatus = 'active' | 'suspended' | 'revoked' | 'expired';

export interface ActivatedDevice {
  deviceId: string;
  deviceName: string;
  os: string;
  platform: string;
  activatedAt: number;
  lastSeenAt: number;
  ip?: string;
}

export interface LicenseRecord {
  id: string;
  key: string; // Formatted key e.g. "CINE-XXXX-XXXX-XXXX"
  keyHash: string; // SHA-256 hash of the key
  assignedName?: string; // Pre-assigned licensee name
  activatedName?: string; // Name submitted by user upon activation
  type: LicenseType;
  status: 'active' | 'suspended' | 'revoked';
  createdAt: number;
  expiresAt: number | null; // null for lifetime
  maxDevices: number; // e.g. 1, 2, 5
  activatedDevices: ActivatedDevice[];
  notes?: string;
  createdBy: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: number;
  action:
    | 'activate_attempt'
    | 'activate_success'
    | 'activate_failure'
    | 'validate'
    | 'deactivate'
    | 'admin_create'
    | 'admin_revoke'
    | 'admin_reset_devices'
    | 'admin_login';
  licenseKey?: string;
  userName?: string;
  deviceId?: string;
  ip?: string;
  details: string;
  success: boolean;
}

export interface AdminUserRecord {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface LicenseDatabaseSchema {
  version: number;
  secret: string; // HMAC secret key
  admin: AdminUserRecord;
  licenses: LicenseRecord[];
  auditLogs: AuditLogRecord[];
}

export interface EntitlementPayload {
  lid: string;
  name: string;
  type: LicenseType;
  status: LicenseStatus;
  did: string;
  iat: number;
  exp: number | null;
  offlineUntil: number; // e.g. valid offline for 14 days from token issue
}

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'licenses.json');

// Helper to hash password with salt
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Generate formatted key: CINE-XXXX-XXXX-XXXX
export function generateLicenseKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude 0, O, 1, I
  const part = (len: number) => {
    let res = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  };
  return `CINE-${part(4)}-${part(4)}-${part(4)}`;
}

export function hashKey(key: string): string {
  const cleanKey = key.trim().toUpperCase();
  return crypto.createHash('sha256').update(cleanKey).digest('hex');
}

export class LicenseDatabase {
  private db: LicenseDatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.db = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): LicenseDatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('[LicenseDB] Failed to read database, creating new:', err);
      }
    }

    // Initialize Default Database
    const salt = crypto.randomBytes(16).toString('hex');
    // No default credentials: use ADMIN_PASSWORD or generate a one-time password shown once on the console.
    let adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      adminPassword = crypto.randomBytes(12).toString('base64url');
      console.warn(
        `[LicenseDB] ADMIN_PASSWORD not set. Generated one-time admin password: ${adminPassword}`
      );
    }
    const passwordHash = hashPassword(adminPassword, salt);
    const secret = process.env.LICENSE_SECRET || crypto.randomBytes(32).toString('hex');
    const seedSamples = process.env.NODE_ENV !== 'production';

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Seed realistic sample licenses for testing all states
    const sampleLifetimeKey = 'CINE-LIFE-STUD-2026';
    const sampleYearlyKey = 'CINE-PRO1-YEAR-9988';
    const sampleRevokedKey = 'CINE-BADR-EVOK-0001';
    const sampleExpiredKey = 'CINE-PAST-EXPD-1999';

    const sampleLicenses: LicenseRecord[] = [
      {
        id: crypto.randomUUID(),
        key: sampleLifetimeKey,
        keyHash: hashKey(sampleLifetimeKey),
        assignedName: 'Master Photographer',
        type: 'lifetime',
        status: 'active',
        createdAt: now - 30 * dayMs,
        expiresAt: null,
        maxDevices: 3,
        activatedDevices: [],
        notes: 'Pre-activated Studio Lifetime Tier',
        createdBy: 'system_seed',
      },
      {
        id: crypto.randomUUID(),
        key: sampleYearlyKey,
        keyHash: hashKey(sampleYearlyKey),
        assignedName: 'Commercial Studio',
        type: '1_year',
        status: 'active',
        createdAt: now - 10 * dayMs,
        expiresAt: now + 355 * dayMs,
        maxDevices: 2,
        activatedDevices: [],
        notes: 'Annual Pro Production License',
        createdBy: 'system_seed',
      },
      {
        id: crypto.randomUUID(),
        key: sampleRevokedKey,
        keyHash: hashKey(sampleRevokedKey),
        assignedName: 'Revoked Test Account',
        type: '30_day',
        status: 'revoked',
        createdAt: now - 20 * dayMs,
        expiresAt: now + 10 * dayMs,
        maxDevices: 1,
        activatedDevices: [],
        notes: 'Test key revoked by administrator',
        createdBy: 'system_seed',
      },
      {
        id: crypto.randomUUID(),
        key: sampleExpiredKey,
        keyHash: hashKey(sampleExpiredKey),
        assignedName: 'Expired Test Account',
        type: '30_day',
        status: 'active',
        createdAt: now - 60 * dayMs,
        expiresAt: now - 5 * dayMs, // Already expired in the past
        maxDevices: 1,
        activatedDevices: [],
        notes: 'Test key that has passed expiration date',
        createdBy: 'system_seed',
      },
    ];

    const initialDb: LicenseDatabaseSchema = {
      version: 1,
      secret,
      admin: {
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash,
        salt,
        createdAt: now,
      },
      licenses: seedSamples ? sampleLicenses : [],
      auditLogs: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          action: 'admin_create',
          details: 'Initialized CineGrid Pro Licensing System with seed licenses.',
          success: true,
        },
      ],
    };

    this.saveDatabase(initialDb);
    return initialDb;
  }

  private saveDatabase(data: LicenseDatabaseSchema) {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[LicenseDB] Failed to save database:', err);
    }
  }

  public getSecret(): string {
    // An environment-provided secret always wins so production never depends on the data file.
    return process.env.LICENSE_SECRET || this.db.secret;
  }

  // --- ADMIN AUTHENTICATION ---
  public verifyAdminCredentials(password: string): boolean {
    const computed = hashPassword(password, this.db.admin.salt);
    return computed === this.db.admin.passwordHash;
  }

  public getAdminInfo() {
    return {
      username: this.db.admin.username,
      createdAt: this.db.admin.createdAt,
    };
  }

  // --- CRYPTOGRAPHIC ENTITLEMENT TOKEN CREATION ---
  public signEntitlementToken(payload: EntitlementPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'CINE_ENTITLEMENT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.db.secret)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  public verifyEntitlementToken(token: string): EntitlementPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;

      const expectedSig = crypto
        .createHmac('sha256', this.db.secret)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (expectedSig !== signature) return null;

      const payload: EntitlementPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
      return payload;
    } catch {
      return null;
    }
  }

  // --- AUDIT LOGGING ---
  public logAudit(log: Omit<AuditLogRecord, 'id' | 'timestamp'>) {
    const entry: AuditLogRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...log,
    };
    this.db.auditLogs.unshift(entry);
    if (this.db.auditLogs.length > 500) {
      this.db.auditLogs.pop();
    }
    this.saveDatabase(this.db);
  }

  public getAuditLogs(): AuditLogRecord[] {
    return this.db.auditLogs;
  }

  // --- LICENSE MANAGEMENT ---
  public getAllLicenses(): LicenseRecord[] {
    return this.db.licenses;
  }

  public findLicenseByKey(key: string): LicenseRecord | undefined {
    const clean = key.trim().toUpperCase();
    const h = hashKey(clean);
    return this.db.licenses.find((l) => l.keyHash === h || l.key.toUpperCase() === clean);
  }

  public findLicenseById(id: string): LicenseRecord | undefined {
    return this.db.licenses.find((l) => l.id === id);
  }

  public createLicense(params: {
    assignedName?: string;
    type: LicenseType;
    maxDevices?: number;
    notes?: string;
    customKey?: string;
    expiresInDays?: number;
  }): LicenseRecord {
    const key = params.customKey ? params.customKey.trim().toUpperCase() : generateLicenseKey();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let expiresAt: number | null = null;
    if (params.type === '30_day') {
      expiresAt = now + 30 * dayMs;
    } else if (params.type === '90_day') {
      expiresAt = now + 90 * dayMs;
    } else if (params.type === '1_year') {
      expiresAt = now + 365 * dayMs;
    } else if (params.expiresInDays) {
      expiresAt = now + params.expiresInDays * dayMs;
    } else {
      expiresAt = null; // Lifetime
    }

    const license: LicenseRecord = {
      id: crypto.randomUUID(),
      key,
      keyHash: hashKey(key),
      assignedName: params.assignedName?.trim(),
      type: params.type,
      status: 'active',
      createdAt: now,
      expiresAt,
      maxDevices: params.maxDevices || 1,
      activatedDevices: [],
      notes: params.notes,
      createdBy: 'admin',
    };

    this.db.licenses.unshift(license);
    this.saveDatabase(this.db);

    this.logAudit({
      action: 'admin_create',
      licenseKey: key,
      userName: params.assignedName,
      details: `Created ${license.type} license (Limit: ${license.maxDevices} devices).`,
      success: true,
    });

    return license;
  }

  public updateLicenseStatus(
    id: string,
    status: 'active' | 'suspended' | 'revoked',
    notes?: string
  ): LicenseRecord | null {
    const license = this.findLicenseById(id);
    if (!license) return null;

    license.status = status;
    if (notes !== undefined) license.notes = notes;
    this.saveDatabase(this.db);

    this.logAudit({
      action: status === 'revoked' ? 'admin_revoke' : 'admin_create',
      licenseKey: license.key,
      userName: license.assignedName || license.activatedName,
      details: `Updated license status to ${status.toUpperCase()}.`,
      success: true,
    });

    return license;
  }

  public resetDeviceActivations(id: string): LicenseRecord | null {
    const license = this.findLicenseById(id);
    if (!license) return null;

    const count = license.activatedDevices.length;
    license.activatedDevices = [];
    this.saveDatabase(this.db);

    this.logAudit({
      action: 'admin_reset_devices',
      licenseKey: license.key,
      userName: license.assignedName || license.activatedName,
      details: `Reset ${count} activated devices.`,
      success: true,
    });

    return license;
  }

  public deleteLicense(id: string): boolean {
    const idx = this.db.licenses.findIndex((l) => l.id === id);
    if (idx === -1) return false;

    const removed = this.db.licenses.splice(idx, 1)[0];
    this.saveDatabase(this.db);

    this.logAudit({
      action: 'admin_revoke',
      licenseKey: removed.key,
      userName: removed.assignedName || removed.activatedName,
      details: `Deleted license ${removed.key} permanently.`,
      success: true,
    });

    return true;
  }

  // --- ACTIVATION / VALIDATION LOGIC ---
  public activateLicense(params: {
    name: string;
    licenseKey: string;
    deviceId: string;
    deviceName?: string;
    os?: string;
    platform?: string;
    ip?: string;
  }): {
    success: boolean;
    errorCode?: 'INVALID_KEY' | 'EXPIRED' | 'REVOKED' | 'DEVICE_LIMIT' | 'SERVER_ERROR';
    message: string;
    entitlementToken?: string;
    licenseInfo?: {
      name: string;
      type: LicenseType;
      status: LicenseStatus;
      expiresAt: number | null;
      activatedAt: number;
      deviceCount: number;
      maxDevices: number;
    };
  } {
    const cleanKey = params.licenseKey.trim().toUpperCase();
    const license = this.findLicenseByKey(cleanKey);

    if (!license) {
      this.logAudit({
        action: 'activate_failure',
        licenseKey: cleanKey,
        userName: params.name,
        deviceId: params.deviceId,
        ip: params.ip,
        details: 'Invalid license key entered.',
        success: false,
      });
      return {
        success: false,
        errorCode: 'INVALID_KEY',
        message: 'Invalid license key.',
      };
    }

    // Check revoked
    if (license.status === 'revoked') {
      this.logAudit({
        action: 'activate_failure',
        licenseKey: cleanKey,
        userName: params.name,
        deviceId: params.deviceId,
        ip: params.ip,
        details: 'License has been revoked by the administrator.',
        success: false,
      });
      return {
        success: false,
        errorCode: 'REVOKED',
        message: 'License already revoked.',
      };
    }

    // Check expiration
    const now = Date.now();
    if (license.expiresAt !== null && now > license.expiresAt) {
      this.logAudit({
        action: 'activate_failure',
        licenseKey: cleanKey,
        userName: params.name,
        deviceId: params.deviceId,
        ip: params.ip,
        details: `License expired on ${new Date(license.expiresAt).toLocaleDateString()}.`,
        success: false,
      });
      return {
        success: false,
        errorCode: 'EXPIRED',
        message: 'License expired.',
      };
    }

    // Check if device already registered
    const existingDeviceIndex = license.activatedDevices.findIndex(
      (d) => d.deviceId === params.deviceId
    );

    if (existingDeviceIndex !== -1) {
      // Refresh existing device
      license.activatedDevices[existingDeviceIndex].lastSeenAt = now;
      if (params.deviceName) license.activatedDevices[existingDeviceIndex].deviceName = params.deviceName;
      if (params.os) license.activatedDevices[existingDeviceIndex].os = params.os;
    } else {
      // Check device activation limit
      if (license.activatedDevices.length >= license.maxDevices) {
        this.logAudit({
          action: 'activate_failure',
          licenseKey: cleanKey,
          userName: params.name,
          deviceId: params.deviceId,
          ip: params.ip,
          details: `Device activation limit of ${license.maxDevices} reached (${license.activatedDevices.length} active).`,
          success: false,
        });
        return {
          success: false,
          errorCode: 'DEVICE_LIMIT',
          message: 'Device activation limit reached.',
        };
      }

      // Register new device
      license.activatedDevices.push({
        deviceId: params.deviceId,
        deviceName: params.deviceName || 'Camera Device',
        os: params.os || 'Unknown OS',
        platform: params.platform || 'web',
        activatedAt: now,
        lastSeenAt: now,
        ip: params.ip,
      });
    }

    // Set activated name if not assigned or update
    license.activatedName = params.name.trim();
    this.saveDatabase(this.db);

    // Build entitlement token with 14-day offline validity guarantee
    const offlineValidityDays = 14;
    const offlineUntil = Math.min(
      now + offlineValidityDays * 24 * 60 * 60 * 1000,
      license.expiresAt ?? Number.MAX_SAFE_INTEGER
    );

    const tokenPayload: EntitlementPayload = {
      lid: license.id,
      name: license.activatedName || license.assignedName || params.name,
      type: license.type,
      status: 'active',
      did: params.deviceId,
      iat: now,
      exp: license.expiresAt,
      offlineUntil,
    };

    const entitlementToken = this.signEntitlementToken(tokenPayload);

    this.logAudit({
      action: 'activate_success',
      licenseKey: cleanKey,
      userName: params.name,
      deviceId: params.deviceId,
      ip: params.ip,
      details: `License activated successfully on device ${params.deviceId}.`,
      success: true,
    });

    return {
      success: true,
      message: 'License activated successfully.',
      entitlementToken,
      licenseInfo: {
        name: license.activatedName || license.assignedName || params.name,
        type: license.type,
        status: 'active',
        expiresAt: license.expiresAt,
        activatedAt: now,
        deviceCount: license.activatedDevices.length,
        maxDevices: license.maxDevices,
      },
    };
  }

  public validateEntitlement(params: {
    entitlementToken: string;
    deviceId: string;
    ip?: string;
  }): {
    valid: boolean;
    errorCode?: 'INVALID_TOKEN' | 'REVOKED' | 'EXPIRED' | 'DEVICE_MISMATCH' | 'DEVICE_UNLINKED';
    message: string;
    refreshedToken?: string;
    licenseInfo?: {
      name: string;
      type: LicenseType;
      status: LicenseStatus;
      expiresAt: number | null;
      deviceCount: number;
      maxDevices: number;
    };
  } {
    const payload = this.verifyEntitlementToken(params.entitlementToken);
    if (!payload) {
      return {
        valid: false,
        errorCode: 'INVALID_TOKEN',
        message: 'Invalid license key.',
      };
    }

    if (payload.did !== params.deviceId) {
      return {
        valid: false,
        errorCode: 'DEVICE_MISMATCH',
        message: 'License device signature mismatch.',
      };
    }

    const license = this.findLicenseById(payload.lid);
    if (!license) {
      return {
        valid: false,
        errorCode: 'INVALID_TOKEN',
        message: 'License no longer found.',
      };
    }

    if (license.status === 'revoked') {
      return {
        valid: false,
        errorCode: 'REVOKED',
        message: 'License already revoked.',
      };
    }

    const now = Date.now();
    if (license.expiresAt !== null && now > license.expiresAt) {
      return {
        valid: false,
        errorCode: 'EXPIRED',
        message: 'License expired.',
      };
    }

    // Verify device is still registered
    const dev = license.activatedDevices.find((d) => d.deviceId === params.deviceId);
    if (!dev) {
      return {
        valid: false,
        errorCode: 'DEVICE_UNLINKED',
        message: 'Device activation has been reset by administrator.',
      };
    }

    dev.lastSeenAt = now;
    this.saveDatabase(this.db);

    // Refresh entitlement
    const offlineValidityDays = 14;
    const offlineUntil = Math.min(
      now + offlineValidityDays * 24 * 60 * 60 * 1000,
      license.expiresAt ?? Number.MAX_SAFE_INTEGER
    );

    const refreshedPayload: EntitlementPayload = {
      lid: license.id,
      name: license.activatedName || license.assignedName || payload.name,
      type: license.type,
      status: 'active',
      did: params.deviceId,
      iat: now,
      exp: license.expiresAt,
      offlineUntil,
    };

    const refreshedToken = this.signEntitlementToken(refreshedPayload);

    return {
      valid: true,
      message: 'License active.',
      refreshedToken,
      licenseInfo: {
        name: license.activatedName || license.assignedName || payload.name,
        type: license.type,
        status: 'active',
        expiresAt: license.expiresAt,
        deviceCount: license.activatedDevices.length,
        maxDevices: license.maxDevices,
      },
    };
  }

  public deactivateDevice(params: {
    entitlementToken: string;
    deviceId: string;
  }): { success: boolean; message: string } {
    const payload = this.verifyEntitlementToken(params.entitlementToken);
    if (!payload) {
      return { success: false, message: 'Invalid license session.' };
    }

    const license = this.findLicenseById(payload.lid);
    if (!license) {
      return { success: true, message: 'Device released.' };
    }

    const idx = license.activatedDevices.findIndex((d) => d.deviceId === params.deviceId);
    if (idx !== -1) {
      license.activatedDevices.splice(idx, 1);
      this.saveDatabase(this.db);
    }

    this.logAudit({
      action: 'deactivate',
      licenseKey: license.key,
      userName: payload.name,
      deviceId: params.deviceId,
      details: `Device ${params.deviceId} voluntarily deactivated.`,
      success: true,
    });

    return { success: true, message: 'Device deactivated successfully.' };
  }
}

export const licenseDb = new LicenseDatabase();
