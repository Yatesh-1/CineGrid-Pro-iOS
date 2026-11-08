import type { Prim, Pt, StrokeKind } from '../../types/gridGeometry';

export const PHI = (1 + Math.sqrt(5)) / 2;
export const G1 = 1 - 1 / PHI; // 0.382
export const G2 = 1 / PHI; // 0.618

// ---------- primitive constructors ----------
export const L = (x1: number, y1: number, x2: number, y2: number, k?: StrokeKind): Prim => ({
  t: 'l',
  x1,
  y1,
  x2,
  y2,
  k,
});
export const R = (x: number, y: number, w: number, h: number, k?: StrokeKind): Prim => ({
  t: 'r',
  x,
  y,
  w,
  h,
  k,
});
export const P = (pts: Pt[], closed = false, k?: StrokeKind): Prim => ({ t: 'p', pts, closed, k });
export const DOT = (x: number, y: number): Prim => ({ t: 'dot', x, y });
export const DIM = (x: number, y: number, w: number, h: number): Prim => ({ t: 'dim', x, y, w, h });

export const vlines = (xs: number[], k?: StrokeKind): Prim[] => xs.map((x) => L(x, 0, x, 1, k));
export const hlines = (ys: number[], k?: StrokeKind): Prim[] => ys.map((y) => L(0, y, 1, y, k));
const evenly = (n: number): number[] => Array.from({ length: n - 1 }, (_, i) => (i + 1) / n);

/** cols × rows division lines (no outer border). */
export const gridLines = (cols: number, rows: number, k?: StrokeKind): Prim[] => [
  ...vlines(evenly(cols), k),
  ...hlines(evenly(rows), k),
];

/** Intersections of a cols × rows grid, as node dots. */
export const gridDots = (cols: number, rows: number): Prim[] => {
  const out: Prim[] = [];
  for (const x of evenly(cols)) for (const y of evenly(rows)) out.push(DOT(x, y));
  return out;
};

// ---------- true-shape helpers (aspect aware) ----------
/** Ellipse sampled as a polygon. Radii are in frame-height units, so with `A` it is a true circle. */
export function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  A: number,
  rotDeg = 0,
  n = 56
): Pt[] {
  const rot = (rotDeg * Math.PI) / 180;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ex = rx * Math.cos(a);
    const ey = ry * Math.sin(a);
    const x = ex * Math.cos(rot) - ey * Math.sin(rot);
    const y = ex * Math.sin(rot) + ey * Math.cos(rot);
    pts.push([cx + x / A, cy + y]);
  }
  return pts;
}

/** True circle; `r` is a fraction of the shorter frame side. */
export const circle = (cx: number, cy: number, r: number, A: number, k?: StrokeKind): Prim =>
  P(ellipse(cx, cy, r * Math.min(1, A), r * Math.min(1, A), A), true, k);

/** Regular polygon outline, radius in frame-height units. */
export function regularPoly(cx: number, cy: number, r: number, n: number, A: number, rotDeg = -90): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rotDeg + (360 / n) * i) * Math.PI) / 180;
    pts.push([cx + (r * Math.cos(a)) / A, cy + r * Math.sin(a)]);
  }
  return pts;
}

