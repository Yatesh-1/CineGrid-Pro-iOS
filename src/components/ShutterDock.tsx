import React, { useState } from 'react';
import { MediaThumb } from './MediaThumb';
import type { CapturedPhoto, BurstMode, BracketingMode, CameraMode } from '../types/camera';
import { Timer, Image as ImageIcon, Circle, Zap, Layers, Mic, Moon, Gauge, Clock } from 'lucide-react';
import { CaptureModeSelector } from './CaptureModeSelector';

interface ShutterDockProps {
  onCapture: () => void;
  isCapturing: boolean;
  timerCount: number | null;
  onSelectTimer: (seconds: number) => void;
  selectedTimer: number;
  latestPhoto: CapturedPhoto | null;
  onOpenGallery: () => void;
  captureMode: CameraMode;
  onSelectCaptureMode?: (mode: CameraMode) => void;
  onToggleCaptureMode?: () => void;
  isRecordingVideo?: boolean;
  recordingDuration?: number;
  burstMode?: BurstMode;
  bracketingMode?: BracketingMode;
  burstProgress?: { current: number; total: number } | null;
  onOpenAudioStudio?: () => void;
}

export const ShutterDock: React.FC<ShutterDockProps> = ({
  onCapture,
  isCapturing,
  timerCount,
  onSelectTimer,
  selectedTimer,
  latestPhoto,
  onOpenGallery,
  captureMode,
  onSelectCaptureMode,
  onToggleCaptureMode,
  isRecordingVideo = false,
  recordingDuration = 0,
  burstMode = 'off',
  bracketingMode = 'off',
  burstProgress = null,
  onOpenAudioStudio,
}) => {
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  const timerOptions = [0, 3, 5, 10];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideoStyleMode =
    captureMode === 'video' ||
    (captureMode === 'panorama' && isRecordingVideo) ||
    captureMode === 'dual' ||
    captureMode === 'slow_motion' ||
    captureMode === 'timelapse';

  const handleModeChange = (mode: CameraMode) => {
    if (onSelectCaptureMode) {
      onSelectCaptureMode(mode);
    } else if (onToggleCaptureMode) {
      onToggleCaptureMode();
    }
  };

  return (
    <div className="relative w-full px-6 pt-0 pb-1 safe-bottom flex flex-col items-center select-none">
      {/* 1. iOS-Style Compact Horizontally Scrollable Mode Selector */}
      <CaptureModeSelector
        activeMode={captureMode}
        onSelectMode={handleModeChange}
        disabled={isRecordingVideo || isCapturing}
      />

      {/* 2. Main Controls Bar: Gallery (Left) | Capture Button (Center) | Audio Studio & Timer (Right) */}
      <div className="w-full flex items-center justify-between">
        {/* LEFT: Recent Photo Thumbnail Gallery Button */}
        <div className="w-16 flex items-center justify-start">
          <button
            onClick={onOpenGallery}
            className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-white/20 active:scale-95 transition-colors flex items-center justify-center flex-shrink-0 hover:border-amber-400/50"
            title="Open Photo Gallery & Editor"
          >
            {latestPhoto ? (
              <MediaThumb
                key={latestPhoto.id}
                photo={latestPhoto}
                alt="Latest captured shot"
                className="cg-thumb-pop w-full h-full object-cover"
              />
            ) : (
              <ImageIcon size={20} className="text-zinc-500" />
            )}
          </button>
        </div>

        {/* CENTER: Context-Aware Shutter / Record Button */}
        <div className="relative flex flex-col items-center justify-center">
          <button
            onClick={onCapture}
            disabled={isCapturing}
            title={
              isVideoStyleMode
                ? isRecordingVideo
                  ? 'Stop Recording'
                  : 'Start Recording'
                : 'Take High-Res Photo'
            }
            aria-label={
              isVideoStyleMode
                ? isRecordingVideo
                  ? 'Stop Recording'
                  : 'Start Recording'
                : 'Take High-Res Photo'
            }
            className={`relative rounded-full flex items-center justify-center transition-transform duration-100 ${
              isCapturing ? 'scale-90 opacity-80' : 'active:scale-90'
            }`}
            style={{ width: '64px', height: '64px' }}
          >
            {/* Outer Concentric Ring */}
            <div
              className={`absolute inset-0 rounded-full border-[3px] transition-colors ${
                isVideoStyleMode
                  ? isRecordingVideo
                    ? 'border-rose-500 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : captureMode === 'slow_motion'
                      ? 'border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                      : captureMode === 'timelapse'
                        ? 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                        : 'border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : captureMode === 'night'
                    ? 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                    : 'border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.25)]'
              }`}
            />

            {/* Inner Shutter Core */}
            <div
              className={`transition-all duration-200 flex items-center justify-center shadow-inner ${
                isVideoStyleMode
                  ? isRecordingVideo
                    ? 'w-8 h-8 rounded-md bg-rose-600'
                    : captureMode === 'slow_motion'
                      ? 'w-12 h-12 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400'
                      : captureMode === 'timelapse'
                        ? 'w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400'
                        : 'w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400'
                  : captureMode === 'night'
                    ? 'w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300'
                    : 'w-12 h-12 rounded-full bg-gradient-to-tr from-zinc-200 to-white'
              }`}
            >
              {timerCount !== null ? (
                <span className="text-xl font-bold font-mono text-black animate-ping">
                  {timerCount}
                </span>
              ) : burstProgress !== null ? (
                <span className="text-xs font-bold font-mono text-black">
                  {burstProgress.current}/{burstProgress.total}
                </span>
              ) : isVideoStyleMode && isRecordingVideo ? (
                <Circle size={10} fill="white" className="text-white animate-ping" />
              ) : captureMode === 'night' ? (
                <Moon size={16} className="text-black" />
              ) : captureMode === 'slow_motion' ? (
                <Gauge size={16} className="text-black" />
              ) : captureMode === 'timelapse' ? (
                <Clock size={16} className="text-black" />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full border border-black/10 ${
                    captureMode === 'video' ? 'bg-rose-500' : 'bg-white'
                  }`}
                />
              )}
            </div>
          </button>

          {/* Active Mode Status Badge Below Button */}
          {isVideoStyleMode && isRecordingVideo ? (
            <div className="absolute -bottom-5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-300 font-mono text-[10px] font-bold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{formatDuration(recordingDuration)}</span>
            </div>
          ) : captureMode === 'photo' && burstMode !== 'off' ? (
            <div className="absolute -bottom-5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-400 font-mono text-[10px] font-bold shadow">
              <Zap size={9} />
              <span>BURST ({burstMode === '3fps' ? '3' : '10'})</span>
            </div>
          ) : captureMode === 'photo' && bracketingMode !== 'off' ? (
            <div className="absolute -bottom-5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/50 text-sky-400 font-mono text-[10px] font-bold shadow">
              <Layers size={9} />
              <span>AEB ({bracketingMode === '3_bracket' || bracketingMode === '3_shots' ? '3' : '5'})</span>
            </div>
          ) : null}
        </div>

        {/* RIGHT: Contextual Audio Studio or Self Timer */}
        <div className="w-16 flex items-center justify-end gap-2">
          {/* Audio Studio Button (Visible when Video or Dual Recording) */}
          {isVideoStyleMode && onOpenAudioStudio ? (
            <button
              onClick={onOpenAudioStudio}
              className="w-10 h-10 rounded-full bg-zinc-900 text-amber-400 border border-amber-400/40 flex items-center justify-center hover:bg-zinc-800 transition-all active:scale-95 shadow-md shadow-amber-400/10"
              title="Open Audio Studio (Noise Reduction & Mic)"
            >
              <Mic size={16} />
            </button>
          ) : (
            /* Timer Button for Stills / Night / Portrait */
            <div className="relative">
              <button
                onClick={() => setShowTimerMenu(!showTimerMenu)}
                className={`w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-md transition-all active:scale-95 ${
                  selectedTimer > 0
                    ? 'bg-amber-400 text-black border-amber-300 font-bold font-mono text-xs shadow-md shadow-amber-400/20'
                    : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white hover:bg-zinc-800'
                }`}
                title="Self-Timer (3s, 5s, 10s)"
              >
                {selectedTimer > 0 ? `${selectedTimer}s` : <Timer size={17} />}
              </button>

              {/* Timer Popover */}
              {showTimerMenu && (
                <div className="absolute bottom-12 right-0 bg-zinc-950/95 border border-white/20 rounded-xl shadow-2xl p-1 flex flex-col gap-1 z-30 min-w-[72px] backdrop-blur-xl animate-in fade-in duration-100">
                  {timerOptions.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        onSelectTimer(sec);
                        setShowTimerMenu(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-center transition-colors ${
                        selectedTimer === sec
                          ? 'bg-amber-400 text-black'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {sec === 0 ? 'Off' : `${sec}s`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
