import { createPortal } from 'react-dom';
import React, { useRef, useEffect, useState } from 'react';
import type {
  AspectRatio,
  ProSettings,
  AvailableCameraDevice,
} from '../types/camera';
import type { PhysicalCameraHardwareProfile } from '../types/hardware';
import { drawLiveHistogram, drawLiveWaveform } from '../utils/shaders';
import { cameraService } from '../services/cameraService';
import type { AppliedControls, ControlSupport } from '../services/cameraControlService';
import { BlackmagicAudioMeter } from './hud/BlackmagicAudioMeter';
import { BlackmagicPillPopover, type ActivePillType } from './hud/BlackmagicPillPopover';
import { BlackmagicQuickPresets } from './hud/BlackmagicQuickPresets';
import type { BlackmagicCameraPreset } from '../data/blackmagicPresets';
import {
  Zap,
  ZapOff,
  SwitchCamera,
  Layers,
  Sliders,
  Activity,
  X,
  Compass,
  Square,
  Sparkles,
  HardDrive,
} from 'lucide-react';

import type { StillSupport } from '../services/nativeCameraService';

interface ProHUDProps {
  aspectRatio: AspectRatio;
  onCycleAspectRatio: () => void;
  proSettings: ProSettings;
  onUpdatePro: (patch: Partial<ProSettings>) => void;
  videoElement: HTMLVideoElement | null;
  imageElement: HTMLImageElement | null;
  isFrontCamera: boolean;
  onSwitchCamera: () => void;
  hasTorch: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
  splitActive: boolean;
  onToggleSplit: () => void;
  onOpenSettings: () => void;
  zoomLevel?: number;
  onZoomChange?: (z: number) => void;
  isRecordingVideo?: boolean;
  recordingDuration?: number;
  stream?: MediaStream | null;
  availableLenses?: AvailableCameraDevice[];
  onSelectLens?: (id: string) => void;
  activeDeviceId?: string;
  onApplyPreset?: (preset: BlackmagicCameraPreset) => void;
  activePhysicalLens?: PhysicalCameraHardwareProfile;
  activeFocalLengthMm?: number;
  /** When false the HUD shows only the essential top row; monitoring and readouts are hidden. */
  expanded?: boolean;
  onToggleExpanded?: () => void;
  /** Top row (flash, pro, flip, timecode, ratio, scopes). Off when those live in the feature rail. */
  showHeader?: boolean;
  /** When set, the exposure readouts and scopes render there (below the frame) instead of over the picture. */
  toolsHost?: HTMLElement | null;
  /** Scopes show only inside the host (the Pro > Monitoring tab); with no host they are not drawn at all. */
  scopesInHostOnly?: boolean;
  /** True once a photo exists, so the post-capture before/after editor can be opened. */
  canCompare?: boolean;
  /** What the active camera really supports / accepted; unsupported manual controls are disabled, not faked. */
  controlSupport?: ControlSupport;
  hwControls?: AppliedControls;
  /** Which still formats this phone's camera really supports. */
  stillSupport?: StillSupport;
}

