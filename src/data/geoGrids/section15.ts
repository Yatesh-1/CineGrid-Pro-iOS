import type { GeoGridDefinition, Prim, Pt } from '../../types/gridGeometry';
import { DOT, L, P, R, TXT, circle, crossAt, ellipse, gridLines, hlines, vlines } from '../../utils/gridGeometry/kit';
import { def } from './define';

/**
 * Section 15: "Shot guide" overlays in the style of cafe / food photo-tutorial screenshots:
 * a thirds grid with dashed focus circles, ellipses, chevrons, diamonds, triangles and boxes
 * marking where the hero subjects should sit. Several variants per category (food, portrait,
 * landscape, street, architecture, product, macro, creative).
 */
const T = 1 / 3;
const TT = 2 / 3;
const thirds = (): Prim[] => gridLines(3, 3, 'minor');

/** Dashed true circle (r = fraction of the shorter side). */
const dc = (cx: number, cy: number, r: number, A: number): Prim => circle(cx, cy, r, A, 'dash');
/** Solid circle. */
const sc = (cx: number, cy: number, r: number, A: number): Prim => circle(cx, cy, r, A, 'accent');
/** Dashed straight segment. */
const dl = (x1: number, y1: number, x2: number, y2: number): Prim => L(x1, y1, x2, y2, 'dash');

/** Arc sampled as a polyline; angles in degrees, r in frame-height units (true circle via A). */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, A: number, k: 'dash' | 'accent' | 'minor' = 'dash', n = 40): Prim => {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + (r * Math.cos(a)) / A, cy + r * Math.sin(a)]);
  }
  return P(pts, false, k);
};

/** Quadratic curve through control point c. */
const curve = (a: Pt, c: Pt, b: Pt, k: 'dash' | 'accent' | 'minor' = 'accent', n = 24): Prim => {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]);
  }
  return P(pts, false, k);
};

/** Open arrow head at `tip`, pointing along the direction from `from`. */
const head = (from: Pt, tip: Pt, size = 0.035, k: 'dash' | 'accent' = 'accent'): Prim => {
  const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const w = (d: number): Pt => [tip[0] - size * Math.cos(ang + d), tip[1] - size * Math.sin(ang + d)];
  return P([w(0.5), tip, w(-0.5)], false, k);
};


/** Stretched ellipse given in frame fractions (rxF / ryF), optional rotation in degrees. */
const elF = (cx: number, cy: number, rxF: number, ryF: number, A: number, rot = 0): Prim => P(ellipse(cx, cy, rxF * A, ryF, A, rot, 72), true);

/** Part of an ellipse (frame-fraction radii) as an open polyline; angles in degrees, 0 = right, clockwise. */
const partEl = (cx: number, cy: number, rxF: number, ryF: number, a0: number, a1: number, k: 'dash' | 'accent' | 'minor' | undefined, n = 48): Prim => {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + rxF * Math.cos(a), cy + ryF * Math.sin(a)]);
  }
  return P(pts, false, k);
};

/** Dashed link between two rings, trimmed to the ring edges (true-shape space). */
const link = (a: Pt, b: Pt, ra: number, rb: number, A: number): Prim => {
  const dx = (b[0] - a[0]) * A;
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ta = (ra * Math.min(1, A)) / len;
  const tb = (rb * Math.min(1, A)) / len;
  return L(a[0] + (b[0] - a[0]) * ta, a[1] + (b[1] - a[1]) * ta, b[0] - (b[0] - a[0]) * tb, b[1] - (b[1] - a[1]) * tb, 'dash');
};

/** Hand-drawn style annotation arrow: a curve with a small loop, ending in an open head. */
const flourish = (tail: Pt, ctrl: Pt, tip: Pt, loop: Pt, A: number): Prim[] => [
  curve(tail, ctrl, tip, undefined),
  P(ellipse(loop[0], loop[1], 0.03 * A, 0.022, A, -25, 28), true),
  head(ctrl, tip, 0.03, undefined),
];

