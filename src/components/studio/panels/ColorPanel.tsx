import React, { useState } from 'react';
import type { ColorSettings, HslSettings, ColorGradingSettings } from '../../../types/studio';
import { HslMixer } from './HslMixer';
import { ColorWheel } from './ColorWheel';
import { RotateCcw } from 'lucide-react';

interface ColorPanelProps {
  color: ColorSettings;
  onChangeColor: (color: ColorSettings) => void;
  hsl: HslSettings;
  onChangeHsl: (hsl: HslSettings) => void;
  colorGrading: ColorGradingSettings;
  onChangeColorGrading: (cg: ColorGradingSettings) => void;
  onResetColor: () => void;
  onAiAutoGrade?: () => void;
}

export const ColorPanel: React.FC<ColorPanelProps> = ({
  color,
  onChangeColor,
  hsl,
  onChangeHsl,
  colorGrading,
  onChangeColorGrading,
  onResetColor,
  onAiAutoGrade,
}) => {
  const [isColorMixActive, setIsColorMixActive] = useState(false);
  const [showGrading, setShowGrading] = useState(false);

  const updateColorField = (field: keyof ColorSettings, val: number) => {
    onChangeColor({ ...color, [field]: val });
  };

  if (isColorMixActive) {
    return (
      <HslMixer
        hsl={hsl}
        onChangeHsl={onChangeHsl}
        onDone={() => setIsColorMixActive(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Header with Color mix & Reset button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsColorMixActive(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium border border-white/10 active:scale-95 transition-all shadow-sm"
          >
            <div className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <span>Color mix</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGrading(!showGrading)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              showGrading
                ? 'bg-amber-400 text-black border-amber-400 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border-white/10'
            }`}
          >
            Color Grading
          </button>

          {onAiAutoGrade && (
            <button
              type="button"
              onClick={onAiAutoGrade}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
              title="Automatic scene-aware AI color grading"
            >
              <span>AI Auto</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onResetColor}
          className="text-zinc-500 hover:text-zinc-300 p-1"
          title="Reset Color"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {showGrading ? (
        <div className="flex flex-col gap-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <ColorWheel
              label="Shadows"
              value={colorGrading.shadows}
              onChange={(val) => onChangeColorGrading({ ...colorGrading, shadows: val })}
            />
            <ColorWheel
              label="Highlights"
              value={colorGrading.highlights}
              onChange={(val) => onChangeColorGrading({ ...colorGrading, highlights: val })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorWheel
              label="Midtones"
              value={colorGrading.midtones}
              onChange={(val) => onChangeColorGrading({ ...colorGrading, midtones: val })}
            />
            <ColorWheel
              label="Global"
              value={colorGrading.global}
              onChange={(val) => onChangeColorGrading({ ...colorGrading, global: val })}
            />
          </div>
        </div>
      ) : (
        /* Temperature, Tint, Vibrance, Saturation (matching Screenshot 2) */
        <div className="flex flex-col gap-3.5 pt-1">
          {/* Temperature */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Temp</span>
              <span className="text-zinc-300 font-mono text-[11px]">{color.temperature}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={color.temperature}
              onChange={(e) => updateColorField('temperature', parseInt(e.target.value))}
              className="w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-400 to-amber-400 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Tint */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Tint</span>
              <span className="text-zinc-300 font-mono text-[11px]">{color.tint}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={color.tint}
              onChange={(e) => updateColorField('tint', parseInt(e.target.value))}
              className="w-full h-1 bg-gradient-to-r from-emerald-500 via-zinc-600 to-pink-500 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Vibrance */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Vibrance</span>
              <span className="text-zinc-300 font-mono text-[11px]">{color.vibrance}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={color.vibrance}
              onChange={(e) => updateColorField('vibrance', parseInt(e.target.value))}
              className="w-full h-1 bg-gradient-to-r from-zinc-600 via-emerald-700 to-orange-500 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Saturation */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Saturation</span>
              <span className="text-zinc-300 font-mono text-[11px]">{color.saturation}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={color.saturation}
              onChange={(e) => updateColorField('saturation', parseInt(e.target.value))}
              className="w-full h-1 bg-gradient-to-r from-zinc-600 to-amber-500 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
