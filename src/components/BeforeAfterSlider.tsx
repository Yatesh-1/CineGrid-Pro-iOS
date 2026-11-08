import React, { useRef, useEffect, useCallback } from 'react';

interface BeforeAfterSliderProps {
  position: number; // 0 to 100 percentage
  onChange: (pos: number) => void;
  isActive: boolean;
  onToggleActive?: () => void;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  position,
  onChange,
  isActive,
}) => {
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const clamped = Math.max(5, Math.min(95, (x / rect.width) * 100));
    onChangeRef.current(clamped);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      updatePosition(e.clientX);
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
  }, [updatePosition]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-30 select-none"
    >
      {/* Vertical split line */}
      <div
        className="absolute top-0 bottom-0 w-[1.5px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] -translate-x-1/2 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        {/* Central interactive Handle with Before / After badges (exact match to user's photo!) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center pointer-events-auto cursor-ew-resize touch-none"
          onPointerDown={(e) => {
            e.stopPropagation();
            isDraggingRef.current = true;
          }}
        >
          {/* "Before" Pill */}
          <div className="mr-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-white/90 uppercase tracking-wider shadow-lg">
            Before
          </div>

          {/* Center Handle Button < > */}
          <div className="w-8 h-8 rounded-full bg-white/95 text-zinc-900 border border-black/20 shadow-[0_2px_12px_rgba(0,0,0,0.5)] flex items-center justify-center font-bold text-xs active:scale-95 transition-transform">
            <span className="tracking-tighter select-none font-mono">&lt;&gt;</span>
          </div>

          {/* "After" Pill */}
          <div className="ml-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-white/90 uppercase tracking-wider shadow-lg">
            After
          </div>
        </div>
      </div>
    </div>
  );
};
