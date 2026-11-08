// CineGrid Pro — Dual Camera Recording Contextual Controls
// One scrollable row: layout, swap and PIP size. The hardware note sits above it, truncated to one line.

import React from 'react';
import { Layout, Columns, Rows, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DualCameraConfig, PipSize } from '../../types/camera';

interface DualCameraControlsProps {
  config: DualCameraConfig;
  onChangeConfig: (patch: Partial<DualCameraConfig>) => void;
  onSwapCameras: () => void;
}

const chip = (active: boolean) =>
  `h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-colors ${
    active ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-300 border border-white/10 hover:text-white'
  }`;

const LAYOUTS = [
  { id: 'pip', label: 'PIP', title: 'Picture in Picture', Icon: Layout },
  { id: 'split_vertical', label: 'Split V', title: 'Split Screen Vertical', Icon: Rows },
  { id: 'split_horizontal', label: 'Split H', title: 'Split Screen Horizontal', Icon: Columns },
] as const;

export const DualCameraControls: React.FC<DualCameraControlsProps> = ({ config, onChangeConfig, onSwapCameras }) => (
  <div className="w-full flex flex-col gap-1.5 min-w-0">
    {!config.isSupported ? (
      <div className="flex items-center gap-1.5 px-2 text-amber-300 text-[11px]">
        <AlertTriangle size={13} className="flex-shrink-0" aria-hidden="true" />
        <span className="truncate">
          {config.unsupportedReason || 'Single camera bus on this device; dual capture is simulated.'}
        </span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 px-2 text-emerald-400 text-[11px]">
        <CheckCircle2 size={13} className="flex-shrink-0" aria-hidden="true" />
        <span className="truncate">Both sensors recording together</span>
      </div>
    )}

    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1">
      {LAYOUTS.map(({ id, label, title, Icon }) => (
        <button
          key={id}
          onClick={() => onChangeConfig({ layout: id })}
          aria-pressed={config.layout === id}
          className={chip(config.layout === id)}
          title={title}
        >
          <Icon size={14} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}

      <button onClick={onSwapCameras} className={chip(false)} title="Swap Primary and Secondary Cameras">
        <RefreshCw size={14} aria-hidden="true" />
        <span>Swap</span>
      </button>

      {config.layout === 'pip' &&
        (['small', 'medium', 'large'] as PipSize[]).map((s) => (
          <button
            key={s}
            onClick={() => onChangeConfig({ pipSize: s })}
            aria-pressed={config.pipSize === s}
            className={chip(config.pipSize === s)}
            title={`PIP size ${s}`}
          >
            {s[0].toUpperCase()}
          </button>
        ))}
    </div>
  </div>
);
