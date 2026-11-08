import React from 'react';
import type { GridType } from '../../types/camera';
import { isGeoGridId } from '../../data/geoGrids';
import { GeoGridThumb } from './GeoGridOverlay';

interface GridMiniaturePreviewProps {
  gridType: GridType;
  color?: string;
  className?: string;
}

export const GridMiniaturePreview: React.FC<GridMiniaturePreviewProps> = ({
  gridType,
  color = '#facc15',
  className = 'w-full h-full',
}) => {
  if (isGeoGridId(gridType)) {
    return (
      <div className={`${className} flex items-center justify-center bg-zinc-900`}>
        <GeoGridThumb gridId={gridType} color={color} size={56} />
      </div>
    );
  }
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background card fill */}
      <rect width="100" height="100" fill="#18181b" />
      <rect width="100" height="100" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* Grid specific lines */}
      <g stroke={color} strokeWidth="1.5" strokeLinecap="round">
        {/* NONE */}
        {gridType === 'none' && (
          <circle cx="50" cy="50" r="4" fill={color} stroke="none" />
        )}

        {/* RULE OF THIRDS */}
        {(gridType === 'rule_of_thirds' || gridType === 'landscape_horizon_thirds') && (
          <>
            <line x1="33.3" y1="0" x2="33.3" y2="100" />
            <line x1="66.6" y1="0" x2="66.6" y2="100" />
            <line x1="0" y1="33.3" x2="100" y2="33.3" />
            <line x1="0" y1="66.6" x2="100" y2="66.6" />
            <circle cx="33.3" cy="33.3" r="3" fill={color} stroke="none" />
            <circle cx="66.6" cy="33.3" r="3" fill={color} stroke="none" />
            <circle cx="33.3" cy="66.6" r="3" fill={color} stroke="none" />
            <circle cx="66.6" cy="66.6" r="3" fill={color} stroke="none" />
          </>
        )}

        {/* GOLDEN RATIO */}
        {(gridType === 'golden_ratio' || gridType === 'landscape_golden_ratio') && (
          <>
            <line x1="38.2" y1="0" x2="38.2" y2="100" strokeWidth="1.8" />
            <line x1="61.8" y1="0" x2="61.8" y2="100" strokeWidth="1.8" />
            <line x1="0" y1="38.2" x2="100" y2="38.2" strokeWidth="1.8" />
            <line x1="0" y1="61.8" x2="100" y2="61.8" strokeWidth="1.8" />
            <circle cx="38.2" cy="38.2" r="3" fill={color} stroke="none" />
            <circle cx="61.8" cy="61.8" r="3" fill={color} stroke="none" />
          </>
        )}

        {/* GOLDEN SPIRAL / FIBONACCI */}
        {(gridType === 'golden_spiral' || gridType === 'fibonacci_spiral') && (
          <>
            <rect x="0" y="0" width="100" height="100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="61.8" y1="0" x2="61.8" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="61.8" y1="61.8" x2="100" y2="61.8" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2 2" />
            <path
              d="M 0 100 A 100 100 0 0 1 100 0 A 61.8 61.8 0 0 1 100 61.8 A 38.2 38.2 0 0 1 61.8 61.8 A 23.6 23.6 0 0 1 61.8 38.2 A 14.6 14.6 0 0 1 76.4 38.2"
              fill="none"
              stroke={color}
              strokeWidth="2.2"
            />
            <circle cx="71.5" cy="45" r="3" fill={color} stroke="none" />
          </>
        )}

        {/* GOLDEN TRIANGLES */}
        {(gridType === 'golden_triangles' || gridType === 'street_golden_triangle') && (
          <>
            <line x1="0" y1="100" x2="100" y2="0" strokeWidth="2" />
            <line x1="0" y1="0" x2="60" y2="40" strokeWidth="1.5" />
            <line x1="100" y1="100" x2="40" y2="60" strokeWidth="1.5" />
            <circle cx="60" cy="40" r="3" fill={color} stroke="none" />
            <circle cx="40" cy="60" r="3" fill={color} stroke="none" />
          </>
        )}

        {/* DIAGONAL COMPOSITION */}
        {(gridType === 'diagonal_composition' || gridType === 'diagonal_method' || gridType === 'food_diagonal') && (
          <>
            <line x1="0" y1="0" x2="100" y2="100" strokeWidth="1.8" />
            <line x1="100" y1="0" x2="0" y2="100" strokeWidth="1.8" />
            <line x1="0" y1="50" x2="50" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <line x1="50" y1="100" x2="100" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          </>
        )}

        {/* CENTER CROSSHAIR */}
        {gridType === 'center_crosshair' && (
          <>
            <line x1="50" y1="15" x2="50" y2="45" />
            <line x1="50" y1="55" x2="50" y2="85" />
            <line x1="15" y1="50" x2="45" y2="50" />
            <line x1="55" y1="50" x2="85" y2="50" />
            <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="2.5" fill={color} stroke="none" />
          </>
        )}

        {/* CENTER SYMMETRY */}
        {(gridType === 'center_symmetry' || gridType === 'arch_building_symmetry' || gridType === 'product_symmetry') && (
          <>
            <line x1="50" y1="0" x2="50" y2="100" strokeWidth="2" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.5)" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="22" fill="none" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="2 2" />
          </>
        )}

        {/* DYNAMIC SYMMETRY */}
        {gridType === 'dynamic_symmetry' && (
          <>
            <line x1="0" y1="0" x2="100" y2="100" />
            <line x1="100" y1="0" x2="0" y2="100" />
            <line x1="0" y1="100" x2="61.8" y2="0" stroke="rgba(255,255,255,0.5)" />
            <line x1="100" y1="0" x2="38.2" y2="100" stroke="rgba(255,255,255,0.5)" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.3)" strokeDasharray="2 2" />
          </>
        )}

        {/* RADIAL COMPOSITION */}
        {gridType === 'radial_composition' && (
          <>
            <line x1="50" y1="0" x2="50" y2="100" />
            <line x1="0" y1="50" x2="100" y2="50" />
            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.5)" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.5)" />
            <circle cx="50" cy="50" r="25" fill="none" />
          </>
        )}

        {/* CONCENTRIC CIRCLES */}
        {(gridType === 'concentric_circles' || gridType === 'food_plate_pos') && (
          <>
            <circle cx="50" cy="50" r="12" fill="none" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="24" fill="none" strokeWidth="1.8" />
            <circle cx="50" cy="50" r="36" fill="none" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="2" fill={color} stroke="none" />
          </>
        )}

        {/* PERSPECTIVE GRID */}
        {(gridType === 'perspective_grid' || gridType === 'arch_perspective_align' || gridType === 'landscape_leading_lines' || gridType === 'street_leading_lines') && (
          <>
            <line x1="50" y1="40" x2="0" y2="100" strokeWidth="2" />
            <line x1="50" y1="40" x2="100" y2="100" strokeWidth="2" />
            <line x1="50" y1="40" x2="28" y2="100" stroke="rgba(255,255,255,0.5)" />
            <line x1="50" y1="40" x2="72" y2="100" stroke="rgba(255,255,255,0.5)" />
            <line x1="0" y1="40" x2="100" y2="40" strokeWidth="1.8" />
            <line x1="20" y1="85" x2="80" y2="85" stroke="rgba(255,255,255,0.5)" />
          </>
        )}

        {/* NxN TECHNICAL GRIDS */}
        {gridType === 'grid_4x4' && (
          <>
            <line x1="25" y1="0" x2="25" y2="100" />
            <line x1="50" y1="0" x2="50" y2="100" strokeWidth="1.8" />
            <line x1="75" y1="0" x2="75" y2="100" />
            <line x1="0" y1="25" x2="100" y2="25" />
            <line x1="0" y1="50" x2="100" y2="50" strokeWidth="1.8" />
            <line x1="0" y1="75" x2="100" y2="75" />
          </>
        )}

        {gridType === 'grid_5x5' && (
          <>
            {[20, 40, 60, 80].map((p) => (
              <React.Fragment key={p}>
                <line x1={p} y1="0" x2={p} y2="100" />
                <line x1="0" y1={p} x2="100" y2={p} />
              </React.Fragment>
            ))}
          </>
        )}

        {gridType === 'grid_6x6' && (
          <>
            {[16.6, 33.3, 50, 66.6, 83.3].map((p) => (
              <React.Fragment key={p}>
                <line x1={p} y1="0" x2={p} y2="100" strokeWidth={p === 50 ? 1.8 : 1} />
                <line x1="0" y1={p} x2="100" y2={p} strokeWidth={p === 50 ? 1.8 : 1} />
              </React.Fragment>
            ))}
          </>
        )}

        {gridType === 'grid_8x8' && (
          <>
            {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((p) => (
              <React.Fragment key={p}>
                <line x1={p} y1="0" x2={p} y2="100" strokeWidth={p === 50 ? 1.8 : 0.8} />
                <line x1="0" y1={p} x2="100" y2={p} strokeWidth={p === 50 ? 1.8 : 0.8} />
              </React.Fragment>
            ))}
          </>
        )}

        {gridType === 'grid_10x10' && (
          <>
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
              <React.Fragment key={p}>
                <line x1={p} y1="0" x2={p} y2="100" strokeWidth={p === 50 ? 1.8 : 0.6} />
                <line x1="0" y1={p} x2="100" y2={p} strokeWidth={p === 50 ? 1.8 : 0.6} />
              </React.Fragment>
            ))}
          </>
        )}

        {/* ALIGNMENT */}
        {gridType === 'horizontal_alignment' && (
          <>
            <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="100" y2="50" strokeWidth="2.2" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
            <line x1="50" y1="46" x2="50" y2="54" strokeWidth="2" />
          </>
        )}

        {(gridType === 'vertical_alignment' || gridType === 'arch_vertical_correction') && (
          <>
            <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
            <line x1="50" y1="0" x2="50" y2="100" strokeWidth="2.2" />
            <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
            <line x1="46" y1="50" x2="54" y2="50" strokeWidth="2" />
          </>
        )}

        {(gridType === 'horizon_level' || gridType === 'dual_axis_level') && (
          <>
            <line x1="15" y1="50" x2="42" y2="50" strokeWidth="2.2" />
            <circle cx="50" cy="50" r="3.5" fill={color} stroke="none" />
            <line x1="58" y1="50" x2="85" y2="50" strokeWidth="2.2" />
            {gridType === 'dual_axis_level' && (
              <>
                <line x1="50" y1="15" x2="50" y2="42" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
                <line x1="50" y1="58" x2="50" y2="85" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
              </>
            )}
          </>
        )}

        {(gridType === 'vanishing_point_guide' || gridType === 'arch_vanishing_point') && (
          <>
            {[0, 25, 50, 75, 100].map((x) => (
              <line key={x} x1="50" y1="45" x2={x} y2="100" strokeWidth="1.5" />
            ))}
            <circle cx="50" cy="45" r="4" fill={color} stroke="none" />
          </>
        )}

        {gridType === 'safe_area_guide' && (
          <>
            <rect x="8" y="8" width="84" height="84" fill="none" strokeWidth="1.5" />
            <rect x="16" y="16" width="68" height="68" fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="2.5" fill={color} stroke="none" />
          </>
        )}

        {/* PORTRAIT GUIDES */}
        {gridType === 'portrait_eyeline' && (
          <>
            <line x1="10" y1="38" x2="90" y2="38" strokeWidth="2.2" />
            <circle cx="40" cy="38" r="3.5" fill={color} stroke="none" />
            <circle cx="60" cy="38" r="3.5" fill={color} stroke="none" />
            <line x1="50" y1="15" x2="50" y2="85" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 2" />
          </>
        )}

        {(gridType === 'portrait_headroom' || gridType === 'rule_of_thirds_top') && (
          <>
            <line x1="20" y1="15" x2="80" y2="15" stroke="rgba(255,255,255,0.6)" strokeDasharray="3 3" />
            <line x1="10" y1="38" x2="90" y2="38" strokeWidth="2" />
            <ellipse cx="50" cy="46" rx="20" ry="24" fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="4 2" />
          </>
        )}

        {gridType === 'portrait_face_align' && (
          <>
            <ellipse cx="50" cy="48" rx="22" ry="28" fill="none" strokeWidth="1.8" />
            <line x1="32" y1="42" x2="68" y2="42" />
            <circle cx="43" cy="42" r="3" fill={color} stroke="none" />
            <circle cx="57" cy="42" r="3" fill={color} stroke="none" />
            <line x1="50" y1="15" x2="50" y2="85" stroke="rgba(255,255,255,0.3)" strokeDasharray="2 2" />
          </>
        )}

        {gridType === 'portrait_head_shoulder' && (
          <>
            <ellipse cx="50" cy="40" rx="18" ry="22" fill="none" strokeWidth="1.5" />
            <path d="M 15 95 C 28 72, 40 65, 50 65 C 60 65, 72 72, 85 95" fill="none" strokeWidth="1.8" />
          </>
        )}

        {gridType === 'portrait_full_body' && (
          <>
            <circle cx="50" cy="15" r="8" fill="none" strokeWidth="1.5" />
            <line x1="50" y1="23" x2="50" y2="92" strokeWidth="2" />
            <line x1="30" y1="50" x2="70" y2="50" stroke="rgba(255,255,255,0.5)" strokeDasharray="2 2" />
            <line x1="30" y1="82" x2="70" y2="82" stroke="rgba(255,255,255,0.5)" strokeDasharray="2 2" />
          </>
        )}

        {/* LANDSCAPE */}
        {(gridType === 'landscape_foreground' || gridType === 'rule_of_thirds_bottom') && (
          <>
            <line x1="0" y1="33" x2="100" y2="33" strokeWidth="2" />
            <circle cx="50" cy="72" r="14" fill="none" strokeDasharray="3 3" />
            <circle cx="50" cy="72" r="3" fill={color} stroke="none" />
          </>
        )}

        {gridType === 'landscape_mountain_align' && (
          <>
            <polyline points="0,70 35,38 65,55 85,30 100,65" fill="none" strokeWidth="2" />
            <circle cx="85" cy="30" r="3.5" fill={color} stroke="none" />
          </>
        )}

        {gridType === 'landscape_panoramic' && (
          <>
            <rect x="0" y="0" width="100" height="22" fill="rgba(0,0,0,0.5)" stroke="none" />
            <rect x="0" y="78" width="100" height="22" fill="rgba(0,0,0,0.5)" stroke="none" />
            <line x1="0" y1="22" x2="100" y2="22" strokeWidth="2" />
            <line x1="0" y1="78" x2="100" y2="78" strokeWidth="2" />
          </>
        )}

        {/* ARCHITECTURE */}
        {gridType === 'arch_facade_divisions' && (
          <>
            <line x1="0" y1="25" x2="100" y2="25" strokeWidth="1.8" />
            <line x1="0" y1="75" x2="100" y2="75" strokeWidth="1.8" />
            {[25, 50, 75].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 2" />
            ))}
          </>
        )}

        {/* PRODUCT */}
        {(gridType === 'product_center' || gridType === 'product_safe_area') && (
          <>
            <circle cx="50" cy="52" r="20" fill="none" strokeWidth="1.8" />
            <rect x="25" y="25" width="50" height="52" rx="6" fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="3 3" />
            <circle cx="50" cy="52" r="2.5" fill={color} stroke="none" />
          </>
        )}

        {gridType === 'product_negative_space' && (
          <>
            <line x1="40" y1="0" x2="40" y2="100" strokeWidth="2" />
            <circle cx="20" cy="50" r="12" fill="none" />
            <rect x="45" y="25" width="45" height="50" rx="4" fill="none" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 2" />
          </>
        )}

        {(gridType === 'product_flat_lay' || gridType === 'food_flat_lay' || gridType === 'food_overhead') && (
          <>
            <circle cx="50" cy="50" r="22" fill="none" strokeWidth="1.8" />
            <circle cx="76" cy="28" r="9" fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="2 2" />
            <circle cx="24" cy="72" r="9" fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="2 2" />
          </>
        )}

        {/* STREET */}
        {gridType === 'street_frame_in_frame' && (
          <>
            <rect x="15" y="15" width="70" height="70" rx="8" fill="none" strokeWidth="2" />
            <circle cx="50" cy="50" r="4" fill={color} stroke="none" />
          </>
        )}

        {gridType === 'street_subject_pos' && (
          <>
            <line x1="33" y1="0" x2="33" y2="100" strokeWidth="1.8" />
            <circle cx="33" cy="60" r="10" fill="none" strokeDasharray="3 3" />
            <line x1="33" y1="60" x2="75" y2="60" strokeDasharray="2 2" />
          </>
        )}
      </g>
    </svg>
  );
};
