import type { GeoGridDefinition, Prim, Pt } from '../../types/gridGeometry';
import { DOT, G1, G2, L, P, R, circle, crossAt, ellipse, gridLines, hlines, vlines } from '../../utils/gridGeometry/kit';
import { def } from './define';

/**
 * Section 16: original "pro shot" guides. Each one answers a concrete shooting problem (where does the hero go,
 * where does the light come from, how do the eyes travel) and mixes thirds / golden proportions with rings,
 * ellipses, triangles and dashed zones. Rings are true circles at any frame shape.
 */
const T = 1 / 3;
const TT = 2 / 3;
const thirds = (): Prim[] => gridLines(3, 3, 'minor');
const ring = (cx: number, cy: number, r: number, A: number): Prim => circle(cx, cy, r, A, 'dash');
const hero = (cx: number, cy: number, r: number, A: number): Prim => circle(cx, cy, r, A, 'accent');

/** Dashed segment between two ring centres, trimmed to the ring edges. */
const tie = (a: Pt, b: Pt, ra: number, rb: number, A: number): Prim => {
  const dx = (b[0] - a[0]) * A;
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ta = (ra * Math.min(1, A)) / len;
  const tb = (rb * Math.min(1, A)) / len;
  return L(a[0] + (b[0] - a[0]) * ta, a[1] + (b[1] - a[1]) * ta, b[0] - (b[0] - a[0]) * tb, b[1] - (b[1] - a[1]) * tb, 'dash');
};

/** Ellipse from frame-fraction radii (so it stretches with the frame like a zone, not a ring). */
const zone = (cx: number, cy: number, rxF: number, ryF: number, A: number, rot = 0, k?: 'dash' | 'accent' | 'minor'): Prim =>
  P(ellipse(cx, cy, rxF * A, ryF, A, rot, 64), true, k);

