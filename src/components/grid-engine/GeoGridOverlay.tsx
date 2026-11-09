import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { GridStyleOptions } from '../../types/camera';
import type { GeoGridDefinition, GeoParams, Prim, StrokeKind } from '../../types/gridGeometry';
import { getGeoGrid, withDefaults } from '../../data/geoGrids';
import { geoGridParamsService } from '../../services/geoGridParamsService';

const DASH: Record<GridStyleOptions['lineStyle'], string | undefined> = {
  solid: undefined,
  dashed: '6 4',
  dotted: '2 3',
};

interface SvgProps {
  prims: Prim[];
  width: number;
  height: number;
  style: Partial<GridStyleOptions>;
  /** Thumbnails and illustrations ignore user transform options. */
  plain?: boolean;
}

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(' ');

/** Renders primitives (fractions of the frame) into a pixel-sized SVG so shapes stay true. */
export const GeoGridSvg: React.FC<SvgProps> = ({ prims, width, height, style, plain }) => {
  const color = style.color ?? '#ffffff';
  const sw = style.strokeWidth ?? 1.2;
  const dash = plain ? undefined : DASH[style.lineStyle ?? 'solid'];
  const nodes = style.showIntersectionNodes ?? true;
  const scale = plain ? 1 : style.scale ?? 1;
  const rotation = plain ? 0 : style.rotation ?? 0;
  const ox = plain ? 0 : (style.offsetX ?? 0) / 100;
  const oy = plain ? 0 : (style.offsetY ?? 0) / 100;

  const transform =
    `translate(${ox * width} ${oy * height}) translate(${width / 2} ${height / 2}) ` +
    `rotate(${rotation}) scale(${scale}) translate(${-width / 2} ${-height / 2}) scale(${width} ${height})`;

  const stroke = (k?: StrokeKind) => ({
    stroke: color,
    strokeWidth: k === 'accent' ? sw * 1.7 : sw,
    strokeOpacity: k === 'minor' ? 0.55 : 1,
    strokeDasharray: k === 'dash' ? '5 4' : dash,
    vectorEffect: 'non-scaling-stroke' as const,
    fill: 'none',
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <g transform={transform}>
        {prims.map((p, i) => {
          switch (p.t) {
            case 'l':
              return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...stroke(p.k)} />;
            case 'r':
              return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} {...stroke(p.k)} />;
            case 'p':
              return p.closed ? (
                <polygon key={i} points={pts(p.pts)} {...stroke(p.k)} />
              ) : (
                <polyline key={i} points={pts(p.pts)} {...stroke(p.k)} />
              );
            case 'dim':
              return (
                <path
                  key={i}
                  fillRule="evenodd"
                  fill="#000"
                  fillOpacity={0.5}
                  d={`M-2 -2H3V3H-2Z M${p.x} ${p.y}h${p.w}v${p.h}h${-p.w}Z`}
                />
              );
            case 'txt': {
              // Drawn outside the stretched unit space so glyphs are never distorted.
              const fs = (p.size ?? 0.03) * height;
              return (
                <text
                  key={i}
                  x={p.x * width}
                  y={p.y * height}
                  fontSize={fs}
                  fill={color}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`scale(${1 / width} ${1 / height}) rotate(${p.rot ?? 0} ${p.x * width} ${p.y * height})`}
                  style={{ fontFamily: '"Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive', fontWeight: 600, paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 2.5 }}
                >
                  {p.text}
                </text>
              );
            }
            case 'dot':
              return nodes ? (
                <ellipse key={i} cx={p.x} cy={p.y} rx={4 / width} ry={4 / height} fill={color} />
              ) : null;
          }
        })}
      </g>
    </svg>
  );
};

/** Measures an element so builders can be given the real frame aspect. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const useParams = (def: GeoGridDefinition): GeoParams =>
  useSyncExternalStore(geoGridParamsService.subscribe, () => geoGridParamsService.get(def));

interface OverlayProps {
  gridId: string;
  styleOptions?: Partial<GridStyleOptions>;
}

const Inner: React.FC<{ def: GeoGridDefinition } & Omit<OverlayProps, 'gridId'>> = ({ def, styleOptions = {} }) => {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const params = useParams(def);
  const aspect = h > 0 ? w / h : 1;
  const prims = useMemo(() => (w > 0 && h > 0 ? def.build(aspect, params) : []), [def, aspect, params, w, h]);
  if (styleOptions.isVisible === false) return null;
  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20"
      style={{ opacity: styleOptions.opacity ?? 0.75 }}
      data-testid="geo-grid-overlay"
    >
      {w > 0 && h > 0 && <GeoGridSvg prims={prims} width={w} height={h} style={styleOptions} />}
    </div>
  );
};

/** Live camera overlay for a geometry-engine grid. */
export const GeoGridOverlay: React.FC<OverlayProps> = ({ gridId, styleOptions }) => {
  const def = getGeoGrid(gridId);
  if (!def) return null;
  return <Inner def={def} styleOptions={styleOptions} />;
};

const DEFAULT_THUMB_ASPECT = 1;

/** Fixed-size thumbnail drawn from the same geometry as the live overlay. */
export const GeoGridThumb: React.FC<{ gridId: string; color?: string; size?: number }> = ({
  gridId,
  color = '#facc15',
  size = 72,
}) => {
  const def = getGeoGrid(gridId);
  const aspect = def?.previewAspect ?? DEFAULT_THUMB_ASPECT;
  const w = aspect >= 1 ? size : Math.round(size * aspect);
  const h = aspect >= 1 ? Math.round(size / aspect) : size;
  const prims = useMemo(() => (def ? def.build(aspect, withDefaultsFor(def)) : []), [def, aspect]);
  if (!def) return null;
  return (
    <GeoGridSvg prims={prims} width={w} height={h} style={{ color, strokeWidth: 1, showIntersectionNodes: true }} plain />
  );
};

const thumbParams = new Map<string, GeoParams>();
function withDefaultsFor(def: GeoGridDefinition): GeoParams {
  let p = thumbParams.get(def.id);
  if (!p) {
    p = withDefaults(def);
    thumbParams.set(def.id, p);
  }
  return p;
}
