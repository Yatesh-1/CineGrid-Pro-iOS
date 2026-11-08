import React, { useState } from 'react';
import type {
  GridType,
  GridStyleOptions,
  SecondaryGuideOptions,
  AspectRatio,
} from '../../types/camera';
import { RotateCw, FlipHorizontal } from 'lucide-react';

export interface GridRendererProps {
  gridType: GridType;
  styleOptions?: Partial<GridStyleOptions>;
  secondaryGuides?: Partial<SecondaryGuideOptions>;
  rollAngle?: number;  // Device roll in degrees (-90 to +90)
  pitchAngle?: number; // Device pitch in degrees (-90 to +90)
  aspectRatio?: AspectRatio;
  onRotateSpiral?: () => void;
  onFlipSpiral?: () => void;
}

const DEFAULT_STYLE: GridStyleOptions = {
  color: '#ffffff',
  opacity: 0.75,
  strokeWidth: 1.2,
  lineStyle: 'solid',
  showCenterDot: true,
  showIntersectionNodes: true,
  isVisible: true,
  scale: 1.0,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  spiralCorner: 'top-left',
  spiralDirection: 'clockwise',
};

const DEFAULT_SECONDARY: SecondaryGuideOptions = {
  showHorizonLevel: false,
  showDualAxisLevel: false,
  showSafeArea: false,
  showReferenceOverlay: false,
};

