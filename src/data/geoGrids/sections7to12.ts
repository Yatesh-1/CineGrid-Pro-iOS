import type { GeoGridDefinition, GeoParamSpec, GridAlias, Prim, Pt } from '../../types/gridGeometry';
import {
  DIM,
  DOT,
  G1,
  G2,
  L,
  P,
  PHI,
  R,
  circle,
  cropGuide,
  crossAt,
  ellipse,
  fitRect,
  gridDots,
  gridLines,
  hlines,
  orient,
  person,
  rays,
  spiralPrims,
  vlines,
  type Corner,
} from '../../utils/gridGeometry/kit';
import { alias, def } from './define';

const THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;

// ---------------- SECTION 7: STREET & CINEMATIC ----------------
export const SECTION7_ALIASES: GridAlias[] = [alias('Street Leading Lines', 7, 'street_leading_lines')];

const STREET = { previewAspect: 1.2, scene: 'street' as const };

/** Rect inset by `m` (fraction of each side) inside the frame. */
const inset = (m: number): [number, number, number, number] => [m, m, 1 - 2 * m, 1 - 2 * m];

export const SECTION7: GeoGridDefinition[] = [
  def('Street Photography Rule of Thirds', 7, 'street', 'Thirds grid with a standing-figure marker on the left line and the right two thirds left open for context.', (A) => [
    ...gridLines(3, 3, 'minor'),
    ...person(THIRD, 0.3, 0.09, A, 0.95),
    ...gridDots(3, 3),
  ], STREET),
  def('Street Symmetry', 7, 'street', 'Centre axis with mirrored third lines for symmetrical streets, alleys and façades.', () => [L(0.5, 0, 0.5, 1, 'accent'), ...vlines([1 / 6, 5 / 6], 'minor'), ...hlines([THIRD, TWO_THIRDS], 'minor')], STREET),
  def('Street Center Composition', 7, 'street', 'Centred subject box with a crosshair and wide equal margins for confrontational portraits.', () => [...crossAt(0.5, 0.5, 'minor'), R(0.3, 0.2, 0.4, 0.6, 'accent'), DOT(0.5, 0.5)], STREET),
  def('Street Negative Space', 7, 'street', 'Small subject on a lower power point surrounded by a large dashed empty area.', (A) => [...gridLines(3, 3, 'minor'), ...person(TWO_THIRDS, 0.6, 0.05, A, 0.95), R(0.03, 0.03, 0.94, 0.5, 'dash')], STREET),
  def('Walking Direction Space', 7, 'street', 'Figure on the left third walking right with a dashed lead-room box and an arrow ahead.', (A) => [
    ...person(THIRD, 0.25, 0.085, A, 0.9, 'right'),
    R(0.42, 0.15, 0.52, 0.75, 'dash'),
    L(0.45, 0.5, 0.8, 0.5, 'accent'),
    P([[0.74, 0.46], [0.8, 0.5], [0.74, 0.54]], false, 'accent'),
  ], STREET),
  def('Subject Movement Guide', 7, 'street', 'Motion trail ending on the right power point, with a landing zone and trail ticks.', () => [
    P([[0.08, 0.7], [0.3, 0.6], [0.5, 0.52], [TWO_THIRDS, THIRD + 0.1]], false, 'accent'),
    ...[0.18, 0.34, 0.5].map((x, i) => L(x, 0.66 - i * 0.07, x, 0.74 - i * 0.07, 'minor')),
    R(TWO_THIRDS - 0.1, THIRD - 0.08, 0.2, 0.3, 'dash'),
    DOT(TWO_THIRDS, THIRD + 0.1),
  ], STREET),
  def('Environmental Storytelling Grid', 7, 'street', 'Subject in the lower-left third with three dashed context zones telling the surrounding story.', () => [
    R(0.08, 0.5, 0.28, 0.42, 'accent'),
    R(0.42, 0.12, 0.5, 0.3, 'dash'),
    R(0.42, 0.5, 0.5, 0.42, 'dash'),
    R(0.04, 0.08, 0.32, 0.3, 'dash'),
    ...gridLines(3, 3, 'minor'),
  ], STREET),
  def('Foreground Framing Grid', 7, 'street', 'Border bands on all four sides where foreground objects should overlap, around an inner subject frame.', () => [R(0.02, 0.02, 0.96, 0.96, 'dash'), R(0.18, 0.18, 0.64, 0.64, 'accent'), L(0, 0, 0.18, 0.18, 'minor'), L(1, 0, 0.82, 0.18, 'minor'), L(0, 1, 0.18, 0.82, 'minor'), L(1, 1, 0.82, 0.82, 'minor')], STREET),
  def('Layered Composition Grid', 7, 'street', 'Three depth bands (foreground, middle ground, background) each holding a smaller rectangle.', () => [
    ...hlines([THIRD, TWO_THIRDS], 'minor'),
    R(0.05, 0.7, 0.4, 0.26, 'accent'),
    R(0.35, 0.4, 0.3, 0.2, 'accent'),
    R(0.6, 0.1, 0.2, 0.15, 'accent'),
  ], STREET),
  def('Cinematic 16:9 Frame', 7, 'cinematic', 'Crop guide for the 16:9 HD/UHD frame; the area outside is dimmed.', (A) => cropGuide(16 / 9, A), { previewAspect: 1.2, scene: 'street' }),
  def('Cinematic 2.39:1 Frame', 7, 'cinematic', 'Crop guide for anamorphic scope, 2.39:1 (the standard modern widescreen cinema ratio).', (A) => cropGuide(2.39, A), { previewAspect: 1.2, scene: 'street' }),
  def('Cinematic 1.85:1 Frame', 7, 'cinematic', 'Crop guide for 1.85:1 theatrical flat.', (A) => cropGuide(1.85, A), { previewAspect: 1.2, scene: 'street' }),
  def('Cinematic 4:3 Frame', 7, 'cinematic', 'Crop guide for the classic 4:3 Academy-style frame.', (A) => cropGuide(4 / 3, A), { previewAspect: 1.2, scene: 'street' }),
  def('Cinematic 9:16 Frame', 7, 'cinematic', 'Crop guide for vertical 9:16 video.', (A) => cropGuide(9 / 16, A), { previewAspect: 1.2, scene: 'street' }),
  def('Cinema Safe Area', 7, 'cinematic', 'Action-safe (90%) and title-safe (80%) rectangles with a centre cross.', () => [R(0.05, 0.05, 0.9, 0.9, 'minor'), R(0.1, 0.1, 0.8, 0.8, 'accent'), ...crossAt(0.5, 0.5, 'minor'), DOT(0.5, 0.5)], { previewAspect: 1.4, scene: 'street' }),
  def('Action Composition Guide', 7, 'cinematic', 'Rising diagonal with a lead-room zone ahead of the subject on the lower left power point.', () => [L(0, 1, 1, 0, 'accent'), R(0.5, 0.1, 0.45, 0.6, 'dash'), ...gridLines(3, 3, 'minor'), DOT(THIRD, TWO_THIRDS)], { previewAspect: 1.4, scene: 'street' }),
  def('Dialogue Two-Person Frame', 7, 'cinematic', 'Two facing profiles on the outer thirds at a shared eye line, with a neutral centre gap.', (A) => [
    L(0, 0.38, 1, 0.38, 'accent'),
    ...person(0.22, 0.2, 0.16, A, 0.95, 'right'),
    ...person(0.78, 0.2, 0.16, A, 0.95, 'left'),
    ...vlines([THIRD, TWO_THIRDS], 'minor'),
  ], { previewAspect: 1.4, scene: 'portrait' }),
  def('Over-the-Shoulder Frame', 7, 'cinematic', 'Foreground shoulder and head blob on the lower left with the listener’s face on the right power point.', (A) => [
    P(ellipse(0.12, 0.62, 0.2, 0.34, A), true, 'accent'),
    P(ellipse(0.1, 0.9, 0.22, 0.22, A), false, 'accent'),
    circle(TWO_THIRDS + 0.02, THIRD + 0.02, 0.13, A, 'accent'),
    ...gridLines(3, 3, 'minor'),
  ], { previewAspect: 1.4, scene: 'portrait' }),
  def('Cinematic Center Composition', 7, 'cinematic', 'Dead-centre symmetrical frame with a centre cross and equal margins inside a scope crop.', (A) => [...cropGuide(2.39, A), ...crossAt(0.5, 0.5, 'minor'), L(0.5, 0.3, 0.5, 0.7, 'accent'), DOT(0.5, 0.5)], { previewAspect: 1.2, scene: 'street' }),
];

