// CineGrid Pro — Night Mode Photography Contextual Controls
// Exposure Presets (Auto, 10s, 30s, Custom), Countdown Ring & Stability Guidance.

import React from 'react';
import { Moon, X, Activity } from 'lucide-react';
import type { NightModeConfig, NightExposurePreset } from '../../types/camera';

interface NightModeControlsProps {
  config: NightModeConfig;
  onChangeConfig: (patch: Partial<NightModeConfig>) => void;
  onCancelCapture?: () => void;
}

export const NightModeControls: React.FC<NightModeControlsProps> = ({
  config,
  onChangeConfig,
  onCancelCapture,
}) => {
  const presets: { id: NightExposurePreset; label: string }[] = [
    { id: 'auto', label: 'Auto (3s)' },
    { id: '10s', label: '10s' },
    { id: '30s', label: '30s' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="w-full flex flex-col items-center gap-2 min-w-0">
      {/* Mode Badge & Pipeline Transparency */}
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <Moon size={11} className="text-amber-400" aria-hidden="true" />
        <span className="text-zinc-400">
          {config.isHardwareLongExposure
            ? 'Hardware Long Exposure'
            : 'Computational Multi-Frame Stacking'}
        </span>
      </div>

      {/* When Capturing: Show Progress Ring & Stability Guidance */}
      {config.isCapturing ? (
        <div className="w-full max-w-sm flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900 border border-amber-400/40 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full border-2 border-amber-400/30 flex items-center justify-center">
              <span className="text-[11px] font-mono font-bold text-amber-400">
                {config.remainingSeconds}s
              </span>
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Activity size={12} className="text-amber-400" />
                <span>Hold Device Still</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                Averaging Noise Floor ({config.progressPercent}%)
              </div>
            </div>
          </div>

          {onCancelCapture && (
            <button
              onClick={onCancelCapture}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
              title="Cancel Capture"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ) : (
        /* Presets Selector */
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10">
          {presets.map((p) => {
            const isSelected = config.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onChangeConfig({ preset: p.id })}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  isSelected ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Slider if 'custom' preset is selected and not capturing */}
      {config.preset === 'custom' && !config.isCapturing && (
        <div className="flex items-center gap-3 w-full max-w-xs px-2">
          <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
            {config.customSeconds}s Duration
          </span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={config.customSeconds}
            onChange={(e) => onChangeConfig({ customSeconds: Number(e.target.value) })}
            className="w-full accent-amber-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
