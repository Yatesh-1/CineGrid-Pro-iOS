import React from 'react';
import {
  Sun,
  Palette,
  Crosshair,
  Mic,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Play,
  X,
} from 'lucide-react';
import type {
  CinemaVideoConfig,
  CinemaShutterAngle,
  CinemaColorProfile,
} from '../../types/cinemaVideo';

interface CinemaContextualPanelsProps {
  activeTab: 'exposure' | 'color' | 'focus' | 'audio' | null;
  onClose: () => void;
  config: CinemaVideoConfig;
  onUpdateConfig: (partial: Partial<CinemaVideoConfig>) => void;
  onExecuteRackFocus: (dir: 'A_to_B' | 'B_to_A') => void;
  audioLevels: { leftDb: number; rightDb: number; peakClipping: boolean };
}

export const CinemaContextualPanels: React.FC<CinemaContextualPanelsProps> = ({
  activeTab,
  onClose,
  config,
  onUpdateConfig,
  onExecuteRackFocus,
  audioLevels,
}) => {
  if (!activeTab) return null;

  const shutterAngles: { angle: CinemaShutterAngle; label: string; desc: string }[] = [
    { angle: 180, label: '180°', desc: 'Cinema Standard (Natural motion blur)' },
    { angle: 172.8, label: '172.8°', desc: '50Hz Anti-Flicker (PAL / European lights)' },
    { angle: 144, label: '144°', desc: '60Hz Anti-Flicker (NTSC / US lights at 25fps)' },
    { angle: 90, label: '90°', desc: 'Action Shutter (Crisp motion / sports)' },
    { angle: 45, label: '45°', desc: 'Staccato Shutter (Intense combat / war scenes)' },
  ];

  const isoPresets = [50, 100, 200, 400, 800, 1600, 3200, 6400];

  const wbPresets = [
    { kelvin: 3200, label: '3200K Tungsten' },
    { kelvin: 4300, label: '4300K Fluorescent' },
    { kelvin: 5600, label: '5600K Daylight' },
    { kelvin: 6500, label: '6500K Cloudy' },
  ];

  const colorProfiles: { profile: CinemaColorProfile; label: string; desc: string }[] = [
    { profile: 'rec709', label: 'Rec.709', desc: 'Standard broadcast dynamic range' },
    { profile: 'flat_log', label: 'Flat Log', desc: 'Preserves 14+ stops for color grading' },
    { profile: 'hdr10', label: 'HDR10', desc: 'Wide color gamut (BT.2020 PQ)' },
    { profile: 'hlg', label: 'HLG', desc: 'Hybrid Log-Gamma broadcast HDR' },
  ];

  return (
    <div
      className="absolute bottom-24 left-0 right-0 z-40 px-3 max-w-md mx-auto animate-in slide-in-from-bottom-6 duration-200"
      role="region"
      aria-label={`${activeTab.toUpperCase()} Controls`}
    >
      <div className="bg-[#0b0e14]/95 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-white">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            {activeTab === 'exposure' && <Sun className="w-4 h-4 text-amber-400" />}
            {activeTab === 'color' && <Palette className="w-4 h-4 text-sky-400" />}
            {activeTab === 'focus' && <Crosshair className="w-4 h-4 text-emerald-400" />}
            {activeTab === 'audio' && <Mic className="w-4 h-4 text-violet-400" />}
            <span className="text-xs font-mono font-bold tracking-wider uppercase">
              {activeTab.toUpperCase()} CONTROLS
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800"
            aria-label="Close contextual panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. EXPOSURE TAB */}
        {activeTab === 'exposure' && (
          <div className="space-y-4">
            {/* Shutter Angle Buttons */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                <span>SHUTTER ANGLE</span>
                <span className="text-amber-400 font-bold">
                  {config.shutterAngle}° ({config.calculatedShutterSpeed}s)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {shutterAngles.map((s) => (
                  <button
                    key={s.angle}
                    onClick={() => onUpdateConfig({ shutterAngle: s.angle })}
                    className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      config.shutterAngle === s.angle
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                    title={s.desc}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ISO Controls */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                <span>ISO SENSITIVITY</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateConfig({ isoAuto: !config.isoAuto })}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-mono font-bold uppercase ${
                      config.isoAuto
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {config.isoAuto ? 'AUTO' : 'MANUAL'}
                  </button>
                  <span className="text-white font-bold">{config.iso}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {isoPresets.map((iso) => (
                  <button
                    key={iso}
                    onClick={() => onUpdateConfig({ iso, isoAuto: false })}
                    className={`py-1 rounded text-xs font-mono transition-all ${
                      config.iso === iso && !config.isoAuto
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {iso}
                  </button>
                ))}
              </div>
            </div>

            {/* EV Compensation Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                <span>EXPOSURE VALUE (EV)</span>
                <span className="text-white font-bold">
                  {config.ev > 0 ? `+${config.ev.toFixed(1)}` : config.ev.toFixed(1)} EV
                </span>
              </div>
              <input
                type="range"
                min="-3.0"
                max="3.0"
                step="0.1"
                value={config.ev}
                onChange={(e) => onUpdateConfig({ ev: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                aria-label="Exposure value compensation slider"
              />
            </div>

            {/* Exposure Lock */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => onUpdateConfig({ exposureLocked: !config.exposureLocked })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  config.exposureLocked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {config.exposureLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {config.exposureLocked ? 'EXPOSURE LOCKED' : 'LOCK EXPOSURE'}
              </button>
            </div>
          </div>
        )}

        {/* 2. COLOR TAB */}
        {activeTab === 'color' && (
          <div className="space-y-4">
            {/* White Balance Kelvin */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                <span>WHITE BALANCE (KELVIN)</span>
                <span className="text-sky-400 font-bold">{config.whiteBalanceKelvin}K</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {wbPresets.map((wb) => (
                  <button
                    key={wb.kelvin}
                    onClick={() => onUpdateConfig({ whiteBalanceKelvin: wb.kelvin })}
                    className={`py-1 px-2 rounded text-[11px] font-mono transition-all text-left ${
                      config.whiteBalanceKelvin === wb.kelvin
                        ? 'bg-sky-500 text-black font-bold'
                        : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {wb.label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="2500"
                max="10000"
                step="50"
                value={config.whiteBalanceKelvin}
                onChange={(e) => onUpdateConfig({ whiteBalanceKelvin: parseInt(e.target.value, 10) })}
                className="w-full accent-sky-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                aria-label="White Balance Kelvin slider"
              />
            </div>

            {/* Tint Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                <span>TINT (MAGENTA / GREEN)</span>
                <span className="text-white font-bold">{config.whiteBalanceTint > 0 ? `+${config.whiteBalanceTint}` : config.whiteBalanceTint}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={config.whiteBalanceTint}
                onChange={(e) => onUpdateConfig({ whiteBalanceTint: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                aria-label="White balance tint slider"
              />
            </div>

            {/* Cinema Color Profiles */}
            <div>
              <div className="text-[11px] font-mono text-neutral-400 mb-1.5">
                COLOR PROFILE / LOG
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {colorProfiles.map((cp) => (
                  <button
                    key={cp.profile}
                    onClick={() => onUpdateConfig({ colorProfile: cp.profile })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      config.colorProfile === cp.profile
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-neutral-800/60 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold">{cp.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">{cp.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Monitoring LUT vs Bake LUT Toggle */}
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-400">RECORDING LUT MODE</span>
                <button
                  onClick={() => onUpdateConfig({ bakeLutIntoRecording: !config.bakeLutIntoRecording })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    config.bakeLutIntoRecording
                      ? 'bg-amber-500 text-black'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {config.bakeLutIntoRecording ? 'BAKED INTO MEDIA' : 'MONITOR ONLY (CLEAN REC)'}
                </button>
              </div>
              <div className="text-[10px] text-neutral-400">
                {config.bakeLutIntoRecording
                  ? '⚠️ LUT is burned into the final video stream.'
                  : '✓ Standard DP workflow: Preview shows LUT look, recorded video stays clean Flat Log for grading.'}
              </div>
            </div>
          </div>
        )}

        {/* 3. FOCUS TAB */}
        {activeTab === 'focus' && (
          <div className="space-y-4">
            {/* AF / MF Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-neutral-400">FOCUS MODE</span>
              <div className="flex items-center gap-1 bg-neutral-800 p-0.5 rounded-lg">
                <button
                  onClick={() => onUpdateConfig({ focusMode: 'auto' })}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                    config.focusMode === 'auto'
                      ? 'bg-emerald-500 text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  AUTO (AF)
                </button>
                <button
                  onClick={() => onUpdateConfig({ focusMode: 'manual' })}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                    config.focusMode === 'manual'
                      ? 'bg-emerald-500 text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  MANUAL (MF)
                </button>
              </div>
            </div>

            {/* Manual Focus Distance Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                <span>FOCUS DISTANCE</span>
                <span className="text-emerald-400 font-bold">
                  {config.manualFocusDistance.toFixed(2)} (
                  {config.manualFocusDistance < 0.2 ? 'Macro' : config.manualFocusDistance > 0.85 ? 'Infinity ∞' : 'Mid'}
                  )
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={config.manualFocusDistance}
                onChange={(e) => onUpdateConfig({ manualFocusDistance: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                aria-label="Manual focus distance slider"
              />
            </div>

            {/* Focus Magnifier */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                <span>FOCUS MAGNIFIER</span>
                <span className="text-white font-bold">{config.focusMagnification}x</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {([1.0, 2.0, 4.0] as const).map((mag) => (
                  <button
                    key={mag}
                    onClick={() => onUpdateConfig({ focusMagnification: mag })}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      config.focusMagnification === mag
                        ? 'bg-emerald-500 text-black'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {mag}X
                  </button>
                ))}
              </div>
            </div>

            {/* Rack Focus Automation */}
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-300">
                <span>RACK FOCUS AUTOMATION</span>
                <span className="text-emerald-400">{config.rackFocus.durationSeconds}s</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    onUpdateConfig({
                      rackFocus: {
                        ...config.rackFocus,
                        pointA: { ...config.rackFocus.pointA, distance: config.manualFocusDistance },
                      },
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-left"
                >
                  <div className="text-[10px] text-neutral-400 font-mono">POINT A (SET)</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {config.rackFocus.pointA.distance.toFixed(2)}
                  </div>
                </button>

                <button
                  onClick={() =>
                    onUpdateConfig({
                      rackFocus: {
                        ...config.rackFocus,
                        pointB: { ...config.rackFocus.pointB, distance: config.manualFocusDistance },
                      },
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-left"
                >
                  <div className="text-[10px] text-neutral-400 font-mono">POINT B (SET)</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {config.rackFocus.pointB.distance.toFixed(2)}
                  </div>
                </button>
              </div>

              {/* Duration Slider */}
              <div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={config.rackFocus.durationSeconds}
                  onChange={(e) =>
                    onUpdateConfig({
                      rackFocus: {
                        ...config.rackFocus,
                        durationSeconds: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-400 h-1 bg-neutral-800 rounded cursor-pointer"
                  aria-label="Rack focus transition duration"
                />
              </div>

              {/* Execute Rack Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onExecuteRackFocus('A_to_B')}
                  disabled={config.rackFocus.isTransitioning}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" /> RACK A → B
                </button>
                <button
                  onClick={() => onExecuteRackFocus('B_to_A')}
                  disabled={config.rackFocus.isTransitioning}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3 rotate-180" /> RACK B → A
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            {/* Real Stereo VU Level Meter */}
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>STEREO INPUT VU METER</span>
                <span className={audioLevels.peakClipping ? 'text-red-500 font-bold' : 'text-neutral-400'}>
                  {audioLevels.peakClipping ? 'CLIP DETECTED' : `${Math.round(audioLevels.leftDb)} dB`}
                </span>
              </div>

              {/* L Channel */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-500 w-3">L</span>
                <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioLevels.leftDb > -3
                        ? 'bg-red-500'
                        : audioLevels.leftDb > -12
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (audioLevels.leftDb + 60) * (100 / 60)))}%` }}
                  />
                </div>
              </div>

              {/* R Channel */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-500 w-3">R</span>
                <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioLevels.rightDb > -3
                        ? 'bg-red-500'
                        : audioLevels.rightDb > -12
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (audioLevels.rightDb + 60) * (100 / 60)))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Noise Modes */}
            <div>
              <div className="text-[11px] font-mono text-neutral-400 mb-1.5">
                NOISE REDUCTION DSP
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['off', 'standard', 'strong', 'wind', 'voice', 'auto'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdateConfig({ audioNoiseMode: mode })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono uppercase font-bold transition-all ${
                      config.audioNoiseMode === mode
                        ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                        : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Monitor Level & Mute */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => onUpdateConfig({ audioMuted: !config.audioMuted })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  config.audioMuted
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {config.audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {config.audioMuted ? 'AUDIO MUTED' : 'MUTE AUDIO'}
              </button>

              <span className="text-[11px] font-mono text-neutral-400">
                48 kHz · 24-bit Linear PCM
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
