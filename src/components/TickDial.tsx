import React, { useRef, useEffect } from 'react';
import { cameraAudio } from '../utils/audio';

interface TickDialProps {
  value: number; // e.g. 0 to 100
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  label?: string;
  unit?: string;
}

export const TickDial: React.FC<TickDialProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label = 'LOOK INTENSITY',
  unit = '%',
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValRef = useRef(value);
  const lastClickValRef = useRef(value);

  const range = max - min;
  const progressRatio = Math.max(0, Math.min(1, (value - min) / range));

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      // Sensitivity: 200px drag covers the full range
      const deltaVal = (dx / 220) * range;
      const rawVal = startValRef.current + deltaVal;
      const clamped = Math.min(max, Math.max(min, Math.round(rawVal / step) * step));

      if (Math.abs(clamped - lastClickValRef.current) >= 5) {
        lastClickValRef.current = clamped;
        cameraAudio.playClick();
      }

      onChange(clamped);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [min, max, step, range, onChange]);

  // Handle direct tap on track
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newVal = Math.round((min + ratio * range) / step) * step;
    cameraAudio.playClick();
    onChange(newVal);
  };

  return (
    <div className="w-full flex flex-col items-center select-none px-4 py-1">
      {/* Header: Label, Progress Bar & Value Badge */}
      <div className="flex items-center justify-between gap-2 w-full text-[11px] font-mono text-zinc-400 mb-1">
        <span className="truncate uppercase font-semibold text-zinc-300">{label}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick preset chips */}
          <div className="flex items-center gap-1 text-[11px]">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => {
                  cameraAudio.playClick();
                  onChange(p);
                }}
                className={`px-1.5 py-0.5 rounded-full transition-colors ${
                  value === p ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>

          <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
            {value}{unit}
          </span>
        </div>
      </div>

      {/* Interactive Dial & Track */}
      <div
        ref={dialRef}
        onClick={handleTrackClick}
        onPointerDown={(e) => {
          isDraggingRef.current = true;
          startXRef.current = e.clientX;
          startValRef.current = value;
          lastClickValRef.current = value;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        className="relative w-full h-6 flex items-center justify-center cursor-ew-resize touch-none overflow-hidden rounded-full bg-zinc-950/70 border border-white/10"
      >
        {/* Background Visual Fill Bar */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/20 to-amber-400/35 transition-all duration-75 pointer-events-none"
          style={{ width: `${progressRatio * 100}%` }}
        />

        {/* Ticks Grid */}
        <div className="w-full h-3 flex items-center justify-between px-3 opacity-50 pointer-events-none">
          {Array.from({ length: 41 }).map((_, i) => {
            const isMajor = i % 5 === 0;
            const isHighlight = i / 40 <= progressRatio;
            return (
              <div
                key={i}
                className={`w-[1px] transition-colors ${
                  isMajor
                    ? isHighlight ? 'h-4 bg-amber-300' : 'h-3.5 bg-white/70'
                    : isHighlight ? 'h-2 bg-amber-400/60' : 'h-1.5 bg-white/20'
                }`}
              />
            );
          })}
        </div>

        {/* Dynamic Needle Thumb */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)] pointer-events-none z-10 transition-all duration-75"
          style={{ left: `${progressRatio * 100}%` }}
        >
          <div className="absolute top-0 -translate-x-[3px] w-2 h-2 rounded-full bg-amber-400 border border-black shadow-md" />
        </div>
      </div>
    </div>
  );
};
