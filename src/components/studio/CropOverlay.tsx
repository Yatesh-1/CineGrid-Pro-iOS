import React, { useRef } from 'react';
import { dragCrop, type CropHandle, type CropRect } from '../../utils/cropMath';

interface CropOverlayProps {
  rect: CropRect;
  /** width / height of the photograph being cropped */
  imageAspect: number;
  /** pixel aspect to hold while resizing, or null for a free crop */
  lock: number | null;
  onChange: (rect: CropRect) => void;
  /** called once when a drag ends */
  onCommit: (rect: CropRect) => void;
}

const HANDLE_SIZE = 28; // px hit area; comfortably touchable

const HANDLES: { id: CropHandle; style: React.CSSProperties; cursor: string; corner: boolean }[] = [
  { id: 'nw', style: { left: 0, top: 0 }, cursor: 'nwse-resize', corner: true },
  { id: 'ne', style: { left: '100%', top: 0 }, cursor: 'nesw-resize', corner: true },
  { id: 'se', style: { left: '100%', top: '100%' }, cursor: 'nwse-resize', corner: true },
  { id: 'sw', style: { left: 0, top: '100%' }, cursor: 'nesw-resize', corner: true },
  { id: 'n', style: { left: '50%', top: 0 }, cursor: 'ns-resize', corner: false },
  { id: 's', style: { left: '50%', top: '100%' }, cursor: 'ns-resize', corner: false },
  { id: 'w', style: { left: 0, top: '50%' }, cursor: 'ew-resize', corner: false },
  { id: 'e', style: { left: '100%', top: '50%' }, cursor: 'ew-resize', corner: false },
];

/** Draggable crop rectangle drawn over the full (uncropped) photo. Coordinates are percentages. */
export const CropOverlay: React.FC<CropOverlayProps> = ({ rect, imageAspect, lock, onChange, onCommit }) => {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: CropHandle; start: CropRect; grab: { x: number; y: number }; latest: CropRect } | null>(null);

  const toPercent = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const begin = (handle: CropHandle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toPercent(e);
    drag.current = { handle, start: rect, grab: { x: p.x - rect.x, y: p.y - rect.y }, latest: rect };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toPercent(e);
    d.latest = dragCrop(d.handle, d.start, p.x, p.y, imageAspect, lock, d.grab);
    onChange(d.latest);
  };

  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (d) onCommit(d.latest);
  };

  return (
    <div ref={box} className="absolute inset-0 touch-none select-none" data-testid="crop-overlay">
      {/* dim everything outside the crop */}
      <div className="absolute left-0 right-0 top-0 bg-black/60 pointer-events-none" style={{ height: `${rect.y}%` }} />
      <div className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none" style={{ height: `${100 - rect.y - rect.height}%` }} />
      <div className="absolute left-0 bg-black/60 pointer-events-none" style={{ top: `${rect.y}%`, height: `${rect.height}%`, width: `${rect.x}%` }} />
      <div className="absolute right-0 bg-black/60 pointer-events-none" style={{ top: `${rect.y}%`, height: `${rect.height}%`, width: `${100 - rect.x - rect.width}%` }} />

      <div
        className="absolute border-2 border-amber-400"
        style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
      >
        {/* rule-of-thirds guides while cropping */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white" />
          <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white" />
          <div className="absolute left-0 right-0 top-1/3 h-px bg-white" />
          <div className="absolute left-0 right-0 top-2/3 h-px bg-white" />
        </div>

        {/* move */}
        <div
          role="button"
          aria-label="Move crop"
          className="absolute inset-0 cursor-move"
          onPointerDown={begin('move')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />

        {HANDLES.filter((h) => lock === null || h.corner).map((h) => (
          <div
            key={h.id}
            role="slider"
            aria-label={`Crop ${h.id} handle`}
            className="absolute flex items-center justify-center"
            style={{ ...h.style, width: HANDLE_SIZE, height: HANDLE_SIZE, marginLeft: -HANDLE_SIZE / 2, marginTop: -HANDLE_SIZE / 2, cursor: h.cursor }}
            onPointerDown={begin(h.id)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <span className={`block bg-amber-400 border border-black/60 ${h.corner ? 'w-3.5 h-3.5 rounded-sm' : 'w-2.5 h-2.5 rounded-full'}`} />
          </div>
        ))}
      </div>
    </div>
  );
};