// ---------------- SECTION 8: PRODUCT, FOOD, COMMERCIAL ----------------
export const SECTION8_ALIASES: GridAlias[] = [
  alias('Product Centering Guide', 8, 'product_center'),
  alias('Product Negative Space Grid', 8, 'product_negative_space'),
  alias('Flat-Lay Composition Grid', 8, 'product_flat_lay'),
  alias('Food Overhead Grid', 8, 'food_overhead'),
];

const PROD = { previewAspect: 1, scene: 'product' as const };
const FOOD = { previewAspect: 1, scene: 'food' as const };

export const SECTION8: GeoGridDefinition[] = [
  def('Square Product Grid', 8, 'product', 'Square 1:1 crop with an internal thirds grid and product safe zone.', (A) => {
    const r = fitRect(1, A);
    const x = (f: number) => r.x + r.w * f;
    const y = (f: number) => r.y + r.h * f;
    return [
      ...cropGuide(1, A),
      L(x(THIRD), r.y, x(THIRD), r.y + r.h, 'minor'),
      L(x(TWO_THIRDS), r.y, x(TWO_THIRDS), r.y + r.h, 'minor'),
      L(r.x, y(THIRD), r.x + r.w, y(THIRD), 'minor'),
      L(r.x, y(TWO_THIRDS), r.x + r.w, y(TWO_THIRDS), 'minor'),
    ];
  }, PROD),  def('Product Rule of Thirds', 8, 'product', 'Thirds grid with the product box on the lower-left power point and copy space to the right.', () => [...gridLines(3, 3, 'minor'), R(0.12, 0.38, 0.4, 0.48, 'accent'), DOT(THIRD, TWO_THIRDS)], PROD),
  def('Product Golden Ratio', 8, 'product', 'Golden grid with the product box on the lower-left φ node.', () => [...vlines([G1, G2], 'minor'), ...hlines([G1, G2], 'minor'), R(G1 - 0.2, G2 - 0.24, 0.4, 0.48, 'accent'), DOT(G1, G2)], PROD),
  def('Product Symmetry Grid', 8, 'product', 'Centre axis with a centred product box and mirrored margin guides.', () => [L(0.5, 0, 0.5, 1, 'accent'), R(0.3, 0.25, 0.4, 0.5, 'accent'), ...vlines([0.15, 0.85], 'minor'), ...hlines([0.15, 0.85], 'minor')], PROD),
  def('Product Triangle Composition', 8, 'product', 'Three product positions at the corners of a triangle: hero at top, supporters at the base.', (A) => [P([[0.5, 0.18], [0.2, 0.78], [0.8, 0.78]], true, 'minor'), circle(0.5, 0.26, 0.1, A, 'accent'), circle(0.24, 0.72, 0.08, A, 'accent'), circle(0.76, 0.72, 0.08, A, 'accent')], PROD),
  def('Food Rule of Thirds', 8, 'food', 'Thirds grid with a plate circle on the upper-left power point and room for garnish on the right.', (A) => [...gridLines(3, 3, 'minor'), circle(THIRD + 0.04, THIRD + 0.06, 0.3, A, 'accent'), ...gridDots(3, 3)], FOOD),
  def('Food Radial Composition', 8, 'food', 'Plate rings with eight radiating spokes for arranging items around the centre.', (A) => {
    const out: Prim[] = [circle(0.5, 0.5, 0.42, A, 'accent'), circle(0.5, 0.5, 0.26, A, 'minor'), circle(0.5, 0.5, 0.08, A, 'minor')];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const m = Math.min(1, A);
      out.push(L(0.5 + (0.08 * m * Math.cos(a)) / A, 0.5 + 0.08 * m * Math.sin(a), 0.5 + (0.42 * m * Math.cos(a)) / A, 0.5 + 0.42 * m * Math.sin(a), 'minor'));
    }
    return out;
  }, FOOD),
  def('Food Center Composition', 8, 'food', 'Centred plate with rim and well rings and a centre cross.', (A) => [circle(0.5, 0.5, 0.42, A, 'accent'), circle(0.5, 0.5, 0.3, A, 'minor'), ...crossAt(0.5, 0.5, 'minor')], FOOD),
  def('Food Golden Spiral', 8, 'food', 'Golden spiral with the plate circle placed on its eye.', (A) => {
    const sp = spiralPrims('tr', 'cw');
    const eye = sp[sp.length - 1];
    const e: Pt = eye.t === 'dot' ? [eye.x, eye.y] : [0.7, 0.4];
    return [...sp, circle(e[0], e[1], 0.22, A, 'minor')];
  }, FOOD),
  def('Tabletop Photography Grid', 8, 'product', 'Table edge on the lower third, backdrop line above and an object zone in between.', () => [L(0, 0.62, 1, 0.62, 'accent'), L(0, 0.34, 1, 0.34, 'dash'), R(0.3, 0.3, 0.4, 0.4, 'accent'), ...vlines([THIRD, TWO_THIRDS], 'minor')], { previewAspect: 1.3, scene: 'product' }),
  def('Commercial Product Frame', 8, 'product', 'Ten percent safe margin, product zone and a copy-space block for headline text.', () => [R(0.1, 0.1, 0.8, 0.8, 'minor'), R(0.14, 0.2, 0.42, 0.6, 'accent'), R(0.6, 0.2, 0.26, 0.6, 'dash')], { previewAspect: 1.3, scene: 'product' }),
  def('E-Commerce Product Guide', 8, 'product', 'Square crop with the product bounding box at about 85% of the frame, centred on a white margin.', (A) => {
    const r = fitRect(1, A);
    const inner = fitRect(1, A, 0.85);
    return [DIM(r.x, r.y, r.w, r.h), R(r.x, r.y, r.w, r.h, 'accent'), R(inner.x, inner.y, inner.w, inner.h, 'dash'), L(r.x, r.y + r.h * 0.92, r.x + r.w, r.y + r.h * 0.92, 'minor')];
  }, PROD),
  def('Bottle Photography Guide', 8, 'product', 'Tall centred bottle outline with neck, shoulder and base marks and a base shadow line.', () => [
    P([[0.44, 0.08], [0.44, 0.22], [0.36, 0.3], [0.36, 0.88], [0.64, 0.88], [0.64, 0.3], [0.56, 0.22], [0.56, 0.08]], true, 'accent'),
    L(0.1, 0.88, 0.9, 0.88, 'minor'),
    L(0.5, 0, 0.5, 1, 'minor'),
  ], { previewAspect: 0.75, scene: 'product' }),
  def('Jewelry Photography Grid', 8, 'product', 'Small centred focus ring with a larger vignette ring for lighting falloff.', (A) => [circle(0.5, 0.5, 0.18, A, 'accent'), circle(0.5, 0.5, 0.4, A, 'minor'), ...crossAt(0.5, 0.5, 'minor')], PROD),
  def('Packaging Photography Grid', 8, 'product', 'Isometric box outline showing front, top and side faces for packaging shots.', () => [P([[0.5, 0.12], [0.85, 0.3], [0.85, 0.72], [0.5, 0.9], [0.15, 0.72], [0.15, 0.3]], true, 'accent'), L(0.5, 0.48, 0.5, 0.9, 'minor'), L(0.5, 0.48, 0.15, 0.3, 'minor'), L(0.5, 0.48, 0.85, 0.3, 'minor')], PROD),
  def('Product Reflection Guide', 8, 'product', 'Surface line at the lower golden line with a dashed mirrored product box below it.', () => [L(0, G2, 1, G2, 'accent'), R(0.32, 0.22, 0.36, G2 - 0.22, 'accent'), R(0.32, G2, 0.36, G2 - 0.22, 'dash')], PROD),
];

