import React, { useState } from 'react';
import type { GridType } from '../types/camera';
import { RotateCw, FlipHorizontal } from 'lucide-react';

interface GridOverlayProps {
  gridType: GridType;
  color?: string;
  opacity?: number;
  showLevel?: boolean;
  rollAngle?: number; // Tilt degrees from accelerometer
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  gridType,
  color = '#eab308', // Gold default
  opacity = 0.85,
  showLevel = true,
  rollAngle = 0,
}) => {
  const [spiralRotation, setSpiralRotation] = useState<number>(0);
  const [spiralFlipped, setSpiralFlipped] = useState<boolean>(false);

  if (gridType === 'none' && !showLevel) return null;

  const isLevel = Math.abs(rollAngle) <= 0.8;
  const levelColor = isLevel ? '#22c55e' : 'rgba(255, 255, 255, 0.7)';

  const cycleSpiralRotation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpiralRotation((prev) => (prev + 90) % 360);
  };

  const toggleSpiralFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpiralFlipped((prev) => !prev);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity }}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Shadow filter to ensure grid visibility over pure white or pure dark scenes */}
          <filter id="gridGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* 1. RULE OF THIRDS */}
        {gridType === 'rule_of_thirds' && (
          <g filter="url(#gridGlow)">
            {/* Vertical lines */}
            <line x1="33.33%" y1="0%" x2="33.33%" y2="100%" stroke={color} strokeWidth="1" />
            <line x1="66.67%" y1="0%" x2="66.67%" y2="100%" stroke={color} strokeWidth="1" />
            {/* Horizontal lines */}
            <line x1="0%" y1="33.33%" x2="100%" y2="33.33%" stroke={color} strokeWidth="1" />
            <line x1="0%" y1="66.67%" x2="100%" y2="66.67%" stroke={color} strokeWidth="1" />

            {/* 4 Intersection Power Points */}
            <circle cx="33.33%" cy="33.33%" r="5" fill={color} />
            <circle cx="33.33%" cy="33.33%" r="9" fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
            <circle cx="66.67%" cy="33.33%" r="5" fill={color} />
            <circle cx="66.67%" cy="33.33%" r="9" fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
            <circle cx="33.33%" cy="66.67%" r="5" fill={color} />
            <circle cx="33.33%" cy="66.67%" r="9" fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
            <circle cx="66.67%" cy="66.67%" r="5" fill={color} />
            <circle cx="66.67%" cy="66.67%" r="9" fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
          </g>
        )}

        {/* 2. 2/3 UPPER FOCUS (Sky / High Subject) */}
        {gridType === 'rule_of_thirds_top' && (
          <g filter="url(#gridGlow)">
            <line x1="0%" y1="66.67%" x2="100%" y2="66.67%" stroke={color} strokeWidth="2" />
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="33.33%" y1="0%" x2="33.33%" y2="66.67%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="66.67%" y1="0%" x2="66.67%" y2="66.67%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="50%" cy="33.33%" r="6" fill={color} />
            <text x="50%" y="64%" fill={color} fontSize="11" textAnchor="middle" fontWeight="bold">HORIZON 2/3</text>
          </g>
        )}

        {/* 3. 1/3 GROUND FOCUS (Foreground / Reflection) */}
        {gridType === 'rule_of_thirds_bottom' && (
          <g filter="url(#gridGlow)">
            <line x1="0%" y1="33.33%" x2="100%" y2="33.33%" stroke={color} strokeWidth="2" />
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="33.33%" y1="33.33%" x2="33.33%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="66.67%" y1="33.33%" x2="66.67%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="50%" cy="66.67%" r="6" fill={color} />
            <text x="50%" y="30%" fill={color} fontSize="11" textAnchor="middle" fontWeight="bold">FOREGROUND 1/3</text>
          </g>
        )}

        {/* 4. GOLDEN RATIO (PHI GRID: 0.382 / 0.618) */}
        {gridType === 'golden_ratio' && (
          <g filter="url(#gridGlow)">
            <line x1="38.2%" y1="0%" x2="38.2%" y2="100%" stroke={color} strokeWidth="1.5" />
            <line x1="61.8%" y1="0%" x2="61.8%" y2="100%" stroke={color} strokeWidth="1.5" />
            <line x1="0%" y1="38.2%" x2="100%" y2="38.2%" stroke={color} strokeWidth="1.5" />
            <line x1="0%" y1="61.8%" x2="100%" y2="61.8%" stroke={color} strokeWidth="1.5" />

            <circle cx="38.2%" cy="38.2%" r="5" fill={color} />
            <circle cx="61.8%" cy="38.2%" r="5" fill={color} />
            <circle cx="38.2%" cy="61.8%" r="5" fill={color} />
            <circle cx="61.8%" cy="61.8%" r="5" fill={color} />
            <text x="50%" y="51%" fill={color} fontSize="12" textAnchor="middle" fontWeight="600" opacity="0.7">PHI 1:1.618</text>
          </g>
        )}

        {/* 5. GOLDEN SPIRAL (FIBONACCI) */}
        {gridType === 'golden_spiral' && (
          <g
            style={{
              transformOrigin: 'center center',
              transform: `rotate(${spiralRotation}deg) scale(${spiralFlipped ? -1 : 1}, 1)`,
            }}
            filter="url(#gridGlow)"
          >
            {/* Golden rectangles boundary */}
            <rect x="0%" y="0%" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <line x1="61.8%" y1="0%" x2="61.8%" y2="100%" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="61.8%" y1="61.8%" x2="100%" y2="61.8%" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="76.4%" y1="61.8%" x2="76.4%" y2="100%" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* Continuous Logarithmic Spiral Path */}
            <path
              d="M 0 1000 A 1000 1000 0 0 1 1000 0 A 618 618 0 0 1 1618 618 A 382 382 0 0 1 1236 1000 A 236 236 0 0 1 1000 764 A 146 146 0 0 1 1146 618"
              transform="scale(0.000625, 0.001) scale(100, 100)"
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            {/* Focal Eye Dot */}
            <circle cx="71.5%" cy="71.5%" r="6" fill={color} />
            <circle cx="71.5%" cy="71.5%" r="12" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
          </g>
        )}

        {/* 6. GOLDEN TRIANGLES */}
        {gridType === 'golden_triangles' && (
          <g filter="url(#gridGlow)">
            {/* Corner diagonal */}
            <line x1="0%" y1="100%" x2="100%" y2="0%" stroke={color} strokeWidth="1.8" />
            {/* Perpendiculars */}
            <line x1="0%" y1="0%" x2="60%" y2="40%" stroke={color} strokeWidth="1.8" />
            <line x1="100%" y1="100%" x2="40%" y2="60%" stroke={color} strokeWidth="1.8" />

            <circle cx="60%" cy="40%" r="5" fill={color} />
            <circle cx="40%" cy="60%" r="5" fill={color} />
          </g>
        )}

        {/* 7. CENTER & SYMMETRY */}
        {gridType === 'center_symmetry' && (
          <g filter="url(#gridGlow)">
            {/* Center crosshair */}
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke={color} strokeWidth="1.2" />
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke={color} strokeWidth="1.2" />
            
            {/* Concentric circles */}
            <circle cx="50%" cy="50%" r="22%" fill="none" stroke={color} strokeWidth="1.2" />
            <circle cx="50%" cy="50%" r="10%" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="3 3" />
            
            {/* Center reticle */}
            <circle cx="50%" cy="50%" r="3" fill={color} />
            <rect x="47%" y="47%" width="6%" height="6%" fill="none" stroke={color} strokeWidth="1.2" />
          </g>
        )}

        {/* 8. DYNAMIC SYMMETRY (HARMONIC ARMATURE) */}
        {gridType === 'dynamic_symmetry' && (
          <g filter="url(#gridGlow)">
            {/* Diagonals */}
            <line x1="0%" y1="0%" x2="100%" y2="100%" stroke={color} strokeWidth="1.4" />
            <line x1="100%" y1="0%" x2="0%" y2="100%" stroke={color} strokeWidth="1.4" />
            {/* Cross centers */}
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            {/* Diamond armature */}
            <polygon points="50%,0% 100%,50% 50%,100% 0%,50%" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 4" />
          </g>
        )}

        {/* 9. PORTRAIT & HEADROOM */}
        {gridType === 'portrait_headroom' && (
          <g filter="url(#gridGlow)">
            {/* Upper headroom limit */}
            <line x1="15%" y1="12%" x2="85%" y2="12%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="50%" y="10%" fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle">HEADROOM</text>

            {/* Dominant Eye-line */}
            <line x1="5%" y1="38%" x2="95%" y2="38%" stroke={color} strokeWidth="1.8" />
            <text x="92%" y="36%" fill={color} fontSize="10" textAnchor="end" fontWeight="bold">EYE-LINE</text>

            {/* Face oval guide */}
            <ellipse cx="50%" cy="45%" rx="22%" ry="26%" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="6 3" />
            {/* Left and right eye crosshairs */}
            <circle cx="42%" cy="38%" r="4" fill={color} />
            <circle cx="58%" cy="38%" r="4" fill={color} />

            {/* Shoulder arch */}
            <path d="M 22% 95% Q 50% 75% 78% 95%" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
          </g>
        )}

        {/* 10. DIAGONAL METHOD */}
        {gridType === 'diagonal_method' && (
          <g filter="url(#gridGlow)">
            <line x1="0%" y1="0%" x2="100%" y2="100%" stroke={color} strokeWidth="1.5" />
            <line x1="100%" y1="0%" x2="0%" y2="100%" stroke={color} strokeWidth="1.5" />
            <line x1="0%" y1="50%" x2="50%" y2="0%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            <line x1="50%" y1="100%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            <line x1="0%" y1="50%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            <line x1="50%" y1="0%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          </g>
        )}

        {/* VIRTUAL ARTIFICIAL HORIZON LEVEL GAUGE */}
        {showLevel && (
          <g transform={`rotate(${rollAngle}, 150, 150)`} className="transition-transform duration-75">
            {/* Center horizon line with degree indicator */}
            <line
              x1="22%"
              y1="50%"
              x2="44%"
              y2="50%"
              stroke={levelColor}
              strokeWidth={isLevel ? 2.5 : 1.5}
            />
            <circle cx="50%" cy="50%" r="3" fill={levelColor} />
            <line
              x1="56%"
              y1="50%"
              x2="78%"
              y2="50%"
              stroke={levelColor}
              strokeWidth={isLevel ? 2.5 : 1.5}
            />
          </g>
        )}
      </svg>

      {/* Floating level degree pill when tilting */}
      {showLevel && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wider flex items-center gap-1.5 shadow-md ${
              isLevel
                ? 'bg-emerald-500/90 text-black shadow-emerald-500/30'
                : 'bg-black/60 text-white/90 border border-white/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLevel ? 'bg-black animate-ping' : 'bg-amber-400'}`} />
            {isLevel ? 'LEVEL 0.0°' : `${rollAngle > 0 ? '+' : ''}${rollAngle.toFixed(1)}°`}
          </div>
        </div>
      )}

      {/* Interactive controls for Golden Spiral orientation */}
      {gridType === 'golden_spiral' && (
        <div className="absolute top-12 right-3 pointer-events-auto flex flex-col gap-2">
          <button
            onClick={cycleSpiralRotation}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
            title="Rotate Spiral 90°"
          >
            <RotateCw size={15} />
          </button>
          <button
            onClick={toggleSpiralFlip}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
            title="Flip Horizontal"
          >
            <FlipHorizontal size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
