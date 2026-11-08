import type { GeoGridDefinition, GridAlias } from '../../types/gridGeometry';
import {
  DIM,
  DOT,
  G1,
  G2,
  L,
  P,
  PHI,
  R,
  perpFoot,
  armature,
  circle,
  crossAt,
  ellipse,
  fitRect,
  gridDots,
  gridLines,
  hlines,
  lerp,
  regularPoly,
  spiralPrims,
  squareTiling,
  vlines,
} from '../../utils/gridGeometry/kit';
import type { Pt } from '../../types/gridGeometry';
import { alias, def } from './define';

// ---------------- SECTION 1: BASIC ----------------
export const SECTION1_ALIASES: GridAlias[] = [
  alias('Rule of Thirds', 1, 'rule_of_thirds'),
  alias('Nine Section Grid', 1, 'rule_of_thirds'),
  alias('Sixteen Section Grid', 1, 'grid_4x4'),
  alias('Twenty-Five Section Grid', 1, 'grid_5x5'),
  alias('Thirty-Six Section Grid', 1, 'grid_6x6'),
  alias('Sixty-Four Section Grid', 1, 'grid_8x8'),
  alias('Hundred Section Grid', 1, 'grid_10x10'),
  alias('Crosshair Center Grid', 1, 'center_crosshair'),
  alias('Center Symmetry Grid', 1, 'center_symmetry'),
];

export const SECTION1: GeoGridDefinition[] = [
  def('Center Composition', 1, 'basic', 'Subject box on the exact centre with centring lines; for bold, static, frontal subjects.', () => [...crossAt(0.5, 0.5, 'minor'), R(0.33, 0.33, 0.34, 0.34, 'accent'), DOT(0.5, 0.5)]),
  def('Four Quadrant Grid', 1, 'basic', 'Frame split into four equal quadrants by one vertical and one horizontal line.', () => [...gridLines(2, 2), DOT(0.5, 0.5)]),
  def('Six Section Grid', 1, 'basic', 'Three columns by two rows: six equal sections for horizon-and-subject layouts.', () => gridLines(3, 2)),
  def('Twelve Section Grid', 1, 'basic', 'Four columns by three rows: twelve cells for layered scenes.', () => [...gridLines(4, 3), ...gridDots(4, 3)]),
  def('Forty-Nine Section Grid', 1, 'basic', 'Seven by seven matrix with an odd centre cell for precise placement.', () => gridLines(7, 7)),
  def('Eighty-One Section Grid', 1, 'basic', 'Nine by nine matrix: fine alignment for copy work and architecture.', () => gridLines(9, 9)),
  def('Vertical Division Grid', 1, 'basic', 'Six vertical columns with no horizontal lines; checks verticals and subject spacing.', () => vlines([1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6])),
  def('Horizontal Division Grid', 1, 'basic', 'Six horizontal bands with no vertical lines; checks horizons and layers.', () => hlines([1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6])),
  def('Double Crosshair Grid', 1, 'basic', 'Two crosshairs at one-quarter and three-quarter width for paired subjects.', (A) => [
    ...[0.25, 0.75].flatMap((x) => [L(x, 0.4, x, 0.6, 'accent'), L(x - 0.06 / A, 0.5, x + 0.06 / A, 0.5, 'accent'), circle(x, 0.5, 0.12, A, 'minor')]),
    L(0.5, 0, 0.5, 1, 'minor'),
  ]),
  def('Off-Center Composition Grid', 1, 'basic', 'Subject target on the left golden line, leaving the right 62% as deliberate space.', (A) => [
    L(G1, 0, G1, 1),
    L(0, 0.5, 1, 0.5, 'minor'),
    circle(G1, 0.5, 0.12, A, 'accent'),
    DIM(G1 + 0.02, 0.04, 0.96 - G1 - 0.02, 0.92),
    DOT(G1, 0.5),
  ]),
  def('Balanced Composition Grid', 1, 'basic', 'Two weights either side of a central fulcrum; a small near object balances a larger far one.', (A) => [
    L(0.5, 0, 0.5, 1, 'minor'),
    P([[0.5, 0.86], [0.5 - 0.05 / A, 0.94], [0.5 + 0.05 / A, 0.94]], true),
    L(0.1, 0.5, 0.9, 0.5, 'minor'),
    circle(0.25, 0.5, 0.2, A, 'accent'),
    circle(0.75, 0.5, 0.1, A, 'accent'),
  ]),
];

