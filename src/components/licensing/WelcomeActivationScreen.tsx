import React, { useState } from 'react';
import { Camera, KeyRound, User, ShieldCheck, AlertCircle, Loader2, Sparkles, HelpCircle, Lock } from 'lucide-react';
import { licenseService } from '../../services/licenseService';

interface WelcomeActivationScreenProps {
  onActivated: () => void;
  onOpenAdmin?: () => void;
  onOpenContactAdmin: () => void;
  initialMessage?: string;
}

export const WelcomeActivationScreen: React.FC<WelcomeActivationScreenProps> = ({
  onActivated,
  onOpenAdmin,
  onOpenContactAdmin,
  initialMessage,
}) => {
  const [name, setName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialMessage || '');
  const [successMessage, setSuccessMessage] = useState('');

  // Format license key input as CINE-XXXX-XXXX-XXXX
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length > 16) raw = raw.slice(0, 16);

    // Auto-dash formatting
    const parts: string[] = [];
    if (raw.length > 0) parts.push(raw.slice(0, 4));
    if (raw.length > 4) parts.push(raw.slice(4, 8));
    if (raw.length > 8) parts.push(raw.slice(8, 12));
    if (raw.length > 12) parts.push(raw.slice(12, 16));

    setLicenseKey(parts.join('-'));
    setErrorMessage('');
  };

  const handleUseSampleKey = () => {
    setName('Studio Pro User');
    setLicenseKey('CINE-PRO1-YEAR-9988');
    setErrorMessage('');
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Studio Pro User';
    let cleanKey = licenseKey.trim().toUpperCase();

    if (!cleanKey) {
      setErrorMessage('Please enter your license key.');
      return;
    }

    // Auto-format key to CINE prefix if user entered short key or plain characters
    if (!cleanKey.startsWith('CINE')) {
      const alphaNum = cleanKey.replace(/[^A-Z0-9]/g, '');
      cleanKey = `CINE-${alphaNum.padEnd(12, '0').slice(0, 12)}`;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await licenseService.activate(cleanName, cleanKey);

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(res.message || 'License activated successfully.');
      setTimeout(() => {
        onActivated();
      }, 500);
    } else {
      setErrorMessage(res.message || 'Unable to activate license.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050608] text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none relative overflow-y-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Branding / Logo */}
      <div className="w-full max-w-md flex items-center justify-between pt-3 pb-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20">
            <Camera size={19} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wider text-zinc-100 font-mono">CINEGRID PRO</span>
            <span className="text-[10px] text-amber-400 font-mono">BLACKMAGIC CAMERA STUDIO</span>
          </div>
        </div>

        <button
          onClick={onOpenContactAdmin}
          className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10"
        >
          <HelpCircle size={13} />
          <span>Support</span>
        </button>
      </div>

      {/* Main Activation Card */}
      <div className="w-full max-w-md my-auto py-6 px-5 sm:px-8 bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-10">
        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-mono font-bold mb-3">
            <Sparkles size={12} />
            <span>AUTHENTICATED ACCESS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            Welcome to Professional Camera Studio
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Enter your name and license key provided by the administrator to activate your application.
          </p>
        </div>

        {/* Error / Success Feedback Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Activation Form */}
        <form onSubmit={handleActivate} className="flex flex-col gap-4">
          {/* Field 1: Your Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
              <User size={13} className="text-amber-400" />
              <span>Your Name</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="e.g. Sarah Jenkins"
                className="w-full bg-zinc-900/90 border border-white/15 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner font-sans"
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          {/* Field 2: License Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
              <KeyRound size={13} className="text-amber-400" />
              <span>License Key</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={licenseKey}
                onChange={handleKeyChange}
                placeholder="CINE-XXXX-XXXX-XXXX"
                className="w-full bg-zinc-900/90 border border-white/15 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono tracking-widest uppercase placeholder-zinc-600 outline-none transition-all shadow-inner"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Format: 16-character key (CINE-...)</span>
              <button
                type="button"
                onClick={handleUseSampleKey}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Use Sample Key
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-2">
            {/* Golden Primary Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold text-sm font-mono tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>VALIDATING KEY...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>ACTIVATE LICENSE</span>
                </>
              )}
            </button>

            {/* Secondary Button: Contact Administrator */}
            <button
              type="button"
              onClick={onOpenContactAdmin}
              className="w-full py-2 px-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 font-mono text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <span>Contact Administrator / Sample Keys</span>
            </button>
          </div>
        </form>

        {/* Device Registration & Security Notice */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            🔒 Hardware-bound installation. Your license will be securely registered with this device and permits offline shooting once activated.
          </p>
        </div>
      </div>

      {/* Bottom Footer: Admin Portal Link */}
      <div className="w-full max-w-md flex items-center justify-between py-3 text-xs text-zinc-500 z-10 font-mono">
        <span>CineGrid Studio v2.6.0</span>
        {onOpenAdmin ? (
          <button
            onClick={onOpenAdmin}
            className="hover:text-amber-400 flex items-center gap-1 transition-colors"
            title="Open Administrator License Dashboard"
          >
            <Lock size={12} />
            <span>Admin Portal</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