// ---------------- SECTION 9: MACRO ----------------
const MACRO = { previewAspect: 1, scene: 'macro' as const };

export const SECTION9: GeoGridDefinition[] = [
  def('Macro Center Guide', 9, 'macro', 'Centred focus box and ring with a centre cross for precise focus on a small subject.', (A) => [...crossAt(0.5, 0.5, 'minor'), R(0.4, 0.4, 0.2, 0.2, 'accent'), circle(0.5, 0.5, 0.35, A, 'minor')], MACRO),
  def('Macro Rule of Thirds', 9, 'macro', 'Thirds grid with a focus ring on the upper-right power point.', (A) => [...gridLines(3, 3, 'minor'), circle(TWO_THIRDS, THIRD, 0.14, A, 'accent'), ...gridDots(3, 3)], MACRO),
  def('Macro Golden Ratio', 9, 'macro', 'Golden grid with a focus ring on the lower-left φ node.', (A) => [...vlines([G1, G2], 'minor'), ...hlines([G1, G2], 'minor'), circle(G1, G2, 0.14, A, 'accent')], MACRO),
  def('Macro Diagonal Grid', 9, 'macro', 'Corner diagonals with nodes at the third points along each, for subjects that run across the frame.', () => [L(0, 0, 1, 1, 'accent'), L(1, 0, 0, 1, 'accent'), DOT(THIRD, THIRD), DOT(TWO_THIRDS, TWO_THIRDS), DOT(TWO_THIRDS, THIRD), DOT(THIRD, TWO_THIRDS)], MACRO),
  def('Macro Focus Area Guide', 9, 'macro', 'Focus ellipse plus two lines bracketing the sharp depth-of-field band.', (A) => [P(ellipse(0.5, 0.5, 0.22, 0.12, A), true, 'accent'), L(0, 0.42, 1, 0.42, 'dash'), L(0, 0.58, 1, 0.58, 'dash'), L(0.5, 0.3, 0.5, 0.7, 'minor')], MACRO),
  def('Flower Petal Radial Grid', 9, 'macro', 'Eight petal ellipses around a centre disc, matching a typical blossom.', (A) => {
    const out: Prim[] = [circle(0.5, 0.5, 0.08, A, 'accent')];
    const m = Math.min(1, A);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cx = 0.5 + (0.22 * m * Math.cos(a)) / A;
      const cy = 0.5 + 0.22 * m * Math.sin(a);
      out.push(P(ellipse(cx, cy, 0.14 * m, 0.07 * m, A, (a * 180) / Math.PI), true, 'minor'));
    }
    return out;
  }, MACRO),
  def('Circular Macro Composition', 9, 'macro', 'Outer and inner rings for circular subjects such as eyes, droplets and coins.', (A) => [circle(0.5, 0.5, 0.45, A, 'accent'), circle(0.5, 0.5, 0.22, A, 'minor'), DOT(0.5, 0.5)], MACRO),
  def('Insect Positioning Grid', 9, 'macro', 'Body ellipse along the lower third with the head node on the right third and lead room ahead.', (A) => [L(0, TWO_THIRDS, 1, TWO_THIRDS, 'minor'), P(ellipse(0.42, TWO_THIRDS - 0.03, 0.2, 0.08, A), true, 'accent'), DOT(TWO_THIRDS, TWO_THIRDS - 0.05), R(0.7, 0.35, 0.25, 0.4, 'dash'), L(TWO_THIRDS, 0, TWO_THIRDS, 1, 'minor')], MACRO),
  def('Eye Macro Composition', 9, 'macro', 'Almond lid outline with concentric iris and pupil rings, centred.', (A) => [
    P([[0.04, 0.5], [0.25, 0.3], [0.5, 0.24], [0.75, 0.3], [0.96, 0.5], [0.75, 0.7], [0.5, 0.76], [0.25, 0.7]], true, 'accent'),
    circle(0.5, 0.5, 0.3, A, 'minor'),
    circle(0.5, 0.5, 0.12, A, 'minor'),
  ], MACRO),
  def('Texture Photography Grid', 9, 'macro', 'Fine eight-by-eight lattice with diagonals for checking even texture coverage and parallel shooting.', () => [...gridLines(8, 8, 'minor'), L(0, 0, 1, 1), L(1, 0, 0, 1)], MACRO),
  def('Close-Up Subject Guide', 9, 'macro', 'Central subject box at 60% with an eye line on the upper third and equal margins.', () => [R(0.2, 0.2, 0.6, 0.6, 'accent'), L(0, THIRD, 1, THIRD, 'minor'), ...vlines([0.5], 'minor')], MACRO),
  def('Macro Negative Space Guide', 9, 'macro', 'Small subject ring at the lower-left node and a large dashed empty region to the upper right.', (A) => [circle(THIRD, TWO_THIRDS, 0.14, A, 'accent'), R(0.45, 0.05, 0.5, 0.55, 'dash'), ...gridLines(3, 3, 'minor')], MACRO),
];

