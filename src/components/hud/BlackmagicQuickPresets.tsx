import React, { useState } from 'react';
import type { ProSettings, CameraMode } from '../../types/camera';
import {
  BLACKMAGIC_VIDEO_PRESETS,
  BLACKMAGIC_PHOTO_PRESETS,
  type BlackmagicCameraPreset,
} from '../../data/blackmagicPresets';
import { X, Film, Camera, Sparkles } from 'lucide-react';

interface BlackmagicQuickPresetsProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: 'photo' | 'video' | CameraMode;
  onApplyPreset: (preset: BlackmagicCameraPreset) => void;
  currentSettings?: ProSettings;
}

export const BlackmagicQuickPresets: React.FC<BlackmagicQuickPresetsProps> = ({
  isOpen,
  onClose,
  activeMode,
  onApplyPreset,
}) => {
  const isVideo =
    activeMode === 'video' ||
    activeMode === 'dual' ||
    activeMode === 'slow_motion' ||
    activeMode === 'timelapse';
  const [tab, setTab] = useState<'video' | 'photo'>(isVideo ? 'video' : 'photo');

  if (!isOpen) return null;

  const presets = tab === 'video' ? BLACKMAGIC_VIDEO_PRESETS : BLACKMAGIC_PHOTO_PRESETS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950/95 border border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider uppercase text-white">
              Blackmagic Camera Presets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 rounded-xl border border-white/10 text-xs font-mono font-bold">
          <button
            onClick={() => setTab('video')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'video' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film size={14} />
            CINEMA VIDEO
          </button>
          <button
            onClick={() => setTab('photo')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'photo' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera size={14} />
            PRO PHOTO
          </button>
        </div>

        {/* Preset Cards List */}
        <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar max-h-[60vh] pr-0.5">
          {presets.map((p) => {
            return (
              <div
                key={p.id}
                onClick={() => {
                  onApplyPreset(p);
                  onClose();
                }}
                className="group relative p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-amber-400/50 cursor-pointer transition-all active:scale-[0.99] flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 border border-white/15 text-amber-300">
                      {p.badge}
                    </span>
                  </div>
                  <Sparkles size={13} className="text-zinc-500 group-hover:text-amber-400 transition-colors" />
                </div>

                <div className="text-[11px] text-amber-200/80 font-mono font-medium">
                  {p.subtitle}
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
