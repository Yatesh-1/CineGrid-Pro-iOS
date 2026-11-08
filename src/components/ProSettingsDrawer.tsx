import React, { useState, useEffect } from 'react';
import type {
  CameraFilter,
  ProSettings,
  VideoResolution,
  VideoFps,
  VideoCodec,
  PhotoFormat,
  BurstMode,
  PeakingColor,
} from '../types/camera';
import {
  cameraService,
  type AvailableAudioDevice,
  type HardwareCapabilities,
} from '../services/cameraService';
import { EXPOSURE_TIME_UNIT_SECONDS, type ControlSupport } from '../services/cameraControlService';
import { LICENSE_ENFORCED } from '../config';
import { clampPct, evFromPct, focusFromPct, isoFromPct, kelvinFromPct, pctFromEv, pctFromFocus, pctFromIso, pctFromKelvin, pctFromShutter, shutterFromPct, shutterLabel } from '../utils/studioScale';
import type { BlackmagicCameraPreset } from '../data/blackmagicPresets';
import type { PhysicalCameraHardwareProfile } from '../types/hardware';
import { CAMERA_FILTERS } from '../data/presets';
import type { StillSupport } from '../services/nativeCameraService';
import {
  X,
  RotateCcw,
  Camera,
  Sun,
  Focus,
  Palette,
  Activity,
  Film,
  Check,
  Eye,
  SwitchCamera,
  Shield,
  Lock,
  Unlock,
  Cpu,
  ShieldAlert,
} from 'lucide-react';

interface ProSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProSettings;
  onChange: (patch: Partial<ProSettings>) => void;
  onReset: () => void;
  onApplyPreset?: (preset: BlackmagicCameraPreset) => void;
  isFrontCamera?: boolean;
  onSwitchCamera?: () => void;
  onOpenLicenseInfo?: () => void;
  onOpenAdminDashboard?: () => void;
  hardwareCaps?: HardwareCapabilities;
  /** What the active camera track really supports, and which controls the hardware accepted. */
  controlSupport?: ControlSupport;
  /** Receives the element where live scopes (histogram, waveform) are drawn inside the Monitoring tab. */
  onScopesHost?: (el: HTMLDivElement | null) => void;
  /** Tab to show each time the drawer opens (e.g. the video ISO readout opens Exposure). */
  initialTab?: ProSettingsTab;
  activeHardwareProfile?: PhysicalCameraHardwareProfile;
  onOpenHardwareInspector?: () => void;
  /** Film look currently applied to the viewfinder and saved photos. */
  selectedFilterId?: string;
  onSelectFilter?: (filter: CameraFilter) => void;
  /** Which still formats and multi-frame modes this phone's camera really supports. */
  stillSupport?: StillSupport;
  /** The native film camera owns the camera: several web-side controls then have no effect, and the drawer says so. */
  nativeFilmActive?: boolean;
}

export type ProSettingsTab = 'camera' | 'exposure' | 'focus' | 'color' | 'monitoring' | 'recording';

const TABS: { id: ProSettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'camera', label: 'CAMERA', icon: <Camera size={13} /> },
  { id: 'exposure', label: 'EXPOSURE', icon: <Sun size={13} /> },
  { id: 'focus', label: 'FOCUS', icon: <Focus size={13} /> },
  { id: 'color', label: 'COLOR', icon: <Palette size={13} /> },
  { id: 'monitoring', label: 'MONITORING', icon: <Activity size={13} /> },
  { id: 'recording', label: 'RECORDING', icon: <Film size={13} /> },
];

const RESOLUTIONS: VideoResolution[] = ['720p', '1080p', '4k', '8k'];
const FPS_OPTIONS: VideoFps[] = [23.98, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 100, 120];
const SHUTTER_PRESETS = ['1/24', '1/48', '1/50', '1/60', '1/96', '1/120', '1/250', '1/500', '1/1000', '1/2000'];
const ISO_PRESETS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800];
const PEAKING_COLORS: { label: string; value: PeakingColor; hex: string }[] = [
  { label: 'Green', value: 'green', hex: '#10b981' },
  { label: 'Red', value: 'red', hex: '#ef4444' },
  { label: 'Cyan', value: 'cyan', hex: '#06b6d4' },
  { label: 'Yellow', value: 'yellow', hex: '#f59e0b' },
];

