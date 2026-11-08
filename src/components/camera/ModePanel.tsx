import React from 'react';
import { X } from 'lucide-react';

interface ModePanelProps {
  title: string;
  /** Leaves the mode (back to photo). When omitted no close button is shown. */
  onClose?: () => void;
  children: React.ReactNode;
}

/** Shared frame for per-mode controls: title, a close button, and a body that never spills sideways. */
export const ModePanel: React.FC<ModePanelProps> = ({ title, onClose, children }) => (
  <section
    aria-label={title}
    className="mx-3 rounded-3xl bg-zinc-950/90 border border-white/10 overflow-hidden"
  >
    <header className="flex items-center justify-between pl-4 pr-1 h-9 border-b border-white/5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-300">{title}</h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </header>
    <div className="p-2 min-w-0">{children}</div>
  </section>
);
