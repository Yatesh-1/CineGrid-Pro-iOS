import React, { useState } from 'react';
import type { DeviceHardwareReport } from '../../types/hardware';
import {
  X,
  Cpu,
  Camera,
  Maximize2,
  ShieldAlert,
  Info,
  CheckCircle2,
  Video,
  RefreshCw,
} from 'lucide-react';

interface HardwareInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DeviceHardwareReport | null;
  onRefreshHardware?: () => void;
  onSelectCamera?: (deviceId: string) => void;
  activeDeviceId?: string;
}

export const HardwareInspectorModal: React.FC<HardwareInspectorModalProps> = ({
  isOpen,
  onClose,
  report,
  onRefreshHardware,
  onSelectCamera,
  activeDeviceId,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  if (!isOpen || !report) return null;

  const activeCam =
    report.allCameras.find((c) => c.deviceId === (selectedProfileId || activeDeviceId)) ||
    report.allCameras[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/30">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-mono text-white tracking-wide flex items-center gap-2">
                DEVICE HARDWARE INTELLIGENCE
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-mono">
                  {report.platform.toUpperCase()}
                </span>
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                {report.platformDescription} • {report.nativeFramework}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshHardware && (
              <button
                onClick={onRefreshHardware}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Rescan Device Hardware"
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split view (Camera List on left, Sensor Inspector on right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Physical Cameras Overview */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Detected Physical Sensors ({report.totalCameras})</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {report.rearCameras.length} Rear / {report.frontCameras.length} Front
                </span>
              </h3>

              <div className="space-y-2">
                {report.allCameras.map((cam) => {
                  const isSelected = (selectedProfileId || activeDeviceId) === cam.deviceId;
                  const isActiveStream = activeDeviceId === cam.deviceId;

                  return (
                    <div
                      key={cam.deviceId}
                      onClick={() => {
                        setSelectedProfileId(cam.deviceId);
                        if (onSelectCamera && !isActiveStream) {
                          onSelectCamera(cam.deviceId);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400/60 shadow-lg shadow-amber-400/10'
                          : 'bg-zinc-900/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                          <Camera size={13} className={isSelected ? 'text-amber-400' : 'text-zinc-400'} />
                          {cam.label}
                        </span>
                        {isActiveStream && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 uppercase text-amber-300">
                          {cam.role.replace('_', ' ')}
                        </span>
                        <span>{cam.opticalZoomFactor}x Opt</span>
                        {cam.equivalentFocalLengthMm && (
                          <span>• {cam.equivalentFocalLengthMm}mm equiv</span>
                        )}
                        {cam.nativeAperture && <span>• {cam.nativeAperture}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Concurrent Multi-Camera Status */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10">
              <h4 className="text-xs font-mono font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Video size={13} className="text-amber-400" />
                Dual ISP Concurrent Streaming
              </h4>
              <p className="text-[11px] font-mono text-zinc-400 mb-2">
                {report.hasConcurrentCameraSupport
                  ? `Hardware supports concurrent multi-sensor sessions (${report.concurrentCombinations.length} combinations available).`
                  : 'Single ISP hardware: Browser platform restricts concurrent stream access.'}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    report.hasConcurrentCameraSupport
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <CheckCircle2 size={10} />
                  {report.hasConcurrentCameraSupport ? 'CONCURRENCY READY' : 'SINGLE ISP PIPELINE'}
                </span>
              </div>
            </div>

            {/* Warnings and Limitations */}
            {report.warningsAndLimitations.length > 0 && (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10">
                <h4 className="text-xs font-mono font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <ShieldAlert size={13} />
                  Driver Transparency Notes
                </h4>
                <ul className="space-y-1 text-[10px] font-mono text-zinc-400">
                  {report.warningsAndLimitations.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-amber-400">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Active Selected Sensor Deep Inspection */}
          <div className="md:col-span-7 space-y-4">
            {activeCam ? (
              <>
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/15">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div>
                      <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                        {activeCam.label}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {activeCam.role.toUpperCase()}
                        </span>
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-400">ID: {activeCam.deviceId}</p>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-amber-400">
                        {activeCam.opticalZoomFactor}x Optical
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {activeCam.equivalentFocalLengthMm ? `${activeCam.equivalentFocalLengthMm}mm Equiv` : 'Focal length not reported'}
                      </div>
                    </div>
                  </div>

                  {/* Capabilities Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                    <CapabilityPill
                      label="Aperture"
                      value={activeCam.nativeAperture || 'f/1.8'}
                      status="active"
                    />
                    <CapabilityPill
                      label="Max Frame Rate"
                      value={`${activeCam.frameRate.max} FPS`}
                      status={activeCam.frameRate.max >= 60 ? 'active' : 'neutral'}
                    />
                    <CapabilityPill
                      label="Slow Motion"
                      value={activeCam.frameRate.supportsSlowMo ? 'Supported (120+)' : 'Limited (30/60)'}
                      status={activeCam.frameRate.supportsSlowMo ? 'active' : 'neutral'}
                    />
                    <CapabilityPill
                      label="ISO Range"
                      value={`${activeCam.exposure.minIso} - ${activeCam.exposure.maxIso}`}
                      status="active"
                    />
                    <CapabilityPill
                      label="Shutter Speed"
                      value={`1/${Math.round(1000 / activeCam.exposure.minExposureDurationMs)}s - ${(activeCam.exposure.maxExposureDurationMs / 1000).toFixed(1)}s`}
                      status="active"
                    />
                    <CapabilityPill
                      label="Exposure Comp"
                      value={`${activeCam.exposure.minEv} to +${activeCam.exposure.maxEv} EV`}
                      status="active"
                    />
                    <CapabilityPill
                      label="Focus Mode"
                      value={
                        activeCam.focus.isFixedFocus
                          ? 'Fixed Focus'
                          : activeCam.focus.hasManualFocus
                          ? 'Auto & Manual'
                          : 'Auto Only'
                      }
                      status={activeCam.focus.isFixedFocus ? 'warning' : 'active'}
                    />
                    <CapabilityPill
                      label="Macro Focus"
                      value={
                        activeCam.isMacroCapable
                          ? `Close (${(activeCam.focus.minFocusDistanceMeters || 0.02) * 100}cm)`
                          : 'Standard'
                      }
                      status={activeCam.isMacroCapable ? 'active' : 'neutral'}
                    />
                    <CapabilityPill
                      label="Stabilization"
                      value={
                        activeCam.hasOpticalStabilization
                          ? 'OIS' + (activeCam.hasElectronicStabilization ? ' + EIS' : '')
                          : activeCam.hasElectronicStabilization
                            ? 'No OIS (EIS in hardware)'
                            : 'None reported'
                      }
                      status={activeCam.hasOpticalStabilization ? 'active' : 'neutral'}
                    />
                    <CapabilityPill
                      label="Flash / Torch"
                      value={activeCam.hasTorch ? 'Available' : 'None'}
                      status={activeCam.hasTorch ? 'active' : 'neutral'}
                    />
                    <CapabilityPill
                      label="Depth Capture"
                      value={activeCam.hasDepthCapture ? 'Hardware Depth' : 'Algorithmic'}
                      status={activeCam.hasDepthCapture ? 'active' : 'neutral'}
                    />
                    <CapabilityPill
                      label="Kelvin Range"
                      value={`${activeCam.whiteBalance.minKelvin}K - ${activeCam.whiteBalance.maxKelvin}K`}
                      status="active"
                    />
                  </div>
                </div>

                {/* Supported Video Capture Formats */}
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/15">
                  <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Maximize2 size={13} className="text-amber-400" />
                    Supported Resolution & Aspect Ratio Matrix
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    {activeCam.supportedResolutions.map((res, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between"
                      >
                        <span className="text-white font-medium">{res.label}</span>
                        <span className="text-zinc-400 text-[10px]">{res.aspectRatio}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw Driver Diagnostics */}
                {activeCam.rawCapabilities && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <h4 className="text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1">
                      <Info size={11} />
                      W3C MediaTrackCapabilities Raw Dictionary
                    </h4>
                    <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-32 p-2 bg-black/60 rounded border border-white/5">
                      {JSON.stringify(activeCam.rawCapabilities, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                Select a physical camera from the left panel to inspect hardware capabilities.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>CineGrid Pro Hardware Abstraction Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-400 text-black font-bold hover:bg-amber-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const CapabilityPill: React.FC<{
  label: string;
  value: string;
  status: 'active' | 'warning' | 'neutral';
}> = ({ label, value, status }) => {
  return (
    <div className="p-2 rounded-lg bg-black/40 border border-white/10 flex flex-col justify-between">
      <span className="text-[10px] text-zinc-400 uppercase">{label}</span>
      <span
        className={`font-bold mt-0.5 truncate ${
          status === 'active'
            ? 'text-white'
            : status === 'warning'
            ? 'text-amber-400'
            : 'text-zinc-300'
        }`}
      >
        {value}
      </span>
    </div>
  );
};
