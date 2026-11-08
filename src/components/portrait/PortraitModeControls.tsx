// CineGrid Pro — Portrait Mode Contextual Controls
// Optical Depth Simulation (f/1.4 to f/16), Bokeh Slider, and Eyeline Alignment Guide.

import React from 'react';
import { Aperture, Eye } from 'lucide-react';
import type { AspectRatio } from '../../types/camera';

interface PortraitModeControlsProps {
  aperture: number;
  onChangeAperture: (fStop: number) => void;
  showEyelineGuide: boolean;
  onToggleEyelineGuide: () => void;
  /** Background blur on/off (off = a normal photo in Portrait mode) */
  blurOn: boolean;
  onToggleBlur: () => void;
  /** A subject (face or object) is being tracked, so the blur follows it */
  subjectFound: boolean;
  aspectRatio: string;
  onChangeAspectRatio: (r: AspectRatio) => void;
}

export const PortraitModeControls: React.FC<PortraitModeControlsProps> = ({
  aperture,
  onChangeAperture,
  showEyelineGuide,
  onToggleEyelineGuide,
  blurOn,
  onToggleBlur,
  subjectFound,
  aspectRatio,
  onChangeAspectRatio,
}) => {
  const ratios: AspectRatio[] = ['4:3', '3:2', '16:9', '1:1', '2.39:1'];
  const fStops = [1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 16.0];

  return (
    <div className="w-full flex flex-col items-center gap-2 min-w-0">
      {/* Title & Active Aperture */}
      <div className="flex items-center justify-between w-full max-w-sm text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-amber-400 font-bold">
          <Aperture size={13} />
          <span>PORTRAIT FOCUS BLUR</span>
        </span>
        <span className="text-white font-bold bg-zinc-900 px-2 py-0.5 rounded-md border border-white/10">
          {blurOn ? 'f/' + aperture.toFixed(1) + (aperture < 8 ? '' : ' (no blur)') : 'Blur off'}
        </span>
      </div>

      <p className="w-full max-w-sm text-[10px] text-zinc-500 leading-snug">
        {blurOn ? (subjectFound ? 'Subject locked: background is blurred behind it.' : 'No subject yet: point at a face or object.') : 'Blur off: normal photo.'}
      </p>

      {/* Photo ratio */}
      <div className="flex items-center gap-1 w-full max-w-sm overflow-x-auto no-scrollbar" role="group" aria-label="Photo ratio">
        <span className="text-[10px] font-mono text-zinc-500 pr-1">Ratio</span>
        {ratios.map((r) => (
          <button
            key={r}
            onClick={() => onChangeAspectRatio(r)}
            aria-pressed={aspectRatio === r}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${aspectRatio === r ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-300'}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between w-full max-w-sm gap-2">
        {/* Blur on/off */}
        <button
          onClick={onToggleBlur}
          aria-pressed={blurOn}
          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${blurOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-300'}`}
          title="Turn the portrait background blur on or off"
        >
          Blur {blurOn ? 'On' : 'Off'}
        </button>
        {/* F-Stop Stepper Buttons */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
          {fStops.map((f) => {
            const isSelected = Math.abs(aperture - f) < 0.1;
            return (
              <button
                key={f}
                onClick={() => onChangeAperture(f)}
                disabled={!blurOn}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  !blurOn ? 'opacity-40' : isSelected ? 'bg-amber-400 text-black shadow' : 'text-zinc-300 hover:text-white'
                }`}
              >
                f/{f}
              </button>
            );
          })}
        </div>

        {/* Eyeline Guide Toggle */}
        <button
          onClick={onToggleEyelineGuide}
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold transition-all ${
            showEyelineGuide
              ? 'bg-amber-400/15 border-amber-400 text-amber-300'
              : 'bg-zinc-900 border-white/10 text-zinc-400'
          }`}
          title="Toggle Golden Ratio Eyeline Alignment Guide"
        >
          <Eye size={12} />
          <span>Eyeline</span>
        </button>
      </div>
    </div>
  );
};