// ---------------- SECTION 2: GOLDEN ----------------
export const SECTION2_ALIASES: GridAlias[] = [
  alias('Golden Ratio Grid', 2, 'golden_ratio'),
  alias('Golden Spiral Clockwise', 2, 'golden_spiral'),
  alias('Fibonacci Spiral', 2, 'fibonacci_spiral'),
  alias('Golden Triangle', 2, 'golden_triangles'),
];

/** Golden-triangle armature: one diagonal plus perpendiculars dropped from the named corners. */
const triangle = (A: number, variant: 'inverted' | 'left' | 'right') => {
  const tl: Pt = [0, 0];
  const tr: Pt = [1, 0];
  const bl: Pt = [0, 1];
  const br: Pt = [1, 1];
  const build = (a: Pt, b: Pt, corners: Pt[]) => [
    L(a[0], a[1], b[0], b[1], 'accent'),
    ...corners.map((c) => {
      const f = perpFoot(c, a, b, A);
      return L(c[0], c[1], f[0], f[1]);
    }),
  ];
  if (variant === 'inverted') return build(tr, bl, [tl, br]);
  if (variant === 'left') return build(tl, br, [bl]);
  return build(bl, tr, [br]);
};
export const SECTION2: GeoGridDefinition[] = [
  def('Golden Rectangle', 2, 'golden', 'A 1:1.618 rectangle fitted to the frame and subdivided into the squares that generate the spiral.', (A) => squareTiling(PHI, A, 7), { previewAspect: 1.4 }),
  def('Golden Spiral Counterclockwise', 2, 'golden', 'Golden spiral winding counter-clockwise into an eye in the upper left.', () => spiralPrims('tl', 'ccw')),
  def('Golden Spiral Top-Left', 2, 'golden', 'Golden spiral whose eye sits in the top-left quadrant.', () => spiralPrims('tl', 'cw')),
  def('Golden Spiral Top-Right', 2, 'golden', 'Golden spiral whose eye sits in the top-right quadrant.', () => spiralPrims('tr', 'cw')),
  def('Golden Spiral Bottom-Left', 2, 'golden', 'Golden spiral whose eye sits in the bottom-left quadrant.', () => spiralPrims('bl', 'cw')),
  def('Golden Spiral Bottom-Right', 2, 'golden', 'Golden spiral whose eye sits in the bottom-right quadrant.', () => spiralPrims('br', 'cw')),
  def('Fibonacci Rectangle', 2, 'golden', 'Nested Fibonacci rectangles (1×1, 1×2, 2×3, 3×5, 5×8, 8×13) sharing one corner.', (A) => {
    const r = fitRect(13 / 8, A);
    const out = [R(r.x, r.y, r.w, r.h, 'accent')];
    const seq: [number, number][] = [[1, 1], [1, 2], [2, 3], [3, 5], [5, 8]];
    for (const [a, b] of seq) out.push(R(r.x, r.y + r.h - (a / 8) * r.h, (b / 13) * r.w, (a / 8) * r.h, 'minor'));
    return out;
  }, { previewAspect: 1.4 }),
  def('Fibonacci Square Sequence', 2, 'golden', 'Squares of side 8, 5, 3, 2, 1, 1 tiling a 13:8 rectangle, with each square’s centre marked.', (A) => {
    const out = squareTiling(13 / 8, A, 6);
    const r = fitRect(13 / 8, A);
    out.push(DOT(r.x + r.w * (4 / 13), r.y + r.h * 0.5));
    return out;
  }, { previewAspect: 1.4 }),
  def('Golden Section Vertical', 2, 'golden', 'Two vertical lines at 38.2% and 61.8% only; for subjects that divide the frame left and right.', () => [...vlines([G1, G2]), DOT(G1, 0.5), DOT(G2, 0.5)]),
  def('Golden Section Horizontal', 2, 'golden', 'Two horizontal lines at 38.2% and 61.8% only; for horizons and layered scenes.', () => [...hlines([G1, G2]), DOT(0.5, G1), DOT(0.5, G2)]),
  def('Golden Ratio Portrait', 2, 'golden', 'Golden grid tuned for portraits: eye line on the 38.2% line and a face oval on the upper power point.', (A) => [
    ...vlines([G1, G2], 'minor'),
    ...hlines([G1, G2], 'minor'),
    L(0, G1, 1, G1, 'accent'),
    P(ellipse(0.5, G1 - 0.02, 0.16, 0.21, A), true, 'accent'),
  ], { previewAspect: 0.75, scene: 'portrait' }),
  def('Golden Ratio Landscape', 2, 'golden', 'Golden grid for landscapes: horizon on the 61.8% line with sky 38.2% / land 61.8% ticks.', () => [
    ...vlines([G1, G2], 'minor'),
    L(0, G2, 1, G2, 'accent'),
    L(0, G1, 1, G1, 'minor'),
    DOT(G1, G1),
    DOT(G2, G1),
    DOT(G1, G2),
    DOT(G2, G2),
  ], { previewAspect: 1.4, scene: 'landscape' }),
  def('Golden Triangle Inverted', 2, 'golden', 'Golden triangle armature on the rising diagonal (bottom-left to top-right) with perpendiculars from the other two corners.', (A) => triangle(A, 'inverted')),
  def('Golden Triangle Left', 2, 'golden', 'Diagonal from top-left to bottom-right with one perpendicular from the bottom-left corner; weights the left half.', (A) => triangle(A, 'left')),
  def('Golden Triangle Right', 2, 'golden', 'Diagonal from bottom-left to top-right with one perpendicular from the bottom-right corner; weights the right half.', (A) => triangle(A, 'right')),
  def('Reciprocal Golden Spiral', 2, 'golden', 'Two interlocking spirals, one clockwise from the top left and one counter-clockwise from the bottom right.', () => [...spiralPrims('tl', 'cw'), ...spiralPrims('br', 'cw').map((p) => ({ ...p, k: 'dash' as const }))]),
];

