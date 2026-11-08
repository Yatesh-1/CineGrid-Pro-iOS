import React from 'react';
import type { MaskObject, MaskType, MaskAdjustments } from '../../../types/studio';
import {
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sun,
  Maximize2,
  Sliders,
  Brush,
  Contrast,
  Palette,
  Info,
} from 'lucide-react';

interface MaskingPanelProps {
  masks: MaskObject[];
  activeMaskId: string | null;
  onSelectMask: (id: string | null) => void;
  onAddMask: (type: MaskType) => void;
  onUpdateMask: (mask: MaskObject) => void;
  onDeleteMask: (id: string) => void;
  showMaskOverlay: boolean;
  onToggleMaskOverlay: () => void;
}

interface RowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

const Row: React.FC<RowProps> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
  <label className="flex flex-col gap-1">
    <span className="flex items-center justify-between text-xs font-mono">
      <span className="text-zinc-300">{label}</span>
      <span className="text-zinc-400 text-[11px]">
        {value > 0 && min < 0 ? '+' : ''}
        {Number.isInteger(step) ? Math.round(value) : value.toFixed(1)}
        {unit}
      </span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full min-h-[28px] cursor-pointer accent-amber-400"
      style={{ touchAction: 'none' }}
    />
  </label>
);

const MASK_TYPES: { type: MaskType; label: string; icon: React.ReactNode; hint: string }[] = [
  { type: 'linear', label: 'Linear Gradient', icon: <Sliders size={13} />, hint: 'Drag on the photo to place the line' },
  { type: 'radial', label: 'Radial Gradient', icon: <Maximize2 size={13} />, hint: 'Drag on the photo to move it' },
  { type: 'brush', label: 'Brush', icon: <Brush size={13} />, hint: 'Paint on the photo' },
  { type: 'luminance', label: 'Luminance Range', icon: <Contrast size={13} />, hint: 'Selects by brightness' },
  { type: 'color', label: 'Color Range', icon: <Palette size={13} />, hint: 'Selects a colour' },
  { type: 'sky', label: 'Sky (estimate)', icon: <Sun size={13} />, hint: 'Guesses sky from colour and position' },
];

const ADJUSTMENTS: { key: keyof MaskAdjustments; label: string; min: number; max: number; step?: number; unit?: string }[] = [
  { key: 'exposure', label: 'Exposure', min: -3, max: 3, step: 0.1, unit: ' EV' },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
];

