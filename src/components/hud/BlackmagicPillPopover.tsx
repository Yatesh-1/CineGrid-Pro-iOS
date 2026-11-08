import React from 'react';
import type {
  ProSettings,
  VideoFps,
  PeakingColor,
} from '../../types/camera';
import {
  X,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export type ActivePillType = 'fps' | 'shutter' | 'iso' | 'wb' | 'focus' | 'ev' | 'zoom' | null;

interface BlackmagicPillPopoverProps {
  activePill: ActivePillType;
  onClose: () => void;
  settings: ProSettings;
  onUpdate: (patch: Partial<ProSettings>) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onTriggerRackFocus?: () => void;
}

const FPS_PRESETS: VideoFps[] = [23.98, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120];
const SHUTTER_PRESETS = ['1/24', '1/48', '1/50', '1/60', '1/96', '1/120', '1/250', '1/500', '1/1000', '1/2000'];
const SHUTTER_ANGLES = [45, 90, 144, 172.8, 180, 270, 360];
const ISO_PRESETS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800];
const WB_PRESETS = [
  { label: 'Tungsten', k: 3200 },
  { label: 'Fluorescent', k: 4000 },
  { label: 'Daylight', k: 5600 },
  { label: 'Cloudy', k: 6500 },
  { label: 'Shade', k: 7500 },
];
const PEAKING_COLORS: { label: string; value: PeakingColor; hex: string }[] = [
  { label: 'Green', value: 'green', hex: '#10b981' },
  { label: 'Red', value: 'red', hex: '#ef4444' },
  { label: 'Cyan', value: 'cyan', hex: '#06b6d4' },
  { label: 'Yellow', value: 'yellow', hex: '#f59e0b' },
];

