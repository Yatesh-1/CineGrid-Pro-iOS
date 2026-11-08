import React from 'react';
import type { GeometrySettings, CropAspectRatio } from '../../../types/studio';
import { centeredCropRect } from '../../../utils/cropMath';
import {
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
} from 'lucide-react';

interface GeometryPanelProps {
  geometry: GeometrySettings;
  onChangeGeometry: (geo: GeometrySettings) => void;
  onResetGeometry: () => void;
  /** width / height of the photograph, so ratio crops are exact */
  imageAspect: number;
  isCropEditing: boolean;
  onToggleCropEditing: () => void;
}

export const GeometryPanel: React.FC<GeometryPanelProps> = ({
  geometry,
  onChangeGeometry,
  onResetGeometry,
  imageAspect,
  isCropEditing,
  onToggleCropEditing,
}) => {
  const cropRatios: { id: CropAspectRatio; label: string }[] = [
    { id: 'original', label: 'Original' },
    { id: 'free', label: 'Free' },
    { id: '1:1', label: '1:1 Square' },
    { id: '4:3', label: '4:3 Standard' },
    { id: '3:2', label: '3:2 35mm' },
    { id: '4:5', label: '4:5 Social' },
    { id: '9:16', label: '9:16 Story' },
    { id: '16:9', label: '16:9 Cinema' },
  ];

  const handleSelectRatio = (ratio: CropAspectRatio) => {
    // Ratio crops are exact in pixels for this photo: the largest crop of that ratio, centred.
    // A free crop keeps whatever rectangle is already set, so the user can keep adjusting it.
    const rect = ratio === 'free' ? geometry.cropRect : centeredCropRect(ratio, imageAspect);
    onChangeGeometry({ ...geometry, cropRatio: ratio, cropRect: rect });
  };
  const handleRotate90 = () => {
    onChangeGeometry({
      ...geometry,
      rotation: (geometry.rotation + 90) % 360,
    });
  };

  const handleToggleFlipH = () => {
    onChangeGeometry({ ...geometry, flipH: !geometry.flipH });
  };

  const handleToggleFlipV = () => {
    onChangeGeometry({ ...geometry, flipV: !geometry.flipV });
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Crop size={15} className="text-amber-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Crop & Geometry
          </h4>
        </div>
        <button
          onClick={onResetGeometry}
          className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          title="Reset Geometry"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleCropEditing}
        aria-pressed={isCropEditing}
        className={'min-h-[44px] rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ' + (isCropEditing ? 'bg-amber-400 text-black border-amber-400' : 'bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800')}
      >
        <Crop size={14} aria-hidden="true" />
        {isCropEditing ? 'Done cropping' : 'Crop on photo (drag handles)'}
      </button>

      {/* Aspect Ratio Grid */}
      <div className="flex flex-col gap-1.5">
        <h5 className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
          Aspect Ratio
        </h5>
        <div className="grid grid-cols-4 gap-1.5">
          {cropRatios.map((r) => {
            const isSelected = geometry.cropRatio === r.id;
            return (
              <button
                key={r.id}
                onClick={() => handleSelectRatio(r.id)}
                className={`min-h-[36px] py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all truncate border ${
                  isSelected
                    ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transform Buttons: Rotate 90, Flip H, Flip V */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
        <h5 className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
          Transforms
        </h5>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRotate90}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <RotateCw size={13} />
            <span>90° Rotate</span>
          </button>

          <button
            onClick={handleToggleFlipH}
            className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              geometry.flipH
                ? 'bg-amber-400 text-black border-amber-400 font-extrabold'
                : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Flip Horizontal"
          >
            <FlipHorizontal size={14} />
          </button>

          <button
            onClick={handleToggleFlipV}
            className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              geometry.flipV
                ? 'bg-amber-400 text-black border-amber-400 font-extrabold'
                : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Flip Vertical"
          >
            <FlipVertical size={14} />
          </button>
        </div>
      </div>

      {/* Straighten Slider */}
      <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className={geometry.straighten !== 0 ? 'text-amber-300' : 'text-zinc-300'}>
            Straighten Angle
          </span>
          <span className="text-zinc-400 text-[11px]">
            {geometry.straighten > 0 ? `+${geometry.straighten}°` : `${geometry.straighten}°`}
          </span>
        </div>
        <input
          type="range"
          min="-45"
          max="45"
          step="0.5"
          value={geometry.straighten}
          onChange={(e) =>
            onChangeGeometry({ ...geometry, straighten: parseFloat(e.target.value) })
          }
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
      </div>

      {/* Perspective Keystone */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <h5 className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
          Perspective Keystone
        </h5>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={geometry.verticalKeystone !== 0 ? 'text-amber-300' : 'text-zinc-400'}>
              Vertical Keystone
            </span>
            <span className="text-zinc-400 text-[11px]">{geometry.verticalKeystone}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={geometry.verticalKeystone}
            onChange={(e) =>
              onChangeGeometry({ ...geometry, verticalKeystone: parseInt(e.target.value) })
            }
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={geometry.horizontalKeystone !== 0 ? 'text-amber-300' : 'text-zinc-400'}>
              Horizontal Keystone
            </span>
            <span className="text-zinc-400 text-[11px]">{geometry.horizontalKeystone}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={geometry.horizontalKeystone}
            onChange={(e) =>
              onChangeGeometry({ ...geometry, horizontalKeystone: parseInt(e.target.value) })
            }
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>
    </div>
  );
};