export const MaskingPanel: React.FC<MaskingPanelProps> = ({
  masks,
  activeMaskId,
  onSelectMask,
  onAddMask,
  onUpdateMask,
  onDeleteMask,
  showMaskOverlay,
  onToggleMaskOverlay,
}) => {
  const activeMask = masks.find((m) => m.id === activeMaskId) || null;
  const patch = (p: Partial<MaskObject>) => activeMask && onUpdateMask({ ...activeMask, ...p });
  const hint = activeMask ? MASK_TYPES.find((t) => t.type === activeMask.type)?.hint : undefined;

  return (
    <div className="flex flex-col gap-4 select-none">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-amber-400" aria-hidden="true" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Selective Masks</h4>
        </div>
        <button
          type="button"
          onClick={onToggleMaskOverlay}
          aria-pressed={showMaskOverlay}
          className={`min-h-[36px] px-2 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${
            showMaskOverlay ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-white'
          }`}
          title="Show the selected area in red"
        >
          {showMaskOverlay ? <Eye size={11} /> : <EyeOff size={11} />}
          <span>SHOW AREA</span>
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Create New Mask</span>
        <div className="grid grid-cols-2 gap-1.5">
          {MASK_TYPES.map((mt) => (
            <button
              key={mt.type}
              type="button"
              onClick={() => onAddMask(mt.type)}
              className="min-h-[44px] px-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={12} className="text-amber-400 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{mt.label}</span>
            </button>
          ))}
        </div>
        <p className="flex items-start gap-1.5 text-[10px] text-zinc-500 leading-snug mt-1">
          <Info size={11} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Subject, face and background selection need an on-device AI model, which this app does not include. “Sky” is an
            estimate from colour and position, not object recognition.
          </span>
        </p>
      </div>

      {masks.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Mask Layers ({masks.length})</span>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar">
            {masks.map((mask) => {
              const isSelected = mask.id === activeMaskId;
              return (
                <div
                  key={mask.id}
                  className={`flex items-center justify-between rounded-xl border transition-all ${
                    isSelected ? 'bg-amber-400/15 border-amber-400 text-white' : 'bg-zinc-900/80 border-white/5 text-zinc-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectMask(mask.id)}
                    aria-pressed={isSelected}
                    className="flex-1 min-h-[44px] pl-2 flex items-center gap-2 text-left"
                  >
                    <span className="text-xs font-mono font-semibold truncate">{mask.name}</span>
                  </button>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => onUpdateMask({ ...mask, enabled: !mask.enabled })}
                      aria-label={mask.enabled ? 'Disable mask' : 'Enable mask'}
                      className="w-10 min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
                    >
                      {mask.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateMask({ ...mask, inverted: !mask.inverted })}
                      aria-pressed={mask.inverted}
                      className={`px-1.5 py-1 mr-1 rounded text-[10px] font-mono uppercase ${mask.inverted ? 'bg-amber-400 text-black font-bold' : 'bg-zinc-800 text-zinc-400'}`}
                      title="Invert the selected area"
                    >
                      INV
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMask(mask.id)}
                      aria-label="Delete mask"
                      className="w-10 min-h-[44px] flex items-center justify-center text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeMask && (
        <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-mono font-bold text-amber-300">Area: {activeMask.name}</h5>
            {hint && <span className="text-[10px] font-mono text-zinc-500">{hint}</span>}
          </div>

          {/* Where the mask applies */}
          {activeMask.type === 'linear' && (
            <>
              <Row label="Position" value={activeMask.y} min={0} max={100} unit="%" onChange={(v) => patch({ y: v })} />
              <Row label="Angle" value={activeMask.angle} min={-180} max={180} unit="°" onChange={(v) => patch({ angle: v })} />
              <Row label="Feather" value={activeMask.feather} min={0} max={100} onChange={(v) => patch({ feather: v })} />
            </>
          )}
          {activeMask.type === 'radial' && (
            <>
              <Row label="Centre X" value={activeMask.x} min={0} max={100} unit="%" onChange={(v) => patch({ x: v })} />
              <Row label="Centre Y" value={activeMask.y} min={0} max={100} unit="%" onChange={(v) => patch({ y: v })} />
              <Row label="Width" value={activeMask.width} min={5} max={100} unit="%" onChange={(v) => patch({ width: v })} />
              <Row label="Height" value={activeMask.height} min={5} max={100} unit="%" onChange={(v) => patch({ height: v })} />
              <Row label="Feather" value={activeMask.feather} min={0} max={100} onChange={(v) => patch({ feather: v })} />
            </>
          )}
          {activeMask.type === 'brush' && (
            <>
              <Row label="Brush size" value={activeMask.width} min={5} max={100} onChange={(v) => patch({ width: v })} />
              <Row label="Softness" value={activeMask.feather} min={0} max={100} onChange={(v) => patch({ feather: v })} />
              <button
                type="button"
                onClick={() => patch({ brushPoints: [] })}
                className="min-h-[44px] rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white"
              >
                Clear strokes ({activeMask.brushPoints?.length ?? 0} dabs)
              </button>
            </>
          )}
          {activeMask.type === 'luminance' && (
            <>
              <Row label="From brightness" value={activeMask.lumMin ?? 0} min={0} max={100} unit="%" onChange={(v) => patch({ lumMin: Math.min(v, activeMask.lumMax ?? 100) })} />
              <Row label="To brightness" value={activeMask.lumMax ?? 100} min={0} max={100} unit="%" onChange={(v) => patch({ lumMax: Math.max(v, activeMask.lumMin ?? 0) })} />
              <Row label="Feather" value={activeMask.feather} min={0} max={100} onChange={(v) => patch({ feather: v })} />
            </>
          )}
          {activeMask.type === 'color' && (
            <>
              <Row label="Hue" value={activeMask.hue ?? 210} min={0} max={360} unit="°" onChange={(v) => patch({ hue: v })} />
              <Row label="Range" value={activeMask.hueRange ?? 30} min={5} max={90} unit="°" onChange={(v) => patch({ hueRange: v })} />
              <div className="h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }} aria-hidden="true" />
            </>
          )}
          {activeMask.type === 'sky' && (
            <Row label="Feather" value={activeMask.feather} min={0} max={100} onChange={(v) => patch({ feather: v })} />
          )}

          {/* What changes inside the selected area */}
          <h5 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider pt-1">Adjust selected area</h5>
          {ADJUSTMENTS.map((a) => (
            <Row
              key={a.key}
              label={a.label}
              value={activeMask.adjustments[a.key]}
              min={a.min}
              max={a.max}
              step={a.step}
              unit={a.unit}
              onChange={(v) => patch({ adjustments: { ...activeMask.adjustments, [a.key]: v } })}
            />
          ))}
        </div>
      )}
    </div>
  );
};
