import type { GeoGridDefinition, Prim, Pt } from '../../types/gridGeometry';
import { DIM, DOT, G1, L, P, R, circle, cropGuide, crossAt, ellipse, gridDots, gridLines, hlines, vlines } from '../../utils/gridGeometry/kit';
import type { GridAlias } from '../../types/gridGeometry';
import { alias, def } from './define';

/** 1.33:1 Academy is the same frame as the existing Cinematic 4:3 Frame, so it is a search name, not a copy. */
export const SECTION14_ALIASES: GridAlias[] = [alias('Aspect 1.33:1 Academy Guide', 14, 'geo_cinematic_4_3_frame')];

/** Line through (cx, cy) at a true on-screen angle (degrees), clipped to the frame. `A` = frame width / height. */
function angledLine(cx: number, cy: number, deg: number, A: number, k?: 'minor' | 'accent' | 'dash'): Prim {
  const a = (deg * Math.PI) / 180;
  // a screen direction (cos, sin) in pixels is (cos, sin * A) in frame fractions
  const dx = Math.cos(a);
  const dy = Math.sin(a) * A;
  const ts: number[] = [];
  const hit = (t: number) => {
    const x = cx + dx * t;
    const y = cy + dy * t;
    if (x >= -1e-9 && x <= 1 + 1e-9 && y >= -1e-9 && y <= 1 + 1e-9) ts.push(t);
  };
  if (Math.abs(dx) > 1e-9) {
    hit((0 - cx) / dx);
    hit((1 - cx) / dx);
  }
  if (Math.abs(dy) > 1e-9) {
    hit((0 - cy) / dy);
    hit((1 - cy) / dy);
  }
  const t0 = Math.min(...ts);
  const t1 = Math.max(...ts);
  return L(cx + dx * t0, cy + dy * t0, cx + dx * t1, cy + dy * t1, k);
}

/**
 * Well-known composition guides from photography and painting that the earlier sections did not include:
 * Rule of Odds, Quincunx, Rabatment, Baroque / Sinister diagonals, Rule of Fifths, Triptych, Cross, Fill the Frame,
 * Dutch angle, C-curve, thirds with diagonals, passport photo, and more cinema aspect ratios.
 */
