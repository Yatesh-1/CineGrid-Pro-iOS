import React from 'react';
import type { MasterPhotographyPreset } from '../types/camera';
import { MASTER_PHOTOGRAPHY_PRESETS } from '../data/gridLibrary';
import { GridMiniaturePreview } from './grid-engine/GridMiniaturePreview';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';

interface MasterPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: MasterPhotographyPreset) => void;
  activePresetId?: string;
}

export const MasterPresetsModal: React.FC<MasterPresetsModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
  activePresetId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="w-full max-w-lg bg-zinc-950/95 border border-white/15 rounded-2xl shadow-2xl flex flex-col text-white max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">Master Photography Presets</h2>
              <span className="text-[10px] text-zinc-400 font-mono">One-touch grid + lens aspect + filter setup</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* List of Presets */}
        <div className="p-4 flex flex-col gap-2.5 overflow-y-auto no-scrollbar">
          {MASTER_PHOTOGRAPHY_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => {
                  onApplyPreset(preset);
                  onClose();
                }}
                className={`flex items-center gap-3.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                    : 'bg-zinc-900/80 border-white/10 hover:border-white/30 hover:bg-zinc-800/80'
                }`}
              >
                {/* Miniature Grid Visual Preview */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-white/15 bg-zinc-950">
                  <GridMiniaturePreview
                    gridType={preset.gridType}
                    color={isActive ? '#facc15' : 'rgba(255,255,255,0.8)'}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate">{preset.name}</h4>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-white/5 flex-shrink-0">
                      {preset.aspectRatio}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 font-medium truncate mt-0.5">
                    {preset.subtitle}
                  </p>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {preset.description}
                  </p>
                </div>

                {/* Apply Arrow / Check */}
                <div className="flex-shrink-0">
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center">
                      <Check size={13} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:text-white">
                      <ArrowRight size={13} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
