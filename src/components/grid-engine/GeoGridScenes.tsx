import React from 'react';
import type { SceneKind } from '../../types/gridGeometry';

interface SceneProps {
  kind: SceneKind;
  /** 0..2: three deliberately different compositions per kind. */
  variant: number;
  w: number;
  h: number;
}

/**
 * Simple vector illustrations used as grid examples. They are drawn in the app (not photographs)
 * and each kind has three different compositions so the same picture is never reused.
 */
export const GeoGridScene: React.FC<SceneProps> = ({ kind, variant: v, w, h }) => {
  const X = (f: number) => f * w;
  const Y = (f: number) => f * h;
  const pick = <T,>(a: [T, T, T]): T => a[v % 3];

  const body = (() => {
    switch (kind) {
      case 'portrait': {
        const cx = pick([0.33, 0.5, 0.67]);
        const headY = pick([0.33, 0.4, 0.27]);
        const r = pick([0.1, 0.19, 0.085]) * Math.min(w, h * 0.8) * 1.1;
        return (
          <>
            <rect width={w} height={h} fill="#334155" />
            <ellipse cx={X(cx)} cy={Y(headY) + r * 3.6} rx={r * 2.4} ry={r * 2.6} fill="#64748b" />
            <ellipse cx={X(cx)} cy={Y(headY)} rx={r * 0.8} ry={r} fill="#cbd5e1" />
          </>
        );
      }
      case 'landscape': {
        const horizon = pick([0.33, 0.5, 0.66]);
        const sx = pick([0.7, 0.3, 0.5]);
        return (
          <>
            <rect width={w} height={Y(horizon)} fill="#7dd3fc" />
            <circle cx={X(sx)} cy={Y(horizon * 0.45)} r={Math.min(w, h) * 0.06} fill="#fde68a" />
            <polygon points={`${X(0)},${Y(horizon)} ${X(0.28)},${Y(horizon - 0.2)} ${X(0.55)},${Y(horizon)}`} fill="#64748b" />
            <polygon points={`${X(0.4)},${Y(horizon)} ${X(0.7)},${Y(horizon - 0.14)} ${X(1)},${Y(horizon)}`} fill="#94a3b8" />
            <rect y={Y(horizon)} width={w} height={h - Y(horizon)} fill="#4d7c0f" />
          </>
        );
      }
      case 'street': {
        const fx = pick([0.33, 0.5, 0.7]);
        return (
          <>
            <rect width={w} height={h} fill="#475569" />
            <rect x={0} y={0} width={X(0.28)} height={Y(0.85)} fill="#334155" />
            <rect x={X(0.72)} y={0} width={X(0.28)} height={Y(0.85)} fill="#1e293b" />
            <polygon points={`${X(0.28)},${Y(0.85)} ${X(0.72)},${Y(0.85)} ${X(0.56)},${Y(0.5)} ${X(0.44)},${Y(0.5)}`} fill="#52525b" />
            <rect x={X(fx) - w * 0.02} y={Y(0.5)} width={w * 0.04} height={Y(0.3)} fill="#fbbf24" />
            <circle cx={X(fx)} cy={Y(0.47)} r={w * 0.025} fill="#fde68a" />
          </>
        );
      }
      case 'architecture': {
        const rows = pick([5, 4, 7]);
        const cols = pick([4, 5, 2]);
        const cells: React.ReactNode[] = [];
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++)
            cells.push(<rect key={`${r}-${c}`} x={X(0.18 + (c * 0.64) / cols + 0.01)} y={Y(0.12 + (r * 0.7) / rows + 0.01)} width={(w * 0.64) / cols - w * 0.03} height={(h * 0.7) / rows - h * 0.03} fill="#e2e8f0" />);
        return (
          <>
            <rect width={w} height={h} fill="#0ea5e9" />
            <rect x={X(0.15)} y={Y(0.1)} width={X(0.7)} height={Y(0.85)} fill="#64748b" />
            {cells}
          </>
        );
      }
      case 'product': {
        const px = pick([0.35, 0.5, 0.65]);
        return (
          <>
            <rect width={w} height={h} fill="#e5e7eb" />
            <rect y={Y(0.62)} width={w} height={Y(0.38)} fill="#d6d3d1" />
            <rect x={X(px) - w * 0.1} y={Y(0.28)} width={w * 0.2} height={Y(0.46)} rx={w * 0.02} fill="#0f766e" />
            <rect x={X(px) - w * 0.04} y={Y(0.18)} width={w * 0.08} height={Y(0.12)} fill="#115e59" />
          </>
        );
      }
      case 'food': {
        const px = pick([0.5, 0.36, 0.62]);
        const py = pick([0.5, 0.4, 0.55]);
        const r = Math.min(w, h) * pick([0.34, 0.26, 0.3]);
        return (
          <>
            <rect width={w} height={h} fill="#78350f" />
            <circle cx={X(px)} cy={Y(py)} r={r} fill="#f5f5f4" />
            <circle cx={X(px)} cy={Y(py)} r={r * 0.65} fill="#fcd34d" />
            <circle cx={X(px) + r * 0.2} cy={Y(py) - r * 0.1} r={r * 0.2} fill="#dc2626" />
          </>
        );
      }
      case 'macro': {
        const cx = pick([0.5, 0.66, 0.35]);
        const cy = pick([0.5, 0.35, 0.65]);
        const r = Math.min(w, h) * pick([0.12, 0.09, 0.14]);
        const petals = Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <ellipse key={i} cx={X(cx) + Math.cos(a) * r * 1.7} cy={Y(cy) + Math.sin(a) * r * 1.7} rx={r * 1.2} ry={r * 0.6} transform={`rotate(${(a * 180) / Math.PI} ${X(cx) + Math.cos(a) * r * 1.7} ${Y(cy) + Math.sin(a) * r * 1.7})`} fill="#f9a8d4" />;
        });
        return (
          <>
            <rect width={w} height={h} fill="#14532d" />
            {petals}
            <circle cx={X(cx)} cy={Y(cy)} r={r} fill="#facc15" />
          </>
        );
      }
      default: {
        const o = pick([0, 0.15, -0.15]);
        return (
          <>
            <rect width={w} height={h} fill="#312e81" />
            <circle cx={X(0.35 + o)} cy={Y(0.4)} r={Math.min(w, h) * 0.18} fill="#f472b6" />
            <polygon points={`${X(0.6)},${Y(0.8)} ${X(0.85 + o / 2)},${Y(0.35)} ${X(0.95)},${Y(0.8)}`} fill="#38bdf8" />
          </>
        );
      }
    }
  })();

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${kind} example illustration ${v + 1}`}>
      {body}
    </svg>
  );
};
