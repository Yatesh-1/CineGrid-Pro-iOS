// CineGrid Pro — Slow Motion Video Recording Contextual Controls
// Frame Rate Selection (60, 120, 240 FPS), Playback Speed Multiplier, and Sensor Limits.

import React from 'react';
import { Gauge } from 'lucide-react';
import type { SlowMotionConfig, SlowMoFpsOption, SlowMoPlaybackSpeed } from '../../types/camera';

interface SlowMoControlsProps {
  config: SlowMotionConfig;
  onChangeConfig: (patch: Partial<SlowMotionConfig>) => void;
  isRecording?: boolean;
}

export const SlowMoControls: React.FC<SlowMoControlsProps> = ({
  config,
  onChangeConfig,
  isRecording = false,
}) => {
  const fpsOptions: SlowMoFpsOption[] = [60, 120, 240];
  const speedOptions: { speed: SlowMoPlaybackSpeed; label: string }[] = [
    { speed: 0.5, label: '0.5x (Half)' },
    { speed: 0.25, label: '0.25x (1/4)' },
    { speed: 0.125, label: '0.125x (1/8)' },
  ];

  return (
    <div className="w-full flex flex-col items-center gap-2 min-w-0">
      {/* Sensor Capability Label */}
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <span className="flex items-center gap-1 text-sky-400 font-bold">
          <Gauge size={11} />
          <span>SLOW MOTION</span>
        </span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-400">
          Sensor Cap: {Math.round(config.supportedMaxFps)} FPS (Max)
        </span>
      </div>

      {/* FPS & Speed Bar */}
      <div className="flex items-center justify-between w-full max-w-sm gap-2">
        {/* Target Frame Rate */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10">
          {fpsOptions.map((fps) => {
            const isSelected = config.targetFps === fps;
            const isSupported = config.supportedMaxFps >= fps - 1;

            return (
              <button
                key={fps}
                onClick={() => onChangeConfig({ targetFps: fps })}
                disabled={isRecording}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? 'bg-sky-400 text-black shadow'
                    : isSupported
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-zinc-600 cursor-not-allowed'
                }`}
                title={isSupported ? `Record at ${fps} FPS` : 'Unsupported by sensor'}
              >
                {fps}
              </button>
            );
          })}
        </div>

        {/* Playback Speed Multiplier */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10">
          {speedOptions.map((opt) => {
            const isSelected = config.playbackSpeed === opt.speed;

            return (
              <button
                key={opt.speed}
                onClick={() => onChangeConfig({ playbackSpeed: opt.speed })}
                disabled={isRecording}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  isSelected ? 'bg-amber-400 text-black shadow' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {opt.speed}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