export const SECTION16: GeoGridDefinition[] = [
  // ---------------- food & drink ----------------
  def('Hero Dish Golden Triangle', 16, 'food', 'Golden-triangle diagonal with the hero dish ring where the two perpendiculars meet and a smaller ring for the garnish at the far corner.', (A) => {
    const foot: Pt = [0.5 - 0.5 * 0.5, 0.5 + 0.5 * 0.5];
    return [
      ...thirds(),
      L(0, 1, 1, 0, 'accent'),
      L(0, 0, foot[0], foot[1], 'dash'),
      L(1, 1, 1 - foot[0], 1 - foot[1], 'dash'),
      hero(foot[0], foot[1], 0.14, A),
      ring(0.8, 0.22, 0.07, A),
    ];
  }, { previewAspect: 0.85, scene: 'food' }),

  def('Drink and Dessert Diagonal Pair', 16, 'food', 'Two rings of different size on the golden diagonal: the dessert (large) on the lower φ node, the drink (small) on the upper φ node.', (A) => [
    ...thirds(),
    ring(G1, G2, 0.19, A),
    ring(G2, G1, 0.11, A),
    tie([G1, G2], [G2, G1], 0.19, 0.11, A),
    DOT(G1, G2),
    DOT(G2, G1),
  ], { previewAspect: 0.85, scene: 'food' }),

  def('Flat Lay Odd Trio', 16, 'food', 'Overhead layout for three items: a triangle of rings sized large, medium and small, with the largest nearest the centre of gravity.', (A) => [
    ...thirds(),
    hero(0.4, 0.58, 0.17, A),
    ring(0.72, 0.36, 0.12, A),
    ring(0.3, 0.2, 0.08, A),
    tie([0.4, 0.58], [0.72, 0.36], 0.17, 0.12, A),
    tie([0.4, 0.58], [0.3, 0.2], 0.17, 0.08, A),
    tie([0.72, 0.36], [0.3, 0.2], 0.12, 0.08, A),
  ], { previewAspect: 1, scene: 'food' }),

  def('Window Light Side Band', 16, 'food', 'A dashed light band along the left edge (window side), the hero on the right power point, and a shadow zone the plate throws to the lower right.', (A) => [
    ...thirds(),
    R(0.02, 0.04, 0.2, 0.92, 'dash'),
    L(0.22, 0.04, 0.22, 0.96, 'minor'),
    hero(TT, T + 0.08, 0.14, A),
    zone(0.78, 0.62, 0.14, 0.07, A, -20, 'dash'),
  ], { previewAspect: 0.85, scene: 'food' }),

  def('Menu Copy Space Frame', 16, 'food', 'Subject ring on the lower third with a large dashed copy-space box above it, safe for menu text and logos.', (A) => [
    ...thirds(),
    hero(0.5, TT + 0.02, 0.2, A),
    R(0.08, 0.06, 0.84, 0.3, 'dash'),
    L(0.08, 0.21, 0.92, 0.21, 'minor'),
  ], { previewAspect: 0.85, scene: 'food' }),

  // ---------------- portrait ----------------
  def('Eye Line and Chin Triangle', 16, 'portrait', 'Two eye rings on the upper third line and a chin marker on the centre axis; the small triangle between them is the face.', (A) => [
    ...thirds(),
    L(0.5, 0.05, 0.5, 0.95, 'minor'),
    ring(0.4, T, 0.05, A),
    ring(0.6, T, 0.05, A),
    P([[0.4, T], [0.6, T], [0.5, 0.52]], true, 'dash'),
    DOT(0.5, 0.52),
  ], { previewAspect: 0.75, scene: 'portrait' }),

  def('Environmental Portrait L Frame', 16, 'portrait', 'L-shaped frame (left edge plus lower edge) for context, the person in the upper-right box and a ring on the face.', (A) => [
    ...thirds(),
    P([[0.04, 0.04], [0.04, 0.96], [0.96, 0.96]], false, 'accent'),
    R(0.5, 0.08, 0.42, 0.74, 'dash'),
    hero(0.71, 0.26, 0.11, A),
  ], { previewAspect: 0.75, scene: 'portrait' }),

  // ---------------- landscape / street / architecture ----------------
  def('Horizon Golden Band', 16, 'landscape', 'Horizon on the upper golden line (38.2%), the sun or main peak ring on the right φ line, and a dashed foreground band below.', (A) => [
    L(0, G1, 1, G1, 'accent'),
    L(G2, 0, G2, 1, 'minor'),
    ring(G2, G1 - 0.1, 0.09, A),
    R(0.03, 0.78, 0.94, 0.18, 'dash'),
    DOT(G2, G1),
  ], { previewAspect: 0.9, scene: 'landscape' }),

  def('Funnel Leading Lines', 16, 'street', 'Lines funnel from the lower corners to a vanishing ring on the right-third upper power point; the subject walks the funnel.', (A) => [
    ...thirds(),
    L(0, 1, TT, T, 'accent'),
    L(1, 1, TT, T, 'accent'),
    L(0.35, 1, TT, T, 'minor'),
    L(0.78, 1, TT, T, 'minor'),
    hero(TT, T, 0.07, A),
  ], { previewAspect: 0.8, scene: 'street' }),

  def('Corner Perspective Diamond', 16, 'architecture', 'Diamond whose top point sits on the upper-third centre and bottom point on the lower third; use it to square up a corner or a hallway.', (A) => [
    ...thirds(),
    P([[0.5, T], [0.86, 0.5], [0.5, TT], [0.14, 0.5]], true, 'accent'),
    L(0.5, 0, 0.5, 1, 'dash'),
    ring(0.5, 0.5, 0.06, A),
  ], { previewAspect: 0.85, scene: 'architecture' }),

  // ---------------- product / macro / creative ----------------
  def('Product Pedestal Ellipse', 16, 'product', 'Base ellipse for the pedestal, a box for the product above it and a dashed shadow zone to one side; centred and ready for e-commerce.', (A) => [
    ...crossAt(0.5, 0.5, 'minor'),
    zone(0.5, 0.78, 0.3, 0.07, A, 0, 'accent'),
    R(0.36, 0.28, 0.28, 0.5, 'accent'),
    zone(0.74, 0.8, 0.12, 0.04, A, 0, 'dash'),
  ], { previewAspect: 1, scene: 'product' }),

  def('Macro Focus Cross Ring', 16, 'macro', 'Focus ring on the near power point with crosshair ticks inside it and a dashed depth ring around; pull focus to the centre dot.', (A) => [
    ...thirds(),
    hero(TT, TT, 0.1, A),
    ring(TT, TT, 0.22, A),
    L(TT - 0.06, TT, TT + 0.06, TT),
    L(TT, TT - 0.06, TT, TT + 0.06),
    DOT(TT, TT),
  ], { previewAspect: 1, scene: 'macro' }),

  def('Fibonacci Rings', 16, 'creative', 'Rings whose radii follow the Fibonacci ratio, stepping from a large ring at the lower left up to a small one at the upper right.', (A) => {
    const radii = [0.21, 0.13, 0.08, 0.05];
    const pts: Pt[] = [[0.28, 0.68], [0.56, 0.5], [0.74, 0.34], [0.85, 0.24]];
    return [
      ...gridLines(2, 2, 'minor'),
      ...pts.map((p, i) => ring(p[0], p[1], radii[i], A)),
      P(pts, false, 'minor'),
    ];
  }, { previewAspect: 1, scene: 'abstract' }),

  def('Mirror Axis Rings', 16, 'creative', 'Vertical mirror axis with matching rings and dashed zones on both sides, for reflections, symmetry and twin subjects.', (A) => [
    L(0.5, 0, 0.5, 1, 'accent'),
    ...hlines([T, TT], 'minor'),
    ring(0.25, 0.4, 0.13, A),
    ring(0.75, 0.4, 0.13, A),
    R(0.1, 0.68, 0.3, 0.22, 'dash'),
    R(0.6, 0.68, 0.3, 0.22, 'dash'),
    ...vlines([0.25, 0.75], 'minor'),
  ], { previewAspect: 1, scene: 'abstract' }),
];
