import React, { useRef, useState } from 'react';
import type { ToneCurves, ToneCurvePoint } from '../../../types/studio';
import { RotateCcw } from 'lucide-react';

interface ToneCurveEditorProps {
  curves: ToneCurves;
  onChangeCurves: (curves: ToneCurves) => void;
}

type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';

export const ToneCurveEditor: React.FC<ToneCurveEditorProps> = ({
  curves,
  onChangeCurves,
}) => {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('rgb');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);

  const points = curves[activeChannel];

  const channelColors: Record<CurveChannel, { stroke: string; fill: string; label: string }> = {
    rgb: { stroke: '#ffffff', fill: '#ffffff', label: 'RGB' },
    red: { stroke: '#ef4444', fill: '#ef4444', label: 'Red' },
    green: { stroke: '#22c55e', fill: '#22c55e', label: 'Green' },
    blue: { stroke: '#38bdf8', fill: '#38bdf8', label: 'Blue' },
  };

  const getSvgCoordinates = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const y = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const coords = getSvgCoordinates(e);

    // Check if clicked near an existing point
    const threshold = 18;
    const clickedIdx = points.findIndex(
      (p) => Math.hypot(p.x - coords.x, p.y - coords.y) < threshold
    );

    if (clickedIdx !== -1) {
      setSelectedPointIndex(clickedIdx);
      isDraggingRef.current = true;
    } else {
      // Add new point
      const newPoints = [...points, coords].sort((a, b) => a.x - b.x);
      const newIdx = newPoints.findIndex((p) => p.x === coords.x && p.y === coords.y);
      setSelectedPointIndex(newIdx);
      isDraggingRef.current = true;
      onChangeCurves({ ...curves, [activeChannel]: newPoints });
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current || selectedPointIndex === null) return;
    const coords = getSvgCoordinates(e);

    const updated = [...points];

    // Constrain endpoints
    if (selectedPointIndex === 0) {
      updated[0] = { x: 0, y: coords.y };
    } else if (selectedPointIndex === updated.length - 1) {
      updated[updated.length - 1] = { x: 255, y: coords.y };
    } else {
      // Constrain x between neighbors
      const minX = updated[selectedPointIndex - 1].x + 3;
      const maxX = updated[selectedPointIndex + 1].x - 3;
      updated[selectedPointIndex] = {
        x: Math.max(minX, Math.min(maxX, coords.x)),
        y: coords.y,
      };
    }

    onChangeCurves({ ...curves, [activeChannel]: updated });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleDoubleClickPoint = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Cannot delete start and end points
    if (idx === 0 || idx === points.length - 1) return;
    const filtered = points.filter((_, i) => i !== idx);
    setSelectedPointIndex(null);
    onChangeCurves({ ...curves, [activeChannel]: filtered });
  };

  const handleResetChannel = () => {
    onChangeCurves({
      ...curves,
      [activeChannel]: [
        { x: 0, y: 0 },
        { x: 255, y: 255 },
      ],
    });
    setSelectedPointIndex(null);
  };

  // Generate SVG Path data for smooth curve
  const generatePath = (pts: ToneCurvePoint[]): string => {
    if (pts.length < 2) return '';
    let d = `M ${(pts[0].x / 255) * 100} ${100 - (pts[0].y / 255) * 100}`;
    for (let i = 1; i < pts.length; i++) {
      const x0 = (pts[i - 1].x / 255) * 100;
      const y0 = 100 - (pts[i - 1].y / 255) * 100;
      const x1 = (pts[i].x / 255) * 100;
      const y1 = 100 - (pts[i].y / 255) * 100;
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-zinc-900/70 border border-white/5 select-none">
      {/* Channel Switcher Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-white/10">
          {(['rgb', 'red', 'green', 'blue'] as CurveChannel[]).map((ch) => {
            const isSelected = activeChannel === ch;
            const meta = channelColors[ch];
            return (
              <button
                key={ch}
                onClick={() => {
                  setActiveChannel(ch);
                  setSelectedPointIndex(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta.stroke }}
                />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleResetChannel}
          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          title="Reset Tone Curve"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Interactive 256x256 SVG Curve Graph */}
      <div className="relative w-full aspect-square bg-zinc-950 rounded-lg overflow-hidden border border-white/10 touch-none">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="w-full h-full cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* 4x4 Grid lines */}
          <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
          <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          {/* Diagonal neutral reference */}
          <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2 2" />

          {/* Render Curve Line */}
          <path
            d={generatePath(points)}
            fill="none"
            stroke={channelColors[activeChannel].stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Render Control Points */}
          {points.map((p, idx) => {
            const isSelected = selectedPointIndex === idx;
            const cx = (p.x / 255) * 100;
            const cy = 100 - (p.y / 255) * 100;
            return (
              <g key={idx}>
                {/* Outer touch hitbox */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill="transparent"
                  onDoubleClick={(e) => handleDoubleClickPoint(idx, e)}
                />
                {/* Visible point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? '3.5' : '2.5'}
                  fill={isSelected ? '#facc15' : channelColors[activeChannel].fill}
                  stroke="#000000"
                  strokeWidth="0.8"
                  className="transition-all"
                />
              </g>
            );
          })}
        </svg>

        {/* Selected Point Readout */}
        {selectedPointIndex !== null && points[selectedPointIndex] && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-zinc-300">
            In: {points[selectedPointIndex].x} | Out: {points[selectedPointIndex].y}
          </div>
        )}

        <div className="absolute top-2 right-2 text-[10px] font-mono text-zinc-500">
          Click to add • Drag to shape • Double-click to delete
        </div>
      </div>
    </div>
  );
};
