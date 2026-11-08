import React, { useState, useRef } from 'react';
import type { StudioPreset } from '../../../types/studio';
import { STUDIO_PRESETS, STUDIO_PRESET_CATEGORIES } from '../../../utils/studioPresets';
import {
  Sparkles,
  Save,
  Download,
  Upload,
  Check,
  RotateCcw,
} from 'lucide-react';

interface PresetsPanelProps {
  activePresetId?: string;
  presetIntensity: number;
  onChangeIntensity: (val: number) => void;
  onApplyPreset: (preset: StudioPreset) => void;
  onResetPreset: () => void;
  onSaveCustomPreset: (name: string) => void;
  customPresets: StudioPreset[];
  onImportPresets: (imported: StudioPreset[]) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({
  activePresetId,
  presetIntensity,
  onChangeIntensity,
  onApplyPreset,
  onResetPreset,
  onSaveCustomPreset,
  customPresets,
  onImportPresets,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPresets = [...customPresets, ...STUDIO_PRESETS];

  const filtered = selectedCategory === 'all'
    ? allPresets
    : allPresets.filter((p) => p.category === selectedCategory);

  const handleSave = () => {
    if (!newPresetName.trim()) return;
    onSaveCustomPreset(newPresetName.trim());
    setNewPresetName('');
    setShowSaveDialog(false);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customPresets, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `cinegrid_custom_presets_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportPresets(parsed);
        }
      } catch (err) {
        console.warn('Import presets error:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-amber-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Presets & Looks
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-1.5 px-2 rounded-lg bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/30 text-[10px] font-mono font-bold flex items-center gap-1"
            title="Save Current Look as Preset"
          >
            <Save size={11} />
            <span>SAVE</span>
          </button>
          <button
            onClick={onResetPreset}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Reset Preset"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* Preset Intensity Slider (Only when a preset is active) */}
      {activePresetId && (
        <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-amber-300">Preset Intensity</span>
            <span className="text-amber-400 font-bold">{presetIntensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={presetIntensity}
            onChange={(e) => onChangeIntensity(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      )}

      {/* Save Dialog Popup */}
      {showSaveDialog && (
        <div className="p-3 rounded-xl bg-zinc-900 border border-amber-400/40 flex flex-col gap-2">
          <span className="text-xs font-mono font-bold text-white">Save Current Adjustments</span>
          <input
            type="text"
            placeholder="Preset Name (e.g., My Moody Gold)"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/20 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-2.5 py-1 rounded text-xs font-mono text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 rounded bg-amber-400 text-black font-bold text-xs font-mono hover:bg-amber-300 shadow-sm"
            >
              Save Preset
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {STUDIO_PRESET_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto no-scrollbar pt-1">
        {filtered.map((preset) => {
          const isSelected = preset.id === activePresetId;
          return (
            <div
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className={`p-2.5 rounded-xl cursor-pointer border flex flex-col gap-1 transition-all group ${
                isSelected
                  ? 'bg-amber-400/20 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'bg-zinc-900 border-white/5 hover:border-white/20 hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: preset.thumbnailColor }}
                />
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-black">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
              <h5 className="text-xs font-bold text-white tracking-tight mt-1 truncate">
                {preset.name}
              </h5>
              <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                {preset.description}
              </span>
            </div>
          );
        })}
      </div>

      {/* Import / Export JSON buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-zinc-400">
        <button
          onClick={handleExportJson}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Export Custom Presets to JSON"
        >
          <Download size={11} />
          <span>Export JSON</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Import Presets from JSON"
        >
          <Upload size={11} />
          <span>Import JSON</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
