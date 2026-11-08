import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { licenseDb, type LicenseType } from './db.js';

// Sliding-window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, limit = 8, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// Admin Token helper
function createAdminToken(username: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'ADMIN_SESSION' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      user: username,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', licenseDb.getSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function verifyAdminToken(authHeader?: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7).trim();

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [header, payload, sig] = parts;

    const expectedSig = crypto
      .createHmac('sha256', licenseDb.getSecret())
      .update(`${header}.${payload}`)
      .digest('base64url');

    const a = Buffer.from(expectedSig);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (Date.now() > body.exp) return false;

    return true;
  } catch {
    return false;
  }
}

// JSON Body Parser for raw Node.js IncomingMessage
function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        // 1MB flood protection
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}

// Origins allowed to call the API cross-origin (native app shells + local dev by default).
// Override with LICENSE_CORS_ORIGINS="https://app.example.com,https://other.example.com".
const DEFAULT_ORIGINS = [
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
];

function applyCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (!origin) return;
  const configured = process.env.LICENSE_CORS_ORIGINS?.split(',').map((s) => s.trim());
  const allowed = configured ?? DEFAULT_ORIGINS;
  const host = origin.replace(/:\d+$/, '');
  if (allowed.includes(origin) || (!configured && allowed.includes(host))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

export async function handleLicenseApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url || '';
  const method = req.method || 'GET';

  // Only handle /api/*
  if (!url.startsWith('/api/')) {
    return false;
  }

  applyCors(req, res);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. ACTIVATE LICENSE: POST /api/license/activate
    if (url === '/api/license/activate' && method === 'POST') {
      const body = await readJsonBody(req);
      const { name, licenseKey, deviceId, deviceName, os, platform } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        sendJson(res, 400, { success: false, message: 'Please enter your name.' });
        return true;
      }

      if (!licenseKey || typeof licenseKey !== 'string' || !licenseKey.trim()) {
        sendJson(res, 400, { success: false, message: 'Please enter your license key.' });
        return true;
      }

      if (!deviceId || typeof deviceId !== 'string') {
        sendJson(res, 400, { success: false, message: 'Device installation ID required.' });
        return true;
      }

      // Check rate limit (max 8 attempts per minute per IP)
      if (!checkRateLimit(`act_${clientIp}_${deviceId}`, 8, 60000)) {
        sendJson(res, 429, {
          success: false,
          errorCode: 'RATE_LIMITED',
          message: 'Too many activation attempts. Please wait a minute and try again.',
        });
        return true;
      }

      const result = licenseDb.activateLicense({
        name: name.trim(),
        licenseKey: licenseKey.trim(),
        deviceId: deviceId.trim(),
        deviceName,
        os,
        platform,
        ip: clientIp,
      });

      const statusCode = result.success ? 200 : result.errorCode === 'INVALID_KEY' ? 400 : 403;
      sendJson(res, statusCode, result);
      return true;
    }

    // 2. VALIDATE ENTITLEMENT: POST /api/license/validate
    if (url === '/api/license/validate' && method === 'POST') {
      const body = await readJsonBody(req);
      const { entitlementToken, deviceId } = body;

      if (!entitlementToken || !deviceId) {
        sendJson(res, 400, { valid: false, message: 'Token and deviceId required.' });
        return true;
      }

      const result = licenseDb.validateEntitlement({
        entitlementToken,
        deviceId,
        ip: clientIp,
      });

      sendJson(res, result.valid ? 200 : 403, result);
      return true;
    }

    // 3. DEACTIVATE DEVICE: POST /api/license/deactivate
    if (url === '/api/license/deactivate' && method === 'POST') {
      const body = await readJsonBody(req);
      const { entitlementToken, deviceId } = body;

      if (!entitlementToken || !deviceId) {
        sendJson(res, 400, { success: false, message: 'Token and deviceId required.' });
        return true;
      }

      const result = licenseDb.deactivateDevice({ entitlementToken, deviceId });
      sendJson(res, 200, result);
      return true;
    }

    // 4. ADMIN LOGIN: POST /api/admin/login
    if (url === '/api/admin/login' && method === 'POST') {
      const body = await readJsonBody(req);
      const { username, password } = body;

      if (!username || !password) {
        sendJson(res, 400, { success: false, message: 'Username and password required.' });
        return true;
      }

      if (username !== 'admin' || !licenseDb.verifyAdminCredentials(password)) {
        licenseDb.logAudit({
          action: 'admin_login',
          userName: username,
          ip: clientIp,
          details: 'Failed admin login attempt (invalid credentials).',
          success: false,
        });
        sendJson(res, 401, { success: false, message: 'Invalid admin credentials.' });
        return true;
      }

      const token = createAdminToken(username);
      licenseDb.logAudit({
        action: 'admin_login',
        userName: username,
        ip: clientIp,
        details: 'Admin authenticated successfully.',
        success: true,
      });

      sendJson(res, 200, {
        success: true,
        token,
        admin: licenseDb.getAdminInfo(),
      });
      return true;
    }

    // --- PROTECTED ADMIN ROUTES ---
    if (url.startsWith('/api/admin/')) {
      const authHeader = req.headers['authorization'];
      if (!verifyAdminToken(authHeader)) {
        sendJson(res, 401, { success: false, message: 'Unauthorized. Admin token required.' });
        return true;
      }

      // GET /api/admin/licenses
      if (url === '/api/admin/licenses' && method === 'GET') {
        const licenses = licenseDb.getAllLicenses();
        sendJson(res, 200, { success: true, licenses });
        return true;
      }

      // POST /api/admin/licenses (create license)
      if (url === '/api/admin/licenses' && method === 'POST') {
        const body = await readJsonBody(req);
        const { assignedName, type, maxDevices, notes, customKey, expiresInDays } = body;

        const validTypes: LicenseType[] = ['30_day', '90_day', '1_year', 'lifetime'];
        const licenseType: LicenseType = validTypes.includes(type) ? type : '1_year';

        const license = licenseDb.createLicense({
          assignedName,
          type: licenseType,
          maxDevices: Math.max(1, parseInt(maxDevices, 10) || 1),
          notes,
          customKey,
          expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
        });

        sendJson(res, 201, { success: true, license });
        return true;
      }

      // PATCH /api/admin/licenses/:id (update status / notes)
      const patchMatch = url.match(/^\/api\/admin\/licenses\/([^/?]+)$/);
      if (patchMatch && method === 'PATCH') {
        const id = patchMatch[1];
        const body = await readJsonBody(req);
        const { status, notes } = body;

        if (status && !['active', 'suspended', 'revoked'].includes(status)) {
          sendJson(res, 400, { success: false, message: 'Invalid status.' });
          return true;
        }

        const updated = licenseDb.updateLicenseStatus(id, status, notes);
        if (!updated) {
          sendJson(res, 404, { success: false, message: 'License not found.' });
          return true;
        }

        sendJson(res, 200, { success: true, license: updated });
        return true;
      }

      // POST /api/admin/licenses/:id/reset-devices
      const resetMatch = url.match(/^\/api\/admin\/licenses\/([^/?]+)\/reset-devices$/);
      if (resetMatch && method === 'POST') {
        const id = resetMatch[1];
        const updated = licenseDb.resetDeviceActivations(id);
        if (!updated) {
          sendJson(res, 404, { success: false, message: 'License not found.' });
          return true;
        }
        sendJson(res, 200, { success: true, license: updated });
        return true;
      }

      // DELETE /api/admin/licenses/:id
      const deleteMatch = url.match(/^\/api\/admin\/licenses\/([^/?]+)$/);
      if (deleteMatch && method === 'DELETE') {
        const id = deleteMatch[1];
        const deleted = licenseDb.deleteLicense(id);
        if (!deleted) {
          sendJson(res, 404, { success: false, message: 'License not found.' });
          return true;
        }
        sendJson(res, 200, { success: true, message: 'License deleted.' });
        return true;
      }

      // GET /api/admin/audit-logs
      if (url === '/api/admin/audit-logs' && method === 'GET') {
        const logs = licenseDb.getAuditLogs();
        sendJson(res, 200, { success: true, logs });
        return true;
      }

      // GET /api/admin/stats
      if (url === '/api/admin/stats' && method === 'GET') {
        const licenses = licenseDb.getAllLicenses();
        const now = Date.now();

        const total = licenses.length;
        const active = licenses.filter(
          (l) => l.status === 'active' && (l.expiresAt === null || l.expiresAt > now)
        ).length;
        const expired = licenses.filter(
          (l) => l.expiresAt !== null && l.expiresAt <= now
        ).length;
        const revoked = licenses.filter((l) => l.status === 'revoked').length;
        const totalDevices = licenses.reduce((sum, l) => sum + l.activatedDevices.length, 0);

        sendJson(res, 200, {
          success: true,
          stats: {
            total,
            active,
            expired,
            revoked,
            totalDevices,
          },
        });
        return true;
      }
    }

    sendJson(res, 404, { success: false, message: 'API route not found.' });
    return true;
  } catch (err: any) {
    console.error('[LicenseApi] Request handler error:', err);
    sendJson(res, 500, { success: false, message: 'Internal server error.' });
    return true;
  }
}
