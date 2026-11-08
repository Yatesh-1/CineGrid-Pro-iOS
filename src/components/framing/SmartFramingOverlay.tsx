import React, { useRef, useEffect } from 'react';
import type { SmartFramingGuide, FramingShape } from '../../types/camera';
import { Lock, Unlock, Move, Circle, Square, RectangleHorizontal, User, Mountain } from 'lucide-react';

interface SmartFramingOverlayProps {
  guide: SmartFramingGuide;
  onChangeGuide: (patch: Partial<SmartFramingGuide>) => void;
  videoElement: HTMLVideoElement | null;
}

export const SmartFramingOverlay: React.FC<SmartFramingOverlayProps> = ({
  guide,
  onChangeGuide,
  videoElement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({ clientX: 0, clientY: 0, startX: 0, startY: 0 });
  const resizeStartRef = useRef<{ clientX: number; clientY: number; startW: number; startH: number }>({ clientX: 0, clientY: 0, startW: 0, startH: 0 });

  // Lightweight automatic Face Detection (if supported by browser/Chromium)
  useEffect(() => {
    if (!guide.enabled || guide.mode !== 'auto' || guide.isLocked || !videoElement) return;

    let animId: number;
    let detector: any = null;

    if (typeof (window as any).FaceDetector !== 'undefined') {
      try {
        detector = new (window as any).FaceDetector({ maxDetectedFaces: 1, fastMode: true });
      } catch {}
    }

    const detectLoop = async () => {
      if (detector && videoElement.readyState >= 2) {
        try {
          const faces = await detector.detect(videoElement);
          if (faces && faces.length > 0) {
            const face = faces[0].boundingBox;
            const vw = videoElement.videoWidth || 1920;
            const vh = videoElement.videoHeight || 1080;
            const normX = (face.x / vw) * 100;
            const normY = (face.y / vh) * 100;
            const normW = (face.width / vw) * 100;
            const normH = (face.height / vh) * 100;

            onChangeGuide({
              x: Math.max(5, Math.min(95, normX + normW / 2)),
              y: Math.max(5, Math.min(95, normY + normH / 2)),
              width: Math.max(15, Math.min(60, normW * 1.3)),
              height: Math.max(15, Math.min(70, normH * 1.4)),
            });
          }
        } catch {}
      }
      animId = requestAnimationFrame(detectLoop);
    };

    const interval = setInterval(detectLoop, 800); // 1.25 FPS detection to preserve 60fps render
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animId);
    };
  }, [guide.enabled, guide.mode, guide.isLocked, videoElement, onChangeGuide]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    if (guide.isLocked) return;
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: guide.x,
      startY: guide.y,
    };
  };

  // Handle Resizing
  const handleResizeDown = (e: React.PointerEvent) => {
    if (guide.isLocked) return;
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startW: guide.width,
      startH: guide.height,
    };
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isDraggingRef.current && containerRef.current) {
        const parent = containerRef.current.parentElement?.getBoundingClientRect();
        if (!parent) return;
        const dx = ((e.clientX - dragStartRef.current.clientX) / parent.width) * 100;
        const dy = ((e.clientY - dragStartRef.current.clientY) / parent.height) * 100;
        const newX = Math.max(10, Math.min(90, dragStartRef.current.startX + dx));
        const newY = Math.max(10, Math.min(90, dragStartRef.current.startY + dy));
        onChangeGuide({ x: newX, y: newY, mode: 'manual' });
      } else if (isResizingRef.current && containerRef.current) {
        const parent = containerRef.current.parentElement?.getBoundingClientRect();
        if (!parent) return;
        const dw = ((e.clientX - resizeStartRef.current.clientX) / parent.width) * 100;
        const dh = ((e.clientY - resizeStartRef.current.clientY) / parent.height) * 100;
        const newW = Math.max(12, Math.min(80, resizeStartRef.current.startW + dw));
        const newH = Math.max(12, Math.min(80, resizeStartRef.current.startH + dh));
        onChangeGuide({ width: newW, height: newH, mode: 'manual' });
      }
    };

    const handleUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [guide.x, guide.y, guide.width, guide.height, onChangeGuide]);

  const shapes: { id: FramingShape; icon: React.ReactNode; label: string }[] = [
    { id: 'circle', icon: <Circle size={12} />, label: 'Circle' },
    { id: 'square', icon: <Square size={12} />, label: 'Square' },
    { id: 'rectangle', icon: <RectangleHorizontal size={12} />, label: 'Rect' },
    { id: 'silhouette_head', icon: <User size={12} />, label: 'Portrait' },
    { id: 'mountain_ridge', icon: <Mountain size={12} />, label: 'Ridge' },
  ];

  if (!guide.enabled) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden"
    >
      {/* Draggable & Resizable Guide Frame */}
      <div
        style={{
          left: `${guide.x}%`,
          top: `${guide.y}%`,
          width: `${guide.width}%`,
          height: `${guide.height}%`,
          transform: 'translate(-50%, -50%)',
        }}
        className="absolute pointer-events-auto touch-none transition-shadow group"
      >
        {/* SHAPE RENDERING (Subtle animated dashed green/amber outline matching reference) */}
        <div
          onPointerDown={handlePointerDown}
          className={`w-full h-full relative cursor-move flex items-center justify-center transition-all ${
            guide.shape === 'circle'
              ? 'rounded-full'
              : guide.shape === 'square' || guide.shape === 'rectangle'
              ? 'rounded-xl'
              : 'rounded-2xl'
          } border-2 border-dashed ${
            guide.isLocked
              ? 'border-emerald-400/90 shadow-[0_0_15px_rgba(52,211,153,0.35)]'
              : 'border-amber-400/90 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
          }`}
        >
          {/* Portrait Silhouette details if active */}
          {guide.shape === 'silhouette_head' && (
            <svg viewBox="0 0 100 100" className="w-full h-full p-2 pointer-events-none" fill="none">
              <ellipse cx="50" cy="40" rx="22" ry="26" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeDasharray="4 2" />
              <path d="M 18 95 Q 50 68 82 95" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="28" y1="36" x2="72" y2="36" stroke="#facc15" strokeWidth="1.5" />
            </svg>
          )}

          {/* Mountain Ridge details if active */}
          {guide.shape === 'mountain_ridge' && (
            <svg viewBox="0 0 100 100" className="w-full h-full p-2 pointer-events-none" fill="none">
              <polyline points="5,80 40,30 65,55 85,25 95,80" stroke="#facc15" strokeWidth="1.8" strokeDasharray="4 3" />
              <circle cx="85" cy="25" r="4" fill="#facc15" />
            </svg>
          )}

          {/* Center Target Dot */}
          <div className={`w-2 h-2 rounded-full ${guide.isLocked ? 'bg-emerald-400' : 'bg-amber-400'} shadow-md`} />

          {/* Subject Guide Label Badge */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-md whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full ${guide.isLocked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{guide.label.toUpperCase()}</span>
          </div>

          {/* Resize Corner Handle (Bottom-Right) */}
          {!guide.isLocked && (
            <div
              onPointerDown={handleResizeDown}
              className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-white text-black border border-black/30 flex items-center justify-center cursor-nwse-resize shadow-lg active:scale-125 transition-transform"
              title="Drag to resize guide"
            >
              <Move size={10} />
            </div>
          )}
        </div>

        {/* Quick Toolbar (Shape Switcher & Lock Toggle) */}
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-1 rounded-full border border-white/15 shadow-xl">
          {shapes.map((s) => (
            <button
              key={s.id}
              onClick={() => onChangeGuide({ shape: s.id, label: s.label })}
              className={`p-1 rounded-full transition-colors ${
                guide.shape === s.id ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Switch shape to ${s.label}`}
            >
              {s.icon}
            </button>
          ))}

          <div className="w-[1px] h-3 bg-white/20 mx-0.5" />

          {/* Lock / Unlock Toggle */}
          <button
            onClick={() => onChangeGuide({ isLocked: !guide.isLocked })}
            className={`p-1 rounded-full transition-colors ${
              guide.isLocked ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
            }`}
            title={guide.isLocked ? 'Guide position locked' : 'Click to lock guide position'}
          >
            {guide.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};