// ---------------- SECTION 10: CREATIVE ----------------
export const SECTION10_ALIASES: GridAlias[] = [alias('Concentric Circle Grid', 10, 'concentric_circles')];

const CREATIVE = { previewAspect: 1, scene: 'abstract' as const };

export const SECTION10: GeoGridDefinition[] = [
  def('S-Curve Composition', 10, 'creative', 'A full S curve from the lower left to the upper right, leading the eye through the frame.', () => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      pts.push([0.15 + 0.7 * t, 0.9 - 0.8 * t + 0.12 * Math.sin(t * Math.PI * 2)]);
    }
    return [P(pts, false, 'accent')];
  }, CREATIVE),  def('Z-Pattern Composition', 10, 'creative', 'Z path: across the top, diagonal down, across the bottom; the natural reading pattern.', () => [P([[0.1, 0.15], [0.9, 0.15], [0.1, 0.85], [0.9, 0.85]], false, 'accent'), DOT(0.1, 0.15), DOT(0.9, 0.85)], CREATIVE),
  def('L-Shape Composition', 10, 'creative', 'An L path along the left edge and bottom for subjects that wrap the frame corner.', () => [P([[0.14, 0.1], [0.14, 0.86], [0.9, 0.86]], false, 'accent'), R(0.3, 0.12, 0.6, 0.62, 'dash')], CREATIVE),
  def('T-Shape Composition', 10, 'creative', 'A horizontal bar across the upper third with a vertical stem down the centre.', () => [L(0.08, 0.22, 0.92, 0.22, 'accent'), L(0.5, 0.22, 0.5, 0.92, 'accent'), DOT(0.5, 0.22)], CREATIVE),
  def('V-Shape Composition', 10, 'creative', 'Two arms descending to a point at the lower centre that funnel attention downward.', () => [P([[0.08, 0.1], [0.5, 0.88], [0.92, 0.1]], false, 'accent'), DOT(0.5, 0.88)], CREATIVE),
  def('Circular Composition', 10, 'creative', 'One large circle inscribed in the frame with a centre point.', (A) => [circle(0.5, 0.5, 0.46, A, 'accent'), DOT(0.5, 0.5)], CREATIVE),
  def('Radial Symmetry Grid', 10, 'creative', 'Four mirror axes (vertical, horizontal and both diagonals) with two rings.', (A) => [L(0.5, 0, 0.5, 1), L(0, 0.5, 1, 0.5), L(0, 0, 1, 1, 'minor'), L(1, 0, 0, 1, 'minor'), circle(0.5, 0.5, 0.2, A, 'accent'), circle(0.5, 0.5, 0.4, A, 'minor')], CREATIVE),
  def('Spiral Composition', 10, 'creative', 'Archimedean spiral of equal-spaced turns, for curling, coiled or swirling subjects.', (A) => {
    const pts: Pt[] = [];
    const m = Math.min(1, A);
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 6;
      const r = 0.46 * m * (i / 180);
      pts.push([0.5 + (r * Math.cos(a)) / A, 0.5 + r * Math.sin(a)]);
    }
    return [P(pts, false, 'accent')];
  }, CREATIVE),
  def('Frame Within Frame', 10, 'creative', 'Single inner frame at 62% of the outer for doorways, windows and arches.', () => [R(...inset(0.19), 'accent'), R(0.02, 0.02, 0.96, 0.96, 'minor')], CREATIVE),
  def('Nested Frame Composition', 10, 'creative', 'Three concentric frames at 90%, 66% and 42% for repeated framing layers.', () => [R(...inset(0.05), 'minor'), R(...inset(0.17), 'minor'), R(...inset(0.29), 'accent')], CREATIVE),
  def('Triangle Balance Grid', 10, 'creative', 'Upright triangle balanced against a smaller inverted one on a shared midline.', () => [P([[0.35, 0.1], [0.08, 0.6], [0.62, 0.6]], true, 'accent'), P([[0.55, 0.9], [0.8, 0.45], [0.95, 0.9]], true, 'minor'), L(0.04, 0.6, 0.96, 0.6, 'dash')], CREATIVE),
  def('Visual Weight Balance Grid', 10, 'creative', 'See-saw: a large near-centre weight offset against a small far-edge weight on a central fulcrum.', (A) => [L(0.06, 0.55, 0.94, 0.55, 'minor'), P([[0.5, 0.55], [0.5 - 0.05 / A, 0.7], [0.5 + 0.05 / A, 0.7]], true), circle(0.35, 0.4, 0.2, A, 'accent'), circle(0.85, 0.46, 0.08, A, 'accent')], CREATIVE),
  def('Repetition Pattern Grid', 10, 'creative', 'Five-by-four array of equal circles for repeating elements, with a break position highlighted.', (A) => {
    const out: Prim[] = [];
    for (let c = 0; c < 5; c++) for (let r = 0; r < 4; r++) out.push(circle(0.1 + c * 0.2, 0.125 + r * 0.25, 0.09, A, c === 3 && r === 1 ? 'accent' : 'minor'));
    return out;
  }, CREATIVE),
  def('Rhythm Composition Grid', 10, 'creative', 'Alternating tall and short bars across the frame, a visual beat.', () => Array.from({ length: 9 }, (_, i) => R(0.06 + i * 0.099, i % 2 ? 0.45 : 0.2, 0.06, i % 2 ? 0.4 : 0.65, i === 4 ? 'accent' : 'minor')), CREATIVE),
  def('Layered Depth Grid', 10, 'creative', 'Three rectangles shrinking toward the centre with perspective corner lines.', () => [R(0.02, 0.02, 0.96, 0.96, 'minor'), R(0.2, 0.22, 0.6, 0.56, 'minor'), R(0.36, 0.38, 0.28, 0.24, 'accent'), L(0.02, 0.02, 0.36, 0.38, 'dash'), L(0.98, 0.02, 0.64, 0.38, 'dash'), L(0.02, 0.98, 0.36, 0.62, 'dash'), L(0.98, 0.98, 0.64, 0.62, 'dash')], CREATIVE),
  def('Negative Space Composition', 10, 'creative', 'Tiny subject on the lower-right power point inside a large dashed void.', (A) => [R(0.04, 0.04, 0.92, 0.92, 'dash'), circle(TWO_THIRDS, TWO_THIRDS, 0.06, A, 'accent'), ...gridDots(3, 3)], CREATIVE),
  def('Abstract Geometric Composition', 10, 'creative', 'Circle, triangle and bar arranged on diagonals with a golden dividing line.', (A) => [circle(0.3, 0.3, 0.16, A, 'accent'), P([[0.7, 0.45], [0.55, 0.85], [0.88, 0.85]], true, 'accent'), L(0.1, 0.9, 0.9, 0.1, 'minor'), L(G2, 0, G2, 1, 'minor')], CREATIVE),
];

