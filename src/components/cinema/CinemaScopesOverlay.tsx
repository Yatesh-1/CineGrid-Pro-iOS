import React, { useEffect, useRef } from 'react';
import type {
  CinemaVideoConfig,
} from '../../types/cinemaVideo';
import {
  drawFalseColor,
  drawWaveform,
  drawRgbParade,
  drawVectorscope,
  drawZebraOverlay,
  drawFocusPeaking,
  drawFocusMagnifier,
} from '../../utils/cinemaScopes';
import { drawLiveHistogram } from '../../utils/shaders';

interface CinemaScopesOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  config: CinemaVideoConfig;
}

export const CinemaScopesOverlay: React.FC<CinemaScopesOverlayProps> = ({
  videoRef,
  config,
}) => {
  const falseColorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rgbParadeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorscopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zebraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const histogramCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const rafRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const renderLoop = () => {
      if (!isMounted) return;
      frameCountRef.current++;

      const video = videoRef.current;
      // Only draw when video is ready and playing
      if (video && video.readyState >= 2 && !video.paused) {
        // Run scopes at ~30-60fps (stagger heavy scopes every 2-3 frames to avoid GC pressure)
        const frame = frameCountRef.current;

        // 1. False Color
        if (config.activeScopes.has('false_color') && falseColorCanvasRef.current && frame % 2 === 0) {
          drawFalseColor(video, falseColorCanvasRef.current);
        }

        // 2. Waveform
        if (config.activeScopes.has('waveform') && waveformCanvasRef.current && frame % 2 === 0) {
          drawWaveform(video, waveformCanvasRef.current);
        }

        // 3. RGB Parade
        if (config.activeScopes.has('rgb_parade') && rgbParadeCanvasRef.current && frame % 3 === 0) {
          drawRgbParade(video, rgbParadeCanvasRef.current);
        }

        // 4. Vectorscope
        if (config.activeScopes.has('vectorscope') && vectorscopeCanvasRef.current && frame % 3 === 0) {
          drawVectorscope(video, vectorscopeCanvasRef.current);
        }

        // 5. Zebra Overlay
        if (config.activeScopes.has('zebra') && zebraCanvasRef.current && frame % 2 === 0) {
          drawZebraOverlay(video, zebraCanvasRef.current, 85);
        }

        // 6. Focus Peaking
        if (config.activeScopes.has('peaking') && peakingCanvasRef.current && frame % 2 === 0) {
          const colorHex =
            config.focusPeakingColor === 'green'
              ? '#22c55e'
              : config.focusPeakingColor === 'red'
              ? '#ef4444'
              : config.focusPeakingColor === 'blue'
              ? '#3b82f6'
              : config.focusPeakingColor === 'amber'
              ? '#f59e0b'
              : '#ffffff';
          drawFocusPeaking(video, peakingCanvasRef.current, colorHex);
        }

        // 7. Histogram
        if (config.activeScopes.has('histogram') && histogramCanvasRef.current && frame % 3 === 0) {
          drawLiveHistogram(video, histogramCanvasRef.current);
        }

        // Focus Magnifier
        if (config.focusMagnification > 1.0 && magnifierCanvasRef.current && frame % 2 === 0) {
          drawFocusMagnifier(
            video,
            magnifierCanvasRef.current,
            config.focusMagnification,
            config.focusMagnificationCenter
          );
        }
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    };

    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    videoRef,
    config.activeScopes,
    config.focusPeakingColor,
    config.focusMagnification,
    config.focusMagnificationCenter,
  ]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* 1. Full Screen False Color Overlay */}
      {config.activeScopes.has('false_color') && (
        <canvas
          ref={falseColorCanvasRef}
          width={480}
          height={270}
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity"
        />
      )}

      {/* 2. Full Screen Zebra Stripes Overlay */}
      {config.activeScopes.has('zebra') && (
        <canvas
          ref={zebraCanvasRef}
          width={480}
          height={270}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* 3. Full Screen Focus Peaking Overlay */}
      {config.activeScopes.has('peaking') && (
        <canvas
          ref={peakingCanvasRef}
          width={480}
          height={270}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* 4. Focus Magnifier PiP View */}
      {config.focusMagnification > 1.0 && (
        <div className="absolute top-16 right-4 z-30 shadow-2xl rounded-xl border border-emerald-500/80 overflow-hidden bg-black/90">
          <canvas
            ref={magnifierCanvasRef}
            width={160}
            height={160}
            className="w-36 h-36 object-cover"
          />
        </div>
      )}

      {/* 5. Floating Scopes Dock (Bottom Left / Bottom Right) */}
      <div className="absolute top-16 left-3 flex flex-col gap-2 max-w-[200px]">
        {/* Waveform Monitor */}
        {config.activeScopes.has('waveform') && (
          <div className="bg-black/85 backdrop-blur-md border border-neutral-700/80 rounded-lg p-1.5 shadow-xl">
            <div className="text-[10px] font-mono font-bold text-emerald-400 mb-0.5 tracking-wider">
              LUMA WAVEFORM
            </div>
            <canvas
              ref={waveformCanvasRef}
              width={160}
              height={90}
              className="w-full h-20 rounded bg-black/70"
            />
          </div>
        )}

        {/* RGB Parade Monitor */}
        {config.activeScopes.has('rgb_parade') && (
          <div className="bg-black/85 backdrop-blur-md border border-neutral-700/80 rounded-lg p-1.5 shadow-xl">
            <div className="text-[10px] font-mono font-bold text-sky-400 mb-0.5 tracking-wider">
              RGB PARADE
            </div>
            <canvas
              ref={rgbParadeCanvasRef}
              width={180}
              height={90}
              className="w-full h-20 rounded bg-black/70"
            />
          </div>
        )}

        {/* Vectorscope Monitor */}
        {config.activeScopes.has('vectorscope') && (
          <div className="bg-black/85 backdrop-blur-md border border-neutral-700/80 rounded-lg p-1.5 shadow-xl">
            <div className="text-[10px] font-mono font-bold text-purple-400 mb-0.5 tracking-wider">
              VECTORSCOPE
            </div>
            <canvas
              ref={vectorscopeCanvasRef}
              width={120}
              height={120}
              className="w-24 h-24 rounded-full mx-auto bg-black/70"
            />
          </div>
        )}

        {/* Histogram Monitor */}
        {config.activeScopes.has('histogram') && (
          <div className="bg-black/85 backdrop-blur-md border border-neutral-700/80 rounded-lg p-1.5 shadow-xl">
            <div className="text-[10px] font-mono font-bold text-yellow-400 mb-0.5 tracking-wider">
              HISTOGRAM
            </div>
            <canvas
              ref={histogramCanvasRef}
              width={160}
              height={70}
              className="w-full h-16 rounded bg-black/70"
            />
          </div>
        )}
      </div>
    </div>
  );
};