export const BlackmagicPillPopover: React.FC<BlackmagicPillPopoverProps> = ({
  activePill,
  onClose,
  settings,
  onUpdate,
  zoomLevel,
  onZoomChange,
  onTriggerRackFocus,
}) => {
  if (!activePill) return null;

  return (
    <div
      className="absolute bottom-12 left-2 right-2 z-50 bg-zinc-950/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-white select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-200">
            {activePill === 'fps' && 'Frame Rate (FPS)'}
            {activePill === 'shutter' && 'Shutter Speed & Angle'}
            {activePill === 'iso' && 'Sensor Gain (ISO)'}
            {activePill === 'wb' && 'White Balance & Tint'}
            {activePill === 'focus' && 'Focus Mode & Peaking'}
            {activePill === 'ev' && 'Exposure Compensation (EV)'}
            {activePill === 'zoom' && 'Optical & Digital Zoom'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* 1. FPS CONTROLS */}
      {activePill === 'fps' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">PROJECT FRAME RATE</span>
            <span className="text-amber-400 font-bold">{settings.videoFps.toFixed(2)} FPS</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {FPS_PRESETS.map((fps) => {
              const active = settings.videoFps === fps;
              return (
                <button
                  key={fps}
                  onClick={() => {
                    // Smart dependency: calculate 180° shutter if shutterMode is angle
                    const speed = fps === 24 ? '1/48' : fps === 25 ? '1/50' : fps === 30 ? '1/60' : fps === 60 ? '1/120' : '1/240';
                    onUpdate({ videoFps: fps, shutterSpeed: speed });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    active
                      ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                      : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {fps} FPS
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-white/10">
            <span className="text-zinc-400">180° Cinema Shutter Rule</span>
            <span className="text-emerald-400 font-bold">Auto-Linked (1/{(settings.videoFps * 2).toFixed(0)}s)</span>
          </div>
        </div>
      )}

      {/* 2. SHUTTER CONTROLS */}
      {activePill === 'shutter' && (
        <div className="flex flex-col gap-3">
          {/* Mode Switch: Speed vs Angle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
              <button
                onClick={() => onUpdate({ shutterMode: 'speed' })}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  settings.shutterMode === 'speed' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                SPEED (1/s)
              </button>
              <button
                onClick={() => onUpdate({ shutterMode: 'angle' })}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  settings.shutterMode === 'angle' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ANGLE (°)
              </button>
            </div>

            <span className="text-amber-400 font-mono font-bold text-xs">
              {settings.shutterMode === 'angle' ? `${settings.shutterAngle.toFixed(1)}°` : `${settings.shutterSpeed}s`}
            </span>
          </div>

          {/* Shutter Angle Buttons */}
          {settings.shutterMode === 'angle' ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {SHUTTER_ANGLES.map((angle) => {
                  const active = Math.abs(settings.shutterAngle - angle) < 1;
                  return (
                    <button
                      key={angle}
                      onClick={() => onUpdate({ shutterAngle: angle })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                        active
                          ? 'bg-amber-400 text-black border-amber-300 shadow'
                          : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                      }`}
                    >
                      {angle}° {angle === 180 ? '(Film)' : ''}
                    </button>
                  );
                })}
              </div>
              <input
                type="range"
                min={11}
                max={360}
                step={1}
                value={settings.shutterAngle}
                onChange={(e) => onUpdate({ shutterAngle: Number(e.target.value) })}
                className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>
          ) : (
            /* Shutter Speed Buttons */
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {SHUTTER_PRESETS.map((speed) => {
                const active = settings.shutterSpeed === speed;
                return (
                  <button
                    key={speed}
                    onClick={() => onUpdate({ shutterSpeed: speed })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                      active
                        ? 'bg-amber-400 text-black border-amber-300 shadow'
                        : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                    }`}
                  >
                    {speed}
                  </button>
                );
              })}
            </div>
          )}

          {/* Flicker-free shortcuts */}
          <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-white/10">
            <span className="text-zinc-400">FLICKER FREE</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdate({ shutterSpeed: '1/50', flickerFree: '50hz' })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  settings.flickerFree === '50hz' ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}
              >
                50 Hz (PAL)
              </button>
              <button
                onClick={() => onUpdate({ shutterSpeed: '1/60', flickerFree: '60hz' })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  settings.flickerFree === '60hz' ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}
              >
                60 Hz (NTSC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ISO CONTROLS */}
      {activePill === 'iso' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">GAIN</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400">
                {settings.iso <= 800 ? 'Low Base ISO (400)' : 'High Base ISO (3200)'}
              </span>
            </div>
            <span className="text-amber-400 font-bold">{settings.iso} ISO</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {ISO_PRESETS.map((isoVal) => {
              const active = settings.iso === isoVal;
              return (
                <button
                  key={isoVal}
                  onClick={() => onUpdate({ iso: isoVal })}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                    active
                      ? 'bg-amber-400 text-black border-amber-300 shadow'
                      : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                  }`}
                >
                  {isoVal}
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={50}
            max={12800}
            step={50}
            value={settings.iso}
            onChange={(e) => onUpdate({ iso: Number(e.target.value) })}
            className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* 4. WB & TINT CONTROLS */}
      {activePill === 'wb' && (() => {
        const currentTint = settings.tint ?? settings.wbTint ?? 0;
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">COLOR TEMP & TINT</span>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-amber-400">{settings.whiteBalance}K</span>
                <span className={currentTint >= 0 ? 'text-emerald-400' : 'text-purple-400'}>
                  {currentTint >= 0 ? `+${currentTint}` : currentTint} Tint
                </span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {WB_PRESETS.map((preset) => {
                const active = settings.whiteBalance === preset.k;
                return (
                  <button
                    key={preset.k}
                    onClick={() => onUpdate({ whiteBalance: preset.k })}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border ${
                      active
                        ? 'bg-amber-400 text-black border-amber-300 shadow'
                        : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label} ({preset.k}K)
                  </button>
                );
              })}
            </div>

            {/* Kelvin Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>Warm (2500K)</span>
                <span>Cool (10000K)</span>
              </div>
              <input
                type="range"
                min={2500}
                max={10000}
                step={50}
                value={settings.whiteBalance}
                onChange={(e) => onUpdate({ whiteBalance: Number(e.target.value) })}
                className="w-full accent-amber-400 h-2 bg-gradient-to-r from-amber-600 via-zinc-400 to-sky-500 rounded-lg cursor-pointer"
              />
            </div>

            {/* Tint Slider */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span className="text-purple-400">Magenta (-50)</span>
                <span className="text-emerald-400">Green (+50)</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                step={1}
                value={currentTint}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdate({ tint: val, wbTint: val });
                }}
                className="w-full accent-amber-400 h-1.5 bg-gradient-to-r from-purple-500 via-zinc-700 to-emerald-500 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        );
      })()}

      {/* 5. FOCUS & PEAKING CONTROLS */}
      {activePill === 'focus' && (() => {
        const focusDist = settings.manualFocusDistance ?? Math.round((settings.manualFocus ?? 0.5) * 100);
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdate({ focusMode: settings.focusMode === 'auto' ? 'manual' : 'auto' })}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                    settings.focusMode === 'manual'
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-zinc-900 text-zinc-300 border-white/10'
                  }`}
                >
                  {settings.focusMode === 'manual' ? 'MANUAL FOCUS (MF)' : 'AUTOFOCUS (AF)'}
                </button>

                <button
                  onClick={() => onUpdate({ focusLocked: !settings.focusLocked, focusLock: !settings.focusLocked })}
                  className={`p-1.5 rounded-lg border transition-all ${
                    settings.focusLocked
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-zinc-900 text-zinc-400 border-white/10'
                  }`}
                  title="Focus Lock"
                >
                  {settings.focusLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
              </div>

              <span className="text-xs font-mono text-amber-400 font-bold">
                {focusDist}% DIST
              </span>
            </div>

            {/* Manual Focus Distance Slider */}
            {settings.focusMode === 'manual' && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>Macro (0.1m)</span>
                  <span>Infinity (∞)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={focusDist}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onUpdate({ manualFocusDistance: val, manualFocus: val / 100 });
                  }}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Focus Peaking Color & Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate({ focusPeaking: !settings.focusPeaking })}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-all ${
                    settings.focusPeaking
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-zinc-900 text-zinc-400 border-white/10'
                  }`}
                >
                  PEAKING {settings.focusPeaking ? 'ON' : 'OFF'}
                </button>

                <div className="flex items-center gap-1">
                  {PEAKING_COLORS.map((col) => (
                    <button
                      key={col.value}
                      onClick={() => onUpdate({ peakingColor: col.value })}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        settings.peakingColor === col.value ? 'scale-125 border-white shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={`Peaking Color: ${col.label}`}
                    />
                  ))}
                </div>
              </div>

              {/* Rack Focus Preset Button */}
              {onTriggerRackFocus && (
                <button
                  onClick={onTriggerRackFocus}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-white/10 text-[10px] font-mono font-bold"
                  title="Transition focus smoothly from foreground to background"
                >
                  <Sparkles size={11} />
                  RACK A ↔ B
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* 6. EV COMPENSATION CONTROLS */}
      {activePill === 'ev' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">EXPOSURE COMPENSATION</span>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${settings.ev === 0 ? 'text-white' : settings.ev > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {settings.ev > 0 ? `+${settings.ev.toFixed(1)}` : settings.ev.toFixed(1)} EV
              </span>
              <button
                onClick={() => onUpdate({ ev: 0 })}
                className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                title="Reset to 0 EV"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          </div>

          <input
            type="range"
            min={-3.0}
            max={3.0}
            step={0.1}
            value={settings.ev}
            onChange={(e) => onUpdate({ ev: Number(e.target.value) })}
            className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] font-mono">
            <span className="text-zinc-400">AUTO EXPOSURE LOCK</span>
            <button
              onClick={() => onUpdate({ exposureLocked: !settings.exposureLocked, exposureLock: !settings.exposureLocked })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition-all ${
                settings.exposureLocked
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-zinc-900 text-zinc-400 border-white/10'
              }`}
            >
              {settings.exposureLocked ? <Lock size={12} /> : <Unlock size={12} />}
              {settings.exposureLocked ? 'AE LOCKED' : 'AE UNLOCKED'}
            </button>
          </div>
        </div>
      )}

      {/* 7. ZOOM CONTROLS */}
      {activePill === 'zoom' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">MAGNIFICATION</span>
            <span className="text-amber-400 font-bold">{zoomLevel.toFixed(1)}x</span>
          </div>

          <div className="flex items-center justify-between gap-1.5">
            {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((z) => {
              const active = Math.abs(zoomLevel - z) < 0.05;
              return (
                <button
                  key={z}
                  onClick={() => onZoomChange(z)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    active
                      ? 'bg-amber-400 text-black border-amber-300 shadow'
                      : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                  }`}
                >
                  {z}x
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={0.5}
            max={5.0}
            step={0.1}
            value={zoomLevel}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