/** A 1-100 slider. 1 is the lowest the camera allows, 100 the highest. Moving it switches that control to manual. */
const PercentSlider: React.FC<{ label: string; value: number; readout: string; active: boolean; onPct: (p: number) => void }> = ({ label, value, readout, active, onPct }) => (
  <div className="flex flex-col gap-1 mt-1.5">
    <div className="flex justify-between text-[11px] font-mono">
      <span className="text-zinc-500">{label} · 1–100</span>
      <span className={active ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
        {value} <span className="text-zinc-500">({readout})</span>
      </span>
    </div>
    <input
      type="range"
      min={1}
      max={100}
      step={1}
      value={value}
      aria-label={`${label} 1 to 100`}
      onChange={(e) => onPct(Number(e.target.value))}
      className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
    />
  </div>
);

export const ProSettingsDrawer: React.FC<ProSettingsDrawerProps> = ({
  nativeFilmActive = false,
  isOpen,
  onClose,
  settings,
  onChange,
  onReset,
  isFrontCamera = false,
  onSwitchCamera,
  onOpenLicenseInfo,
  onOpenAdminDashboard,
  hardwareCaps,
  controlSupport,
  onScopesHost,
  initialTab,
  activeHardwareProfile,
  onOpenHardwareInspector,
  selectedFilterId,
  onSelectFilter,
  stillSupport,
}) => {
  const [activeTab, setActiveTab] = useState<ProSettingsTab>(initialTab ?? 'camera');
  useEffect(() => {
    if (isOpen && initialTab) setActiveTab(initialTab);
  }, [isOpen, initialTab]);
  // On cameras that cannot set ISO or shutter, the app applies them as a software exposure change and says so
  const isoSoftware = !!controlSupport && !controlSupport.iso;
  // Ranges for the 1-100 sliders: the camera's own limits when it reports them
  const isoRange = controlSupport?.iso ? { min: controlSupport.iso.min, max: controlSupport.iso.max } : { min: 100, max: 6400 };
  const shutterRange = controlSupport?.exposureTime
    ? { min: controlSupport.exposureTime.min * EXPOSURE_TIME_UNIT_SECONDS, max: controlSupport.exposureTime.max * EXPOSURE_TIME_UNIT_SECONDS }
    : { min: 1 / 4000, max: 1 };
  const evRange = controlSupport?.ev ? { min: controlSupport.ev.min, max: controlSupport.ev.max } : { min: -3, max: 3 };
  const kelvinRange = controlSupport?.colorTemperature ? { min: controlSupport.colorTemperature.min, max: controlSupport.colorTemperature.max } : { min: 2500, max: 10000 };
  const currentShutterSecs = (() => {
    const m = /^1\/(\d+(?:\.\d+)?)$/.exec(String(settings.shutterSpeed).trim());
    const secs = m ? 1 / Number(m[1]) : Number(String(settings.shutterSpeed).replace(/s$/, ''));
    return Number.isFinite(secs) && secs > 0 ? secs : 1 / 60;
  })();
  const [audioDevices, setAudioDevices] = useState<AvailableAudioDevice[]>([]);

  useEffect(() => {
    if (isOpen) {
      cameraService.enumerateAudioInputs().then(setAudioDevices);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-zinc-950/98 border-t border-white/20 rounded-t-3xl p-4 sm:p-5 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 max-h-[88vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider uppercase">
              Camera Studio Controls
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Reset Settings to Defaults"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Category tabs: plain names in one sliding row, every tab reachable */}
        <div role="tablist" className="flex items-center gap-5 px-1 overflow-x-auto no-scrollbar border-b border-white/10">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-shrink-0 h-11 flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-colors ${
                  isSelected ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
                {isSelected && <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>

        {/* TAB PANELS (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4 pr-0.5">
          {nativeFilmActive && (
            <div role="note" data-testid="native-film-notice" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] leading-snug text-amber-100">
              <strong className="font-semibold">Native film camera is on.</strong> Exposure compensation (EV), zoom, flash and front/rear switching control the camera hardware. ISO, shutter, white-balance Kelvin, tint, the colour sliders, scopes and subject detection are not applied in this mode, and focus is continuous auto. Choose &quot;No camera&quot; in Look Studio to use them.
            </div>
          )}
          {/* 1. CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="flex flex-col gap-4">
              {/* Front / Rear Camera Flip */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div className="flex items-center gap-2">
                  <SwitchCamera size={16} className="text-amber-400" />
                  <div>
                    <div className="text-xs font-mono font-bold text-white">Camera Facing Mode</div>
                    <div className="text-[10px] text-zinc-400">{isFrontCamera ? 'Front Selfie Sensor' : 'Rear Master Sensor'}</div>
                  </div>
                </div>
                {onSwitchCamera && (
                  <button
                    onClick={onSwitchCamera}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-amber-400 font-mono font-bold text-xs border border-white/10 hover:bg-zinc-700 active:scale-95 transition-all"
                  >
                    FLIP CAMERA
                  </button>
                )}
              </div>

              {/* Optical & Digital Image Stabilization */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-emerald-400" />
                  <div>
                    <div className="text-xs font-mono font-bold text-white">Optical Stabilization (OIS)</div>
                    <div className="text-[10px] text-zinc-400">
                      {hardwareCaps?.hasOpticalStabilization
                        ? 'Built into the lens, always on'
                        : activeHardwareProfile?.hasElectronicStabilization
                          ? 'This lens has none. The camera offers electronic stabilization, which this app cannot switch on.'
                          : 'This camera reports no stabilization'}
                    </div>
                  </div>
                </div>
                <div
                  className={`px-2.5 py-1 rounded-md border font-mono text-xs font-bold ${
                    hardwareCaps?.hasOpticalStabilization
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-800 border-white/15 text-zinc-400'
                  }`}
                >
                  {hardwareCaps?.hasOpticalStabilization ? 'OIS' : 'NO OIS'}
                </div>
              </div>

              {/* Active Physical Sensor Hardware Intelligence Card */}
              {activeHardwareProfile && (
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                      <Camera size={14} className="text-amber-400" />
                      <span>{activeHardwareProfile.label}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold uppercase">
                      {activeHardwareProfile.role.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-zinc-400">
                    <div className="p-1.5 rounded bg-black/40">
                      <div className="text-zinc-500">OPTICAL</div>
                      <div className="text-white font-bold">{activeHardwareProfile.opticalZoomFactor}x</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/40">
                      <div className="text-zinc-500">FOCAL EQUIV</div>
                      <div className="text-white font-bold">{activeHardwareProfile.equivalentFocalLengthMm ? `${activeHardwareProfile.equivalentFocalLengthMm}mm` : 'Not reported'}</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/40">
                      <div className="text-zinc-500">APERTURE</div>
                      <div className="text-white font-bold">{activeHardwareProfile.nativeAperture || 'f/1.8'}</div>
                    </div>
                  </div>

                  {onOpenHardwareInspector && (
                    <button
                      onClick={onOpenHardwareInspector}
                      className="mt-1 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Cpu size={12} />
                      <span>Device Hardware Intelligence Inspector</span>
                    </button>
                  )}
                </div>
              )}

              {/* License Entitlement & Administration */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={15} className="text-amber-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">Studio License & Hardware Bind</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      LICENSE_ENFORCED
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {LICENSE_ENFORCED ? 'LICENSED' : 'TRIAL'}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                  {LICENSE_ENFORCED
                    ? 'Activated for this device. The license is checked with the server.'
                    : 'Trial build: every feature is unlocked and no license is required.'}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {onOpenLicenseInfo && (
                    <button
                      onClick={onOpenLicenseInfo}
                      className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-mono text-xs font-bold border border-white/10 transition-colors"
                    >
                      License Information
                    </button>
                  )}
                  {onOpenAdminDashboard && (
                    <button
                      onClick={onOpenAdminDashboard}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold border border-white/10 transition-colors"
                      title="Open Administrator Portal"
                    >
                      Admin Portal
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. EXPOSURE TAB */}
          {activeTab === 'exposure' && (
            <div className="flex flex-col gap-4">
              {/* Hardware exposure support: say plainly what this camera/browser can really do */}
              {controlSupport && (!controlSupport.iso || !controlSupport.exposureTime) && (
                <div role="note" className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-[11px] text-zinc-300 flex items-start gap-2">
                  <ShieldAlert size={14} className="text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    {!controlSupport.iso && !controlSupport.exposureTime
                      ? 'This camera cannot set ISO or shutter speed itself, so the app applies them as a software exposure change (ISO 100 at 1/60 s is neutral). It brightens or darkens the picture and the saved photo, but it does not change noise or motion blur.'
                      : !controlSupport.iso
                      ? 'This camera cannot set ISO itself, so ISO is applied as a software exposure change. Shutter speed is set on the camera.'
                      : 'This camera cannot set shutter speed itself, so shutter is applied as a software exposure change. ISO is set on the camera.'}
                  </span>
                </div>
              )}
              {/* ISO Gain */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-semibold">ISO SENSOR GAIN</span>
                  <span className="text-amber-400 font-bold">{settings.isoAuto ? 'AUTO' : settings.iso + ' ISO'}{isoSoftware && !settings.isoAuto ? ' ? software' : ''}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange({ isoAuto: true })}
                    className={'py-1.5 rounded-lg text-xs font-mono font-bold border ' + (settings.isoAuto ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 text-zinc-300 border-white/10')}
                  >
                    AUTO
                  </button>
                  {ISO_PRESETS.filter((v) => !controlSupport?.iso || (v >= controlSupport.iso.min && v <= controlSupport.iso.max)).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onChange({ iso: val, isoAuto: false })}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                        !settings.isoAuto && settings.iso === val
                          ? 'bg-amber-400 text-black border-amber-300 shadow'
                          : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <PercentSlider
                  label="ISO"
                  value={pctFromIso(settings.iso, isoRange)}
                  active={!settings.isoAuto}
                  readout={settings.isoAuto ? 'Auto' : `${settings.iso}`}
                  onPct={(p) => onChange({ iso: isoFromPct(p, isoRange), isoAuto: false })}
                />
              </div>

              {/* Shutter Speed & 180° Angle */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-semibold">SHUTTER SPEED (ANGLE)</span>
                  <span className="text-amber-400 font-bold">
                    {settings.shutterAuto
                      ? 'AUTO'
                      : settings.shutterMode === 'angle'
                      ? `${settings.shutterAngle.toFixed(1)}°`
                      : `${settings.shutterSpeed}s`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <button
                    type="button"
                    onClick={() => onChange({ shutterAuto: true })}
                    className={'px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ' + (settings.shutterAuto ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 text-zinc-300 border-white/10')}
                  >
                    AUTO
                  </button>
                  {SHUTTER_PRESETS.filter((sp) => {
                    const r = controlSupport?.exposureTime;
                    const m = /^1\/(\d+)$/.exec(sp);
                    if (!r || !m) return true;
                    const secs = 1 / Number(m[1]);
                    return secs >= r.min * EXPOSURE_TIME_UNIT_SECONDS && secs <= r.max * EXPOSURE_TIME_UNIT_SECONDS;
                  }).map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => onChange({ shutterSpeed: speed, shutterMode: 'speed', shutterAuto: false })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                        !settings.shutterAuto && settings.shutterSpeed === speed && settings.shutterMode === 'speed'
                          ? 'bg-amber-400 text-black border-amber-300 shadow'
                          : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
                <PercentSlider
                  label="Shutter (fast to slow)"
                  value={pctFromShutter(currentShutterSecs, shutterRange)}
                  active={!settings.shutterAuto}
                  readout={settings.shutterAuto ? 'Auto' : shutterLabel(currentShutterSecs)}
                  onPct={(p) => onChange({ shutterSpeed: shutterLabel(shutterFromPct(p, shutterRange)), shutterMode: 'speed', shutterAuto: false })}
                />
              </div>

              {/* Exposure Compensation (EV) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-semibold">EXPOSURE COMPENSATION</span>
                  <span className={`font-bold ${settings.ev === 0 ? 'text-white' : settings.ev > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {settings.ev > 0 ? `+${settings.ev.toFixed(1)}` : settings.ev.toFixed(1)} EV
                  </span>
                </div>
                <input
                  type="range"
                  min={controlSupport?.ev ? controlSupport.ev.min : -3.0}
                  max={controlSupport?.ev ? controlSupport.ev.max : 3.0}
                  step={0.1}
                  aria-label="Exposure compensation"
                  value={settings.ev}
                  onChange={(e) => onChange({ ev: Number(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <PercentSlider
                  label="Exposure (dark to bright)"
                  value={pctFromEv(settings.ev, evRange)}
                  active={settings.ev !== 0}
                  readout={`${settings.ev > 0 ? '+' : ''}${settings.ev.toFixed(1)} EV`}
                  onPct={(p) => onChange({ ev: evFromPct(p, evRange) })}
                />
              </div>

              {controlSupport && !controlSupport.ev && (
                <p className="text-[11px] text-zinc-400 -mt-2">
                  Exposure compensation is applied as a software brightness adjustment on this camera.
                </p>
              )}

              {/* Auto Exposure Lock */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div className="flex items-center gap-2">
                  {settings.exposureLocked ? <Lock size={16} className="text-amber-400" /> : <Unlock size={16} className="text-zinc-400" />}
                  <div>
                    <div className="text-xs font-mono font-bold text-white">Auto Exposure Lock (AE-L)</div>
                    <div className="text-[10px] text-zinc-400">Locks sensor exposure to prevent light shifts during framing</div>
                  </div>
                </div>
                <button
                  onClick={() => onChange({ exposureLocked: !settings.exposureLocked, exposureLock: !settings.exposureLocked })}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs border transition-all ${
                    settings.exposureLocked ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-800 text-zinc-300 border-white/10'
                  }`}
                >
                  {settings.exposureLocked ? 'LOCKED' : 'UNLOCKED'}
                </button>
              </div>
            </div>
          )}

          {/* 3. FOCUS TAB */}
          {activeTab === 'focus' && (
            <div className="flex flex-col gap-4">
              {/* If Fixed Focus Lens */}
              {(hardwareCaps?.isFixedFocus || activeHardwareProfile?.focus.isFixedFocus) && (
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs font-mono">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                    <ShieldAlert size={14} />
                    <span>FIXED FOCUS OPTICAL SENSOR</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 leading-relaxed">
                    The active physical lens ({activeHardwareProfile?.role || 'sensor'}) has a fixed hyperfocal focus design. Manual distance motor is physically unavailable. Focus peaking remains active for edge contrast confirmation.
                  </div>
                </div>
              )}

              {/* AF / MF Mode Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div>
                  <div className="text-xs font-mono font-bold text-white">Focus Mode</div>
                  <div className="text-[10px] text-zinc-400">Toggle Continuous Autofocus or Manual Distance Ring</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => onChange({ focusMode: 'auto' })}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                      settings.focusMode === 'auto' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    AF
                  </button>
                  <button
                    onClick={() => onChange({ focusMode: 'manual' })}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                      settings.focusMode === 'manual' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    MF
                  </button>
                </div>
              </div>

              {/* Focus 1-100: moving it takes manual focus (1 = nearest, 100 = farthest) */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-white/10">
                <PercentSlider
                  label="Focus (near to far)"
                  value={pctFromFocus(settings.manualFocus ?? 0.5)}
                  active={settings.focusMode === 'manual'}
                  readout={settings.focusMode === 'manual' ? `${pctFromFocus(settings.manualFocus ?? 0.5)}` : 'Auto'}
                  onPct={(p) => onChange({ focusMode: 'manual', manualFocus: focusFromPct(p), manualFocusDistance: p })}
                />
              </div>

              {/* Manual Focus Distance Ring */}
              {settings.focusMode === 'manual' && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900 border border-white/10">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">MANUAL DISTANCE</span>
                    <span className="text-amber-400 font-bold">{Math.round((settings.manualFocus ?? 0.5) * 100)}% (Near to ∞)</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((settings.manualFocus ?? 0.5) * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onChange({ manualFocus: v / 100, manualFocusDistance: v });
                    }}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Focus Peaking Color */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-white">Focus Peaking Assist</div>
                    <div className="text-[10px] text-zinc-400">Sharp contrast edge highlight detection</div>
                  </div>
                  <button
                    onClick={() => onChange({ focusPeaking: !settings.focusPeaking })}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                      settings.focusPeaking ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-zinc-800 text-zinc-400 border-white/10'
                    }`}
                  >
                    {settings.focusPeaking ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400">ASSIST COLOR:</span>
                  <div className="flex items-center gap-2">
                    {PEAKING_COLORS.map((col) => (
                      <button
                        key={col.value}
                        onClick={() => onChange({ peakingColor: col.value })}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          settings.peakingColor === col.value ? 'scale-125 border-white shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. COLOR TAB */}
          {activeTab === 'color' && (
            <div className="flex flex-col gap-4">
              {/* White Balance Kelvin */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-semibold">COLOR TEMPERATURE</span>
                  <span className="text-amber-400 font-bold">{settings.whiteBalance}K</span>
                </div>
                <input
                  type="range"
                  min={2500}
                  max={10000}
                  step={50}
                  value={settings.whiteBalance}
                  onChange={(e) => onChange({ whiteBalance: Number(e.target.value), wbAuto: false })}
                  className="w-full accent-amber-400 h-2 bg-gradient-to-r from-amber-600 via-zinc-400 to-sky-500 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => onChange({ wbAuto: true, whiteBalance: 5600 })}
                  aria-pressed={settings.wbAuto}
                  className={`self-start px-3 py-1 rounded-lg border text-[11px] font-mono font-bold ${settings.wbAuto ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-300'}`}
                >
                  Auto white balance
                </button>
                <PercentSlider
                  label="White balance (warm to cool)"
                  value={pctFromKelvin(settings.whiteBalance, kelvinRange)}
                  active={!settings.wbAuto}
                  readout={settings.wbAuto ? 'Auto' : `${settings.whiteBalance}K`}
                  onPct={(p) => onChange({ whiteBalance: kelvinFromPct(p, kelvinRange), wbAuto: false })}
                />
              </div>

              {/* Tint Adjustment */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-semibold">TINT (MAGENTA / GREEN)</span>
                  <span className={(settings.wbTint ?? 0) >= 0 ? 'text-emerald-400 font-bold' : 'text-purple-400 font-bold'}>
                    {(settings.wbTint ?? 0) >= 0 ? `+${settings.wbTint ?? 0}` : settings.wbTint}
                  </span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={settings.wbTint ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChange({ wbTint: v, tint: v });
                  }}
                  className="w-full accent-amber-400 h-1.5 bg-gradient-to-r from-purple-500 via-zinc-700 to-emerald-500 rounded-lg cursor-pointer"
                />
                <PercentSlider
                  label="Tint (magenta to green)"
                  value={clampPct(1 + (99 * ((settings.wbTint ?? 0) + 50)) / 100)}
                  active={(settings.wbTint ?? 0) !== 0}
                  readout={`${(settings.wbTint ?? 0) >= 0 ? '+' : ''}${settings.wbTint ?? 0}`}
                  onPct={(p) => {
                    const v = Math.round(-50 + (100 * (clampPct(p) - 1)) / 99);
                    onChange({ wbTint: v, tint: v });
                  }}
                />
              </div>

              {/* Saturation and contrast (live in the preview and in saved photos) */}
              <div className="flex flex-col gap-3">
                <PercentSlider
                  label="Saturation"
                  value={clampPct(1 + (99 * ((settings.colorSaturation ?? 0) + 100)) / 200)}
                  active={(settings.colorSaturation ?? 0) !== 0}
                  readout={`${(settings.colorSaturation ?? 0) > 0 ? '+' : ''}${settings.colorSaturation ?? 0}`}
                  onPct={(p) => onChange({ colorSaturation: Math.round(-100 + (200 * (clampPct(p) - 1)) / 99) })}
                />
                <PercentSlider
                  label="Contrast"
                  value={clampPct(1 + (99 * ((settings.colorContrast ?? 0) + 100)) / 200)}
                  active={(settings.colorContrast ?? 0) !== 0}
                  readout={`${(settings.colorContrast ?? 0) > 0 ? '+' : ''}${settings.colorContrast ?? 0}`}
                  onPct={(p) => onChange({ colorContrast: Math.round(-100 + (200 * (clampPct(p) - 1)) / 99) })}
                />
                <button
                  type="button"
                  onClick={() => onChange({ colorSaturation: 0, colorContrast: 0, wbTint: 0, tint: 0, wbAuto: true, whiteBalance: 5600 })}
                  className="self-start px-3 py-1 rounded-lg border border-white/10 bg-zinc-900 text-[11px] font-mono font-bold text-zinc-300"
                >
                  Reset colour
                </button>
              </div>

              {/* Film Look Selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-zinc-400 font-semibold">FILM LOOK & LUT EMULATION</span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                  {CAMERA_FILTERS.slice(0, 8).map((look) => (
                    <button
                      type="button"
                      key={look.id}
                      onClick={() => onSelectFilter?.(look)}
                      aria-pressed={selectedFilterId === look.id}
                      className={`p-2.5 rounded-xl border bg-zinc-900/80 flex items-center gap-2 text-left cursor-pointer ${
                        selectedFilterId === look.id ? 'border-amber-400' : 'border-white/10 hover:border-amber-400/50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: look.previewGradient || look.previewColor }} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{look.name}</span>
                        <span className="text-[10px] text-zinc-400 truncate">{look.subtitle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. MONITORING TAB */}
          {activeTab === 'monitoring' && (
            <div className="flex flex-col gap-3">
              {/* Live scopes appear here while their switches below are on */}
              <div ref={onScopesHost} className="flex gap-2 empty:hidden" data-testid="scopes-host" />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onChange({ falseColor: !settings.falseColor })}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                    settings.falseColor ? 'bg-purple-950/70 border-purple-500 text-purple-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  <span>False Color</span>
                  {settings.falseColor ? <Check size={14} /> : <Eye size={14} />}
                </button>

                <button
                  onClick={() => onChange({ histogram: !settings.histogram })}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                    settings.histogram ? 'bg-sky-950/70 border-sky-500 text-sky-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  <span>RGB Histogram</span>
                  {settings.histogram ? <Check size={14} /> : <Eye size={14} />}
                </button>

                <button
                  onClick={() => onChange({ waveform: !settings.waveform })}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                    settings.waveform ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  <span>Waveform (IRE)</span>
                  {settings.waveform ? <Check size={14} /> : <Eye size={14} />}
                </button>

                <button
                  onClick={() => onChange({ horizonLevel: !settings.horizonLevel })}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                    settings.horizonLevel ? 'bg-amber-950/70 border-amber-500 text-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  <span>Horizon Level</span>
                  {settings.horizonLevel ? <Check size={14} /> : <Eye size={14} />}
                </button>

                <button
                  onClick={() => onChange({ safeAreaGuide: !settings.safeAreaGuide, safeAreaGuides: !settings.safeAreaGuide })}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                    settings.safeAreaGuide ? 'bg-blue-950/70 border-blue-500 text-blue-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  <span>Safe Area Guides</span>
                  {settings.safeAreaGuide ? <Check size={14} /> : <Eye size={14} />}
                </button>

                <button
                  onClick={() =>
                    onChange({
                      shadowHighlightClipping: !settings.shadowHighlightClipping,
                      clippingHighlights: !settings.shadowHighlightClipping,
                      clippingShadows: !settings.shadowHighlightClipping,
                    })
                  }
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                    settings.shadowHighlightClipping ? 'bg-rose-950/70 border-rose-500 text-rose-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  <span>Clipping Alerts</span>
                  {settings.shadowHighlightClipping ? <Check size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Zebra Threshold */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-white">Zebra Highlight Stripes</div>
                  <button
                    onClick={() => onChange({ zebraStripes: !settings.zebraStripes })}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold border transition-all ${
                      settings.zebraStripes ? 'bg-amber-500 text-black border-amber-400' : 'bg-zinc-800 text-zinc-400 border-white/10'
                    }`}
                  >
                    {settings.zebraStripes ? 'ON' : 'OFF'}
                  </button>
                </div>
                {settings.zebraStripes && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>Threshold</span>
                      <span className="text-amber-400 font-bold">{settings.zebraThreshold}% IRE</span>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={100}
                      step={5}
                      value={settings.zebraThreshold}
                      onChange={(e) => onChange({ zebraThreshold: Number(e.target.value) })}
                      className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. RECORDING TAB */}
          {activeTab === 'recording' && (
            <div className="flex flex-col gap-4">
              {/* Resolution */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-zinc-400 font-semibold">VIDEO RESOLUTION</span>
                <div className="grid grid-cols-4 gap-2">
                  {RESOLUTIONS.map((res) => (
                    <button
                      key={res}
                      onClick={() => onChange({ videoResolution: res })}
                      className={`py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all border ${
                        settings.videoResolution === res
                          ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                          : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-semibold">FRAME RATE (FPS)</span>
                  <span className="text-amber-400 font-bold">{settings.videoFps.toFixed(2)} FPS</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {FPS_OPTIONS.map((fps) => (
                    <button
                      key={fps}
                      onClick={() => {
                        const speed = fps === 24 ? '1/48' : fps === 25 ? '1/50' : fps === 30 ? '1/60' : fps === 60 ? '1/120' : '1/240';
                        onChange({ videoFps: fps, shutterSpeed: speed });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                        settings.videoFps === fps
                          ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                          : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Codec */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-zinc-400 font-semibold">CODEC & BITRATE</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['h264', 'h265', 'prores', 'vp9'] as VideoCodec[]).map((c) => {
                    const caps = cameraService.getSupportedCodecs();
                    const supported = c === 'prores' ? false : c === 'vp9' ? caps.vp9 : c === 'h264' ? MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') : caps.h265;
                    return (
                    <button
                      key={c}
                      disabled={!supported}
                      title={supported ? undefined : 'Not supported by this phone'}
                      onClick={() => onChange({ videoCodec: c })}
                      className={`py-2 rounded-lg text-xs font-mono font-bold uppercase border transition-all ${
                        !supported ? 'bg-zinc-900 text-zinc-600 border-white/5 opacity-40' : settings.videoCodec === c ? 'bg-rose-600 text-white border-rose-400' : 'bg-zinc-900 text-zinc-400 border-white/10'
                      }`}
                    >
                      {c === 'prores' ? 'ProRes (n/a)' : supported ? (c === 'vp9' ? 'VP9 (WebM)' : c.toUpperCase()) : `${c.toUpperCase()} (n/a)`}
                    </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Input */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-zinc-400 font-semibold">MICROPHONE SOURCE</span>
                <div className="flex flex-col gap-1.5">
                  {audioDevices.length > 0 ? (
                    audioDevices.map((dev) => (
                      <button
                        key={dev.deviceId}
                        onClick={() => onChange({ audio: { ...settings.audio, deviceId: dev.deviceId, label: dev.label } })}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                          settings.audio.deviceId === dev.deviceId
                            ? 'bg-sky-950/80 border-sky-400 text-sky-300'
                            : 'bg-zinc-900 border-white/10 text-zinc-400'
                        }`}
                      >
                        <span>{dev.label}</span>
                        {settings.audio.deviceId === dev.deviceId && <Check size={14} />}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 bg-zinc-900 rounded-xl text-xs text-zinc-400 font-mono">
                      Built-in Device Microphone (Default)
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Formats & Burst */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-zinc-400 font-semibold">STILL FORMAT</span>
                  <div className="flex gap-1">
                    {(['jpeg', 'heif', 'raw_dng'] as PhotoFormat[]).map((fmt) => {
                      const available =
                        fmt === 'jpeg' || (fmt === 'raw_dng' && !!stillSupport?.raw) || (fmt === 'heif' && !!stillSupport?.heif);
                      const why =
                        fmt === 'heif'
                          ? stillSupport?.heifReason ?? 'HEIF is not available'
                          : 'This camera cannot shoot RAW (needs a phone whose camera reports RAW)';
                      return (
                        <button
                          key={fmt}
                          type="button"
                          disabled={!available}
                          title={available ? undefined : why}
                          onClick={() => onChange({ photoFormat: fmt })}
                          className={`flex-1 py-1 rounded text-[10px] font-mono font-bold uppercase border ${
                            settings.photoFormat === fmt && available
                              ? 'bg-amber-400 text-black border-amber-300'
                              : available
                              ? 'bg-zinc-900 text-zinc-400 border-white/10'
                              : 'bg-zinc-950 text-zinc-700 border-white/5 line-through cursor-not-allowed'
                          }`}
                        >
                          {fmt === 'raw_dng' ? 'RAW' : fmt}
                        </button>
                      );
                    })}
                  </div>
                  {!stillSupport?.raw && stillSupport?.known && (
                    <span className="text-[9px] text-zinc-500 leading-tight">RAW needs a camera that reports RAW; HEIF needs an encoder.</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-zinc-400 font-semibold">BURST MODE</span>
                  <div className="flex gap-1">
                    {(['off', '3fps', '10fps'] as BurstMode[]).map((bm) => (
                      <button
                        key={bm}
                        onClick={() => onChange({ burstMode: bm })}
                        className={`flex-1 py-1 rounded text-[10px] font-mono font-bold uppercase border ${
                          settings.burstMode === bm ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 text-zinc-400 border-white/10'
                        }`}
                      >
                        {bm === 'off' ? 'Off' : bm === '3fps' ? '3' : '10'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Apply & Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-amber-400 text-black font-bold font-mono text-xs tracking-wider uppercase shadow-xl hover:bg-amber-300 active:scale-98 transition-all"
        >
          APPLY & RETURN TO VIEWFINDER
        </button>
      </div>
    </div>
  );
};
