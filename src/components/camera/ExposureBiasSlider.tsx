import React, { useRef } from 'react';
import { Sun } from 'lucide-react';
import { EV_MAX, EV_MIN, evFromTrackPosition, stepEv, trackPositionFromEv } from '../../utils/exposureBias';

interface ExposureBiasSliderProps {
  value: number;
  onChange: (ev: number) => void;
  /** Called on every touch so the parent can keep the focus square on screen while the user adjusts. */
  onInteract?: () => void;
  min?: number;
  max?: number;
  height?: number;
}

/** Vertical brightness slider with a sun thumb, shown beside the focus square. */
export const ExposureBiasSlider: React.FC<ExposureBiasSliderProps> = ({
  value,
  onChange,
  onInteract,
  min = EV_MIN,
  max = EV_MAX,
  height = 112,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(evFromTrackPosition(clientY - rect.top, rect.height || height, min, max));
  };

  const thumbTop = trackPositionFromEv(value, height, min, max);

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Exposure brightness"
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value > 0 ? '+' : ''}${value.toFixed(1)} EV`}
      data-testid="exposure-bias-slider"
      className="relative w-8 touch-none select-none cursor-ns-resize outline-none"
      style={{ height }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        onInteract?.();
        update(e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        onInteract?.();
        update(e.clientY);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          e.preventDefault();
          onChange(stepEv(value, 1, min, max));
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          e.preventDefault();
          onChange(stepEv(value, -1, min, max));
        }
      }}
    >
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-amber-300/80" />
      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-amber-300 flex items-center justify-center"
        style={{ top: thumbTop }}
      >
        <Sun size={18} aria-hidden="true" />
      </div>
    </div>
  );
};
