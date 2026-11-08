import React, { useState } from 'react';
import type { DetailSettings, OpticsSettings } from '../../../types/studio';
import { RotateCcw } from 'lucide-react';

interface DetailOpticsPanelProps {
  detail: DetailSettings;
  onChangeDetail: (detail: DetailSettings) => void;
  optics: OpticsSettings;
  onChangeOptics: (optics: OpticsSettings) => void;
  onResetDetailOptics: () => void;
}

type DetailSubTab = 'sharpening' | 'noise' | 'colorNoise' | 'optics';

export const DetailOpticsPanel: React.FC<DetailOpticsPanelProps> = ({
  detail,
  onChangeDetail,
  optics,
  onChangeOptics,
  onResetDetailOptics,
}) => {
  const [subTab, setSubTab] = useState<DetailSubTab>('sharpening');

  const updateDetail = (field: keyof DetailSettings, val: number) => {
    onChangeDetail({ ...detail, [field]: val });
  };

  const updateOptics = (field: keyof OpticsSettings, val: number) => {
    onChangeOptics({ ...optics, [field]: val });
  };

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Sub-tab strip: Sharpening | Noise | Color noise | Optics (matching Screenshots 7, 8, 9) */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-5 text-xs font-medium font-sans">
          {(
            [
              { id: 'sharpening', label: 'Sharpening' },
              { id: 'noise', label: 'Noise' },
              { id: 'colorNoise', label: 'Color noise' },
              { id: 'optics', label: 'Optics' },
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
          onClick={onResetDetailOptics}
          className="text-zinc-500 hover:text-zinc-300 p-1"
          title="Reset Detail Adjustments"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Sub-tab 1: Sharpening (Screenshot 7) */}
      {subTab === 'sharpening' && (
        <div className="flex flex-col gap-3.5 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Sharpening</span>
              <span className="text-zinc-300 font-mono text-[11px]">{detail.sharpening}</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={detail.sharpening}
              onChange={(e) => updateDetail('sharpening', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-400">Radius</span>
              <span className="text-zinc-400 font-mono text-[11px]">{detail.sharpRadius}px</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={detail.sharpRadius}
              onChange={(e) => updateDetail('sharpRadius', parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-400">Detail</span>
              <span className="text-zinc-400 font-mono text-[11px]">{detail.sharpDetail}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={detail.sharpDetail}
              onChange={(e) => updateDetail('sharpDetail', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-400">Masking</span>
              <span className="text-zinc-400 font-mono text-[11px]">{detail.sharpMasking}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={detail.sharpMasking}
              onChange={(e) => updateDetail('sharpMasking', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}

      {/* Sub-tab 2: Luminance Noise (Screenshot 8) */}
      {subTab === 'noise' && (
        <div className="flex flex-col gap-3.5 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Luminance</span>
              <span className="text-zinc-300 font-mono text-[11px]">{detail.noiseReduction}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={detail.noiseReduction}
              onChange={(e) => updateDetail('noiseReduction', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-400">Detail</span>
              <span className="text-zinc-400 font-mono text-[11px]">{detail.noiseDetail}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={detail.noiseDetail}
              onChange={(e) => updateDetail('noiseDetail', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}

      {/* Sub-tab 3: Color Noise (Screenshot 9) */}
      {subTab === 'colorNoise' && (
        <div className="flex flex-col gap-3.5 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Color noise reduction</span>
              <span className="text-zinc-300 font-mono text-[11px]">{detail.colorNoiseRed}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={detail.colorNoiseRed}
              onChange={(e) => updateDetail('colorNoiseRed', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}

      {/* Sub-tab 4: Optics Corrections */}
      {subTab === 'optics' && (
        <div className="flex flex-col gap-3.5 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Distortion</span>
              <span className="text-zinc-300 font-mono text-[11px]">{optics.distortion}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={optics.distortion}
              onChange={(e) => updateOptics('distortion', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Chromatic Aberration</span>
              <span className="text-zinc-300 font-mono text-[11px]">{optics.chromaticAberration}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={optics.chromaticAberration}
              onChange={(e) => updateOptics('chromaticAberration', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-zinc-300">Vignette Correction</span>
              <span className="text-zinc-300 font-mono text-[11px]">{optics.vignetteCorrection}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={optics.vignetteCorrection}
              onChange={(e) => updateOptics('vignetteCorrection', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