export const GridRenderer: React.FC<GridRendererProps> = ({
  gridType,
  styleOptions = {},
  secondaryGuides = {},
  rollAngle = 0,
  pitchAngle = 0,
}) => {
  const [spiralRot, setSpiralRot] = useState(0);
  const [spiralFlip, setSpiralFlip] = useState(false);

  const style: GridStyleOptions = { ...DEFAULT_STYLE, ...styleOptions };
  const secondary: SecondaryGuideOptions = { ...DEFAULT_SECONDARY, ...secondaryGuides };

  if (!style.isVisible && !secondary.showHorizonLevel && !secondary.showDualAxisLevel) {
    return null;
  }

  const { color, opacity, strokeWidth, lineStyle, showCenterDot, showIntersectionNodes } = style;

  // Stroke dash array mapping
  const getStrokeDashArray = () => {
    switch (lineStyle) {
      case 'dashed':
        return '6 4';
      case 'dotted':
        return '2 3';
      case 'solid':
      default:
        return 'none';
    }
  };

  const dashArray = getStrokeDashArray();

  // Color with drop shadow filter
  const filterId = 'gridGlowFilter';

  // Level precision calculation
  const isRollLevel = Math.abs(rollAngle) <= 0.6;
  const isPitchLevel = Math.abs(pitchAngle) <= 0.8;
  const isDualLevel = isRollLevel && isPitchLevel;
  const levelAccentColor = isRollLevel ? '#22c55e' : '#eab308';

  // Phi constants
  const PHI_1 = '38.2%';
  const PHI_2 = '61.8%';

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity }}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {style.isVisible && (
          <g
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            filter={`url(#${filterId})`}
          >
            {/* ============================================================ */}
            {/* 1. BASIC COMPOSITION GRIDS                                    */}
            {/* ============================================================ */}

            {/* RULE OF THIRDS */}
            {(gridType === 'rule_of_thirds' || gridType === 'landscape_horizon_thirds') && (
              <g>
                <line x1="33.333%" y1="0%" x2="33.333%" y2="100%" />
                <line x1="66.667%" y1="0%" x2="66.667%" y2="100%" />
                <line x1="0%" y1="33.333%" x2="100%" y2="33.333%" />
                <line x1="0%" y1="66.667%" x2="100%" y2="66.667%" />

                {showIntersectionNodes && (
                  <g fill={color} stroke="none">
                    <circle cx="33.333%" cy="33.333%" r="4.5" />
                    <circle cx="66.667%" cy="33.333%" r="4.5" />
                    <circle cx="33.333%" cy="66.667%" r="4.5" />
                    <circle cx="66.667%" cy="66.667%" r="4.5" />
                  </g>
                )}
              </g>
            )}

            {/* GOLDEN RATIO (PHI GRID) */}
            {(gridType === 'golden_ratio' || gridType === 'landscape_golden_ratio') && (
              <g>
                <line x1={PHI_1} y1="0%" x2={PHI_1} y2="100%" />
                <line x1={PHI_2} y1="0%" x2={PHI_2} y2="100%" />
                <line x1="0%" y1={PHI_1} x2="100%" y2={PHI_1} />
                <line x1="0%" y1={PHI_2} x2="100%" y2={PHI_2} />

                {showIntersectionNodes && (
                  <g fill={color} stroke="none">
                    <circle cx={PHI_1} cy={PHI_1} r="5" />
                    <circle cx={PHI_2} cy={PHI_1} r="5" />
                    <circle cx={PHI_1} cy={PHI_2} r="5" />
                    <circle cx={PHI_2} cy={PHI_2} r="5" />
                  </g>
                )}
              </g>
            )}

            {/* GOLDEN SPIRAL / FIBONACCI SPIRAL */}
            {(gridType === 'golden_spiral' || gridType === 'fibonacci_spiral') && (
              <g
                style={{
                  transformOrigin: '50% 50%',
                  transform: `rotate(${spiralRot}deg) scale(${spiralFlip ? -1 : 1}, 1)`,
                }}
              >
                {/* Golden Rectangle partitions */}
                <rect x="0%" y="0%" width="100%" height="100%" fill="none" strokeWidth={strokeWidth * 0.75} opacity="0.4" />
                <line x1={PHI_2} y1="0%" x2={PHI_2} y2="100%" strokeDasharray="3 3" opacity="0.5" />
                <line x1={PHI_2} y1={PHI_2} x2="100%" y2={PHI_2} strokeDasharray="3 3" opacity="0.5" />
                <line x1="76.4%" y1={PHI_2} x2="76.4%" y2="100%" strokeDasharray="3 3" opacity="0.5" />

                {/* Mathematical Fibonacci Spiral Curve */}
                <path
                  d="M 0 1000 A 1000 1000 0 0 1 1000 0 A 618 618 0 0 1 1618 618 A 382 382 0 0 1 1236 1000 A 236 236 0 0 1 1000 764 A 146 146 0 0 1 1146 618"
                  transform="scale(0.000625, 0.001) scale(100, 100)"
                  fill="none"
                  strokeWidth={strokeWidth * 1.8}
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx="71.5%" cy="71.5%" r="5" fill={color} stroke="none" />
              </g>
            )}

            {/* GOLDEN TRIANGLES */}
            {(gridType === 'golden_triangles' || gridType === 'street_golden_triangle') && (
              <g>
                <line x1="0%" y1="100%" x2="100%" y2="0%" strokeWidth={strokeWidth * 1.4} />
                <line x1="0%" y1="0%" x2="60%" y2="40%" />
                <line x1="100%" y1="100%" x2="40%" y2="60%" />

                {showIntersectionNodes && (
                  <g fill={color} stroke="none">
                    <circle cx="60%" cy="40%" r="5" />
                    <circle cx="40%" cy="60%" r="5" />
                  </g>
                )}
              </g>
            )}

            {/* DIAGONAL COMPOSITION */}
            {(gridType === 'diagonal_composition' || gridType === 'diagonal_method') && (
              <g>
                <line x1="0%" y1="0%" x2="100%" y2="100%" />
                <line x1="100%" y1="0%" x2="0%" y2="100%" />
                <line x1="0%" y1="50%" x2="50%" y2="0%" opacity="0.6" strokeDasharray="4 4" />
                <line x1="50%" y1="100%" x2="100%" y2="50%" opacity="0.6" strokeDasharray="4 4" />
                <line x1="0%" y1="50%" x2="50%" y2="100%" opacity="0.6" strokeDasharray="4 4" />
                <line x1="50%" y1="0%" x2="100%" y2="50%" opacity="0.6" strokeDasharray="4 4" />
              </g>
            )}

            {/* CENTER CROSSHAIR */}
            {gridType === 'center_crosshair' && (
              <g>
                <line x1="50%" y1="10%" x2="50%" y2="45%" />
                <line x1="50%" y1="55%" x2="50%" y2="90%" />
                <line x1="10%" y1="50%" x2="45%" y2="50%" />
                <line x1="55%" y1="50%" x2="90%" y2="50%" />
                <circle cx="50%" cy="50%" r="18" fill="none" strokeWidth={strokeWidth * 0.9} strokeDasharray="3 3" />
                <circle cx="50%" cy="50%" r="3" fill={color} stroke="none" />
              </g>
            )}

            {/* CENTER SYMMETRY */}
            {(gridType === 'center_symmetry' || gridType === 'arch_building_symmetry' || gridType === 'product_symmetry') && (
              <g>
                <line x1="50%" y1="0%" x2="50%" y2="100%" strokeWidth={strokeWidth * 1.5} />
                <line x1="0%" y1="50%" x2="100%" y2="50%" strokeDasharray="4 4" />
                <circle cx="50%" cy="50%" r="22%" fill="none" />
                <circle cx="50%" cy="50%" r="11%" fill="none" strokeDasharray="3 3" />
                <polygon points="50%,47% 53%,50% 50%,53% 47%,50%" fill="none" />
              </g>
            )}

            {/* DYNAMIC SYMMETRY (HARMONIC ARMATURE) */}
            {gridType === 'dynamic_symmetry' && (
              <g>
                {/* Diagonals */}
                <line x1="0%" y1="0%" x2="100%" y2="100%" strokeWidth={strokeWidth * 1.2} />
                <line x1="100%" y1="0%" x2="0%" y2="100%" strokeWidth={strokeWidth * 1.2} />
                {/* Reciprocal corner lines */}
                <line x1="0%" y1="100%" x2="61.8%" y2="0%" opacity="0.6" />
                <line x1="100%" y1="0%" x2="38.2%" y2="100%" opacity="0.6" />
                <line x1="0%" y1="0%" x2="61.8%" y2="100%" opacity="0.6" />
                <line x1="100%" y1="100%" x2="38.2%" y2="0%" opacity="0.6" />
                {/* Centers */}
                <line x1="50%" y1="0%" x2="50%" y2="100%" strokeDasharray="4 4" opacity="0.5" />
                <line x1="0%" y1="50%" x2="100%" y2="50%" strokeDasharray="4 4" opacity="0.5" />
              </g>
            )}

            {/* RADIAL COMPOSITION */}
            {gridType === 'radial_composition' && (
              <g>
                {/* 8 Radial Spokes */}
                <line x1="50%" y1="0%" x2="50%" y2="100%" />
                <line x1="0%" y1="50%" x2="100%" y2="50%" />
                <line x1="0%" y1="0%" x2="100%" y2="100%" />
                <line x1="100%" y1="0%" x2="0%" y2="100%" />
                {/* Concentric guidance */}
                <circle cx="50%" cy="50%" r="15%" fill="none" strokeDasharray="3 3" />
                <circle cx="50%" cy="50%" r="32%" fill="none" />
              </g>
            )}

            {/* CONCENTRIC CIRCLES */}
            {(gridType === 'concentric_circles' || gridType === 'food_plate_pos') && (
              <g>
                <circle cx="50%" cy="50%" r="10%" fill="none" strokeDasharray="3 3" />
                <circle cx="50%" cy="50%" r="20%" fill="none" />
                <circle cx="50%" cy="50%" r="30%" fill="none" strokeDasharray="4 4" />
                <circle cx="50%" cy="50%" r="40%" fill="none" />
                <line x1="48%" y1="50%" x2="52%" y2="50%" />
                <line x1="50%" y1="48%" x2="50%" y2="52%" />
              </g>
            )}

            {/* PERSPECTIVE GRID */}
            {(gridType === 'perspective_grid' || gridType === 'arch_perspective_align' || gridType === 'landscape_leading_lines' || gridType === 'street_leading_lines') && (
              <g>
                {/* Converging perspective road/lines to horizon point */}
                <line x1="50%" y1="40%" x2="0%" y2="100%" strokeWidth={strokeWidth * 1.5} />
                <line x1="50%" y1="40%" x2="100%" y2="100%" strokeWidth={strokeWidth * 1.5} />
                <line x1="50%" y1="40%" x2="25%" y2="100%" opacity="0.6" />
                <line x1="50%" y1="40%" x2="75%" y2="100%" opacity="0.6" />
                <line x1="50%" y1="40%" x2="50%" y2="100%" strokeDasharray="4 4" />
                {/* Horizon line */}
                <line x1="0%" y1="40%" x2="100%" y2="40%" strokeWidth={strokeWidth * 1.5} />
                {/* Depth transversal rungs */}
                <line x1="15%" y1="88%" x2="85%" y2="88%" opacity="0.5" />
                <line x1="28%" y1="74%" x2="72%" y2="74%" opacity="0.4" />
                <line x1="38%" y1="60%" x2="62%" y2="60%" opacity="0.3" />
              </g>
            )}

            {/* ============================================================ */}
            {/* 2. TECHNICAL GRIDS                                           */}
            {/* ============================================================ */}

            {/* 4x4 GRID */}
            {gridType === 'grid_4x4' && (
              <g>
                {[25, 50, 75].map((p) => (
                  <React.Fragment key={p}>
                    <line x1={`${p}%`} y1="0%" x2={`${p}%`} y2="100%" />
                    <line x1="0%" y1={`${p}%`} x2="100%" y2={`${p}%`} />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* 5x5 GRID */}
            {gridType === 'grid_5x5' && (
              <g>
                {[20, 40, 60, 80].map((p) => (
                  <React.Fragment key={p}>
                    <line x1={`${p}%`} y1="0%" x2={`${p}%`} y2="100%" />
                    <line x1="0%" y1={`${p}%`} x2="100%" y2={`${p}%`} />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* 6x6 GRID */}
            {gridType === 'grid_6x6' && (
              <g>
                {[16.66, 33.33, 50, 66.66, 83.33].map((p) => (
                  <React.Fragment key={p}>
                    <line x1={`${p}%`} y1="0%" x2={`${p}%`} y2="100%" />
                    <line x1="0%" y1={`${p}%`} x2="100%" y2={`${p}%`} />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* 8x8 GRID */}
            {gridType === 'grid_8x8' && (
              <g>
                {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((p) => (
                  <React.Fragment key={p}>
                    <line x1={`${p}%`} y1="0%" x2={`${p}%`} y2="100%" strokeWidth={p === 50 ? strokeWidth * 1.3 : strokeWidth * 0.75} />
                    <line x1="0%" y1={`${p}%`} x2="100%" y2={`${p}%`} strokeWidth={p === 50 ? strokeWidth * 1.3 : strokeWidth * 0.75} />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* 10x10 GRID */}
            {gridType === 'grid_10x10' && (
              <g>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
                  <React.Fragment key={p}>
                    <line x1={`${p}%`} y1="0%" x2={`${p}%`} y2="100%" strokeWidth={p === 50 ? strokeWidth * 1.3 : strokeWidth * 0.6} />
                    <line x1="0%" y1={`${p}%`} x2="100%" y2={`${p}%`} strokeWidth={p === 50 ? strokeWidth * 1.3 : strokeWidth * 0.6} />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* HORIZONTAL ALIGNMENT */}
            {gridType === 'horizontal_alignment' && (
              <g>
                {[20, 35, 50, 65, 80].map((p) => (
                  <line
                    key={p}
                    x1="0%"
                    y1={`${p}%`}
                    x2="100%"
                    y2={`${p}%`}
                    strokeWidth={p === 50 ? strokeWidth * 1.8 : strokeWidth * 0.8}
                    strokeDasharray={p === 50 ? 'none' : '4 4'}
                  />
                ))}
                {/* Vernier scale ticks along center line */}
                {[20, 30, 40, 60, 70, 80].map((tx) => (
                  <line key={tx} x1={`${tx}%`} y1="48%" x2={`${tx}%`} y2="52%" />
                ))}
              </g>
            )}

            {/* VERTICAL ALIGNMENT (PLUMB LINES) */}
            {(gridType === 'vertical_alignment' || gridType === 'arch_vertical_correction') && (
              <g>
                {[15, 30, 50, 70, 85].map((p) => (
                  <line
                    key={p}
                    x1={`${p}%`}
                    y1="0%"
                    x2={`${p}%`}
                    y2="100%"
                    strokeWidth={p === 50 ? strokeWidth * 1.8 : strokeWidth * 0.8}
                    strokeDasharray={p === 50 ? 'none' : '4 4'}
                  />
                ))}
                {/* Keystone angle check diagonals */}
                <line x1="15%" y1="0%" x2="20%" y2="100%" opacity="0.3" strokeDasharray="3 3" />
                <line x1="85%" y1="0%" x2="80%" y2="100%" opacity="0.3" strokeDasharray="3 3" />
              </g>
            )}

            {/* VANISHING POINT GUIDE */}
            {(gridType === 'vanishing_point_guide' || gridType === 'arch_vanishing_point') && (
              <g>
                {/* 12 rays radiating from center vanishing point */}
                {[0, 20, 40, 60, 80, 100].map((bx) => (
                  <React.Fragment key={bx}>
                    <line x1="50%" y1="45%" x2={`${bx}%`} y2="100%" opacity="0.7" />
                    <line x1="50%" y1="45%" x2={`${bx}%`} y2="0%" opacity="0.5" />
                  </React.Fragment>
                ))}
                <circle cx="50%" cy="45%" r="6" fill={color} stroke="none" />
                <circle cx="50%" cy="45%" r="16" fill="none" strokeDasharray="2 2" />
              </g>
            )}

            {/* SAFE AREA GUIDE (90% Action / 80% Title / 14:9 / 4:3 broadcast) */}
            {(gridType === 'safe_area_guide' || secondary.showSafeArea) && (
              <g>
                {/* 90% Action Safe */}
                <rect x="5%" y="5%" width="90%" height="90%" fill="none" strokeWidth={strokeWidth} />
                <text x="6%" y="8%" fill={color} stroke="none" fontSize="9" fontFamily="monospace" opacity="0.8">90% ACTION SAFE</text>

                {/* 80% Title Safe */}
                <rect x="10%" y="10%" width="80%" height="80%" fill="none" strokeWidth={strokeWidth * 0.9} strokeDasharray="4 4" />
                <text x="11%" y="13%" fill={color} stroke="none" fontSize="9" fontFamily="monospace" opacity="0.8">80% TITLE SAFE</text>

                {/* Center cross marks */}
                <line x1="48%" y1="50%" x2="52%" y2="50%" strokeWidth={strokeWidth * 1.5} />
                <line x1="50%" y1="48%" x2="50%" y2="52%" strokeWidth={strokeWidth * 1.5} />
              </g>
            )}

            {/* ============================================================ */}
            {/* 3. PHOTOGRAPHY-SPECIFIC GUIDES                               */}
            {/* ============================================================ */}

            {/* PORTRAIT: EYELINE */}
            {gridType === 'portrait_eyeline' && (
              <g>
                {/* Dominant Eye Level Line */}
                <line x1="5%" y1="38.2%" x2="95%" y2="38.2%" strokeWidth={strokeWidth * 2} />
                <circle cx="42%" cy="38.2%" r="5" />
                <circle cx="58%" cy="38.2%" r="5" />
                <text x="50%" y="35%" fill={color} stroke="none" fontSize="11" textAnchor="middle" fontWeight="bold">EYE-LINE LEVEL</text>
                {/* Vertical symmetry */}
                <line x1="50%" y1="10%" x2="50%" y2="90%" strokeDasharray="3 3" opacity="0.6" />
              </g>
            )}

            {/* PORTRAIT: HEADROOM */}
            {(gridType === 'portrait_headroom' || gridType === 'rule_of_thirds_top') && (
              <g>
                {/* Headroom upper boundary */}
                <line x1="15%" y1="12%" x2="85%" y2="12%" strokeDasharray="4 4" strokeWidth={strokeWidth * 1.2} />
                <text x="50%" y="10%" fill={color} stroke="none" fontSize="10" textAnchor="middle" fontWeight="600">OPTIMAL HEADROOM</text>
                {/* Eye line */}
                <line x1="10%" y1="38%" x2="90%" y2="38%" strokeWidth={strokeWidth * 1.8} />
                {/* Face oval */}
                <ellipse cx="50%" cy="45%" rx="22%" ry="26%" fill="none" strokeDasharray="6 3" />
                {/* Shoulders */}
                <path d="M 20% 95% Q 50% 75% 80% 95%" fill="none" opacity="0.7" />
              </g>
            )}

            {/* PORTRAIT: FACE ALIGNMENT */}
            {gridType === 'portrait_face_align' && (
              <g>
                <ellipse cx="50%" cy="46%" rx="24%" ry="30%" fill="none" strokeWidth={strokeWidth * 1.5} />
                {/* Eye line and nodes */}
                <line x1="30%" y1="40%" x2="70%" y2="40%" />
                <circle cx="43%" cy="40%" r="4" fill={color} stroke="none" />
                <circle cx="57%" cy="40%" r="4" fill={color} stroke="none" />
                {/* Nose center */}
                <line x1="50%" y1="42%" x2="50%" y2="52%" strokeWidth={strokeWidth * 1.2} />
                {/* Lips line */}
                <line x1="42%" y1="58%" x2="58%" y2="58%" />
                {/* Vertical symmetry */}
                <line x1="50%" y1="10%" x2="50%" y2="85%" strokeDasharray="4 4" opacity="0.5" />
              </g>
            )}

            {/* PORTRAIT: HEAD AND SHOULDER */}
            {gridType === 'portrait_head_shoulder' && (
              <g>
                <ellipse cx="50%" cy="40%" rx="20%" ry="24%" fill="none" strokeWidth={strokeWidth * 1.4} />
                {/* Eye level */}
                <line x1="20%" y1="36%" x2="80%" y2="36%" strokeDasharray="4 4" />
                {/* Natural shoulder contour */}
                <path d="M 12% 96% C 25% 72%, 40% 64%, 50% 64% C 60% 64%, 75% 72%, 88% 96%" fill="none" strokeWidth={strokeWidth * 1.6} />
              </g>
            )}

            {/* PORTRAIT: FULL BODY FRAMING */}
            {gridType === 'portrait_full_body' && (
              <g>
                {/* 4 Golden vertical partitions: Head (15%), Torso (50%), Legs (85%), Feet (100%) */}
                <line x1="20%" y1="15%" x2="80%" y2="15%" strokeDasharray="4 4" />
                <line x1="20%" y1="50%" x2="80%" y2="50%" strokeDasharray="4 4" />
                <line x1="20%" y1="85%" x2="80%" y2="85%" strokeDasharray="4 4" />
                <line x1="50%" y1="5%" x2="50%" y2="95%" strokeWidth={strokeWidth * 1.5} />
                {/* Head circle & body guides */}
                <circle cx="50%" cy="12%" r="8%" fill="none" />
                <rect x="35%" y="22%" width="30%" height="32%" rx="8" fill="none" strokeDasharray="3 3" />
              </g>
            )}

            {/* LANDSCAPE: FOREGROUND EMPHASIS */}
            {(gridType === 'landscape_foreground' || gridType === 'rule_of_thirds_bottom') && (
              <g>
                {/* Horizon at top 1/3 (33.3%) */}
                <line x1="0%" y1="33.333%" x2="100%" y2="33.333%" strokeWidth={strokeWidth * 1.8} />
                <text x="50%" y="30%" fill={color} stroke="none" fontSize="10" textAnchor="middle" fontWeight="bold">HORIZON (33%)</text>
                {/* Foreground Anchor Target */}
                <circle cx="50%" cy="75%" r="14%" fill="none" strokeDasharray="4 4" />
                <circle cx="50%" cy="75%" r="4" fill={color} stroke="none" />
                <text x="50%" y="93%" fill={color} stroke="none" fontSize="10" textAnchor="middle">FOREGROUND SUBJECT ANCHOR</text>
              </g>
            )}

            {/* LANDSCAPE: MOUNTAIN ALIGNMENT */}
            {gridType === 'landscape_mountain_align' && (
              <g>
                {/* Rideline triangular guides */}
                <polyline points="0%,65% 35%,35% 65%,52% 85%,28% 100%,60%" fill="none" strokeWidth={strokeWidth * 1.6} />
                <line x1="0%" y1="65%" x2="100%" y2="65%" strokeDasharray="4 4" />
                <circle cx="85%" cy="28%" r="5" fill={color} stroke="none" />
                <circle cx="35%" cy="35%" r="5" fill={color} stroke="none" />
              </g>
            )}

            {/* LANDSCAPE: PANORAMIC 2.39:1 / 3:1 MASK */}
            {gridType === 'landscape_panoramic' && (
              <g>
                {/* Cinematic Letterbox Mask bars */}
                <line x1="0%" y1="22%" x2="100%" y2="22%" strokeWidth={strokeWidth * 2} />
                <line x1="0%" y1="78%" x2="100%" y2="78%" strokeWidth={strokeWidth * 2} />
                <line x1="0%" y1="50%" x2="100%" y2="50%" strokeDasharray="4 4" opacity="0.6" />
                <text x="50%" y="20%" fill={color} stroke="none" fontSize="10" textAnchor="middle" fontWeight="bold">2.39:1 ANAMORPHIC CINEMA</text>
              </g>
            )}

            {/* ARCHITECTURE: FACADE DIVISIONS */}
            {gridType === 'arch_facade_divisions' && (
              <g>
                {/* Classical architectural tri-part facade: Base (25%), Shaft (50%), Capital (25%) */}
                <line x1="0%" y1="25%" x2="100%" y2="25%" strokeWidth={strokeWidth * 1.5} />
                <line x1="0%" y1="75%" x2="100%" y2="75%" strokeWidth={strokeWidth * 1.5} />
                {/* Vertical column bays (5 bays) */}
                {[20, 40, 60, 80].map((cx) => (
                  <line key={cx} x1={`${cx}%`} y1="0%" x2={`${cx}%`} y2="100%" strokeDasharray="3 3" />
                ))}
              </g>
            )}

            {/* PRODUCT: SAFE AREA & PEDESTAL */}
            {(gridType === 'product_safe_area' || gridType === 'product_center') && (
              <g>
                <circle cx="50%" cy="55%" r="22%" fill="none" strokeWidth={strokeWidth * 1.5} />
                <ellipse cx="50%" cy="72%" rx="30%" ry="10%" fill="none" strokeDasharray="3 3" />
                {/* Product boundary box */}
                <rect x="25%" y="25%" width="50%" height="52%" rx="8" fill="none" strokeDasharray="4 4" />
                <circle cx="50%" cy="55%" r="3" fill={color} stroke="none" />
              </g>
            )}

            {/* PRODUCT: NEGATIVE SPACE */}
            {gridType === 'product_negative_space' && (
              <g>
                {/* 1/3 subject placement, 2/3 clean negative space for typography / marketing */}
                <line x1="40%" y1="0%" x2="40%" y2="100%" strokeWidth={strokeWidth * 1.8} />
                <rect x="42%" y="15%" width="52%" height="70%" fill="none" strokeDasharray="4 4" opacity="0.6" />
                <text x="68%" y="50%" fill={color} stroke="none" fontSize="11" textAnchor="middle" opacity="0.7">NEGATIVE COPY SPACE</text>
                <circle cx="20%" cy="50%" r="14%" fill="none" />
              </g>
            )}

            {/* PRODUCT / FOOD: FLAT-LAY COMPOSITION */}
            {(gridType === 'product_flat_lay' || gridType === 'food_flat_lay' || gridType === 'food_overhead') && (
              <g>
                {/* Top-down 90-degree alignment grid */}
                <circle cx="50%" cy="50%" r="24%" fill="none" strokeWidth={strokeWidth * 1.6} />
                <circle cx="75%" cy="28%" r="10%" fill="none" strokeDasharray="3 3" />
                <circle cx="25%" cy="72%" r="10%" fill="none" strokeDasharray="3 3" />
                <line x1="50%" y1="0%" x2="50%" y2="100%" strokeDasharray="4 4" opacity="0.5" />
                <line x1="0%" y1="50%" x2="100%" y2="50%" strokeDasharray="4 4" opacity="0.5" />
              </g>
            )}

            {/* STREET: FRAME WITHIN A FRAME */}
            {gridType === 'street_frame_in_frame' && (
              <g>
                {/* Outer frame & inner secondary aperture */}
                <rect x="15%" y="15%" width="70%" height="70%" rx="12" fill="none" strokeWidth={strokeWidth * 2} />
                <line x1="15%" y1="15%" x2="0%" y2="0%" opacity="0.4" />
                <line x1="85%" y1="15%" x2="100%" y2="0%" opacity="0.4" />
                <line x1="15%" y1="85%" x2="0%" y2="100%" opacity="0.4" />
                <line x1="85%" y1="85%" x2="100%" y2="100%" opacity="0.4" />
                <circle cx="50%" cy="50%" r="5" fill={color} stroke="none" />
              </g>
            )}

            {/* STREET: SUBJECT POSITIONING */}
            {gridType === 'street_subject_pos' && (
              <g>
                <line x1="33.333%" y1="0%" x2="33.333%" y2="100%" strokeWidth={strokeWidth * 1.5} />
                <circle cx="33.333%" cy="60%" r="12%" fill="none" strokeDasharray="4 4" />
                <circle cx="33.333%" cy="60%" r="4" fill={color} stroke="none" />
                <path d="M 33.333% 60% L 80% 60%" strokeDasharray="3 3" />
                <text x="60%" y="56%" fill={color} stroke="none" fontSize="10">GAZE / WALKING DIRECTION</text>
              </g>
            )}

            {/* FOOD: DIAGONAL ARRANGEMENT */}
            {gridType === 'food_diagonal' && (
              <g>
                <line x1="0%" y1="100%" x2="100%" y2="0%" strokeWidth={strokeWidth * 1.6} />
                <circle cx="28%" cy="72%" r="14%" fill="none" strokeDasharray="4 4" />
                <circle cx="50%" cy="50%" r="18%" fill="none" strokeWidth={strokeWidth * 1.5} />
                <circle cx="72%" cy="28%" r="11%" fill="none" strokeDasharray="4 4" />
              </g>
            )}

            {/* WILDLIFE: TRACKING FRAME */}
            {gridType === 'wildlife_tracking_frame' && (
              <g>
                <rect x="25%" y="25%" width="50%" height="50%" rx="12" fill="none" strokeWidth={strokeWidth * 1.8} strokeDasharray="8 4" />
                <circle cx="50%" cy="50%" r="4" fill={color} stroke="none" />
                <line x1="75%" y1="50%" x2="95%" y2="50%" strokeWidth={strokeWidth * 1.5} />
                <polyline points="90%,45% 95%,50% 90%,55%" fill="none" strokeWidth={strokeWidth * 1.5} />
              </g>
            )}

            {/* WILDLIFE: EYE PLACEMENT */}
            {gridType === 'wildlife_eye_placement' && (
              <g>
                <line x1="38.2%" y1="0%" x2="38.2%" y2="100%" strokeDasharray="4 4" />
                <line x1="0%" y1="38.2%" x2="100%" y2="38.2%" strokeDasharray="4 4" />
                <circle cx="38.2%" cy="38.2%" r="16" fill="none" strokeWidth={strokeWidth * 1.8} />
                <circle cx="38.2%" cy="38.2%" r="4" fill={color} stroke="none" />
                <text x="38.2%" y="30%" fill={color} stroke="none" fontSize="10" textAnchor="middle" fontWeight="bold">ANIMAL EYE FOCUS</text>
              </g>
            )}

            {/* WILDLIFE: MOTION SPACE */}
            {gridType === 'wildlife_motion_space' && (
              <g>
                <line x1="30%" y1="0%" x2="30%" y2="100%" strokeWidth={strokeWidth * 1.5} />
                <rect x="15%" y="35%" width="30%" height="35%" rx="8" fill="none" strokeDasharray="4 3" />
                <line x1="45%" y1="50%" x2="90%" y2="50%" strokeWidth={strokeWidth * 1.8} strokeDasharray="6 3" />
                <text x="68%" y="46%" fill={color} stroke="none" fontSize="10" textAnchor="middle">ANIMAL MOTION BUFFER</text>
              </g>
            )}

            {/* CENTER POINT RETICLE (if enabled across any grid) */}
            {showCenterDot && gridType !== 'none' && (
              <g fill={color} stroke="none">
                <circle cx="50%" cy="50%" r="2.5" />
              </g>
            )}
          </g>
        )}

        {/* ============================================================ */}
        {/* 4. SECONDARY GUIDES (Horizon Level & Dual Axis Level)         */}
        {/* ============================================================ */}

        {/* HORIZON LEVEL GAUGE */}
        {(gridType === 'horizon_level' || secondary.showHorizonLevel) && (
          <g transform={`rotate(${rollAngle}, 150, 150)`} className="transition-transform duration-75">
            <line
              x1="20%"
              y1="50%"
              x2="43%"
              y2="50%"
              stroke={levelAccentColor}
              strokeWidth={isRollLevel ? 2.8 : 1.8}
            />
            <circle cx="50%" cy="50%" r="3.5" fill={levelAccentColor} />
            <line
              x1="57%"
              y1="50%"
              x2="80%"
              y2="50%"
              stroke={levelAccentColor}
              strokeWidth={isRollLevel ? 2.8 : 1.8}
            />
          </g>
        )}

        {/* DUAL AXIS CROSS LEVEL GAUGE (Pitch + Roll) */}
        {(gridType === 'dual_axis_level' || secondary.showDualAxisLevel) && (
          <g>
            {/* Horizontal Roll line */}
            <g transform={`rotate(${rollAngle}, 150, 150)`}>
              <line x1="25%" y1="50%" x2="44%" y2="50%" stroke={isRollLevel ? '#22c55e' : '#eab308'} strokeWidth={2} />
              <line x1="56%" y1="50%" x2="75%" y2="50%" stroke={isRollLevel ? '#22c55e' : '#eab308'} strokeWidth={2} />
            </g>
            {/* Vertical Pitch gauge */}
            <g transform={`translate(0, ${pitchAngle * 1.5})`}>
              <line x1="50%" y1="28%" x2="50%" y2="44%" stroke={isPitchLevel ? '#22c55e' : '#eab308'} strokeWidth={2} />
              <line x1="50%" y1="56%" x2="50%" y2="72%" stroke={isPitchLevel ? '#22c55e' : '#eab308'} strokeWidth={2} />
            </g>
            {/* Center target ring */}
            <circle cx="50%" cy="50%" r="14" fill="none" stroke={isDualLevel ? '#22c55e' : 'rgba(255,255,255,0.7)'} strokeWidth="1.5" />
            <circle cx="50%" cy="50%" r="3" fill={isDualLevel ? '#22c55e' : '#eab308'} />
          </g>
        )}
      </svg>

      {/* Floating level degree pill when level is active */}
      {(gridType === 'horizon_level' || secondary.showHorizonLevel || gridType === 'dual_axis_level' || secondary.showDualAxisLevel) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wider flex items-center gap-1.5 shadow-md ${
              isRollLevel
                ? 'bg-emerald-500/90 text-black shadow-emerald-500/30'
                : 'bg-black/60 text-white/90 border border-white/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isRollLevel ? 'bg-black animate-ping' : 'bg-amber-400'}`} />
            {isRollLevel ? 'LEVEL 0.0°' : `${rollAngle > 0 ? '+' : ''}${rollAngle.toFixed(1)}°`}
            {secondary.showDualAxisLevel && (
              <span className="text-[10px] opacity-80 border-l border-white/20 pl-1.5">
                PITCH {pitchAngle > 0 ? '+' : ''}{pitchAngle.toFixed(1)}°
              </span>
            )}
          </div>
        </div>
      )}

      {/* Rotate & Flip controls for Golden Spiral */}
      {(gridType === 'golden_spiral' || gridType === 'fibonacci_spiral') && (
        <div className="absolute top-12 right-3 pointer-events-auto flex flex-col gap-2">
          <button
            onClick={() => setSpiralRot((prev) => (prev + 90) % 360)}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg hover:bg-black/80"
            title="Rotate Spiral 90°"
          >
            <RotateCw size={15} />
          </button>
          <button
            onClick={() => setSpiralFlip((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg hover:bg-black/80"
            title="Flip Horizontal"
          >
            <FlipHorizontal size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