// ---------------- SECTION 11: SOCIAL & PRINT ----------------
const SOCIAL = { previewAspect: 1, scene: 'abstract' as const };

/** Rect strip inside the crop rect, in crop-relative fractions. */
const strip = (r: { x: number; y: number; w: number; h: number }, fx: number, fy: number, fw: number, fh: number): Prim =>
  R(r.x + r.w * fx, r.y + r.h * fy, r.w * fw, r.h * fh, 'dash');

export const SECTION11: GeoGridDefinition[] = [
  def('Instagram Square 1:1', 11, 'social', 'Square feed crop; area outside the square is dimmed.', (A) => cropGuide(1, A), SOCIAL),
  def('Instagram Portrait 4:5', 11, 'social', 'Portrait feed crop at 4:5 (1080×1350).', (A) => cropGuide(0.8, A), SOCIAL),
  def('Instagram Landscape 1.91:1', 11, 'social', 'Landscape feed crop at 1.91:1 (1080×566).', (A) => cropGuide(1.91, A), SOCIAL),
  def('Instagram Story 9:16', 11, 'social', 'Full-screen 9:16 with the top 14% and bottom 20% marked as UI overlay zones.', (A) => { const r = fitRect(9 / 16, A); return [...cropGuide(9 / 16, A), strip(r, 0, 0, 1, 0.14), strip(r, 0, 0.8, 1, 0.2)]; }, SOCIAL),
  def('TikTok 9:16', 11, 'social', 'Full-screen 9:16 with the right-hand button column and caption area marked as overlay zones.', (A) => { const r = fitRect(9 / 16, A); return [...cropGuide(9 / 16, A), strip(r, 0.84, 0.4, 0.16, 0.4), strip(r, 0, 0.78, 0.84, 0.22)]; }, SOCIAL),
  def('YouTube Thumbnail 16:9', 11, 'social', 'Thumbnail crop with the bottom-right timestamp area marked.', (A) => { const r = fitRect(16 / 9, A); return [...cropGuide(16 / 9, A), strip(r, 0.82, 0.86, 0.18, 0.14)]; }, SOCIAL),
  def('YouTube Shorts 9:16', 11, 'social', 'Shorts crop with the lower 18% and right action column marked.', (A) => { const r = fitRect(9 / 16, A); return [...cropGuide(9 / 16, A), strip(r, 0, 0.82, 1, 0.18), strip(r, 0.86, 0.45, 0.14, 0.37)]; }, SOCIAL),
  def('Facebook Cover Guide', 11, 'social', 'Page cover at 820:312 with the central mobile-safe region (about 78% of the width) outlined.', (A) => { const r = fitRect(820 / 312, A); return [...cropGuide(820 / 312, A), R(r.x + r.w * 0.11, r.y, r.w * 0.78, r.h, 'dash')]; }, SOCIAL),
  def('LinkedIn Portrait Guide', 11, 'social', 'Profile-style 4:5 crop with a head-and-shoulders circle on the upper centre.', (A) => { const r = fitRect(0.8, A); return [...cropGuide(0.8, A), P(ellipse(r.x + r.w / 2, r.y + r.h * 0.4, r.h * 0.26, r.h * 0.26, A), true, 'minor')]; }, SOCIAL),
  def('Pinterest Portrait Guide', 11, 'social', 'Pin crop at 2:3 (1000×1500), the format Pinterest favours.', (A) => cropGuide(2 / 3, A), SOCIAL),
  def('A4 Print Guide', 11, 'social', 'A4 (1:√2) matched to the frame orientation with a 10 mm margin. Same proportions as A3.', (A) => { const o = orient(Math.SQRT2, A); const r = fitRect(o, A); return [...cropGuide(o, A), R(r.x + r.w * 0.048, r.y + r.h * 0.048, r.w * 0.904, r.h * 0.904, 'dash')]; }, SOCIAL),
  def('A3 Print Guide', 11, 'social', 'A3 (1:√2) matched to the frame orientation with a 15 mm margin. Same proportions as A4, so the crop looks alike; only the margin differs.', (A) => { const o = orient(Math.SQRT2, A); const r = fitRect(o, A); return [...cropGuide(o, A), R(r.x + r.w * 0.05, r.y + r.h * 0.05, r.w * 0.9, r.h * 0.9, 'dash'), R(r.x + r.w * 0.1, r.y + r.h * 0.1, r.w * 0.8, r.h * 0.8, 'minor')]; }, SOCIAL),
  def('5x7 Print Guide', 11, 'social', '5×7 inch print crop (1:1.4).', (A) => cropGuide(orient(7 / 5, A), A), SOCIAL),
  def('8x10 Print Guide', 11, 'social', '8×10 inch print crop (1:1.25).', (A) => cropGuide(orient(10 / 8, A), A), SOCIAL),
  def('4x6 Print Guide', 11, 'social', '4×6 inch print crop (1:1.5), the standard lab print.', (A) => cropGuide(orient(1.5, A), A), SOCIAL),
  def('16x20 Print Guide', 11, 'social', '16×20 inch print crop (same 1:1.25 proportions as 8×10) with a 1-inch mat margin outlined.', (A) => { const o = orient(1.25, A); const r = fitRect(o, A); return [...cropGuide(o, A), R(r.x + r.w * 0.0625, r.y + r.h * 0.05, r.w * 0.875, r.h * 0.9, 'dash')]; }, SOCIAL),
  def('Square Album Print', 11, 'social', 'Square album page with a 6% safe margin so content survives binding and trimming.', (A) => { const r = fitRect(1, A); return [...cropGuide(1, A), R(r.x + r.w * 0.06, r.y + r.h * 0.06, r.w * 0.88, r.h * 0.88, 'dash')]; }, SOCIAL),
  def('Panoramic Print Guide', 11, 'social', 'Panoramic 3:1 print crop matched to the frame orientation.', (A) => cropGuide(orient(3, A), A), SOCIAL),
  def('Safe Crop Area', 11, 'social', 'Concentric 90% and 80% rectangles: keep important content inside the inner one for any crop.', () => [R(0.05, 0.05, 0.9, 0.9, 'minor'), R(0.1, 0.1, 0.8, 0.8, 'accent')], SOCIAL),
  def('Bleed and Trim Guide', 11, 'social', 'Outer edge is the bleed, trim line 3% inside, and a safe-content line 6% inside.', () => [R(0.03, 0.03, 0.94, 0.94, 'accent'), R(0.06, 0.06, 0.88, 0.88, 'dash'), ...[[0, 0.03], [0.97, 0.03], [0, 0.97], [0.97, 0.97]].map(([x, y]) => L(x, y, x === 0 ? 0.03 : 1, y, 'minor'))], SOCIAL),
];

