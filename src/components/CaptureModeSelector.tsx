// CineGrid Pro — Horizontally Scrollable Capture Mode Selector
// iOS-inspired camera mode selector with tactile snap scrolling & accessible touch targets

import React, { useRef, useEffect } from 'react';
import type { CameraMode } from '../types/camera';

interface CaptureModeSelectorProps {
  activeMode: CameraMode;
  onSelectMode: (mode: CameraMode) => void;
  disabled?: boolean;
}

interface ModeItem {
  id: CameraMode;
  label: string;
  badge?: string;
}

const MODES: ModeItem[] = [
  { id: 'photo', label: 'PHOTO' },
  { id: 'video', label: 'VIDEO' },
  { id: 'portrait', label: 'PORTRAIT' },
  { id: 'night', label: 'NIGHT' },
  { id: 'panorama', label: 'PANO' },
  { id: 'dual', label: 'DUAL' },
  { id: 'slow_motion', label: 'SLOW-MO' },
  { id: 'timelapse', label: 'TIME-LAPSE' },
];

export const CaptureModeSelector: React.FC<CaptureModeSelectorProps> = ({
  activeMode,
  onSelectMode,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active mode into horizontal center
  useEffect(() => {
    if (activeBtnRef.current && containerRef.current) {
      const container = containerRef.current;
      const btn = activeBtnRef.current;
      const targetScroll = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          left: targetScroll,
          behavior: 'smooth',
        });
      } else {
        container.scrollLeft = targetScroll;
      }
    }
  }, [activeMode]);

  return (
    <div className="relative w-full overflow-hidden select-none mb-0.5">
      {/* Subtle fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#050608] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050608] to-transparent z-10" />

      {/* Horizontal scroll container */}
      <div
        ref={containerRef}
        role="tablist" aria-label="Capture mode" className="flex items-center gap-6 px-[42%] overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {MODES.map((mode) => {
          const isActive = activeMode === mode.id;

          return (
            <button
              key={mode.id}
              ref={isActive ? activeBtnRef : null}
              onClick={() => {
                if (!disabled && !isActive) {
                  onSelectMode(mode.id);
                }
              }}
              disabled={disabled}
              role="tab" aria-selected={isActive} className={`snap-center relative whitespace-nowrap text-xs font-semibold tracking-wide h-8 px-1 transition-colors active:opacity-60 ${
                isActive
                  ? 'text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{mode.label}</span>

            </button>
          );
        })}
      </div>
    </div>
  );
};
