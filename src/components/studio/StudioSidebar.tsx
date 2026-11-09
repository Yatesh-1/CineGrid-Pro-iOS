import React from 'react';
import type {
  StudioTab,
  StudioEditState,
  ToneCurves,
  LightSettings,
  ColorSettings,
  HslSettings,
  ColorGradingSettings,
  EffectsSettings,
  DetailSettings,
  OpticsSettings,
  GeometrySettings,
  MaskObject,
  MaskType,
  StudioPreset,
} from '../../types/studio';
import { LightPanel } from './panels/LightPanel';
import { ColorPanel } from './panels/ColorPanel';
import { EffectsPanel } from './panels/EffectsPanel';
import { DetailOpticsPanel } from './panels/DetailOpticsPanel';
import { GeometryPanel } from './panels/GeometryPanel';
import { MaskingPanel } from './panels/MaskingPanel';
import { PresetsPanel } from './panels/PresetsPanel';
import {
  Sun,
  Palette,
  Sparkles,
  Eye,
  Crop,
  Layers,
  Sliders,
  Wand2,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

interface StudioSidebarProps {
  activeTab: StudioTab;
  onChangeTab: (tab: StudioTab) => void;
  state: StudioEditState;
  onChangeState: (patch: Partial<StudioEditState>) => void;
  onResetLight: () => void;
  onResetColor: () => void;
  onResetEffects: () => void;
  onResetDetailOptics: () => void;
  onResetGeometry: () => void;
  onResetPreset: () => void;
  onChangePresetIntensity: (percent: number) => void;
  onApplyPreset: (preset: StudioPreset) => void;
  onSaveCustomPreset: (name: string) => void;
  customPresets: StudioPreset[];
  onImportPresets: (imported: StudioPreset[]) => void;
  onAddMask: (type: MaskType) => void;
  onUpdateMask: (mask: MaskObject) => void;
  onDeleteMask: (id: string) => void;
  showMaskOverlay: boolean;
  onToggleMaskOverlay: () => void;
  imageAspect: number;
  isCropEditing: boolean;
  onToggleCropEditing: () => void;
  onAutoTone?: () => void;
  onAiAutoGrade?: () => void;
  onResetAll?: () => void;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  activeTab,
  onChangeTab,
  state,
  onChangeState,
  onResetLight,
  onResetColor,
  onResetEffects,
  onResetDetailOptics,
  onResetGeometry,
  onResetPreset,
  onChangePresetIntensity,
  onApplyPreset,
  onSaveCustomPreset,
  customPresets,
  onImportPresets,
  onAddMask,
  onUpdateMask,
  onDeleteMask,
  showMaskOverlay,
  onToggleMaskOverlay,
  imageAspect,
  isCropEditing,
  onToggleCropEditing,
  onAutoTone,
  onAiAutoGrade,
  onResetAll,
}) => {
  const primaryTools: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={18} /> },
    { id: 'color', label: 'Color', icon: <Palette size={18} /> },
    { id: 'effects', label: 'Effects', icon: <Sparkles size={18} /> },
    { id: 'detail', label: 'Detail', icon: <Eye size={18} /> },
    { id: 'geometry', label: 'Crop', icon: <Crop size={18} /> },
    { id: 'presets', label: 'Profiles', icon: <Sliders size={18} /> },
    { id: 'masking', label: 'Masks', icon: <Layers size={18} /> },
  ];

  return (
    <div className="flex flex-col bg-[#090a0d] border-t md:border-t-0 md:border-l border-white/10 select-none w-full md:w-80 lg:w-96 flex-shrink-0 safe-bottom">
      {/* Scrollable Tool Slider Workspace */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 max-h-[38dvh] md:max-h-none">
        {activeTab === 'light' && (
          <LightPanel
            light={state.light}
            onChangeLight={(light: LightSettings) => onChangeState({ light })}
            curves={state.curves}
            onChangeCurves={(curves: ToneCurves) => onChangeState({ curves })}
            onResetLight={onResetLight}
            onAutoTone={onAutoTone}
          />
        )}

        {activeTab === 'color' && (
          <ColorPanel
            color={state.color}
            onChangeColor={(color: ColorSettings) => onChangeState({ color })}
            hsl={state.hsl}
            onChangeHsl={(hsl: HslSettings) => onChangeState({ hsl })}
            colorGrading={state.colorGrading}
            onChangeColorGrading={(colorGrading: ColorGradingSettings) =>
              onChangeState({ colorGrading })
            }
            onResetColor={onResetColor}
            onAiAutoGrade={onAiAutoGrade}
          />
        )}

        {activeTab === 'effects' && (
          <EffectsPanel
            effects={state.effects}
            onChangeEffects={(effects: EffectsSettings) => onChangeState({ effects })}
            onResetEffects={onResetEffects}
          />
        )}

        {activeTab === 'detail' && (
          <DetailOpticsPanel
            detail={state.detail}
            onChangeDetail={(detail: DetailSettings) => onChangeState({ detail })}
            optics={state.optics}
            onChangeOptics={(optics: OpticsSettings) => onChangeState({ optics })}
            onResetDetailOptics={onResetDetailOptics}
          />
        )}

        {activeTab === 'geometry' && (
          <GeometryPanel
            geometry={state.geometry}
            onChangeGeometry={(geometry: GeometrySettings) => onChangeState({ geometry })}
            onResetGeometry={onResetGeometry}
            imageAspect={imageAspect}
            isCropEditing={isCropEditing}
            onToggleCropEditing={onToggleCropEditing}
          />
        )}

        {activeTab === 'masking' && (
          <MaskingPanel
            masks={state.masks}
            activeMaskId={state.activeMaskId}
            onSelectMask={(id) => onChangeState({ activeMaskId: id })}
            onAddMask={onAddMask}
            onUpdateMask={onUpdateMask}
            onDeleteMask={onDeleteMask}
            showMaskOverlay={showMaskOverlay}
            onToggleMaskOverlay={onToggleMaskOverlay}
          />
        )}

        {activeTab === 'presets' && (
          <PresetsPanel
            activePresetId={state.activePresetId}
            presetIntensity={state.presetIntensity}
            onChangeIntensity={onChangePresetIntensity}
            onApplyPreset={onApplyPreset}
            onResetPreset={onResetPreset}
            onSaveCustomPreset={onSaveCustomPreset}
            customPresets={customPresets}
            onImportPresets={onImportPresets}
          />
        )}
      </div>

      {/* Lightroom Mobile Bottom Navigation Bar (Matching Screenshots 1-9) */}
      <div className="border-t border-white/10 bg-black/95">
        {/* Row 1: Primary Tool Tabs with Icons & Labels */}
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto no-scrollbar justify-between sm:justify-center">
          {/* Auto Button */}
          {onAutoTone && (
            <button
              type="button"
              onClick={onAutoTone}
              className="flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-95 flex-shrink-0"
              title="Auto Tone"
            >
              <Wand2 size={18} className="text-amber-400" />
              <span className="text-[10px] font-sans mt-1">Auto</span>
            </button>
          )}

          {primaryTools.map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTab(t.id)}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-lg transition-all active:scale-95 flex-shrink-0 ${
                  isSelected ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <div className={`p-1 rounded-lg ${isSelected ? 'bg-amber-400/10' : ''}`}>
                  {t.icon}
                </div>
                <span className="text-[10px] font-sans mt-0.5">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Secondary Dock Bar (Lightroom Mobile Bottom Dock) */}
        <div className="flex items-center justify-around py-1.5 px-4 border-t border-white/5 bg-zinc-950/80">
          <button
            type="button"
            onClick={onAutoTone}
            className="p-1.5 text-zinc-400 hover:text-white"
            title="Auto Enhance"
          >
            <Wand2 size={16} />
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('presets')}
            className={`p-1.5 transition-colors ${
              activeTab === 'presets' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
            title="Profiles & Presets"
          >
            <Sliders size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeTab('geometry');
              if (!isCropEditing) onToggleCropEditing();
            }}
            className={`p-1.5 transition-colors ${
              activeTab === 'geometry' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
            title="Crop & Rotate"
          >
            <Crop size={16} />
          </button>

          {/* Active Adjust Tool Button (Blue Pill from Screenshot 1) */}
          <button
            type="button"
            onClick={() => onChangeTab('light')}
            className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
            title="Adjustments"
          >
            <SlidersHorizontal size={16} />
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('masking')}
            className={`p-1.5 transition-colors ${
              activeTab === 'masking' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
            title="Masking"
          >
            <Layers size={16} />
          </button>

          {onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
              title="Reset All Adjustments"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
