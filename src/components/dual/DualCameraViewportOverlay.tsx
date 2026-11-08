// CineGrid Pro — Dual Camera Viewport Overlay
// Draggable Picture-in-Picture & Split-Screen Viewport Preview

import React, { useRef } from 'react';
import { RefreshCw, Move, AlertCircle } from 'lucide-react';
import type { DualCameraConfig, PipPosition } from '../../types/camera';

interface DualCameraViewportOverlayProps {
  config: DualCameraConfig;
  secondaryStream: MediaStream | null;
  onSwapCameras: () => void;
  onChangePipPosition: (pos: PipPosition) => void;
}

export const DualCameraViewportOverlay: React.FC<DualCameraViewportOverlayProps> = ({
  config,
  secondaryStream,
  onSwapCameras,
  onChangePipPosition,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Hook secondary stream to video element when available
  React.useEffect(() => {
    if (videoRef.current && secondaryStream) {
      videoRef.current.srcObject = secondaryStream;
      videoRef.current.play().catch(() => {});
    }
  }, [secondaryStream]);

  if (config.layout === 'split_vertical') {
    return (
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
        {/* Top Split Label */}
        <div className="p-2 flex items-center justify-between text-[10px] font-mono text-white/80 bg-black/40">
          <span>PRIMARY ({config.primaryFacing.toUpperCase()})</span>
          <button
            onClick={onSwapCameras}
            className="pointer-events-auto px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold flex items-center gap-1"
          >
            <RefreshCw size={10} />
            <span>SWAP</span>
          </button>
        </div>

        {/* Center Divider Line */}
        <div className="my-auto w-full h-[2px] bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />

        {/* Bottom Split Label */}
        <div className="p-2 flex items-center justify-between text-[10px] font-mono text-white/80 bg-black/40">
          <span>SECONDARY ({config.secondaryFacing.toUpperCase()})</span>
        </div>
      </div>
    );
  }

  if (config.layout === 'split_horizontal') {
    return (
      <div className="absolute inset-0 pointer-events-none z-10 flex">
        {/* Left Half */}
        <div className="flex-1 p-2 text-[10px] font-mono text-white/80 bg-black/30">
          PRIMARY ({config.primaryFacing.toUpperCase()})
        </div>

        {/* Divider */}
        <div className="h-full w-[2px] bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />

        {/* Right Half */}
        <div className="flex-1 p-2 text-[10px] font-mono text-white/80 bg-black/30 text-right">
          SECONDARY ({config.secondaryFacing.toUpperCase()})
        </div>
      </div>
    );
  }

  // Default: PIP Window
  let posClass = 'top-4 right-4';
  if (config.pipPosition === 'top_left') posClass = 'top-4 left-4';
  if (config.pipPosition === 'bottom_left') posClass = 'bottom-20 left-4';
  if (config.pipPosition === 'bottom_right') posClass = 'bottom-20 right-4';

  let sizeClass = 'w-28 h-40';
  if (config.pipSize === 'medium') sizeClass = 'w-36 h-52';
  if (config.pipSize === 'large') sizeClass = 'w-44 h-64';

  const cyclePosition = () => {
    const positions: PipPosition[] = ['top_right', 'bottom_right', 'bottom_left', 'top_left'];
    const nextIdx = (positions.indexOf(config.pipPosition) + 1) % positions.length;
    onChangePipPosition(positions[nextIdx]);
  };

  return (
    <div className={`absolute ${posClass} ${sizeClass} z-30 transition-all duration-300 pointer-events-auto`}>
      <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-amber-400 bg-zinc-950 shadow-2xl flex flex-col">
        {/* Video stream or diagnostic placeholder */}
        {secondaryStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-zinc-900/90 text-zinc-300">
            <AlertCircle size={20} className="text-amber-400 mb-1" />
            <div className="text-[10px] font-mono font-bold text-white">
              {config.secondaryFacing === 'user' ? 'FRONT CAMERA' : 'REAR CAMERA'}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-1 line-clamp-2">
              {config.isSupported ? 'Connecting sensor...' : 'Single ISP device'}
            </div>
          </div>
        )}

        {/* Floating PIP Controls Bar */}
        <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
          <button
            onClick={cyclePosition}
            className="w-6 h-6 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-black"
            title="Move PIP Window"
          >
            <Move size={10} />
          </button>
          <button
            onClick={onSwapCameras}
            className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center hover:bg-amber-300"
            title="Swap Cameras"
          >
            <RefreshCw size={10} />
          </button>
        </div>

        {/* Label */}
        <div className="absolute bottom-1 left-2 text-[10px] font-mono font-bold text-white drop-shadow">
          {config.secondaryFacing.toUpperCase()}
        </div>
      </div>
    </div>
  );
};
