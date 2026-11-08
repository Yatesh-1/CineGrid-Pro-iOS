import React, { useState } from 'react';
import type { HslSettings, HslColorName } from '../../../types/studio';
import { RotateCcw, Crosshair, Check } from 'lucide-react';

interface HslMixerProps {
  hsl: HslSettings;
  onChangeHsl: (hsl: HslSettings) => void;
  onDone?: () => void;
}

const HSL_COLOR_META: Record<
  HslColorName,
  {
    label: string;
    bg: string;
    hueGradient: string;
    satGradient: string;
    lumGradient: string;
  }
> = {
  red: {
    label: 'Red',
    bg: '#ef4444',
    hueGradient: 'from-pink-600 via-red-500 to-orange-500',
    satGradient: 'from-zinc-600 to-red-500',
    lumGradient: 'from-red-950 via-red-500 to-red-200',
  },
  orange: {
    label: 'Orange',
    bg: '#f97316',
    hueGradient: 'from-red-500 via-orange-500 to-yellow-500',
    satGradient: 'from-zinc-600 to-orange-500',
    lumGradient: 'from-orange-950 via-orange-500 to-orange-200',
  },
  yellow: {
    label: 'Yellow',
    bg: '#eab308',
    hueGradient: 'from-orange-500 via-yellow-500 to-lime-500',
    satGradient: 'from-zinc-600 to-yellow-500',
    lumGradient: 'from-yellow-950 via-yellow-500 to-yellow-200',
  },
  green: {
    label: 'Green',
    bg: '#22c55e',
    hueGradient: 'from-yellow-500 via-green-500 to-emerald-500',
    satGradient: 'from-zinc-600 to-green-500',
    lumGradient: 'from-green-950 via-green-500 to-green-200',
  },
  aqua: {
    label: 'Aqua',
    bg: '#06b6d4',
    hueGradient: 'from-emerald-500 via-cyan-500 to-blue-500',
    satGradient: 'from-zinc-600 to-cyan-500',
    lumGradient: 'from-cyan-950 via-cyan-500 to-cyan-200',
  },
  blue: {
    label: 'Blue',
    bg: '#3b82f6',
    hueGradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    satGradient: 'from-zinc-600 to-blue-500',
    lumGradient: 'from-blue-950 via-blue-500 to-blue-200',
  },
  purple: {
    label: 'Purple',
    bg: '#a855f7',
    hueGradient: 'from-blue-500 via-purple-500 to-pink-500',
    satGradient: 'from-zinc-600 to-purple-500',
    lumGradient: 'from-purple-950 via-purple-500 to-purple-200',
  },
  magenta: {
    label: 'Magenta',
    bg: '#ec4899',
    hueGradient: 'from-purple-500 via-pink-500 to-red-500',
    satGradient: 'from-zinc-600 to-pink-500',
    lumGradient: 'from-pink-950 via-pink-500 to-pink-200',
  },
};

export const HslMixer: React.FC<HslMixerProps> = ({ hsl, onChangeHsl, onDone }) => {
  const [selectedColor, setSelectedColor] = useState<HslColorName>('red');

  const colors: HslColorName[] = [
    'red',
    'orange',
    'yellow',
    'green',
    'aqua',
    'blue',
    'purple',
    'magenta',
  ];

  const handleUpdate = (color: HslColorName, channel: 'hue' | 'saturation' | 'luminance', val: number) => {
    onChangeHsl({
      ...hsl,
      [color]: {
        ...hsl[color],
        [channel]: val,
      },
    });
  };

  const handleResetColor = (color: HslColorName) => {
    onChangeHsl({
      ...hsl,
      [color]: { hue: 0, saturation: 0, luminance: 0 },
    });
  };

  const handleResetAll = () => {
    const clean: HslSettings = { ...hsl };
    colors.forEach((c) => {
      clean[c] = { hue: 0, saturation: 0, luminance: 0 };
    });
    onChangeHsl(clean);
  };

  const activeMeta = HSL_COLOR_META[selectedColor];
  const activeVals = hsl[selectedColor];

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Top Header: Title, Target Picker, Reset & Done button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 font-sans">Color mix</span>
          <button
            type="button"
            className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
            title="Color picker target"
          >
            <Crosshair size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300"
            title="Reset All Colors"
          >
            <RotateCcw size={13} />
          </button>

          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="px-4 py-1 rounded-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700 text-xs font-medium tracking-wide flex items-center gap-1 active:scale-95 transition-all"
            >
              <Check size={12} />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Row of 8 Color Dots (Lightroom Mobile style) */}
      <div className="flex items-center justify-between py-2 px-1">
        {colors.map((c) => {
          const meta = HSL_COLOR_META[c];
          const isSelected = selectedColor === c;
          const isModified =
            hsl[c].hue !== 0 || hsl[c].saturation !== 0 || hsl[c].luminance !== 0;

          return (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className="relative flex items-center justify-center p-1 focus:outline-none"
              title={meta.label}
            >
              <div
                className={`w-5 h-5 rounded-full transition-all ${
                  isSelected
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#090a0d] scale-110 shadow-lg'
                    : 'opacity-90 hover:opacity-100'
                }`}
                style={{ backgroundColor: meta.bg }}
              />
              {isModified && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3 Sliders for Selected Color: Hue, Saturation, Luminance */}
      <div className="flex flex-col gap-4 pt-2">
        {/* Hue Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="text-zinc-300">Hue</span>
            <span className="text-zinc-300 font-mono text-[11px]">{activeVals.hue}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activeVals.hue}
            onChange={(e) => handleUpdate(selectedColor, 'hue', parseInt(e.target.value))}
            className={`w-full h-1 bg-gradient-to-r ${activeMeta.hueGradient} rounded-lg appearance-none cursor-pointer accent-white`}
          />
        </div>

        {/* Saturation Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="text-zinc-300">Saturation</span>
            <span className="text-zinc-300 font-mono text-[11px]">{activeVals.saturation}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activeVals.saturation}
            onChange={(e) => handleUpdate(selectedColor, 'saturation', parseInt(e.target.value))}
            className={`w-full h-1 bg-gradient-to-r ${activeMeta.satGradient} rounded-lg appearance-none cursor-pointer accent-white`}
          />
        </div>

        {/* Luminance Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="text-zinc-300">Luminance</span>
            <span className="text-zinc-300 font-mono text-[11px]">{activeVals.luminance}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activeVals.luminance}
            onChange={(e) => handleUpdate(selectedColor, 'luminance', parseInt(e.target.value))}
            className={`w-full h-1 bg-gradient-to-r ${activeMeta.lumGradient} rounded-lg appearance-none cursor-pointer accent-white`}
          />
        </div>

        {/* Reset this color button */}
        {(activeVals.hue !== 0 || activeVals.saturation !== 0 || activeVals.luminance !== 0) && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => handleResetColor(selectedColor)}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono"
            >
              <RotateCcw size={10} />
              <span>Reset {activeMeta.label}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
