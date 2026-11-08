import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  User,
  KeyRound,
  Calendar,
  Smartphone,
  RefreshCw,
  LogOut,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { licenseService, type StoredLicenseSession } from '../../services/licenseService';

interface LicenseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeactivate: () => void;
  onOpenContactAdmin: () => void;
}

export const LicenseInfoModal: React.FC<LicenseInfoModalProps> = ({
  isOpen,
  onClose,
  onDeactivate,
  onOpenContactAdmin,
}) => {
  const [session, setSession] = useState<StoredLicenseSession | null>(
    licenseService.getSession()
  );
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRevalidate = async () => {
    setIsRevalidating(true);
    setStatusMessage(null);

    const res = await licenseService.checkInitialActivation();
    setIsRevalidating(false);

    if (res.isActivated && res.session) {
      setSession(res.session);
      setStatusMessage('License revalidated with server: Active.');
    } else {
      setStatusMessage(res.warningMessage || 'License status changed or expired.');
      if (!res.isActivated) {
        setTimeout(() => {
          onDeactivate();
        }, 1500);
      }
    }
  };

  const handleDeactivate = async () => {
    if (confirm('Deactivate this license on this device? You can reactivate it later with your key.')) {
      await licenseService.deactivate();
      onDeactivate();
      onClose();
    }
  };

  const formatType = (type?: string) => {
    if (!type) return 'Standard';
    if (type === 'lifetime') return 'Lifetime Studio Access';
    if (type === '1_year') return '1-Year Annual Pro';
    if (type === '90_day') return '90-Day Quarterly';
    if (type === '30_day') return '30-Day Monthly';
    return type.toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl p-6 shadow-2xl text-white select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">License Information</h2>
              <p className="text-xs text-zinc-400 font-mono">Professional Camera Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Alert if revalidated */}
        {statusMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-zinc-900 border border-amber-400/30 text-amber-300 text-xs font-mono">
            {statusMessage}
          </div>
        )}

        {/* License Details Cards */}
        <div className="flex flex-col gap-3 text-xs">
          {/* Registered User */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-zinc-400">
              <User size={15} className="text-amber-400" />
              <span>Registered Name</span>
            </div>
            <span className="font-bold text-white text-sm">
              {session?.name || 'Authorized Studio Operator'}
            </span>
          </div>

          {/* Status & Tier */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">License Status</span>
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 font-mono text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="uppercase">{session?.status || 'Active'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">License Type</span>
              <div className="flex items-center gap-1 font-bold text-amber-400 font-mono text-xs">
                <Sparkles size={12} />
                <span>{formatType(session?.type)}</span>
              </div>
            </div>
          </div>

          {/* Masked Key */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-zinc-400">
              <KeyRound size={15} className="text-amber-400" />
              <span>License Key</span>
            </div>
            <span className="font-mono text-amber-300 font-bold">
              {session?.licenseKeyMasked || 'CINE-****-****-****'}
            </span>
          </div>

          {/* Dates & Expiration */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-2 text-zinc-400">
                <Calendar size={14} />
                <span>Activation Date</span>
              </span>
              <span className="font-mono">
                {session?.activatedAt ? new Date(session.activatedAt).toLocaleDateString() : 'Active'}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-2 text-zinc-400">
                <Clock size={14} />
                <span>Expiration Date</span>
              </span>
              <span className="font-mono font-bold text-amber-400">
                {session?.expiresAt
                  ? new Date(session.expiresAt).toLocaleDateString()
                  : 'Never (Lifetime Access)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-300 pt-1 border-t border-white/5">
              <span className="flex items-center gap-2 text-zinc-400">
                <Smartphone size={14} />
                <span>Device Activations</span>
              </span>
              <span className="font-mono font-bold text-sky-400">
                {session?.deviceCount || 1} of {session?.maxDevices || 1} Devices Active
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            onClick={handleRevalidate}
            disabled={isRevalidating}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} className={isRevalidating ? 'animate-spin' : ''} />
            <span>Revalidate Status</span>
          </button>

          <button
            onClick={handleDeactivate}
            className="py-2.5 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Release device activation"
          >
            <LogOut size={13} />
            <span>Deactivate</span>
          </button>
        </div>

        {/* Footer Support Link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              onClose();
              onOpenContactAdmin();
            }}
            className="text-[11px] text-zinc-500 hover:text-amber-400 inline-flex items-center gap-1 transition-colors font-mono"
          >
            <HelpCircle size={12} />
            <span>Need key extension? Contact Administrator</span>
          </button>
        </div>
      </div>
    </div>
  );
};
