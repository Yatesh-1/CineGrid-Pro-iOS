// CineGrid Pro — Wide Selfie Framing Contextual Controls
// 1x Normal vs 0.7x/0.5x Wide FOV toggle and the optional Group Selfie Framing Guide.
// Rendered as a compact pill floating over the viewfinder so it never changes the viewfinder's size.

import React from 'react';
import { Users } from 'lucide-react';
import type { WideSelfieConfig, WideSelfieFraming } from '../../types/camera';

interface WideSelfieControlsProps {
  config: WideSelfieConfig;
  onChangeConfig: (patch: Partial<WideSelfieConfig>) => void;
  onToggleFraming: (framing: WideSelfieFraming) => void;
  isFrontFacing: boolean;
}

export const WideSelfieControls: React.FC<WideSelfieControlsProps> = ({
  config,
  onChangeConfig,
  onToggleFraming,
  isFrontFacing,
}) => {
  if (!isFrontFacing) return null;

  const seg = (active: boolean) =>
    `px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
      active ? 'bg-amber-400 text-black' : 'text-zinc-200'
    }`;

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/10">
      <button onClick={() => onToggleFraming('normal')} className={seg(config.framing === 'normal')}>
        1x
      </button>
      <button onClick={() => onToggleFraming('wide')} className={seg(config.framing === 'wide')}>
        {config.hasHardwareUltraWide ? '0.5x' : '0.7x'}
      </button>
      <button
        onClick={() => onChangeConfig({ groupGuideOverlay: !config.groupGuideOverlay })}
        className={`${seg(config.groupGuideOverlay)} flex items-center gap-1.5`}
        title="Show group alignment boxes"
        aria-label="Group guide"
        aria-pressed={config.groupGuideOverlay}
      >
        <Users size={14} />
        Group
      </button>
    </div>
  );
};