// ---------------- SECTION 3: ADVANCED ----------------
export const SECTION3_ALIASES: GridAlias[] = [
  alias('Dynamic Symmetry', 3, 'dynamic_symmetry'),
  alias('Diagonal Grid', 3, 'diagonal_composition'),
  alias('Radial Geometric Grid', 3, 'radial_composition'),
];

/** Root-N rectangle (width = √N × height) fitted to the frame, with its harmonic armature. */
const rootArmature = (n: number, A: number) => {
  const r = fitRect(Math.sqrt(n), A);
  const out = armature(r.x, r.y, r.w, r.h, A);
  // Verticals through where reciprocals cross the opposite diagonals divide the rectangle harmonically.
  const xs = [1 / Math.sqrt(n), 1 - 1 / Math.sqrt(n)];
  for (const f of xs) out.push(L(r.x + r.w * f, r.y, r.x + r.w * f, r.y + r.h, 'minor'));
  return out;
};

/**
 * Root-rectangle construction. Swinging the diagonal of the √(k-1) rectangle onto the base
 * gives the √k rectangle. `from..to` selects which steps are drawn.
 */
const rootConstruction = (from: number, to: number, A: number) => {
  const r = fitRect(Math.sqrt(to), A, 0.94);
  const u = r.h; // one unit, in frame-height units
  const ox = r.x;
  const oy = r.y + r.h;
  const X = (px: number) => ox + (px * u) / A;
  const Y = (py: number) => oy - py * u;
  const out = [R(X(0), Y(1), X(1) - X(0), u, 'accent')]; // unit square
  for (let k = Math.max(2, from); k <= to; k++) {
    const prev = Math.sqrt(k - 1);
    const w = Math.sqrt(k);
    out.push(R(X(0), Y(1), X(w) - X(0), u, k === to ? 'accent' : 'minor'));
    out.push(L(X(0), Y(0), X(prev), Y(1), 'minor')); // the diagonal being swung
    const pts: Pt[] = [];
    const a0 = Math.atan2(1, prev);
    for (let i = 0; i <= 14; i++) {
      const a = lerp(a0, 0, i / 14);
      pts.push([X(w * Math.cos(a)), Y(w * Math.sin(a))]);
    }
    out.push(P(pts, false, 'minor'));
  }
  return out;
};
export const SECTION3: GeoGridDefinition[] = [
  def('Dynamic Symmetry Root 2', 3, 'advanced', 'Harmonic armature of a √2 (1:1.414) rectangle: diagonals, reciprocals and root divisions.', (A) => rootArmature(2, A), { previewAspect: 1.4 }),
  def('Dynamic Symmetry Root 3', 3, 'advanced', 'Harmonic armature of a √3 (1:1.732) rectangle.', (A) => rootArmature(3, A), { previewAspect: 1.4 }),
  def('Dynamic Symmetry Root 5', 3, 'advanced', 'Harmonic armature of a √5 (1:2.236) rectangle, a wide cinematic proportion.', (A) => rootArmature(5, A), { previewAspect: 1.4 }),
  def('Double Diagonal Grid', 3, 'advanced', 'Both corner-to-corner diagonals crossing at the centre.', () => [L(0, 0, 1, 1), L(1, 0, 0, 1), DOT(0.5, 0.5)]),
  def('Multiple Diagonal Grid', 3, 'advanced', 'Parallel 45° bands crossing the frame in both directions.', (A) => {
    const out = [];
    for (let i = -4; i <= 4; i++) {
      const o = i * 0.25;
      out.push(L(o, 0, o + 1 / A, 1, 'minor'), L(o + 1 / A, 0, o, 1, 'minor'));
    }
    return out;
  }),
  def('Reciprocal Diagonal Grid', 3, 'advanced', 'Diagonals plus all four reciprocal perpendiculars: the full baroque and sinister armature.', (A) => armature(0, 0, 1, 1, A)),
  def('Root Rectangle Grid', 3, 'advanced', 'Nested rectangles of width √1, √2, √3, √4 and √5, built by swinging each diagonal onto the base.', (A) => rootConstruction(1, 5, A), { previewAspect: 1.4 }),
  def('Root 2 Rectangle', 3, 'advanced', 'A unit square and the √2 rectangle formed by swinging its diagonal onto the base.', (A) => rootConstruction(2, 2, A), { previewAspect: 1.4 }),
  def('Root 3 Rectangle', 3, 'advanced', 'The √3 rectangle built from the √2 rectangle’s diagonal.', (A) => rootConstruction(3, 3, A), { previewAspect: 1.4 }),
  def('Root 5 Rectangle', 3, 'advanced', 'The √5 rectangle: the root family that contains the golden ratio.', (A) => rootConstruction(5, 5, A), { previewAspect: 1.4 }),
  def('Triangle Composition Grid', 3, 'advanced', 'Upright triangle with its apex at top centre: stable, grounded subject groups.', (A) => [P([[0.5, 0.08], [0.08, 0.92], [0.92, 0.92]], true, 'accent'), L(0.5, 0.08, 0.5, 0.92, 'minor'), DOT(0.5, 0.08), circle(0.5, 0.64, 0.1, A, 'minor')]),
  def('Inverted Triangle Grid', 3, 'advanced', 'Downward-pointing triangle: tension and dynamism, subject at the lower apex.', () => [P([[0.08, 0.1], [0.92, 0.1], [0.5, 0.92]], true, 'accent'), L(0.5, 0.1, 0.5, 0.92, 'minor'), DOT(0.5, 0.92)]),
  def('Double Triangle Grid', 3, 'advanced', 'Two triangles side by side sharing a base, for paired subjects.', () => [
    P([[0.25, 0.1], [0.02, 0.92], [0.5, 0.92]], true, 'accent'),
    P([[0.75, 0.1], [0.5, 0.92], [0.98, 0.92]], true, 'accent'),
    DOT(0.25, 0.1),
    DOT(0.75, 0.1),
  ]),
  def('Diamond Composition Grid', 3, 'advanced', 'A true square turned 45° with a concentric inner diamond; guides centred, symmetrical subjects.', (A) => {
    const r = 0.46;
    return [P(regularPoly(0.5, 0.5, r, 4, A), true, 'accent'), P(regularPoly(0.5, 0.5, r / 2, 4, A), true, 'minor'), L(0.5, 0.04, 0.5, 0.96, 'minor'), DOT(0.5, 0.5)];
  }),
  def('Rhombus Composition Grid', 3, 'advanced', 'A 60°/120° rhombus standing on its point, leading the eye along its long diagonal.', (A) => {
    const a = 0.46; // half long-diagonal, frame-height units
    const b = a * Math.tan(Math.PI / 6); // half short-diagonal for a 60° apex
    return [P([[0.5, 0.5 - a], [0.5 + b / A, 0.5], [0.5, 0.5 + a], [0.5 - b / A, 0.5]], true, 'accent'), L(0.5, 0.5 - a, 0.5, 0.5 + a, 'minor'), DOT(0.5, 0.5)];
  }),  def('Hexagonal Composition Grid', 3, 'advanced', 'Regular hexagon with its three long diagonals; for radial, repeating subjects.', (A) => {
    const pts = regularPoly(0.5, 0.5, 0.44, 6, A, 0);
    return [P(pts, true, 'accent'), L(pts[0][0], pts[0][1], pts[3][0], pts[3][1], 'minor'), L(pts[1][0], pts[1][1], pts[4][0], pts[4][1], 'minor'), L(pts[2][0], pts[2][1], pts[5][0], pts[5][1], 'minor'), DOT(0.5, 0.5)];
  }),
  def('Octagonal Composition Grid', 3, 'advanced', 'Regular octagon with its four diagonals; eight-fold balance around the centre.', (A) => {
    const pts = regularPoly(0.5, 0.5, 0.44, 8, A, -22.5);
    return [P(pts, true, 'accent'), ...[0, 1, 2, 3].map((i) => L(pts[i][0], pts[i][1], pts[i + 4][0], pts[i + 4][1], 'minor')), DOT(0.5, 0.5)];
  }),
];
