import React, { useState } from 'react';
import type { LightSettings, ToneCurves } from '../../../types/studio';
import { ToneCurveEditor } from './ToneCurveEditor';
import { RotateCcw, TrendingUp, Sparkles } from 'lucide-react';

interface LightPanelProps {
  light: LightSettings;
  onChangeLight: (light: LightSettings) => void;
  curves: ToneCurves;
  onChangeCurves: (curves: ToneCurves) => void;
  onResetLight: () => void;
  onAutoTone?: () => void;
}

export const LightPanel: React.FC<LightPanelProps> = ({
  light,
  onChangeLight,
  curves,
  onChangeCurves,
  onResetLight,
  onAutoTone,
}) => {
  const [showCurve, setShowCurve] = useState(false);
  const [isHdr, setIsHdr] = useState(false);

  const updateField = (field: keyof LightSettings, val: number) => {
    onChangeLight({ ...light, [field]: val });
  };

  const handleToggleHdr = () => {
    const next = !isHdr;
    setIsHdr(next);
    if (next) {
      // Apply balanced HDR dynamic range tone expansion
      onChangeLight({
        ...light,
        highlights: -30,
        shadows: 35,
        contrast: 15,
        whites: 10,
        blacks: -10,
      });
    } else {
      onChangeLight({
        ...light,
        highlights: 0,
        shadows: 0,
        contrast: 0,
        whites: 0,
        blacks: 0,
      });
    }
  };

  const sliders: {
    field: keyof LightSettings;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { field: 'exposure', label: 'Exposure', min: -5.0, max: 5.0, step: 0.05 },
    { field: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1 },
    { field: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1 },
    { field: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1 },
    { field: 'whites', label: 'Whites', min: -100, max: 100, step: 1 },
    { field: 'blacks', label: 'Blacks', min: -100, max: 100, step: 1 },
  ];

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Top Header Row with HDR toggle, Curve toggle, and Auto button (Lightroom Mobile style) */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          {/* HDR toggle switch */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleHdr}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${
                isHdr ? 'bg-amber-400' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isHdr ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-sans text-zinc-300">HDR</span>
          </div>

          {/* Curve button */}
          <button
            type="button"
            onClick={() => setShowCurve(!showCurve)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showCurve
                ? 'bg-amber-400 text-black border-amber-400 font-bold'
                : 'bg-zinc-800 text-zinc-200 border-white/10 hover:bg-zinc-700'
            }`}
          >
            <TrendingUp size={13} />
            <span>Curve</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onAutoTone && (
            <button
              type="button"
              onClick={onAutoTone}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs border border-white/10"
              title="Auto Tone Adjustment"
            >
              <Sparkles size={11} className="text-amber-400" />
              <span>Auto</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetLight}
            className="text-zinc-500 hover:text-zinc-300 p-1"
            title="Reset Light Adjustments"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {showCurve ? (
        <div className="pt-1">
          <ToneCurveEditor curves={curves} onChangeCurves={onChangeCurves} />
        </div>
      ) : (
        /* Sliders List (matching Screenshot 1) */
        <div className="flex flex-col gap-3.5 pt-1">
          {sliders.map((s) => {
            const val = light[s.field];

            return (
              <div key={s.field} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-zinc-300">{s.label}</span>
                  <span className="text-zinc-300 font-mono text-[11px]">
                    {s.field === 'exposure' ? (val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)) : val}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={val}
                  onChange={(e) => updateField(s.field, parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
