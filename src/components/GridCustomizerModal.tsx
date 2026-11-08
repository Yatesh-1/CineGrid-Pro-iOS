import React, { useState } from 'react';
import type { GridStyleOptions, SecondaryGuideOptions, LineStyle, GridType } from '../types/camera';
import { GridRenderer } from './grid-engine/GridRenderer';
import {
  X,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
  Compass,
  Crosshair,
  Layers,
  Save,
  Check,
  Image,
} from 'lucide-react';

interface GridCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleOptions: GridStyleOptions;
  onChangeStyle: (patch: Partial<GridStyleOptions>) => void;
  secondaryGuides: SecondaryGuideOptions;
  onChangeSecondary: (patch: Partial<SecondaryGuideOptions>) => void;
  onReset: () => void;
  onSavePreset: (name: string) => void;
  activeGridType?: GridType;
  onUploadReferenceImage?: (file: File) => void;
}

const COLOR_PALETTE = [
  { label: 'Subtle White', value: '#ffffff' },
  { label: 'Cinema Gold', value: '#eab308' },
  { label: 'Cyan Precision', value: '#38bdf8' },
  { label: 'Emerald Green', value: '#22c55e' },
  { label: 'High-Vis Red', value: '#ef4444' },
  { label: 'Neon Orange', value: '#f97316' },
  { label: 'Electric Violet', value: '#a855f7' },
  { label: 'Dark Carbon', value: '#27272a' },
];

const LINE_STYLES: { id: LineStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
];

