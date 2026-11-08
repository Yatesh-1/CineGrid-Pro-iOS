import React, { useRef, useEffect } from 'react';
import type { ColorWheelValue } from '../../../types/studio';
import { RotateCcw } from 'lucide-react';

interface ColorWheelProps {
  label: string;
  value: ColorWheelValue;
  onChange: (val: ColorWheelValue) => void;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({
  label,
  value,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const radius = 55; // 110x110 canvas

  // Draw circular color wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = radius * 2;
    canvas.width = size;
    canvas.height = size;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const idx = (y * size + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const sat = dist / radius;
          // Simple HSL to RGB conversion for disc
          const c = sat;
          const hPrime = angle / 60;
          const xPrime = c * (1 - Math.abs((hPrime % 2) - 1));

          let r = 0, g = 0, b = 0;
          if (hPrime >= 0 && hPrime < 1) { r = c; g = xPrime; }
          else if (hPrime >= 1 && hPrime < 2) { r = xPrime; g = c; }
          else if (hPrime >= 2 && hPrime < 3) { g = c; b = xPrime; }
          else if (hPrime >= 3 && hPrime < 4) { g = xPrime; b = c; }
          else if (hPrime >= 4 && hPrime < 5) { r = xPrime; b = c; }
          else { r = c; b = xPrime; }

          const m = 0.5 - c * 0.5;
          data[idx] = Math.round((r + m) * 255);
          data[idx + 1] = Math.round((g + m) * 255);
          data[idx + 2] = Math.round((b + m) * 255);
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0; // Transparent outside circle
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    updatePuckPosition(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const updatePuckPosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const sat = Math.round((dist / radius) * 100);
    onChange({
      ...value,
      hue: Math.round(angle),
      saturation: sat,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    updatePuckPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleReset = () => {
    onChange({ hue: 0, saturation: 0, luminance: 0 });
  };

  // Compute puck pixel position
  const puckDist = (value.saturation / 100) * radius;
  const rad = (value.hue * Math.PI) / 180;
  const puckX = radius + Math.cos(rad) * puckDist;
  const puckY = radius + Math.sin(rad) * puckDist;

  return (
    <div className="flex flex-col items-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 select-none w-full">
      {/* Label and Reset */}
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[11px] font-bold text-zinc-300 font-mono tracking-tight">{label}</span>
        <button
          onClick={handleReset}
          className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
          title="Reset Wheel"
        >
          <RotateCcw size={11} />
        </button>
      </div>

      {/* Wheel Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-[110px] h-[110px] rounded-full cursor-crosshair touch-none shadow-inner shadow-black/60 border border-white/10"
      >
        <canvas ref={canvasRef} className="w-full h-full rounded-full" />

        {/* Center reticle */}
        <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-black/40 border border-white/20 pointer-events-none" />

        {/* Draggable Puck */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white bg-black/80 shadow-md shadow-black/80 pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform duration-75"
          style={{
            left: `${puckX}px`,
            top: `${puckY}px`,
          }}
        >
          <div className="w-1 h-1 rounded-full bg-amber-400" />
        </div>
      </div>

      {/* Numerical Readout */}
      <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono text-zinc-400">
        <span>H: {value.hue}°</span>
        <span>S: {value.saturation}%</span>
        <span>L: {value.luminance > 0 ? `+${value.luminance}` : value.luminance}%</span>
      </div>

      {/* Luminance Slider */}
      <div className="flex items-center gap-2 w-full px-1">
        <span className="text-[10px] font-mono text-zinc-500 w-5">LUM</span>
        <input
          type="range"
          min="-100"
          max="100"
          value={value.luminance}
          onChange={(e) => onChange({ ...value, luminance: parseInt(e.target.value) })}
          className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
      </div>
    </div>
  );
};
