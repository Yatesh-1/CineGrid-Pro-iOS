import React from 'react';
import { X, HelpCircle, Mail, ShieldAlert, Copy, Check } from 'lucide-react';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSampleKey?: (key: string, name: string) => void;
}

export const ContactAdminModal: React.FC<ContactAdminModalProps> = ({
  isOpen,
  onClose,
  onSelectSampleKey,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleDemoKeys = [
    {
      name: 'Studio Lifetime Access',
      key: 'CINE-LIFE-STUD-2026',
      desc: 'Full lifetime access with 3 device activations',
      type: 'Lifetime',
    },
    {
      name: 'Commercial Production Pro',
      key: 'CINE-PRO1-YEAR-9988',
      desc: 'Annual 1-Year license with 2 device activations',
      type: '1-Year',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/15 rounded-3xl p-6 shadow-2xl text-white select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">License Support</h2>
              <p className="text-xs text-zinc-400 font-mono">Contact Administrator & Demo Keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 leading-relaxed text-zinc-300">
            <p className="mb-2">
              <strong className="text-white">How to obtain a license:</strong> Licenses are provisioned and distributed exclusively by your organization’s administrator or camera department manager.
            </p>
            <p className="flex items-center gap-1.5 text-amber-400 font-mono">
              <Mail size={13} />
              <span>Contact: admin@cinegridstudio.com</span>
            </p>
          </div>

          {/* Quick Demo Evaluation Keys */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-zinc-400 font-bold uppercase text-[10px]">
                Demo & Evaluation Keys (Included with System)
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {sampleDemoKeys.map((item) => (
                <div
                  key={item.key}
                  className="p-3 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between gap-2 hover:border-amber-400/40 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-200 text-xs">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                        {item.type}
                      </span>
                    </div>
                    <span className="font-mono text-amber-400 font-bold text-xs tracking-wider mt-0.5">
                      {item.key}
                    </span>
                    <span className="text-[10px] text-zinc-400">{item.desc}</span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(item.key)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                      title="Copy Key"
                    >
                      {copiedKey === item.key ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    {onSelectSampleKey && (
                      <button
                        onClick={() => {
                          onSelectSampleKey(item.key, 'Evaluation User');
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-black font-bold font-mono text-[10px] hover:bg-amber-300 transition-colors"
                      >
                        Use Key
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 flex items-start gap-2 text-[11px] text-zinc-400">
            <ShieldAlert size={15} className="text-zinc-500 mt-0.5 flex-shrink-0" />
            <span>
              Administrator credentials can be used in the <strong>Admin Portal</strong> at the bottom of the welcome screen to issue new keys, revoke licenses, or reset device limits.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
