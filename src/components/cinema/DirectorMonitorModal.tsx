import React, { useState } from 'react';
import {
  X,
  Maximize,
  Minimize,
} from 'lucide-react';
import type { CinemaVideoConfig } from '../../types/cinemaVideo';

interface DirectorMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CinemaVideoConfig;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  timecode: string;
}

export const DirectorMonitorModal: React.FC<DirectorMonitorModalProps> = ({
  isOpen,
  onClose,
  config,
  timecode,
}) => {
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [showCropGuides, setShowCropGuides] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between animate-in fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Director Clean Feed Monitor"
    >
      {/* Top Telemetry Overlay */}
      <div className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10 text-white font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-red-600/30 border border-red-500/50 rounded-lg text-red-400 font-bold">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>DIRECTOR FEED</span>
          </div>
          <span className="text-neutral-400">
            {config.productionSlate.roll} · SCENE {config.productionSlate.scene} · TAKE {config.productionSlate.take}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-emerald-400 font-bold text-sm">{timecode}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSafeAreas(!showSafeAreas)}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                showSafeAreas
                  ? 'bg-neutral-200 text-black border-white'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700'
              }`}
            >
              SAFE AREAS
            </button>
            <button
              onClick={() => setShowCropGuides(!showCropGuides)}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                showCropGuides
                  ? 'bg-neutral-200 text-black border-white'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700'
              }`}
            >
              2.39:1 CROP
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-700"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-700"
              aria-label="Close Director Monitor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Framing Guides Over Live Feed */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
        {/* 90% Action Safe Box */}
        {showSafeAreas && (
          <div className="absolute inset-x-[5%] inset-y-[5%] border border-sky-400/40 pointer-events-none rounded-sm">
            <span className="absolute top-1 left-1 text-[10px] font-mono text-sky-400/70">
              90% ACTION SAFE
            </span>
          </div>
        )}

        {/* 80% Title Safe Box */}
        {showSafeAreas && (
          <div className="absolute inset-x-[10%] inset-y-[10%] border border-amber-400/40 pointer-events-none rounded-sm">
            <span className="absolute top-1 left-1 text-[10px] font-mono text-amber-400/70">
              80% TITLE SAFE
            </span>
          </div>
        )}

        {/* 2.39:1 CinemaScope Aspect Ratio Crop Bars */}
        {showCropGuides && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
            <div className="w-full h-[12.5%] bg-black/85 border-b border-neutral-600/60" />
            <div className="w-full h-[12.5%] bg-black/85 border-t border-neutral-600/60" />
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="w-full flex items-center justify-between px-6 py-3 bg-gradient-to-t from-black/80 to-transparent z-10 text-neutral-400 font-mono text-xs">
        <div>
          FORMAT: {config.resolution.toUpperCase()} {config.fps}fps · {config.codec.toUpperCase()} · {config.shutterAngle}° · ISO {config.iso}
        </div>
        <div>
          COLOR: {config.colorProfile.toUpperCase()} {config.applyMonitoringLut ? '(LUT APPLIED)' : '(CLEAN)'}
        </div>
      </div>
    </div>
  );
};
