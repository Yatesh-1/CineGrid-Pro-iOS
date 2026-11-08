import React from 'react';
import {
  Activity,
  Layers,
  BarChart2,
  Disc,
  Sliders,
  Eye,
  Zap,
  Image,
  X,
  Check,
} from 'lucide-react';
import type { CinemaMonitoringTool, CinemaVideoConfig } from '../../types/cinemaVideo';

interface CinemaMonitoringDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: CinemaVideoConfig;
  onToggleTool: (tool: CinemaMonitoringTool) => void;
  onUpdateConfig: (partial: Partial<CinemaVideoConfig>) => void;
}

export const CinemaMonitoringDrawer: React.FC<CinemaMonitoringDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onToggleTool,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  const tools: {
    id: CinemaMonitoringTool;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'false_color',
      name: 'False Color',
      description: 'ARRI/RED standard exposure IRE zones',
      icon: <Activity className="w-5 h-5 text-pink-400" />,
      color: 'pink',
    },
    {
      id: 'waveform',
      name: 'Waveform',
      description: '0–100 IRE green phosphor luma trace',
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      color: 'emerald',
    },
    {
      id: 'rgb_parade',
      name: 'RGB Parade',
      description: 'Independent Red, Green, Blue channel levels',
      icon: <Sliders className="w-5 h-5 text-sky-400" />,
      color: 'sky',
    },
    {
      id: 'vectorscope',
      name: 'Vectorscope',
      description: 'Polar chrominance & skin-tone reference',
      icon: <Disc className="w-5 h-5 text-purple-400" />,
      color: 'purple',
    },
    {
      id: 'zebra',
      name: 'Zebra',
      description: 'Diagonal hash stripes on highlights',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      color: 'amber',
    },
    {
      id: 'peaking',
      name: 'Peaking',
      description: 'High-contrast edge focus assist',
      icon: <Eye className="w-5 h-5 text-green-400" />,
      color: 'green',
    },
    {
      id: 'histogram',
      name: 'Histogram',
      description: '256-bin RGB and luminance distribution',
      icon: <BarChart2 className="w-5 h-5 text-yellow-400" />,
      color: 'yellow',
    },
    {
      id: 'lut',
      name: 'LUT',
      description: 'Monitoring 3D LUT color transform',
      icon: <Image className="w-5 h-5 text-rose-400" />,
      color: 'rose',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Cinema Monitoring Tools"
    >
      <div className="w-full max-w-xl bg-[#0d1117] border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-mono">
                Monitoring Scopes & Tools
              </h2>
              <p className="text-[11px] text-neutral-400">
                Real-time GPU frame analysis · SmallHD inspired
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close Monitoring Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8-Grid Tools Layout */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 overflow-y-auto">
          {tools.map((t) => {
            const isActive = config.activeScopes.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => onToggleTool(t.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-neutral-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                    : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40'
                }`}
                aria-pressed={isActive}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="p-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
                    {t.icon}
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {isActive ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="font-medium text-xs text-white">{t.name}</div>
                <div className="text-[10px] text-neutral-400 leading-tight mt-0.5 line-clamp-2">
                  {t.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Tool Adjusters (Peaking Color, Zebra Threshold, LUT Mode) */}
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-900/40 flex flex-wrap gap-4 items-center justify-between text-xs">
          {/* Peaking Assist Color */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 font-mono">Peaking Color:</span>
            <div className="flex items-center gap-1.5">
              {(['green', 'red', 'blue', 'amber', 'white'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateConfig({ focusPeakingColor: c })}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    config.focusPeakingColor === c ? 'scale-125 border-white ring-1 ring-white' : 'border-transparent opacity-60'
                  }`}
                  style={{
                    backgroundColor:
                      c === 'green'
                        ? '#22c55e'
                        : c === 'red'
                        ? '#ef4444'
                        : c === 'blue'
                        ? '#3b82f6'
                        : c === 'amber'
                        ? '#f59e0b'
                        : '#ffffff',
                  }}
                  title={`Peaking ${c}`}
                  aria-label={`Peaking color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* LUT Mode Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 font-mono">LUT Pipeline:</span>
            <button
              onClick={() => onUpdateConfig({ applyMonitoringLut: !config.applyMonitoringLut })}
              className={`px-2 py-0.5 text-[10px] font-mono rounded border flex items-center gap-1 transition-colors ${
                config.applyMonitoringLut
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              {config.applyMonitoringLut ? <Check className="w-3 h-3" /> : null}
              {config.applyMonitoringLut ? 'Monitoring LUT Active' : 'LUT Bypassed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
