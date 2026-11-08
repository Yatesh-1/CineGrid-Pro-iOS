import { apiUrl } from '../../config';
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Lock,
  Unlock,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Copy,
  Check,
  Smartphone,
  Calendar,
  AlertTriangle,
  User,
  Sliders,
  LogOut,
  FileText,
  Activity,
  Trash2,
} from 'lucide-react';
import type { LicenseType, LicenseStatus } from '../../services/licenseService';

interface AdminLicenseRecord {
  id: string;
  key: string;
  assignedName?: string;
  activatedName?: string;
  type: LicenseType;
  status: 'active' | 'suspended' | 'revoked';
  createdAt: number;
  expiresAt: number | null;
  maxDevices: number;
  activatedDevices: {
    deviceId: string;
    deviceName: string;
    os: string;
    platform: string;
    activatedAt: number;
    lastSeenAt: number;
    ip?: string;
  }[];
  notes?: string;
}

interface AuditLogRecord {
  id: string;
  timestamp: number;
  action: string;
  licenseKey?: string;
  userName?: string;
  deviceId?: string;
  ip?: string;
  details: string;
  success: boolean;
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseLicenseInApp?: (key: string, name: string) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onUseLicenseInApp,
}) => {
  // Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(
    sessionStorage.getItem('cinegrid_admin_token')
  );
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<'licenses' | 'create' | 'logs'>('licenses');
  const [licenses, setLicenses] = useState<AdminLicenseRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    totalDevices: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'revoked' | 'expired'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedDeviceDetails, setSelectedDeviceDetails] = useState<AdminLicenseRecord | null>(null);

  // Create License Form State
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<LicenseType>('1_year');
  const [createMaxDevices, setCreateMaxDevices] = useState(2);
  const [createNotes, setCreateNotes] = useState('');
  const [createCustomKey, setCreateCustomKey] = useState('');
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());

  const handleLogout = useCallback(() => {
    setAdminToken(null);
    sessionStorage.removeItem('cinegrid_admin_token');
    setLicenses([]);
    setAuditLogs([]);
    setStats(null);
  }, []);

  // Load Dashboard Data when token exists
  const loadDashboardData = useCallback(async () => {
    if (!adminToken) return;
    setIsLoading(true);

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [licRes, statRes, logRes] = await Promise.all([
        fetch(apiUrl('/api/admin/licenses'), { headers }),
        fetch(apiUrl('/api/admin/stats'), { headers }),
        fetch(apiUrl('/api/admin/audit-logs'), { headers }),
      ]);

      if (licRes.status === 401 || statRes.status === 401) {
        handleLogout();
        return;
      }

      const licData = await licRes.json();
      const statData = await statRes.json();
      const logData = await logRes.json();

      if (licData.success) setLicenses(licData.licenses);
      if (statData.success) setStats(statData.stats);
      if (logData.success) setAuditLogs(logData.logs);
    } catch (err) {
      console.error('[Admin] Load data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, handleLogout]);

  useEffect(() => {
    if (adminToken && isOpen) {
      loadDashboardData();
    }
  }, [adminToken, isOpen, loadDashboardData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        setAdminToken(data.token);
        sessionStorage.setItem('cinegrid_admin_token', data.token);
        setPassword('');
      } else {
        setLoginError(data.message || 'Invalid administrator credentials.');
      }
    } catch {
      setLoginError('Could not connect to administration server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    try {
      const res = await fetch(apiUrl('/api/admin/licenses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          assignedName: createName,
          type: createType,
          maxDevices: createMaxDevices,
          notes: createNotes,
          customKey: createCustomKey || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreateSuccessMsg(`Created license key: ${data.license.key}`);
        setCreateName('');
        setCreateNotes('');
        setCreateCustomKey('');
        loadDashboardData();
      }
    } catch (err) {
      console.error('[Admin] Create license error:', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'suspended' | 'revoked') => {
    if (!adminToken) return;

    try {
      const res = await fetch(apiUrl(`/api/admin/licenses/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        loadDashboardData();
      }
    } catch (err) {
      console.error('[Admin] Update status error:', err);
    }
  };

  const handleResetDevices = async (id: string) => {
    if (!adminToken) return;

    try {
      const res = await fetch(apiUrl(`/api/admin/licenses/${id}/reset-devices`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.ok) {
        loadDashboardData();
      }
    } catch (err) {
      console.error('[Admin] Reset devices error:', err);
    }
  };

  const handleDeleteLicense = async (id: string) => {
    if (!adminToken) return;
    if (!confirm('Are you sure you want to permanently delete this license?')) return;

    try {
      const res = await fetch(apiUrl(`/api/admin/licenses/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.ok) {
        loadDashboardData();
      }
    } catch (err) {
      console.error('[Admin] Delete license error:', err);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  // Filter licenses based on search and status
  const filteredLicenses = licenses.filter((l) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      l.key.toLowerCase().includes(query) ||
      (l.assignedName && l.assignedName.toLowerCase().includes(query)) ||
      (l.activatedName && l.activatedName.toLowerCase().includes(query)) ||
      (l.notes && l.notes.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    const isExpired = l.expiresAt !== null && currentTime > l.expiresAt;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'expired') return isExpired;
    if (statusFilter === 'active') return l.status === 'active' && !isExpired;
    if (statusFilter === 'suspended') return l.status === 'suspended';
    if (statusFilter === 'revoked') return l.status === 'revoked';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden select-none">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold">
              <KeyRound size={17} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>License Administrator Dashboard</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  SERVER-SIDE CONTROL
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Provisioning, Activation Limits & Security Audits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminToken && (
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-colors"
                title="Sign Out"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 1. ADMIN LOGIN VIEW IF NOT LOGGED IN */}
        {!adminToken ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 text-amber-400 flex items-center justify-center mb-4 shadow-xl">
              <Lock size={26} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Administrator Sign In</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Enter secure credentials to generate keys, revoke licenses, and view device registrations.
            </p>

            {loginError && (
              <div className="w-full mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 text-left">
                <AlertTriangle size={15} className="flex-shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-mono text-zinc-300">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-mono text-zinc-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full bg-zinc-900 border border-white/10 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-black" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <Unlock size={14} />
                    <span>AUTHENTICATE</span>
                  </>
                )}
              </button>

              <div className="mt-3 p-2.5 rounded-lg bg-zinc-900/60 border border-white/5 text-[10px] text-zinc-400 text-left font-mono">
                <span>Default admin password: </span>
                <code className="text-amber-400 font-bold">CineGridAdmin2026!</code>
              </div>
            </form>
          </div>
        ) : (
          /* 2. AUTHENTICATED DASHBOARD VIEW */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* STATS OVERVIEW CARDS */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-3 border-b border-white/10 bg-zinc-900/40 text-center">
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                  <div className="text-[10px] font-mono text-zinc-400">TOTAL LICENSES</div>
                  <div className="text-lg font-mono font-bold text-white">{stats.total}</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                  <div className="text-[10px] font-mono text-emerald-400">ACTIVE</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">{stats.active}</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                  <div className="text-[10px] font-mono text-amber-400">EXPIRED</div>
                  <div className="text-lg font-mono font-bold text-amber-400">{stats.expired}</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                  <div className="text-[10px] font-mono text-rose-400">REVOKED</div>
                  <div className="text-lg font-mono font-bold text-rose-400">{stats.revoked}</div>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                  <div className="text-[10px] font-mono text-sky-400">DEVICES PAIRED</div>
                  <div className="text-lg font-mono font-bold text-sky-400">{stats.totalDevices}</div>
                </div>
              </div>
            )}

            {/* TAB SELECTOR */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/10 bg-zinc-950 font-mono text-xs">
              <button
                onClick={() => setActiveTab('licenses')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'licenses'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Sliders size={13} />
                <span>Licenses ({licenses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Plus size={13} />
                <span>Create License</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'logs'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <FileText size={13} />
                <span>Audit Logs</span>
              </button>

              <div className="ml-auto">
                <button
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* TAB 1: LICENSES LIST */}
            {activeTab === 'licenses' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
                  <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search license key, user name, or notes..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none font-mono"
                    />
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                    {(['all', 'active', 'suspended', 'revoked', 'expired'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase whitespace-nowrap transition-colors ${
                          statusFilter === st
                            ? 'bg-zinc-700 text-white font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Licenses Table / List */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                  {filteredLicenses.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                      No licenses found matching criteria.
                    </div>
                  ) : (
                    filteredLicenses.map((lic) => {
                      const isExpired = lic.expiresAt !== null && currentTime > lic.expiresAt;
                      const displayStatus: LicenseStatus = isExpired
                        ? 'expired'
                        : lic.status;

                      return (
                        <div
                          key={lic.id}
                          className="p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-all"
                        >
                          {/* License Info */}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-amber-400 font-bold text-sm tracking-wider">
                                {lic.key}
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                                  displayStatus === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : displayStatus === 'revoked'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : displayStatus === 'expired'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-zinc-700 text-zinc-300'
                                }`}
                              >
                                {displayStatus}
                              </span>

                              {/* Type Badge */}
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                {lic.type.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>

                            {/* Registered User & Expiry */}
                            <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-zinc-200">
                                <User size={12} className="text-amber-400" />
                                <span>{lic.activatedName || lic.assignedName || 'Unassigned'}</span>
                              </span>

                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>
                                  {lic.expiresAt === null
                                    ? 'Never (Lifetime)'
                                    : `Expires: ${new Date(lic.expiresAt).toLocaleDateString()}`}
                                </span>
                              </span>

                              {/* Device pairing count */}
                              <button
                                onClick={() => setSelectedDeviceDetails(lic)}
                                className="flex items-center gap-1 text-sky-400 hover:underline"
                              >
                                <Smartphone size={12} />
                                <span>
                                  {lic.activatedDevices.length} / {lic.maxDevices} Devices
                                </span>
                              </button>
                            </div>

                            {lic.notes && (
                              <span className="text-[10px] text-zinc-500 mt-0.5 italic">
                                Note: {lic.notes}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                            {/* Copy Key */}
                            <button
                              onClick={() => handleCopyKey(lic.key)}
                              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                              title="Copy Key"
                            >
                              {copiedKey === lic.key ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>

                            {/* Quick fill in activation screen */}
                            {onUseLicenseInApp && (
                              <button
                                onClick={() => {
                                  onUseLicenseInApp(
                                    lic.key,
                                    lic.activatedName || lic.assignedName || 'Demo User'
                                  );
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-[10px] transition-colors"
                                title="Activate this license on current device"
                              >
                                Use Key
                              </button>
                            )}

                            {/* Status toggles */}
                            {lic.status === 'active' ? (
                              <button
                                onClick={() => handleUpdateStatus(lic.id, 'revoked')}
                                className="px-2 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold transition-colors"
                                title="Revoke this license"
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(lic.id, 'active')}
                                className="px-2 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold transition-colors"
                                title="Reactivate this license"
                              >
                                Reactivate
                              </button>
                            )}

                            {/* Reset devices */}
                            {lic.activatedDevices.length > 0 && (
                              <button
                                onClick={() => handleResetDevices(lic.id)}
                                className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] transition-colors"
                                title="Reset registered devices"
                              >
                                Reset Devs
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteLicense(lic.id)}
                              className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-200 transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CREATE LICENSE FORM */}
            {activeTab === 'create' && (
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 max-w-lg mx-auto w-full">
                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Plus size={16} className="text-amber-400" />
                  <span>Generate New License</span>
                </h3>
                <p className="text-xs text-zinc-400 mb-5">
                  Create a unique cryptographic license key for individuals or production teams.
                </p>

                {createSuccessMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
                    <span>{createSuccessMsg}</span>
                    <button
                      onClick={() => setCreateSuccessMsg(null)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleCreateLicense} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-zinc-300">Licensee / User Name</label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. David Fincher (or leave blank for open activation)"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono text-zinc-300">License Tier / Duration</label>
                      <select
                        value={createType}
                        onChange={(e) => setCreateType(e.target.value as LicenseType)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      >
                        <option value="30_day">30-Day Monthly License</option>
                        <option value="90_day">90-Day Quarterly License</option>
                        <option value="1_year">1-Year Annual License</option>
                        <option value="lifetime">Lifetime Studio License</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono text-zinc-300">Device Activation Limit</label>
                      <select
                        value={createMaxDevices}
                        onChange={(e) => setCreateMaxDevices(parseInt(e.target.value, 10))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      >
                        <option value={1}>1 Device (Solo)</option>
                        <option value={2}>2 Devices (Standard)</option>
                        <option value={3}>3 Devices (Pro Studio)</option>
                        <option value={5}>5 Devices (Production Team)</option>
                        <option value={10}>10 Devices (Enterprise)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-zinc-300">Custom Key (Optional)</label>
                    <input
                      type="text"
                      value={createCustomKey}
                      onChange={(e) => setCreateCustomKey(e.target.value.toUpperCase())}
                      placeholder="Leave empty for auto-generated CINE-XXXX-XXXX-XXXX"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-amber-300 placeholder-zinc-500 font-mono tracking-wider outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-zinc-300">Internal Notes</label>
                    <input
                      type="text"
                      value={createNotes}
                      onChange={(e) => setCreateNotes(e.target.value)}
                      placeholder="e.g. A-Camera Rig, Production Unit 2"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-3 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300 transition-all"
                  >
                    <KeyRound size={15} />
                    <span>GENERATE & PROVISION LICENSE</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: AUDIT LOGS */}
            {activeTab === 'logs' && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                <div className="text-xs font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Activity size={14} className="text-emerald-400" />
                  <span>Security & Activation Audit Log ({auditLogs.length} events)</span>
                </div>

                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-start justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            log.success ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-bold text-zinc-200 uppercase">{log.action}</span>
                        {log.licenseKey && (
                          <span className="text-amber-400">{log.licenseKey}</span>
                        )}
                        {log.userName && <span className="text-zinc-400">({log.userName})</span>}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 font-sans">{log.details}</p>
                    </div>

                    <div className="text-[10px] text-zinc-500 flex-shrink-0 text-right">
                      <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-MODAL: DEVICE DETAILS MODAL */}
        {selectedDeviceDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-950 border border-white/15 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                <h4 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <Smartphone size={14} className="text-amber-400" />
                  <span>Paired Devices for {selectedDeviceDetails.key}</span>
                </h4>
                <button
                  onClick={() => setSelectedDeviceDetails(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {selectedDeviceDetails.activatedDevices.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono py-4 text-center">
                    No devices currently registered to this key.
                  </p>
                ) : (
                  selectedDeviceDetails.activatedDevices.map((dev, idx) => (
                    <div
                      key={dev.deviceId || idx}
                      className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200">{dev.deviceName}</span>
                        <span className="text-[10px] text-amber-400 uppercase">{dev.platform}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">OS: {dev.os}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                        ID: {dev.deviceId}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Activated: {new Date(dev.activatedAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedDeviceDetails(null)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 text-xs font-mono text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