export const ProHUD: React.FC<ProHUDProps> = ({
  aspectRatio,
  onCycleAspectRatio,
  proSettings,
  onUpdatePro,
  videoElement,
  imageElement,
  onSwitchCamera,
  hasTorch,
  torchOn,
  onToggleTorch,
  splitActive,
  onToggleSplit,
  onOpenSettings,
  zoomLevel = 1.0,
  onZoomChange,
  isRecordingVideo = false,
  recordingDuration = 0,
  stream = null,
  availableLenses: _availableLenses = [],
  onSelectLens: _onSelectLens,
  activeDeviceId: _activeDeviceId,
  onApplyPreset,
  activePhysicalLens,
  activeFocalLengthMm,
  expanded = true,
  onToggleExpanded,
  showHeader = true,
  toolsHost = null,
  scopesInHostOnly = false,
  canCompare = true,
  controlSupport,
  hwControls,
  stillSupport,
}) => {
  const noIso = !!controlSupport && !controlSupport.iso;
  const noShutter = !!controlSupport && !controlSupport.exposureTime;
  const noManualFocus = !!controlSupport && !controlSupport.focusDistance;
  const evIsSoftware = !!hwControls && !hwControls.ev;
  const wbIsSoftware = !!hwControls && !hwControls.whiteBalance && !proSettings.wbAuto;
  const histCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);

  // Active parameter pill popover ('fps' | 'shutter' | 'iso' | 'wb' | 'focus' | 'ev' | 'zoom')
  const [activePill, setActivePill] = useState<ActivePillType>(null);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);

  // Storage estimate state
  const [storageInfo, setStorageInfo] = useState<{ freeGb: number; remainingMinutes: number }>({
    freeGb: 64.0,
    remainingMinutes: 120,
  });

  // SMPTE Timecode state
  const [liveTimecode, setLiveTimecode] = useState('00:00:00:00');

  // Gyroscope orientation for Dual-Axis Horizon Level
  const [rollAngle, setRollAngle] = useState(0);
  const [pitchAngle, setPitchAngle] = useState(0);

  // Clipping warnings
  const [clippingAlert, setClippingAlert] = useState<{ highlight: boolean; shadow: boolean }>({
    highlight: false,
    shadow: false,
  });

  const activeMonitorCount = [
    proSettings.falseColor,
    proSettings.zebraStripes,
    proSettings.focusPeaking,
    proSettings.histogram,
    proSettings.waveform,
    proSettings.horizonLevel,
    proSettings.safeAreaGuide || proSettings.safeAreaGuides,
  ].filter(Boolean).length;

  // Gyroscope listener for horizon level
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        setRollAngle(Math.max(-45, Math.min(45, e.gamma)));
      }
      if (e.beta !== null) {
        setPitchAngle(Math.max(-30, Math.min(30, e.beta - 90)));
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Update storage estimate when bitrate changes
  useEffect(() => {
    const mbps = proSettings.videoBitrate === 'maximum' ? 100 : proSettings.videoBitrate === 'high' ? 60 : proSettings.videoBitrate === 'medium' ? 35 : 15;
    cameraService.getStorageEstimate(mbps).then(setStorageInfo);
  }, [proSettings.videoBitrate]);

  // Real-time SMPTE Timecode generator loop
  useEffect(() => {
    let timer: number;
    const updateTimecode = () => {
      if (isRecordingVideo) {
        // Record run mode: exact duration at current fps
        setLiveTimecode(cameraService.formatTimecode(recordingDuration, proSettings.videoFps, 'record_run'));
      } else if (proSettings.timecodeMode === 'time_of_day') {
        const now = new Date();
        const totalSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        setLiveTimecode(cameraService.formatTimecode(totalSecs, proSettings.videoFps, 'time_of_day'));
      } else {
        setLiveTimecode('00:00:00:00');
      }
    };

    updateTimecode();
    timer = window.setInterval(updateTimecode, isRecordingVideo ? 100 : 500);
    return () => clearInterval(timer);
  }, [isRecordingVideo, recordingDuration, proSettings.videoFps, proSettings.timecodeMode]);

  // Live real-time histogram calculation loop
  useEffect(() => {
    if (!proSettings.histogram) return;
    let animId: number;

    const render = () => {
      const canvas = histCanvasRef.current;
      const source = videoElement || imageElement;
      if (canvas && source) {
        drawLiveHistogram(source, canvas, 140, 70);
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [proSettings.histogram, videoElement, imageElement]);

  // Live real-time waveform calculation loop & clipping detection
  useEffect(() => {
    if (!proSettings.waveform && !proSettings.shadowHighlightClipping) return;
    let animId: number;

    const renderWave = () => {
      const canvas = waveCanvasRef.current;
      const source = videoElement || imageElement;
      if (canvas && source) {
        drawLiveWaveform(source, canvas, 140, 65);
      }

      // Check clipping via EV and brightness
      if (proSettings.shadowHighlightClipping) {
        const isHighlight = proSettings.ev >= 1.5 || proSettings.iso >= 6400;
        const isShadow = proSettings.ev <= -2.0;
        setClippingAlert({ highlight: isHighlight, shadow: isShadow });
      }

      animId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, [proSettings.waveform, proSettings.shadowHighlightClipping, proSettings.ev, proSettings.iso, videoElement, imageElement]);

  // Trigger Rack Focus A <-> B Transition
  const handleRackFocusTransition = () => {
    const curVal = proSettings.manualFocusDistance ?? Math.round((proSettings.manualFocus ?? 0.5) * 100);
    const target = curVal > 50 ? 15 : 85;
    let current = curVal;
    const step = target > current ? 3 : -3;

    const interval = window.setInterval(() => {
      current += step;
      if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
        clearInterval(interval);
        onUpdatePro({ manualFocusDistance: target, manualFocus: target / 100 });
      } else {
        onUpdatePro({ manualFocusDistance: current, manualFocus: current / 100 });
      }
    }, 40);
  };

  // Readouts and scopes live below the frame when a host is given; otherwise they stay in place.
  const inHost = (node: React.ReactElement) => (toolsHost ? createPortal(node, toolsHost) : node);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-2.5 select-none">
      {/* 1. TOP CINEMA STATUS BAR (Blackmagic Design Inspired) */}
      <div className="flex flex-col gap-1.5 pointer-events-auto">
        {/* Upper Row: Left Tools (Flash/Settings/Flip) | Center (Timecode & Aspect) | Right (Presets & Audio) */}
        <div className={`${showHeader ? 'flex' : 'hidden'} items-center justify-between gap-1 text-[11px] font-mono`}>
          {/* Left: Consistent Round Buttons for Flash, Settings, and Camera Flip */}
          <div className="flex items-center gap-1.5">
            {/* Torch toggle */}
            <button
              onClick={onToggleTorch}
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-95 ${
                torchOn
                  ? 'bg-amber-500 text-black border-amber-300 shadow-lg shadow-amber-500/30'
                  : 'bg-black/60 text-white/90 border-white/15 hover:bg-black/80'
              }`}
              title={hasTorch ? 'Toggle Hardware Torch' : 'Simulated Torch'}
            >
              {torchOn ? <Zap size={15} fill="currentColor" /> : <ZapOff size={15} />}
            </button>

            {/* Pro Settings Drawer Toggle */}
            <button
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/80 hover:text-white active:scale-95 transition-all"
              title="Open Camera Settings Studio"
            >
              <Sliders size={15} />
            </button>

            {/* Flip camera front/back */}
            <button
              onClick={onSwitchCamera}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/80 hover:text-white active:scale-95 transition-all"
              title="Switch Front / Rear Camera"
            >
              <SwitchCamera size={15} />
            </button>
          </div>

          {/* Center: Live Timecode / Mode Badge & Aspect Ratio Pill */}
          <div className="flex items-center gap-1.5">
            {/* Timecode / Mode Badge */}
            <div
              className={`h-8 px-2.5 rounded-full backdrop-blur-md border text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                isRecordingVideo
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-900/40'
                  : 'bg-black/75 border-white/15 text-zinc-300'
              }`}
              title={`Timecode Mode: ${proSettings.timecodeMode === 'record_run' ? 'Record Run' : 'Time of Day'}`}
            >
              {isRecordingVideo ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-rose-400 font-black">REC</span>
                  <span>{liveTimecode}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span className="text-zinc-400 uppercase">{proSettings.captureMode}</span>
                  <span>{liveTimecode}</span>
                </>
              )}
            </div>

            {/* Aspect Ratio Badge */}
            <button
              onClick={onCycleAspectRatio}
              className="h-8 px-2.5 rounded-full bg-black/75 border border-amber-400/50 text-amber-400 font-mono font-bold text-[11px] hover:bg-black active:scale-95 transition-all shadow-sm"
              title="Cycle Aspect Ratio"
            >
              {aspectRatio}
            </button>

            {/* Active Physical Lens Equivalent Badge */}
            {expanded && (activeFocalLengthMm || activePhysicalLens) && (
              <div
                className="hidden xs:flex h-8 px-2.5 rounded-full bg-black/75 border border-white/15 text-amber-300 font-mono text-[10px] items-center gap-1 shadow-sm font-bold"
                title={`Active Physical Sensor: ${activePhysicalLens?.label || ''} (${activeFocalLengthMm || activePhysicalLens?.equivalentFocalLengthMm}mm equivalent)`}
              >
                {(activeFocalLengthMm || activePhysicalLens?.equivalentFocalLengthMm) ? (
                  <span>{activeFocalLengthMm || activePhysicalLens?.equivalentFocalLengthMm}mm</span>
                ) : null}
                <span className="text-[10px] text-zinc-400 uppercase">
                  {activePhysicalLens?.role === 'ultrawide'
                    ? 'UW'
                    : activePhysicalLens?.role === 'telephoto' || activePhysicalLens?.role === 'periscope'
                    ? 'TELE'
                    : 'WIDE'}
                </span>
              </div>
            )}

            {/* Storage Remaining Badge */}
            {expanded && <div
              className="hidden sm:flex h-8 px-2.5 rounded-full bg-black/75 border border-white/10 text-zinc-400 font-mono text-[10px] items-center gap-1 shadow-sm"
              title={`Remaining storage: ${storageInfo.freeGb.toFixed(1)} GB (~${storageInfo.remainingMinutes} mins)`}
            >
              <HardDrive size={11} className="text-zinc-500" />
              <span>{storageInfo.freeGb.toFixed(0)}G</span>
            </div>}
          </div>

          {/* Right: Tools toggle, presets & live audio meter */}
          <div className="flex items-center gap-1.5">
            {/* Tools toggle: reveals monitoring + exposure readouts */}
            {onToggleExpanded && (
              <button
                onClick={onToggleExpanded}
                aria-pressed={expanded}
                aria-label={expanded ? 'Hide pro tools' : 'Show pro tools'}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-95 ${
                  expanded
                    ? 'bg-amber-400 text-black border-amber-300'
                    : 'bg-black/60 text-white/90 border-white/15 hover:bg-black/80'
                }`}
              >
                <Activity size={15} />
                {!expanded && activeMonitorCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center">
                    {activeMonitorCount}
                  </span>
                )}
              </button>
            )}
            {/* Presets Quick Modal Trigger */}
            {expanded && <button
              onClick={() => setIsPresetsModalOpen(true)}
              className="h-8 px-2.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-amber-400 flex items-center gap-1 hover:bg-black active:scale-95 transition-all shadow-sm"
              title="Camera Studio Presets"
            >
              <Sparkles size={13} />
              <span className="text-[10px] font-mono font-bold">PRESETS</span>
            </button>}

            {/* Dual-Channel Live VU Meter */}
            {expanded && <div className="hidden sm:flex">
              <BlackmagicAudioMeter
                isRecording={isRecordingVideo}
                stream={stream}
                channels={proSettings.audio.channels}
                gain={proSettings.audio.gain}
              />
            </div>}
          </div>
        </div>

        {/* Lower Toolbar: Uniform Quick Monitoring Toggles Strip */}
        {expanded && showHeader && <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px] font-mono scroll-smooth">
          {/* False Color */}
          <button
            onClick={() => onUpdatePro({ falseColor: !proSettings.falseColor })}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center justify-center flex-shrink-0 ${
              proSettings.falseColor
                ? 'bg-purple-600 text-white border-purple-400'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="Blackmagic False Color Exposure Heatmap"
          >
            FALSE
          </button>

          {/* Zebra Stripes */}
          <button
            onClick={() => onUpdatePro({ zebraStripes: !proSettings.zebraStripes })}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center justify-center flex-shrink-0 ${
              proSettings.zebraStripes
                ? 'bg-amber-600 text-black border-amber-400'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="Zebra Highlight Clipping Stripes"
          >
            ZEBRA
          </button>

          {/* Focus Peaking */}
          <button
            onClick={() => onUpdatePro({ focusPeaking: !proSettings.focusPeaking })}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center justify-center flex-shrink-0 ${
              proSettings.focusPeaking
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="Focus Peaking Edge Assist"
          >
            PEAK
          </button>

          {/* RGB Histogram */}
          <button
            onClick={() => onUpdatePro({ histogram: !proSettings.histogram })}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center justify-center flex-shrink-0 ${
              proSettings.histogram
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="Live RGB Histogram"
          >
            HIST
          </button>

          {/* Waveform */}
          <button
            onClick={() => onUpdatePro({ waveform: !proSettings.waveform })}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center justify-center flex-shrink-0 ${
              proSettings.waveform
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="IRE 0-100 Exposure Waveform"
          >
            WAVE
          </button>

          {/* Horizon Level */}
          <button
            onClick={() => onUpdatePro({ horizonLevel: !proSettings.horizonLevel })}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 flex-shrink-0 ${
              proSettings.horizonLevel
                ? 'bg-amber-500 text-black border-amber-300'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="Dual-Axis Gyroscope Horizon Level"
          >
            <Compass size={11} />
            LEVEL
          </button>

          {/* Safe Area Guides */}
          <button
            onClick={() => {
              const next = !(proSettings.safeAreaGuide || proSettings.safeAreaGuides);
              onUpdatePro({ safeAreaGuide: next, safeAreaGuides: next });
            }}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 flex-shrink-0 ${
              (proSettings.safeAreaGuide || proSettings.safeAreaGuides)
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="90% Action Safe & 80% Title Safe Markers"
          >
            <Square size={10} />
            SAFE
          </button>

          {/* Split Before/After Toggle */}
          <button
            onClick={onToggleSplit}
            disabled={!canCompare}
            className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 flex-shrink-0 ${
              splitActive
                ? 'bg-white text-black border-white'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title={canCompare ? 'Compare the last photo before and after editing' : 'Take a photo to compare before and after'}
          >
            <Layers size={10} />
            COMPARE
          </button>
        </div>}
      </div>

      {/* 2. FLOATING REAL-TIME SCOPES (Histogram & Waveform) */}
      {(!scopesInHostOnly || toolsHost) && inHost(
      <div className={toolsHost ? 'flex items-stretch justify-center gap-2 px-4 pointer-events-auto' : 'absolute top-20 right-3 pointer-events-auto flex flex-col gap-2 z-30'}>
        {proSettings.histogram && (
          <div className={`rounded-2xl overflow-hidden border border-white/15 bg-black p-1.5 ${toolsHost ? 'flex-1 max-w-[190px]' : ''}`}>
            <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-400 px-1 pb-1 whitespace-nowrap">
              <span>Histogram</span>
              <button type="button" onClick={() => onUpdatePro({ histogram: false })} aria-label="Close histogram" className="w-6 h-6 -mr-1 flex items-center justify-center text-zinc-400 hover:text-white">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <canvas ref={histCanvasRef} width={140} height={65} className="rounded w-full h-[65px]" />
          </div>
        )}

        {proSettings.waveform && (
          <div className={`rounded-2xl overflow-hidden border border-white/15 bg-black p-1.5 ${toolsHost ? 'flex-1 max-w-[190px]' : ''}`}>
            <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-400 px-1 pb-1 whitespace-nowrap">
              <span className="flex items-center gap-1">
                <Activity size={10} className="text-zinc-300" aria-hidden="true" />
                Waveform (IRE 0-100)
              </span>
              <button type="button" onClick={() => onUpdatePro({ waveform: false })} aria-label="Close waveform" className="w-6 h-6 -mr-1 flex items-center justify-center text-zinc-400 hover:text-white">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <canvas ref={waveCanvasRef} width={140} height={65} className="rounded w-full h-[65px]" />
          </div>
        )}
      </div>
      )}

      {/* 3. CENTER VIEWFINDER OVERLAYS (Safe Areas, Horizon Level, Clipping Alerts) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Safe Area Guides (Action 90% and Title 80%) */}
        {(proSettings.safeAreaGuide || proSettings.safeAreaGuides) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* 90% Action Safe */}
            <div className="w-[90%] h-[90%] border border-dashed border-white/30 rounded-sm relative">
              <span className="absolute top-1 left-1 text-[10px] font-mono text-white/40">ACTION 90%</span>
            </div>
            {/* 80% Title Safe */}
            <div className="absolute w-[80%] h-[80%] border border-dotted border-amber-400/35 rounded-sm">
              <span className="absolute top-1 left-1 text-[10px] font-mono text-amber-400/40">TITLE 80%</span>
            </div>
          </div>
        )}

        {/* Dual-Axis Gyro Horizon Level */}
        {proSettings.horizonLevel && (
          <div
            className="absolute flex items-center justify-center pointer-events-none transition-transform duration-100"
            style={{ transform: `rotate(${-rollAngle}deg)` }}
          >
            {/* Horizon bar */}
            <div className="w-48 h-[2px] bg-white/40 relative flex items-center justify-between">
              <div className="w-6 h-[2px] bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full border border-amber-400 flex items-center justify-center">
                <div className={`w-1 h-1 rounded-full ${Math.abs(rollAngle) < 0.8 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <div className="w-6 h-[2px] bg-amber-400" />
            </div>

            {/* Pitch ladder */}
            <div className="absolute flex flex-col items-center gap-4 text-[10px] font-mono text-zinc-500">
              <span>+10°</span>
              <span className={Math.abs(pitchAngle) < 2 ? 'text-emerald-400 font-bold' : ''}>0°</span>
              <span>-10°</span>
            </div>
          </div>
        )}

        {/* Shadow & Highlight Clipping Alerts */}
        {(proSettings.shadowHighlightClipping || proSettings.clippingHighlights) && (
          <div className="absolute top-16 left-3 flex flex-col gap-1 pointer-events-none">
            {clippingAlert.highlight && (
              <div className="px-2 py-0.5 rounded bg-rose-600/90 text-white font-mono text-[10px] font-bold animate-pulse shadow-lg">
                ⚠️ HIGHLIGHT CLIPPING
              </div>
            )}
            {clippingAlert.shadow && (
              <div className="px-2 py-0.5 rounded bg-sky-600/90 text-white font-mono text-[10px] font-bold animate-pulse shadow-lg">
                ⚠️ UNDEREXPOSED SHADOWS
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. ACTIVE PARAMETER POPOVER (Positioned right above bottom pill bar) */}
      <BlackmagicPillPopover
        activePill={activePill}
        onClose={() => setActivePill(null)}
        settings={proSettings}
        onUpdate={onUpdatePro}
        zoomLevel={zoomLevel}
        onZoomChange={onZoomChange || (() => {})}
        onTriggerRackFocus={handleRackFocusTransition}
      />

      {/* 5. BLACKMAGIC QUICK PRESETS MODAL */}
      <BlackmagicQuickPresets
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        activeMode={proSettings.captureMode}
        currentSettings={proSettings}
        onApplyPreset={(preset) => {
          if (preset.settingsPatch) {
            onUpdatePro(preset.settingsPatch);
          }
          if (onApplyPreset) {
            onApplyPreset(preset);
          }
        }}
      />

      {/* 6. BOTTOM INTERACTIVE PARAMETER PILLS BAR (Blackmagic Style), shown with pro tools */}
      {expanded ? inHost(<div className={toolsHost ? 'flex items-center gap-4 overflow-x-auto no-scrollbar text-xs text-white/90 px-4 pointer-events-auto' : 'flex items-center justify-between text-[11px] font-mono text-white/90 bg-black/75 backdrop-blur-md rounded-xl px-2 py-1.5 border border-white/15 pointer-events-auto shadow-2xl mb-0.5'}>
        {/* FPS Pill (in video mode) or FORMAT (in photo mode) */}
        {proSettings.captureMode === 'video' ? (
          <button
            onClick={() => setActivePill(activePill === 'fps' ? null : 'fps')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
              activePill === 'fps' ? 'bg-amber-400 text-black font-bold' : 'hover:bg-zinc-800'
            }`}
            title="Adjust Frame Rate (FPS)"
          >
            <span className={activePill === 'fps' ? 'text-black' : 'text-zinc-500 font-semibold'}>FPS</span>
            <span className={activePill === 'fps' ? 'text-black font-bold' : 'text-amber-400 font-bold'}>
              {proSettings.videoFps.toFixed(0)}
            </span>
          </button>
        ) : (
          <button
            onClick={() => {
              // Cycle only through formats this phone can really save
              const formats: ('jpeg' | 'heif' | 'raw_dng')[] = (['jpeg', 'heif', 'raw_dng'] as const).filter(
                (f) => f === 'jpeg' || (f === 'raw_dng' && !!stillSupport?.raw) || (f === 'heif' && !!stillSupport?.heif)
              );
              const currentIdx = formats.indexOf(proSettings.photoFormat as 'jpeg' | 'heif' | 'raw_dng');
              const next = formats[(currentIdx === -1 ? 0 : currentIdx + 1) % formats.length];
              onUpdatePro({ photoFormat: next });
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Toggle Photo Format (JPEG / HEIF / RAW)"
          >
            <span className="text-zinc-500 font-semibold">FMT</span>
            <span className="text-amber-400 font-bold uppercase">{proSettings.photoFormat}</span>
          </button>
        )}

        <div className={toolsHost ? 'hidden' : 'h-3.5 w-[1px] bg-white/20'} />

        {/* SHUTTER Pill */}
        <button
          onClick={() => setActivePill(activePill === 'shutter' ? null : 'shutter')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
            activePill === 'shutter' ? 'bg-amber-400 text-black font-bold' : 'hover:bg-zinc-800'
          }`}
          title={noShutter ? 'Shutter speed is applied as a software exposure change on this camera' : 'Adjust Shutter Speed or Angle'}
        >
          <span className={activePill === 'shutter' ? 'text-black' : 'text-zinc-500 font-semibold'}>SHUTTER</span>
          <span className={activePill === 'shutter' ? 'text-black font-bold' : 'text-white font-bold'}>
            {proSettings.shutterAuto
              ? 'AUTO'
              : proSettings.shutterMode === 'angle'
              ? `${proSettings.shutterAngle.toFixed(0)}°`
              : proSettings.shutterSpeed}
          </span>
        </button>

        <div className={toolsHost ? 'hidden' : 'h-3.5 w-[1px] bg-white/20'} />

        {/* ISO Pill */}
        <button
          onClick={() => setActivePill(activePill === 'iso' ? null : 'iso')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
            activePill === 'iso' ? 'bg-amber-400 text-black font-bold' : 'hover:bg-zinc-800'
          }`}
          title={noIso ? 'ISO is applied as a software exposure change on this camera' : 'Adjust ISO Sensor Gain'}
        >
          <span className={activePill === 'iso' ? 'text-black' : 'text-zinc-500 font-semibold'}>ISO</span>
          <span className={activePill === 'iso' ? 'text-black font-bold' : 'text-white font-bold'}>
            {proSettings.isoAuto ? 'AUTO' : proSettings.iso}
            {noIso && !proSettings.isoAuto && <sup className="ml-0.5 text-[10px]" title="Software exposure change; this camera has no manual ISO">SW</sup>}
          </span>
        </button>

        <div className={toolsHost ? 'hidden' : 'h-3.5 w-[1px] bg-white/20'} />

        {/* WB Kelvin Pill */}
        <button
          onClick={() => setActivePill(activePill === 'wb' ? null : 'wb')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
            activePill === 'wb' ? 'bg-amber-400 text-black font-bold' : 'hover:bg-zinc-800'
          }`}
          title="Adjust White Balance Temperature & Tint"
        >
          <span className={activePill === 'wb' ? 'text-black' : 'text-zinc-500 font-semibold'}>WB</span>
          <span className={activePill === 'wb' ? 'text-black font-bold' : 'text-amber-300 font-bold'}>
            {proSettings.whiteBalance}K
            {wbIsSoftware && <sup className="ml-0.5 text-[10px]" title="Software colour adjustment; this camera has no manual white balance">SW</sup>}
          </span>
        </button>

        <div className={toolsHost ? 'hidden' : 'h-3.5 w-[1px] bg-white/20'} />

        {/* FOCUS Pill */}
        <button
          onClick={() => setActivePill(activePill === 'focus' ? null : 'focus')}
          disabled={noManualFocus}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
            activePill === 'focus' ? 'bg-amber-400 text-black font-bold' : 'hover:bg-zinc-800'
          }`}
          title={noManualFocus ? 'Manual focus is not supported by this camera or browser (tap the preview to focus)' : 'Adjust Focus Mode & Distance'}
        >
          <span className={activePill === 'focus' ? 'text-black' : 'text-zinc-500 font-semibold'}>FOCUS</span>
          <span className={activePill === 'focus' ? 'text-black font-bold' : 'text-emerald-400 font-bold'}>
            {proSettings.focusMode === 'manual' && !noManualFocus
              ? `${proSettings.manualFocusDistance ?? Math.round((proSettings.manualFocus ?? 0.5) * 100)}%`
              : 'AF'}
          </span>
        </button>

        <div className={toolsHost ? 'hidden' : 'h-3.5 w-[1px] bg-white/20'} />

        {/* EV Compensation Pill */}
        <button
          onClick={() => setActivePill(activePill === 'ev' ? null : 'ev')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
            activePill === 'ev' ? 'bg-amber-400 text-black font-bold' : 'hover:bg-zinc-800'
          }`}
          title="Adjust Exposure Compensation (EV)"
        >
          <span className={activePill === 'ev' ? 'text-black' : 'text-zinc-500 font-semibold'}>EV</span>
          <span
            className={
              activePill === 'ev'
                ? 'text-black font-bold'
                : proSettings.ev === 0
                ? 'text-white font-bold'
                : proSettings.ev > 0
                ? 'text-emerald-400 font-bold'
                : 'text-rose-400 font-bold'
            }
          >
            {proSettings.ev > 0 ? `+${proSettings.ev.toFixed(1)}` : proSettings.ev.toFixed(1)}
            {evIsSoftware && proSettings.ev !== 0 && (
              <sup className="ml-0.5 text-[10px]" title="Software brightness adjustment; this camera has no hardware exposure compensation">
                SW
              </sup>
            )}
          </span>
        </button>

        <div className={toolsHost ? 'hidden' : 'h-3.5 w-[1px] bg-white/20'} />

        {/* ZOOM Pill */}
        <button
          onClick={() => setActivePill(activePill === 'zoom' ? null : 'zoom')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
            activePill === 'zoom' ? 'bg-amber-400 text-black font-bold' : 'hover:bg-zinc-800'
          }`}
          title="Adjust Zoom Magnification"
        >
          <span className={activePill === 'zoom' ? 'text-black font-bold' : 'text-amber-400 font-bold'}>
            {zoomLevel.toFixed(1)}x
          </span>
        </button>
      </div>) : <div />}
    </div>
  );
};