/**
 * The eleven reference screenshots, reproduced one overlay each. Positions were measured from the
 * screenshots as fractions of the visible frame; the underlying grid is the plain thirds grid.
 */
export const SECTION15: GeoGridDefinition[] = [
  // 1: roof-shaped chevron behind one big ring on the hero dish
  def('Circle Chevron', 15, 'food', 'Thirds grid, one ring on the hero dish in the centre cell and a roof-shaped chevron rising behind it (a second faint line runs parallel).', (A) => [
    ...thirds(),
    circle(0.5, 0.5, 0.147, A),
    P([[0, 0.5], [0.5, 0.26], [1, 0.5]]),
    P([[0, 0.515], [0.5, 0.275], [1, 0.515]], false, 'minor'),
  ], { previewAspect: 0.87, scene: 'food' }),

  // 2: "triangle 1": three dashed rings joined by dashed lines
  def('Triangle 1', 15, 'food', 'Three dashed rings (drink upper right, cup left, plate lower right) joined by dashed lines into a triangle.', (A) => {
    const a: Pt = [0.705, 0.307];
    const b: Pt = [0.261, 0.545];
    const c: Pt = [0.654, 0.689];
    return [
      ...thirds(),
      dc(a[0], a[1], 0.116, A),
      dc(b[0], b[1], 0.12, A),
      dc(c[0], c[1], 0.12, A),
      link(a, b, 0.116, 0.12, A),
      link(b, c, 0.12, 0.12, A),
      link(a, c, 0.116, 0.12, A),
    ];
  }, { previewAspect: 0.56, scene: 'food' }),

  // 3: tray with three small interest-point rings and a curled arrow
  def('Triangle Interest Point', 15, 'food', 'Small dashed rings on three interest points joined by a dashed triangle, with a curled arrow pointing at the bottom point.', (A) => {
    const a: Pt = [0.344, 0.449];
    const b: Pt = [0.7, 0.41];
    const c: Pt = [0.626, 0.696];
    return [
      ...thirds(),
      dc(a[0], a[1], 0.047, A),
      dc(b[0], b[1], 0.047, A),
      dc(c[0], c[1], 0.047, A),
      link(a, b, 0.047, 0.047, A),
      link(a, c, 0.047, 0.047, A),
      link(b, c, 0.047, 0.047, A),
      ...flourish([0.792, 0.845], [0.84, 0.74], [0.632, 0.706], [0.71, 0.775], A),
      TXT(0.65, 0.888, 'Interest point', 0.034),
      TXT(0.56, 0.958, 'Use triangle composition', 0.034),
    ];
  }, { previewAspect: 0.76, scene: 'food' }),

  // 4: round table edge arc + ring on the plate + two dashed label boxes and an arrow
  def('Round Table Main Point', 15, 'food', 'Dashed arc following the round table edge, a dashed ring on the plate, and two dashed label boxes (main point, table) with a curled arrow.', (A) => [
    arc(1.561, 0.544, 0.845, 148, 220, A, 'dash', 60),
    arc(1.561, 0.544, 0.853, 148, 220, A, 'minor', 60),
    arc(0.964, 0.5125, 0.2725, 0, 360, A, 'dash', 80),
    R(0.793, 0.11, 0.2, 0.053, 'dash'),
    R(-0.01, 0.445, 0.234, 0.069, 'dash'),
    TXT(0.9, 0.137, 'main point', 0.03),
    TXT(0.1, 0.48, 'point (table)', 0.03),
    ...flourish([0.772, 0.275], [0.735, 0.19], [0.808, 0.166], [0.786, 0.222], A),
  ], { previewAspect: 0.75, scene: 'food' }),

  // 5: "L line": wide + tall ellipses tied by an L-shaped line
  def('L Line', 15, 'food', 'A wide ellipse round the plate, two tall ellipses round the glass, and an L-shaped line down the glass and along the plate.', (A) => [
    ...thirds(),
    elF(0.323, 0.628, 0.253, 0.139, A),
    elF(0.705, 0.369, 0.124, 0.259, A),
    elF(0.7, 0.372, 0.1, 0.25, A, 3),
    P([[0.703, 0.117], [0.703, 0.626], [0.075, 0.626]]),
  ], { previewAspect: 0.88, scene: 'food' }),

  // 6: central composition: dashed upright box on centre cell + arrow
  def('Central Composition', 15, 'food', 'Thirds grid with a dashed upright box filling the centre cell for a centred still life, plus a curled arrow pointing into it.', (A) => [
    ...thirds(),
    R(0.325, 0.31, 0.345, 0.4, 'dash'),
    ...flourish([0.472, 0.39], [0.45, 0.27], [0.645, 0.23], [0.575, 0.325], A),
    TXT(0.655, 0.094, 'Point of interest', 0.036),
    TXT(0.66, 0.178, '"Central composition"', 0.036),
  ], { previewAspect: 0.65, scene: 'food' }),

  // 7: two big rings on opposite power points
  def('2 Point', 15, 'food', 'Two big rings centred on opposite power points (upper left and lower right) of the thirds grid; drink in one, dish in the other.', (A) => [
    ...thirds(),
    circle(T, T, 0.192, A),
    circle(TT, TT, 0.19, A),
  ], { previewAspect: 0.77, scene: 'food' }),

  // 8: bottom-centre dashed column for a lone subject
  def('Lower Centre Subject Box', 15, 'landscape', 'Thirds grid with a dashed upright box in the bottom-centre cell: a lone figure framed by trees, the sky and hills above.', () => [
    ...thirds(),
    R(0.36, 0.69, 0.28, 0.29, 'dash'),
  ], { previewAspect: 0.77, scene: 'landscape' }),

  // 9: three dashed rings of different size + big upper arc
  def('3 Circle Arc', 15, 'architecture', 'Three dashed rings of different sizes (wall, side, floor) with a large dashed arc sweeping over the top.', (A) => [
    ...thirds(),
    dc(0.532, 0.34, 0.128, A),
    dc(0.759, 0.529, 0.126, A),
    dc(0.326, 0.768, 0.228, A),
    partEl(0.5, 0.51, 0.55, 0.36, 195, 345, 'dash', 56),
  ], { previewAspect: 0.86, scene: 'architecture' }),

  // 10: rectangle (diamond) with four ellipses
  def('Rectangle', 15, 'food', 'A tilted diamond with an ellipse on each side (left, top, right, bottom); the hero items sit in the diamond and the ellipses hold the props.', (A) => [
    ...thirds(),
    P([[0.53, 0.213], [0.723, 0.38], [0.493, 0.637], [0.31, 0.411]], true),
    elF(0.311, 0.411, 0.187, 0.097, A),
    elF(0.53, 0.2, 0.088, 0.123, A, -6),
    elF(0.723, 0.384, 0.092, 0.124, A, 6),
    elF(0.495, 0.635, 0.185, 0.106, A),
  ], { previewAspect: 0.74, scene: 'food' }),

  // 11: single dashed ring on the upper-right power point (+ solid arc on its right side)
  def('1 Point', 15, 'macro', 'One dashed ring centred on the upper-right power point with a solid arc on its right edge; for a cup or any single hero subject.', (A) => [
    ...thirds(),
    dc(TT, T, 0.179, A),
    arc(TT, T, 0.188 * Math.min(1, A), -55, 55, A, 'minor'),
  ], { previewAspect: 0.87, scene: 'macro' }),

  // from the screenshot strip: T line
  def('T Line', 15, 'landscape', 'A horizon line on the upper third with a vertical drop to the subject in the lower centre: a T shape for sea, sky and a standing figure.', (A) => [
    L(0, T, 1, T),
    L(0.5, T, 0.5, 0.95, 'dash'),
    ...vlines([T, TT], 'minor'),
    circle(0.5, 0.72, 0.08, A, 'dash'),
  ], { previewAspect: 0.78, scene: 'landscape' }),

  // ---------- extra shot guides in the same style (other categories) ----------
  def('Top Down Triangle Tray', 15, 'food', 'Overhead tray shot: dish top left, two drinks right, joined by a dashed triangle with centre-marked rings.', (A) => [
    ...thirds(),
    dc(0.36, 0.43, 0.12, A),
    dc(0.72, 0.4, 0.1, A),
    dc(0.62, 0.74, 0.1, A),
    link([0.36, 0.43], [0.72, 0.4], 0.12, 0.1, A),
    link([0.36, 0.43], [0.62, 0.74], 0.12, 0.1, A),
    link([0.72, 0.4], [0.62, 0.74], 0.1, 0.1, A),
  ], { previewAspect: 0.78, scene: 'food' }),

  def('Food Duo Ellipses', 15, 'food', 'Large ellipse for the hero plate lower left and a tall one for the drink upper right, joined by a dashed diagonal.', (A) => [
    ...thirds(),
    elF(0.32, 0.64, 0.25, 0.12, A, -6),
    elF(0.7, 0.3, 0.11, 0.22, A),
    L(0.42, 0.57, 0.64, 0.42, 'dash'),
  ], { previewAspect: 1, scene: 'food' }),

  def('Overhead Plate Ring', 15, 'food', 'Overhead single dish: a big dashed ring on the plate rim and a solid ring on the food, with centre cross and margin ticks.', (A) => [
    ...crossAt(0.5, 0.5, 'minor'),
    dc(0.5, 0.5, 0.36, A),
    circle(0.5, 0.5, 0.18, A),
    L(0.05, 0.05, 0.15, 0.05, 'dash'),
    L(0.05, 0.05, 0.05, 0.12, 'dash'),
    L(0.95, 0.95, 0.85, 0.95, 'dash'),
    L(0.95, 0.95, 0.95, 0.88, 'dash'),
  ], { previewAspect: 1, scene: 'food' }),

  def('Portrait Oval and Eye Line', 15, 'portrait', 'Upright oval for head and shoulders with the eye line on the upper third and a centred vertical.', (A) => [
    ...hlines([T, TT], 'minor'),
    L(0.5, 0.05, 0.5, 0.95, 'minor'),
    P(ellipse(0.5, 0.4, 0.2, 0.3, A), true, 'accent'),
    L(0.28, T, 0.72, T, 'dash'),
  ], { previewAspect: 0.75, scene: 'portrait' }),

  def('Portrait Triangle Gaze', 15, 'portrait', 'Dashed triangle between the eyes and the lead-room point, with rings on the face and the space it looks into.', (A) => [
    ...thirds(),
    dc(0.34, 0.33, 0.1, A),
    dc(0.66, 0.4, 0.07, A),
    dc(0.4, 0.76, 0.1, A),
    dl(0.34, 0.33, 0.66, 0.4),
    dl(0.34, 0.33, 0.4, 0.76),
    dl(0.66, 0.4, 0.4, 0.76),
  ], { previewAspect: 0.75, scene: 'portrait' }),

  // ---------- landscape / nature ----------
  def('S-Curve Path Guide', 15, 'landscape', 'Rising S-curve from the lower-left corner to the upper-right power point, with rings on the start and the destination.', (A) => [
    ...thirds(),
    P(
      Array.from({ length: 41 }, (_, i): Pt => {
        const t = i / 40;
        return [0.12 + 0.76 * t + 0.1 * Math.sin(t * Math.PI * 2), 0.9 - 0.6 * t];
      }),
      false,
      'accent'
    ),
    dc(0.14, 0.88, 0.07, A),
    dc(TT, T, 0.09, A),
  ], { previewAspect: 0.85, scene: 'landscape' }),

  def('Foreground Mid Distance Rings', 15, 'landscape', 'Three depth rings in a diagonal: close detail lower left, subject at the centre, far peak on the upper right.', (A) => [
    ...thirds(),
    dc(0.2, 0.8, 0.14, A),
    dc(0.5, 0.52, 0.1, A),
    dc(0.8, 0.22, 0.07, A),
    dl(0.27, 0.72, 0.43, 0.58),
    dl(0.57, 0.46, 0.74, 0.28),
  ], { previewAspect: 0.85, scene: 'landscape' }),

  // ---------- street / architecture ----------
  def('Street Diamond Frame', 15, 'street', 'Diamond (rotated square) with the subject on its lower point and rings on the left and right apexes.', (A) => [
    ...thirds(),
    P([[0.5, 0.15], [0.84, 0.5], [0.5, 0.85], [0.16, 0.5]], true, 'accent'),
    dc(0.5, 0.7, 0.08, A),
    dc(0.16, 0.5, 0.06, A),
    dc(0.84, 0.5, 0.06, A),
  ], { previewAspect: 0.85, scene: 'street' }),

  def('Corner Chair Triangle', 15, 'architecture', 'Table in the lower-middle with two dashed ring pairs on the wall above, forming a triangle of visual weight.', (A) => [
    ...thirds(),
    dc(0.52, 0.34, 0.14, A),
    dc(0.82, 0.5, 0.12, A),
    dc(0.22, 0.82, 0.2, A),
    arc(0.5, 0.2, 0.7, 20, 60, A, 'dash'),
  ], { previewAspect: 0.85, scene: 'architecture' }),

  def('Vanishing Triangle Frame', 15, 'architecture', 'Triangle drawn from the lower corners to a vertex on the upper third, with a centre ring marking the vanishing point.', (A) => [
    ...thirds(),
    P([[0, 1], [0.5, T], [1, 1]], false, 'accent'),
    dc(0.5, T, 0.07, A),
    L(0.5, T, 0.5, 1, 'dash'),
  ], { previewAspect: 0.85, scene: 'architecture' }),

  // ---------- product / macro / creative ----------
  def('Product Spotlight Ring', 15, 'product', 'Large centred ring around the product with a crosshair and four dashed corner ticks for even margins.', (A) => [
    ...crossAt(0.5, 0.5, 'minor'),
    sc(0.5, 0.5, 0.3, A),
    dc(0.5, 0.5, 0.18, A),
    L(0.06, 0.06, 0.16, 0.06, 'dash'),
    L(0.06, 0.06, 0.06, 0.12, 'dash'),
    L(0.94, 0.94, 0.84, 0.94, 'dash'),
    L(0.94, 0.94, 0.94, 0.88, 'dash'),
  ], { previewAspect: 1, scene: 'product' }),

  def('Product Duo Ellipses', 15, 'product', 'Two ellipses on a shared baseline, wide for the box and tall for the bottle, with copy space top right.', (A) => [
    ...thirds(),
    P(ellipse(0.32, 0.7, 0.22, 0.12, A), true, 'accent'),
    P(ellipse(0.68, 0.5, 0.09, 0.28, A), true, 'accent'),
    L(0.05, 0.7, 0.95, 0.7, 'dash'),
    R(0.6, 0.05, 0.35, 0.1, 'dash'),
  ], { previewAspect: 1, scene: 'product' }),

  def('Macro Dual Ring', 15, 'macro', 'Dashed outer ring and solid inner ring offset to the right power point, for a cup, flower or lens-filling detail.', (A) => [
    ...thirds(),
    dc(0.6, 0.42, 0.3, A),
    sc(0.6, 0.42, 0.14, A),
    DOT(0.6, 0.42),
  ], { previewAspect: 1, scene: 'macro' }),

  def('Triangle and Circle Mix', 15, 'creative', 'Inverted triangle with a ring at each corner and a centre ring: balances three focal points around one anchor.', (A) => [
    ...thirds(),
    P([[0.2, 0.25], [0.8, 0.25], [0.5, 0.82]], true, 'dash'),
    dc(0.2, 0.25, 0.08, A),
    dc(0.8, 0.25, 0.08, A),
    dc(0.5, 0.82, 0.08, A),
    sc(0.5, 0.43, 0.06, A),
  ], { previewAspect: 1, scene: 'abstract' }),
];