export const SECTION14: GeoGridDefinition[] = [
  def('Rule of Odds', 14, 'basic', 'Three subjects (an odd number) placed in a loose triangle; odd groups read as more natural than pairs.', (A) => [
    ...vlines([1 / 3, 2 / 3], 'minor'),
    circle(0.25, 0.58, 0.1, A, 'accent'),
    circle(0.5, 0.42, 0.1, A, 'accent'),
    circle(0.75, 0.58, 0.1, A, 'accent'),
    P([[0.25, 0.58], [0.5, 0.42], [0.75, 0.58]], false, 'dash'),
  ], { scene: 'abstract' }),

  def('Quincunx Five-Point Grid', 14, 'basic', 'Five anchor points like the five on a die: four at the thirds intersections and one in the centre.', (A) => [
    ...gridLines(3, 3, 'minor'),
    ...gridDots(3, 3),
    circle(0.5, 0.5, 0.07, A, 'accent'),
    DOT(0.5, 0.5),
    ...[[1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]].map(([x, y]) => circle(x, y, 0.045, A, 'accent')),
  ], { scene: 'landscape' }),

  def('Rabatment of the Rectangle', 14, 'advanced', 'Squares folded in from each short side. Their inner edges mark where a subject or horizon sits with classical balance.', (A) => {
    if (A >= 1) {
      const s = 1 / A;
      return [R(0, 0, s, 1, 'accent'), R(1 - s, 0, s, 1, 'accent'), L(s, 0, s, 1, 'minor'), L(1 - s, 0, 1 - s, 1, 'minor')];
    }
    return [R(0, 0, 1, A, 'accent'), R(0, 1 - A, 1, A, 'accent'), L(0, A, 1, A, 'minor'), L(0, 1 - A, 1, 1 - A, 'minor')];
  }, { scene: 'architecture' }),

  def('Baroque Diagonal', 14, 'advanced', 'Diagonal rising from bottom-left to top-right with parallel guides; the lines of the Baroque armature.', () => [
    L(0, 1, 1, 0, 'accent'),
    L(0, 0.5, 0.5, 0, 'minor'),
    L(0.5, 1, 1, 0.5, 'minor'),
    L(0, 0.0, 1, 1, 'dash'),
  ], { scene: 'landscape' }),

  def('Sinister Diagonal', 14, 'advanced', 'Diagonal falling from top-left to bottom-right with parallel guides; reads as descending or receding energy.', () => [
    L(0, 0, 1, 1, 'accent'),
    L(0.5, 0, 1, 0.5, 'minor'),
    L(0, 0.5, 0.5, 1, 'minor'),
    L(0, 1, 1, 0, 'dash'),
  ], { scene: 'landscape' }),

  def('Rule of Fifths', 14, 'basic', 'Five equal columns with the centre column marked; a finer version of thirds for wide, layered scenes.', () => [
    ...vlines([0.2, 0.4, 0.6, 0.8], 'minor'),
    R(0.4, 0, 0.2, 1, 'accent'),
    ...hlines([0.4, 0.6], 'minor'),
  ], { scene: 'landscape' }),

  def('Triptych Three-Panel Guide', 14, 'creative', 'Three side-by-side panels with gaps, for a shot that will be presented or cropped as a triptych.', () => [
    R(0.03, 0.12, 0.29, 0.76, 'accent'),
    R(0.355, 0.12, 0.29, 0.76, 'accent'),
    R(0.68, 0.12, 0.29, 0.76, 'accent'),
    DIM(0.03, 0.12, 0.94, 0.76),
  ], { scene: 'abstract' }),

  def('Cross Composition', 14, 'advanced', 'A strong vertical and a horizontal on the upper golden line crossing at a focal point; a cruciform layout.', (A) => [
    L(0.5, 0, 0.5, 1, 'accent'),
    L(0, G1, 1, G1, 'accent'),
    circle(0.5, G1, 0.09, A, 'minor'),
    DOT(0.5, G1),
  ], { scene: 'architecture' }),

  def('Fill the Frame Guide', 14, 'basic', 'A tight margin box: the subject should reach the marked edges with little empty space around it.', () => [
    R(0.04, 0.04, 0.92, 0.92, 'accent'),
    ...[[0.04, 0.04, 1, 1], [0.96, 0.04, -1, 1], [0.04, 0.96, 1, -1], [0.96, 0.96, -1, -1]].flatMap(([x, y, sx, sy]) => [
      L(x, y, x + 0.06 * sx, y, 'accent'),
      L(x, y, x, y + 0.06 * sy, 'accent'),
    ]),
    DIM(0.04, 0.04, 0.92, 0.92),
  ], { scene: 'portrait' }),

  def('Dutch Angle Guide', 14, 'creative', 'Guide lines tilted 15° to show how far a deliberate tilted frame leans, with a level reference.', (A) => [
    L(0, 0.5, 1, 0.5, 'dash'),
    angledLine(0.5, 0.5, -15, A, 'accent'),
    angledLine(0.5, 0.25, -15, A, 'minor'),
    angledLine(0.5, 0.75, -15, A, 'minor'),
    L(0.5, 0, 0.5, 1, 'dash'),
  ], { scene: 'street' }),

  def('C-Curve Composition', 14, 'creative', 'A single curve like a letter C to carry the eye around a subject or a bend in a road or shore.', (A) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      pts.push([0.72 - 0.46 * Math.sin(Math.PI * t), 0.1 + 0.8 * t]);
    }
    return [P(pts, false, 'accent'), ...pts.filter((_, i) => i % 10 === 0).map(([x, y]) => circle(x, y, 0.03, A, 'minor'))];
  }, { scene: 'landscape' }),

  def('Thirds with Diagonals', 14, 'basic', 'Rule of thirds plus both corner diagonals, which pass exactly through the four power points.', () => [
    ...gridLines(3, 3, 'minor'),
    L(0, 0, 1, 1, 'accent'),
    L(0, 1, 1, 0, 'accent'),
    ...gridDots(3, 3),
  ], { scene: 'portrait' }),

  def('Passport and ID Photo Guide', 14, 'portrait', 'Head oval from near the top margin to the chin, with the eye line at 58% of the photo height (the common 70-80% head rule).', (A) => [
    P(ellipse(0.5, 0.49, 0.26 * 1, 0.39, A), true, 'accent'),
    L(0.1, 0.1, 0.9, 0.1, 'dash'),
    L(0.1, 0.88, 0.9, 0.88, 'dash'),
    L(0.1, 0.42, 0.9, 0.42, 'minor'),
    L(0.5, 0, 0.5, 1, 'minor'),
    DOT(0.5, 0.42),
  ], { previewAspect: 0.78, scene: 'portrait' }),

  def('Aspect 1.66:1 Guide', 14, 'cinematic', 'Crop guide for 1.66:1 (European widescreen).', (A) => cropGuide(1.66, A), { previewAspect: 1.2, scene: 'street' }),
  def('Aspect 2:1 Univisium Guide', 14, 'cinematic', 'Crop guide for 2:1 (Univisium), common on streaming productions.', (A) => cropGuide(2, A), { previewAspect: 1.2, scene: 'street' }),
  def('Aspect 1.43:1 IMAX Guide', 14, 'cinematic', 'Crop guide for 1.43:1, the full-height IMAX 70 mm frame.', (A) => cropGuide(1.43, A), { previewAspect: 1.2, scene: 'street' }),

  def('Vertical Thirds Columns', 14, 'basic', 'Only the two vertical third lines, for placing subjects left or right without a horizon constraint.', () => [
    ...vlines([1 / 3, 2 / 3], 'accent'),
    ...crossAt(0.5, 0.5, 'dash').slice(1),
  ], { scene: 'portrait' }),

  def('Horizontal Thirds Bands', 14, 'landscape', 'Only the two horizontal third lines: horizon at the top line for ground, bottom line for sky.', () => [
    ...hlines([1 / 3, 2 / 3], 'accent'),
    ...crossAt(0.5, 0.5, 'dash').slice(0, 1),
  ], { scene: 'landscape' }),

  def('Lead Room Space Guide', 14, 'portrait', 'A subject marker on the left third with the larger right area shaded as room to look or move into.', (A) => [
    L(1 / 3, 0, 1 / 3, 1, 'accent'),
    circle(1 / 3, 0.4, 0.1, A, 'accent'),
    DIM(1 / 3 + 0.02, 0.05, 0.93 - 1 / 3, 0.9),
    P([[0.45, 0.4], [0.82, 0.4]], false, 'dash'),
    P([[0.78, 0.37], [0.82, 0.4], [0.78, 0.43]], false, 'dash'),
  ], { scene: 'portrait' }),
];
