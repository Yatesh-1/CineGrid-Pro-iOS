import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** 'fixed' covers the window; 'contain' fills the nearest positioned parent (e.g. the phone shell). */
  scope?: 'fixed' | 'contain';
}

/** Bottom sheet: Escape and backdrop close it, focus moves in and is restored on close. */
export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, title, children, scope = 'fixed' }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`${scope === 'fixed' ? 'fixed' : 'absolute'} inset-0 z-50 flex items-end justify-center bg-black/60`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[75%] flex flex-col bg-[#0c0d10] text-white rounded-t-3xl border-t border-white/10 outline-none"
      >
        <header className="flex items-center justify-between pl-4 pr-1 border-b border-white/10">
          <h2 className="text-sm font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto py-3 safe-bottom">{children}</div>
      </div>
    </div>
  );
};