export const GridCustomizerModal: React.FC<GridCustomizerModalProps> = ({
  isOpen,
  onClose,
  styleOptions,
  onChangeStyle,
  secondaryGuides,
  onChangeSecondary,
  onReset,
  onSavePreset,
  activeGridType = 'rule_of_thirds',
  onUploadReferenceImage,
}) => {
  const [saveName, setSaveName] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSavePreset(saveName.trim());
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
    setSaveName('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadReferenceImage) {
      onUploadReferenceImage(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg bg-zinc-950/95 border-t border-white/15 rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[88vh] overflow-y-auto no-scrollbar text-white select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-amber-400" />
            <h2 className="text-base font-bold tracking-tight">Grid & Guide Customizer</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              title="Reset Grid to Defaults"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Miniature Preview of Grid */}
        <div className="relative w-full h-28 rounded-xl bg-zinc-900 border border-white/15 overflow-hidden flex items-center justify-center">
          <div className="relative w-44 h-full">
            <GridRenderer
              gridType={activeGridType}
              styleOptions={styleOptions}
              secondaryGuides={secondaryGuides}
              rollAngle={0}
              pitchAngle={0}
            />
          </div>
          <div className="absolute bottom-1 right-2 text-[10px] font-mono text-zinc-500 uppercase">
            LIVE PREVIEW
          </div>
        </div>

        {/* 1. VISIBILITY MASTER TOGGLE */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/10">
          <div className="flex items-center gap-2.5">
            {styleOptions.isVisible ? <Eye size={18} className="text-amber-400" /> : <EyeOff size={18} className="text-zinc-500" />}
            <div>
              <div className="text-xs font-bold text-white">Grid Master Visibility</div>
              <div className="text-[10px] text-zinc-400">Toggle primary composition overlay lines</div>
            </div>
          </div>
          <button
            onClick={() => onChangeStyle({ isVisible: !styleOptions.isVisible })}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              styleOptions.isVisible
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-zinc-800 text-zinc-400 border border-white/10'
            }`}
          >
            {styleOptions.isVisible ? 'ACTIVE' : 'MUTED'}
          </button>
        </div>

        {/* 2. COLOR PALETTE */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-zinc-400 font-semibold">GRID LINE COLOR</span>
            <span className="text-amber-400 font-bold" style={{ color: styleOptions.color }}>
              {styleOptions.color.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {COLOR_PALETTE.map((c) => {
              const active = styleOptions.color.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  onClick={() => onChangeStyle({ color: c.value })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                    active ? 'border-amber-400 scale-110 shadow-lg' : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {active && <Check size={13} className={c.value === '#ffffff' ? 'text-black' : 'text-white'} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. OPACITY & LINE THICKNESS SLIDERS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-zinc-400">OPACITY</span>
              <span className="text-amber-400 font-bold">{Math.round(styleOptions.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={styleOptions.opacity}
              onChange={(e) => onChangeStyle({ opacity: Number(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-zinc-400">THICKNESS</span>
              <span className="text-amber-400 font-bold">{styleOptions.strokeWidth.toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4.0}
              step={0.25}
              value={styleOptions.strokeWidth}
              onChange={(e) => onChangeStyle({ strokeWidth: Number(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 4. LINE STYLE: SOLID / DASHED / DOTTED */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono text-zinc-400 font-semibold">LINE STROKE STYLE</span>
          <div className="grid grid-cols-3 gap-2">
            {LINE_STYLES.map((st) => {
              const active = styleOptions.lineStyle === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => onChangeStyle({ lineStyle: st.id })}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                    active
                      ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. GEOMETRIC ROTATION & SCALE */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-zinc-400">ROTATION</span>
              <span className="text-amber-400 font-bold">{styleOptions.rotation}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={styleOptions.rotation}
              onChange={(e) => onChangeStyle({ rotation: Number(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-zinc-400">GRID SCALE</span>
              <span className="text-amber-400 font-bold">{styleOptions.scale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={styleOptions.scale}
              onChange={(e) => onChangeStyle({ scale: Number(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 6. ANCHOR POINTS & RETICLES */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <span className="text-xs font-mono text-zinc-400 font-semibold">GEOMETRIC ACCENTS</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeStyle({ showCenterDot: !styleOptions.showCenterDot })}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                styleOptions.showCenterDot
                  ? 'bg-amber-950/60 border-amber-500 text-amber-400'
                  : 'bg-zinc-900 border-white/10 text-zinc-400'
              }`}
            >
              <span>Center Dot</span>
              <Crosshair size={14} />
            </button>

            <button
              onClick={() => onChangeStyle({ showIntersectionNodes: !styleOptions.showIntersectionNodes })}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                styleOptions.showIntersectionNodes
                  ? 'bg-amber-950/60 border-amber-500 text-amber-400'
                  : 'bg-zinc-900 border-white/10 text-zinc-400'
              }`}
            >
              <span>Intersection Nodes</span>
              <Sparkles size={14} />
            </button>
          </div>
        </div>

        {/* 7. SECONDARY COMPOSITION OVERLAYS */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <span className="text-xs font-mono text-zinc-400 font-semibold">SECONDARY OVERLAY GUIDES</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onChangeSecondary({ showHorizonLevel: !secondaryGuides.showHorizonLevel })}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-mono transition-all ${
                secondaryGuides.showHorizonLevel
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-900 border-white/10 text-zinc-400'
              }`}
            >
              <Compass size={16} />
              <span>Horizon Level</span>
            </button>

            <button
              onClick={() => onChangeSecondary({ showDualAxisLevel: !secondaryGuides.showDualAxisLevel })}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-mono transition-all ${
                secondaryGuides.showDualAxisLevel
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-900 border-white/10 text-zinc-400'
              }`}
            >
              <Crosshair size={16} />
              <span>Dual-Axis 3D</span>
            </button>

            <button
              onClick={() => onChangeSecondary({ showSafeArea: !secondaryGuides.showSafeArea })}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-mono transition-all ${
                secondaryGuides.showSafeArea
                  ? 'bg-sky-950/60 border-sky-500 text-sky-400'
                  : 'bg-zinc-900 border-white/10 text-zinc-400'
              }`}
            >
              <Layers size={16} />
              <span>Safe Area</span>
            </button>
          </div>
        </div>

        {/* 8. REFERENCE IMAGE GHOSTING OVERLAY */}
        {onUploadReferenceImage && (
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 font-semibold">REFERENCE IMAGE GHOSTING</span>
              <label className="cursor-pointer px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-white/10 text-xs font-mono flex items-center gap-1">
                <Image size={13} />
                <span>Upload Ghosting Image</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
            <p className="text-[10px] text-zinc-500">
              Upload any reference shot or previous photo to display as a translucent overlay over the camera for exact shot matching.
            </p>
          </div>
        )}

        {/* 9. SAVE CUSTOM GRID PRESET */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <span className="text-xs font-mono text-zinc-400 font-semibold">SAVE CUSTOM STYLE TO PRESETS</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Fine White Lines, High-Vis Red..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="flex-1 bg-zinc-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-4 py-2 rounded-xl bg-amber-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
            >
              <Save size={14} />
              Save
            </button>
          </div>
          {isSavedNotice && (
            <span className="text-[11px] text-emerald-400 font-mono">
              ✓ Custom style preset saved to local library!
            </span>
          )}
        </div>

        {/* Done / Apply Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-amber-400 text-black font-bold text-sm tracking-wide shadow-lg active:scale-95 transition-transform mt-1"
        >
          APPLY & RETURN TO VIEWFINDER
        </button>
      </div>
    </div>
  );
};
