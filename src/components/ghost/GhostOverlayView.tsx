import React, { useRef, useState } from 'react';
import type { GhostOverlaySettings } from '../../types/ghost';
import { Lock } from 'lucide-react';

interface GhostOverlayViewProps {
  settings: GhostOverlaySettings;
  onUpdateSettings?: (patch: Partial<GhostOverlaySettings>) => void;
}

export const GhostOverlayView: React.FC<GhostOverlayViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number } | null>(null);

  if (!settings.enabled || !settings.imageUrl) {
    return null;
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (settings.isLocked || !onUpdateSettings) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: settings.offsetX,
      initialOffsetY: settings.offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !onUpdateSettings) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    onUpdateSettings({
      offsetX: Math.round(dragStartRef.current.initialOffsetX + dx),
      offsetY: Math.round(dragStartRef.current.initialOffsetY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  // Convert blend mode to CSS mix-blend-mode
  const cssBlendMode = settings.blendMode as React.CSSProperties['mixBlendMode'];

  return (
    <div
      className={`absolute inset-0 z-15 overflow-hidden select-none flex items-center justify-center ${
        settings.isLocked ? 'pointer-events-none' : 'pointer-events-auto cursor-grab active:cursor-grabbing'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title={settings.isLocked ? 'Ghost Overlay Locked' : 'Drag to reposition reference photo'}
    >
      {/* Transformed Reference Image Container */}
      <div
        className="relative transition-transform duration-75 origin-center will-change-transform"
        style={{
          transform: `translate3d(${settings.offsetX}px, ${settings.offsetY}px, 0) rotate(${settings.rotation}deg) scale(${settings.scale})`,
        }}
      >
        <img
          src={settings.imageUrl}
          alt={settings.imageName || 'Framing Reference'}
          className="max-w-full max-h-full object-contain pointer-events-none user-select-none shadow-2xl"
          style={{
            opacity: settings.opacity,
            mixBlendMode: cssBlendMode,
          }}
          draggable={false}
        />

        {/* Repositioning Crosshair Indicator while actively dragging */}
        {isDragging && !settings.isLocked && (
          <div className="absolute inset-0 border-2 border-dashed border-amber-400 pointer-events-none flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border border-amber-400 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
            </div>
          </div>
        )}
      </div>

      {/* Subtle indicator badge when locked */}
      {settings.isLocked && (
        <div className="absolute top-2 right-2 pointer-events-none bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-mono text-zinc-400">
          <Lock size={10} className="text-amber-400" />
          <span>GHOST LOCKED</span>
        </div>
      )}
    </div>
  );
};