// ---------------- SECTION 12: CUSTOM ----------------
const spec = (key: string, label: string, min: number, max: number, step: number, value: number): GeoParamSpec => ({ key, label, min, max, step, value });
const px = (p: Record<string, number>, k: string, d: number) => p[k] ?? d;
const CUSTOM = { previewAspect: 1, scene: 'abstract' as const };

export const SECTION12: GeoGridDefinition[] = [
  def('Custom Grid Builder', 12, 'custom', 'Choose any number of columns and rows, with optional diagonals.', (_A, p) => [...gridLines(Math.round(px(p, 'cols', 5)), Math.round(px(p, 'rows', 4))), ...(px(p, 'diag', 0) >= 1 ? [L(0, 0, 1, 1, 'minor'), L(1, 0, 0, 1, 'minor')] : [])], { ...CUSTOM, params: [spec('cols', 'Columns', 1, 12, 1, 5), spec('rows', 'Rows', 1, 12, 1, 4), spec('diag', 'Diagonals (0/1)', 0, 1, 1, 0)] }),
  def('Custom Vertical Division', 12, 'custom', 'Evenly spaced vertical lines with an adjustable count and sideways offset.', (_A, p) => { const n = Math.round(px(p, 'count', 3)); const off = px(p, 'offset', 0) / 100; return vlines(Array.from({ length: n }, (_, i) => ((i + 1) / (n + 1)) + off).filter((x) => x > 0 && x < 1)); }, { ...CUSTOM, params: [spec('count', 'Lines', 1, 16, 1, 3), spec('offset', 'Offset %', -25, 25, 1, 0)] }),
  def('Custom Horizontal Division', 12, 'custom', 'Evenly spaced horizontal lines with an adjustable count and vertical offset.', (_A, p) => { const n = Math.round(px(p, 'count', 3)); const off = px(p, 'offset', 0) / 100; return hlines(Array.from({ length: n }, (_, i) => ((i + 1) / (n + 1)) + off).filter((y) => y > 0 && y < 1)); }, { ...CUSTOM, params: [spec('count', 'Lines', 1, 16, 1, 3), spec('offset', 'Offset %', -25, 25, 1, 0)] }),
  def('Custom Perspective Grid', 12, 'custom', 'Rays from a vanishing point you position, with an adjustable ray count.', (_A, p) => { const vx = px(p, 'vx', 50) / 100; const vy = px(p, 'vy', 45) / 100; return [L(0, vy, 1, vy, 'minor'), ...rays(vx, vy, Math.round(px(p, 'rays', 16)), 'minor'), DOT(vx, vy)]; }, { ...CUSTOM, params: [spec('vx', 'Vanishing X %', 0, 100, 1, 50), spec('vy', 'Vanishing Y %', 0, 100, 1, 45), spec('rays', 'Rays', 4, 48, 1, 16)] }),
  def('Custom Golden Ratio', 12, 'custom', 'Division lines at an adjustable ratio; 38.2% gives the golden section.', (_A, p) => { const r = px(p, 'ratio', 38.2) / 100; return [...vlines([r, 1 - r]), ...hlines([r, 1 - r]), DOT(r, r), DOT(1 - r, r), DOT(r, 1 - r), DOT(1 - r, 1 - r)]; }, { ...CUSTOM, params: [spec('ratio', 'Ratio %', 20, 50, 0.1, 38.2)] }),
  def('Custom Spiral Position', 12, 'custom', 'Golden spiral with its eye corner, direction and number of turns selectable.', (_A, p) => { const corners: Corner[] = ['tl', 'tr', 'bl', 'br']; return spiralPrims(corners[Math.round(px(p, 'corner', 0))] ?? 'tl', px(p, 'dir', 0) >= 1 ? 'ccw' : 'cw', PHI, Math.round(px(p, 'turns', 12))); }, { ...CUSTOM, params: [spec('corner', 'Corner (0 TL, 1 TR, 2 BL, 3 BR)', 0, 3, 1, 0), spec('dir', 'Direction (0 CW, 1 CCW)', 0, 1, 1, 0), spec('turns', 'Steps', 4, 14, 1, 12)] }),
  def('Custom Circle Guide', 12, 'custom', 'A circle with adjustable centre and size.', (A, p) => [circle(px(p, 'cx', 50) / 100, px(p, 'cy', 50) / 100, px(p, 'size', 35) / 100, A, 'accent'), DOT(px(p, 'cx', 50) / 100, px(p, 'cy', 50) / 100)], { ...CUSTOM, params: [spec('cx', 'Centre X %', 0, 100, 1, 50), spec('cy', 'Centre Y %', 0, 100, 1, 50), spec('size', 'Size %', 5, 50, 1, 35)] }),
  def('Custom Rectangle Guide', 12, 'custom', 'A rectangle with adjustable position and size.', (_A, p) => [R(px(p, 'x', 20) / 100, px(p, 'y', 20) / 100, px(p, 'w', 60) / 100, px(p, 'h', 60) / 100, 'accent')], { ...CUSTOM, params: [spec('x', 'Left %', 0, 90, 1, 20), spec('y', 'Top %', 0, 90, 1, 20), spec('w', 'Width %', 5, 100, 1, 60), spec('h', 'Height %', 5, 100, 1, 60)] }),
  def('Custom Triangle Guide', 12, 'custom', 'A triangle with adjustable apex position, base width and base height.', (_A, p) => { const ax = px(p, 'ax', 50) / 100; const ay = px(p, 'ay', 12) / 100; const bw = px(p, 'bw', 80) / 200; const by = px(p, 'by', 88) / 100; return [P([[ax, ay], [0.5 - bw, by], [0.5 + bw, by]], true, 'accent'), DOT(ax, ay)]; }, { ...CUSTOM, params: [spec('ax', 'Apex X %', 0, 100, 1, 50), spec('ay', 'Apex Y %', 0, 90, 1, 12), spec('bw', 'Base width %', 10, 100, 1, 80), spec('by', 'Base Y %', 10, 100, 1, 88)] }),
  def('Custom Subject Position Guide', 12, 'custom', 'Subject oval and crosshair you position, with an optional lead-room line.', (A, p) => { const cx = px(p, 'x', 33) / 100; const cy = px(p, 'y', 40) / 100; const s = px(p, 'size', 30) / 100; return [P(ellipse(cx, cy, s * 0.35, s * 0.5, A), true, 'accent'), L(cx, 0, cx, 1, 'minor'), L(0, cy, 1, cy, 'minor'), DOT(cx, cy)]; }, { ...CUSTOM, params: [spec('x', 'Subject X %', 0, 100, 1, 33), spec('y', 'Subject Y %', 0, 100, 1, 40), spec('size', 'Size %', 5, 90, 1, 30)] }),
];

