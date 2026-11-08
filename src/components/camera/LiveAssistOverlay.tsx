import React, { useEffect, useRef } from 'react';
import type { PeakingColor } from '../../types/camera';
import { drawFalseColor, drawZebraOverlay, drawFocusPeaking } from '../../utils/cinemaScopes';

const PEAKING_HEX: Record<PeakingColor, string> = {
  green: '#22c55e',
  red: '#ef4444',
  cyan: '#22d3ee',
  yellow: '#facc15',
};

/** Overlay refresh interval. Sampling a 320x180 frame at ~10 fps keeps the UI thread free on phones. */
const REFRESH_MS = 100;

interface LiveAssistOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  useSimulatedScene: boolean;
  falseColor: boolean;
  zebra: boolean;
  zebraThreshold: number;
  peaking: boolean;
  peakingColor: PeakingColor;
  /** Same crop/zoom transform as the preview so the overlay lines up with the picture. */
  style?: React.CSSProperties;
}

/**
 * Real exposure and focus assists computed from the live frame (false colour, zebra, focus peaking).
 * Replaces static decorative overlays that did not look at the picture at all.
 */
export const LiveAssistOverlay: React.FC<LiveAssistOverlayProps> = ({
  videoRef,
  imageRef,
  useSimulatedScene,
  falseColor,
  zebra,
  zebraThreshold,
  peaking,
  peakingColor,
  style,
}) => {
  const falseColorRef = useRef<HTMLCanvasElement>(null);
  const zebraRef = useRef<HTMLCanvasElement>(null);
  const peakingRef = useRef<HTMLCanvasElement>(null);

  const anyOn = falseColor || zebra || peaking;

  useEffect(() => {
    if (!anyOn) return;
    let busy = false;
    const timer = window.setInterval(() => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const source = useSimulatedScene ? imageRef.current : videoRef.current;
        if (!source) return;
        if (source instanceof HTMLVideoElement && (source.readyState < 2 || source.paused)) return;
        if (falseColor && falseColorRef.current) drawFalseColor(source, falseColorRef.current);
        if (zebra && zebraRef.current) drawZebraOverlay(source, zebraRef.current, zebraThreshold);
        if (peaking && peakingRef.current) drawFocusPeaking(source, peakingRef.current, PEAKING_HEX[peakingColor] ?? PEAKING_HEX.green);
      } catch {
        // A frame that cannot be sampled (tainted image, camera restarting) is skipped, never fatal.
      } finally {
        busy = false;
      }
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [anyOn, falseColor, zebra, zebraThreshold, peaking, peakingColor, useSimulatedScene, videoRef, imageRef]);

  if (!anyOn) return null;

  const canvasClass = 'absolute inset-0 w-full h-full object-cover pointer-events-none';
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10" style={style} data-testid="live-assist-overlay">
      {falseColor && <canvas ref={falseColorRef} width={240} height={135} className={`${canvasClass} opacity-90`} />}
      {zebra && <canvas ref={zebraRef} width={320} height={180} className={canvasClass} />}
      {peaking && <canvas ref={peakingRef} width={320} height={180} className={canvasClass} />}
    </div>
  );
};