/** Largest rect of a given aspect ratio that fits the frame, centred; `s` scales it. */
export function fitRect(ratio: number, A: number, s = 1, cx = 0.5, cy = 0.5) {
  let w: number;
  let h: number;
  if (ratio >= A) {
    w = 1;
    h = A / ratio;
  } else {
    h = 1;
    w = ratio / A;
  }
  w *= s;
  h *= s;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Crop guide: dims outside the rect and outlines it. */
export function cropGuide(ratio: number, A: number, s = 1): Prim[] {
  const r = fitRect(ratio, A, s);
  return [DIM(r.x, r.y, r.w, r.h), R(r.x, r.y, r.w, r.h, 'accent')];
}

/** Same ratio, oriented to match the frame (landscape frame → landscape print, etc.). */
export const orient = (ratio: number, A: number): number => (A >= 1 ? Math.max(ratio, 1 / ratio) : Math.min(ratio, 1 / ratio));

export const crossAt = (x: number, y: number, k?: StrokeKind): Prim[] => [L(x, 0, x, 1, k), L(0, y, 1, y, k)];

/** Rays from a vanishing point to evenly spaced points around the frame border. */
export function rays(vx: number, vy: number, n: number, k?: StrokeKind): Prim[] {
  const out: Prim[] = [];
  const per = 4;
  for (let i = 0; i < n; i++) {
    const u = (i / n) * per; // walk the perimeter
    const side = Math.floor(u);
    const f = u - side;
    const [ex, ey]: Pt = side === 0 ? [f, 0] : side === 1 ? [1, f] : side === 2 ? [1 - f, 1] : [0, 1 - f];
    out.push(L(vx, vy, ex, ey, k));
  }
  return out;
}

/** Line from a vanishing point through a frame-edge anchor, extended to leave the frame. */
export const rayThrough = (vx: number, vy: number, ax: number, ay: number, k?: StrokeKind): Prim =>
  L(vx, vy, vx + (ax - vx) * 4, vy + (ay - vy) * 4, k);

// ---------- golden / Fibonacci construction ----------
interface SpiralBuild {
  squares: { x: number; y: number; s: number }[];
  path: Pt[];
  eye: Pt;
}

/**
 * Spiral in a (ratio × 1) rectangle. Squares are peeled off in the order left, bottom,
 * right, top; each contributes a quarter arc, so arcs join end to start.
 * Returned coordinates are normalised to the unit frame.
 */
export function spiralBuild(ratio: number, steps: number): SpiralBuild {
  let x = 0;
  let y = 0;
  let w = ratio;
  let h = 1;
  const squares: SpiralBuild['squares'] = [];
  const path: Pt[] = [];

  const arc = (cx: number, cy: number, sx: number, sy: number, ex: number, ey: number) => {
    const a0 = Math.atan2(sy - cy, sx - cx);
    let d = Math.atan2(ey - cy, ex - cx) - a0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d <= -Math.PI) d += Math.PI * 2;
    const r = Math.hypot(sx - cx, sy - cy);
    for (let i = 0; i <= 20; i++) {
      const a = a0 + (d * i) / 20;
      path.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };

  for (let i = 0; i < steps; i++) {
    const side = i % 4;
    const s = side % 2 === 0 ? h : w;
    if (s < 1e-4) break;
    if (side === 0) {
      squares.push({ x, y, s });
      arc(x, y + s, x, y, x + s, y + s);
      x += s;
      w -= s;
    } else if (side === 1) {
      squares.push({ x, y: y + h - s, s });
      arc(x + s, y + h, x, y + h, x + s, y + h - s);
      h -= s;
    } else if (side === 2) {
      squares.push({ x: x + w - s, y, s });
      arc(x + w, y, x + w, y + s, x + w - s, y);
      w -= s;
    } else {
      squares.push({ x, y, s });
      arc(x, y, x + s, y, x, y + s);
      y += s;
      h -= s;
    }
  }
  const norm = (p: Pt): Pt => [p[0] / ratio, p[1]];
  return {
    squares: squares.map((q) => ({ x: q.x / ratio, y: q.y, s: q.s })),
    path: path.map(norm),
    eye: norm(path[path.length - 1]),
  };
}

type Mat = (p: Pt) => Pt;
// Rotations keep handedness (clockwise stays clockwise); reflections flip it.
const ROTATIONS: Mat[] = [
  ([x, y]) => [x, y],
  ([x, y]) => [1 - y, x],
  ([x, y]) => [1 - x, 1 - y],
  ([x, y]) => [y, 1 - x],
];
const REFLECTIONS: Mat[] = [
  ([x, y]) => [1 - x, y],
  ([x, y]) => [x, 1 - y],
  ([x, y]) => [y, x],
  ([x, y]) => [1 - y, 1 - x],
];

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** Spiral whose eye sits in the requested quadrant, winding clockwise or counter-clockwise on screen. */
export function spiralPrims(
  corner: Corner,
  dir: 'cw' | 'ccw',
  ratio = PHI,
  steps = 9,
  showSquares = false
): Prim[] {
  const base = spiralBuild(ratio, steps);
  const want = (p: Pt): Corner => `${p[1] < 0.5 ? 't' : 'b'}${p[0] < 0.5 ? 'l' : 'r'}` as Corner;
  const candidates = dir === 'cw' ? ROTATIONS : REFLECTIONS;
  const tf = candidates.find((m) => want(m(base.eye)) === corner) ?? candidates[0];
  const out: Prim[] = [P(base.path.map(tf), false, 'accent')];
  if (showSquares) {
    for (const q of base.squares) {
      const c = [tf([q.x, q.y]), tf([q.x + q.s / ratio, q.y + q.s])];
      out.push(
        R(Math.min(c[0][0], c[1][0]), Math.min(c[0][1], c[1][1]), Math.abs(c[1][0] - c[0][0]), Math.abs(c[1][1] - c[0][1]), 'minor')
      );
    }
  }
  const e = tf(base.eye);
  out.push(DOT(e[0], e[1]));
  return out;
}

/** Axis-aligned squares that tile a (ratio × 1) rectangle fitted to the frame. */
export function squareTiling(ratio: number, A: number, steps: number): Prim[] {
  const r = fitRect(ratio, A);
  const b = spiralBuild(ratio, steps);
  const out: Prim[] = [R(r.x, r.y, r.w, r.h, 'accent')];
  for (const q of b.squares) {
    out.push(R(r.x + q.x * r.w, r.y + q.y * r.h, (q.s / ratio) * r.w, q.s * r.h, 'minor'));
  }
  return out;
}

// ---------- perpendicular / diagonal armatures ----------
/** Foot of the perpendicular from point p to the line a–b, computed in true (aspect-scaled) space. */
export function perpFoot(p: Pt, a: Pt, b: Pt, A: number): Pt {
  const ax = a[0] * A;
  const bx = b[0] * A;
  const px = p[0] * A;
  const dx = bx - ax;
  const dy = b[1] - a[1];
  const t = ((px - ax) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return [(ax + t * dx) / A, a[1] + t * dy];
}

/** Rect with all four corners → perpendicular onto the opposite diagonals (harmonic armature). */
export function armature(x: number, y: number, w: number, h: number, A: number): Prim[] {
  const tl: Pt = [x, y];
  const tr: Pt = [x + w, y];
  const bl: Pt = [x, y + h];
  const br: Pt = [x + w, y + h];
  const out: Prim[] = [R(x, y, w, h), L(tl[0], tl[1], br[0], br[1]), L(tr[0], tr[1], bl[0], bl[1])];
  const reciprocals: [Pt, Pt, Pt][] = [
    [tr, tl, br],
    [bl, tl, br],
    [tl, tr, bl],
    [br, tr, bl],
  ];
  for (const [corner, a, b] of reciprocals) {
    const f = perpFoot(corner, a, b, A);
    out.push(L(corner[0], corner[1], f[0], f[1], 'minor'));
  }
  return out;
}

// ---------- human figure guides ----------
/**
 * Simplified figure outline. `head` is head height as a fraction of frame height; the body
 * follows classic 7.5-head proportions and is cut off at `cropY` (frame fraction).
 */
export function person(cx: number, top: number, head: number, A: number, cropY: number, facing: 'front' | 'left' | 'right' = 'front'): Prim[] {
  const hw = head * 0.4; // head half-width, height units
  const out: Prim[] = [];
  const headCy = top + head / 2;
  const turn = facing === 'front' ? 0 : facing === 'left' ? -1 : 1;
  out.push(P(ellipse(cx + (turn * head * 0.08) / A, headCy, hw * (turn ? 0.85 : 1), head / 2, A), true));
  // right side outline in head units: [x offset from axis, y from top of head]
  const side: [number, number][] = [
    [0.3, 0.98],
    [0.36, 1.2],
    [1.3, 1.5],
    [1.4, 3.0],
    [1.1, 3.9],
    [0.95, 5.6],
    [0.75, 7.5],
  ];
  const clipped = (sgn: number): Pt[] => {
    const pts: Pt[] = [];
    let prev: Pt | null = null; // [x offset in heads, absolute y]
    for (const [ox, oy] of side) {
      const y = top + oy * head;
      if (y > cropY) {
        if (prev) {
          const f = (cropY - prev[1]) / (y - prev[1]);
          const x = prev[0] + (ox - prev[0]) * f;
          pts.push([cx + (sgn * x * head) / A, cropY]);
        }
        break;
      }
      pts.push([cx + (sgn * ox * head) / A, y]);
      prev = [ox, y];
    }
    return pts;
  };  out.push(P(clipped(1)), P(clipped(-1)));
  return out;
}

// ---------- dihedral / misc ----------
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function wave(amp: number, cycles: number, y0: number, x0 = 0, x1 = 1, n = 60): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([lerp(x0, x1, t), y0 + amp * Math.sin(t * Math.PI * 2 * cycles)]);
  }
  return pts;
}
