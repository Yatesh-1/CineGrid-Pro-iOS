// CineGrid Pro — Time-Lapse Video Contextual Controls
// Interval selector (0.5s to 30s), Real-time Frame Counter, Output Duration Estimator, and Exposure Lock.

import React from 'react';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import type { TimelapseConfig, TimelapseInterval } from '../../types/camera';

interface TimelapseControlsProps {
  config: TimelapseConfig;
  onChangeConfig: (patch: Partial<TimelapseConfig>) => void;
  isRecording?: boolean;
  batteryWarning?: string;
  storageWarning?: string;
}

export const TimelapseControls: React.FC<TimelapseControlsProps> = ({
  config,
  onChangeConfig,
  isRecording = false,
  batteryWarning,
  storageWarning,
}) => {
  const intervals: TimelapseInterval[] = [0.5, 1, 2, 5, 10, 30];

  const estimatedOutputSec = (config.capturedFrames / config.outputFps).toFixed(1);

  return (
    <div className="w-full flex flex-col items-center gap-2 min-w-0">
      {/* Warnings Banner if low storage or battery */}
      {(batteryWarning || storageWarning) && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono">
          <AlertTriangle size={12} className="text-rose-400 flex-shrink-0" />
          <span className="line-clamp-1">{batteryWarning || storageWarning}</span>
        </div>
      )}

      {/* Recording Status Header or Interval Selector */}
      {isRecording ? (
        <div className="flex items-center justify-between w-full max-w-sm px-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{config.capturedFrames} FRAMES</span>
          </div>
          <div className="text-zinc-400">
            Real: {Math.floor(config.realDurationSeconds / 60)}m {config.realDurationSeconds % 60}s
          </div>
          <div className="text-emerald-400 font-bold">
            Output: ~{estimatedOutputSec}s
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full max-w-sm gap-2">
          {/* Interval Buttons */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
            {intervals.map((sec) => {
              const isSelected = config.interval === sec;
              return (
                <button
                  key={sec}
                  onClick={() => onChangeConfig({ interval: sec })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    isSelected ? 'bg-amber-400 text-black shadow' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              );
            })}
          </div>

          {/* Exposure Lock Toggle */}
          <button
            onClick={() => onChangeConfig({ lockExposure: !config.lockExposure })}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold transition-all ${
              config.lockExposure
                ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                : 'bg-zinc-900 border-white/10 text-zinc-400'
            }`}
            title="Lock exposure to eliminate time-lapse flickering"
          >
            {config.lockExposure ? <Lock size={12} /> : <Unlock size={12} />}
            <span>{config.lockExposure ? 'AE/AF Locked' : 'AE/AF Auto'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
