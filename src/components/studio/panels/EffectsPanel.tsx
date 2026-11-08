import React, { useState } from 'react';
import type { EffectsSettings } from '../../../types/studio';
import { RotateCcw } from 'lucide-react';

interface EffectsPanelProps {
  effects: EffectsSettings;
  onChangeEffects: (effects: EffectsSettings) => void;
  onResetEffects: () => void;
}

type EffectsSubTab = 'effects' | 'vignette' | 'grain';

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  effects,
  onChangeEffects,
  onResetEffects,
}) => {
  const [subTab, setSubTab] = useState<EffectsSubTab>('effects');

  const updateField = (field: keyof EffectsSettings, val: number) => {
    onChangeEffects({ ...effects, [field]: val });
  };

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Sub-tab navigation strip: Effects | Vignette | Grain (matching Screenshots 4, 5, 6) */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-6 text-xs font-medium font-sans">
          {(
            [
              { id: 'effects', label: 'Effects' },
              { id: 'vignette', label: 'Vignette' },
              { id: 'grain', label: 'Grain' },
            ] as const
          ).map((t) => {
            const isSelected = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`relative py-1 transition-colors ${
                  isSelected ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{t.label}</span>
                {isSelected && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onResetEffects}
          className="text-zinc-500 hover:text-zinc-300 p-1"
          title="Reset Effects"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Sub-tab 1: Effects (Texture, Clarity, Dehaze - Screenshot 6) */}
      {subTab === 'effects' && (
        <div className="flex flex-col gap-3.5 pt-2">
          {/* Texture */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Texture</span>
              <span className="text-zinc-300 font-mono text-[11px]">{effects.texture}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={effects.texture}
              onChange={(e) => updateField('texture', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Clarity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Clarity</span>
              <span className="text-zinc-300 font-mono text-[11px]">{effects.clarity}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={effects.clarity}
              onChange={(e) => updateField('clarity', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Dehaze */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Dehaze</span>
              <span className="text-zinc-300 font-mono text-[11px]">{effects.dehaze}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={effects.dehaze}
              onChange={(e) => updateField('dehaze', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}

      {/* Sub-tab 2: Vignette (Amount, Midpoint, Feather - Screenshot 5) */}
      {subTab === 'vignette' && (
        <div className="flex flex-col gap-3.5 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Vignette</span>
              <span className="text-zinc-300 font-mono text-[11px]">{effects.vignette}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={effects.vignette}
              onChange={(e) => updateField('vignette', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-400">Midpoint</span>
              <span className="text-zinc-400 font-mono text-[11px]">{effects.vignetteMidpoint}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={effects.vignetteMidpoint}
              onChange={(e) => updateField('vignetteMidpoint', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-400">Feather</span>
              <span className="text-zinc-400 font-mono text-[11px]">{effects.vignetteFeather}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={effects.vignetteFeather}
              onChange={(e) => updateField('vignetteFeather', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}

      {/* Sub-tab 3: Grain (Grain, Size, Roughness - Screenshot 4) */}
      {subTab === 'grain' && (
        <div className="flex flex-col gap-3.5 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Grain</span>
              <span className="text-zinc-300 font-mono text-[11px]">{effects.grain}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={effects.grain}
              onChange={(e) => updateField('grain', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Size</span>
              <span className="text-zinc-300 font-mono text-[11px]">{effects.grainSize}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={effects.grainSize}
              onChange={(e) => updateField('grainSize', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Roughness</span>
              <span className="text-zinc-300 font-mono text-[11px]">{effects.grainRoughness}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={effects.grainRoughness}
              onChange={(e) => updateField('grainRoughness', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
