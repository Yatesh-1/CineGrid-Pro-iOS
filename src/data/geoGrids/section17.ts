import type { GeoGridDefinition, Prim, Pt } from '../../types/gridGeometry';
import { DOT, G1, G2, L, P, R, ellipse, gridLines, hlines, vlines } from '../../utils/gridGeometry/kit';
import { def } from './define';

/**
 * Section 17: human portrait guides for a phone held upright. Each places the head, shoulders, hands, feet and the
 * empty space around a person: full body, walking, seated, child, selfie, hands, action, couple, trio, fashion,
 * low angle, mirror and window light. Figures are simple outlines, true to shape at any frame aspect.
 */
const T = 1 / 3;
const TT = 2 / 3;
const thirds = (): Prim[] => gridLines(3, 3, 'minor');

const headRing = (cx: number, cy: number, hr: number, A: number, k: 'dash' | 'accent' = 'dash'): Prim =>
  P(ellipse(cx, cy, hr, hr, A, 0, 48), true, k);

/** Stick-style standing figure: head ring, shoulders, torso and legs down to footY. hr = head radius (frame height units). */
const figure = (cx: number, headY: number, hr: number, A: number, footY: number, k: 'dash' | 'accent' = 'dash'): Prim[] => {
  const sh = headY + hr * 1.9;
  const sw = (hr * 2.2) / A;
  const hip = sh + (footY - sh) * 0.42;
  const pts: Pt[] = [
    [cx - sw * 0.3, sh - 0.008],
    [cx - sw, sh + 0.02],
    [cx - sw * 0.85, hip],
    [cx - sw * 0.5, footY],
    [cx - sw * 0.1, footY],
    [cx, hip + 0.03],
    [cx + sw * 0.1, footY],
    [cx + sw * 0.5, footY],
    [cx + sw * 0.85, hip],
    [cx + sw, sh + 0.02],
    [cx + sw * 0.3, sh - 0.008],
  ];
  return [headRing(cx, headY, hr, A, k), P(pts, false, k)];
};

const PORTRAIT = { previewAspect: 0.6, scene: 'portrait' as const };

export const SECTION17: GeoGridDefinition[] = [
  def('Full Body Pose Zones', 17, 'portrait', 'Head ring on the upper third line, torso zone and a floor line with feet just above the bottom edge; keeps head, hands and shoes inside the frame.', (A) => [
    ...thirds(),
    ...figure(0.5, 0.17, 0.05, A, 0.9),
    L(0.1, 0.9, 0.9, 0.9, 'dash'),
    R(0.3, 0.3, 0.4, 0.28, 'minor'),
  ], PORTRAIT),

  def('Walking Candid Lead Space', 17, 'portrait', 'Walking figure on the left third line with a wide dashed lead-room box and an arrow ahead; leave space where the person is heading.', (A) => [
    ...vlines([T, TT], 'minor'),
    ...figure(T, 0.2, 0.045, A, 0.88),
    R(0.42, 0.1, 0.52, 0.78, 'dash'),
    L(0.46, 0.48, 0.86, 0.48, 'accent'),
    P([[0.8, 0.44], [0.86, 0.48], [0.8, 0.52]], false, 'accent'),
  ], PORTRAIT),

  def('Seated Cafe Portrait', 17, 'portrait', 'Seated person on the right third with the head ring on the upper third, a lap line, and a dashed table zone in front for the cup and hands.', (A) => [
    ...thirds(),
    headRing(TT, 0.28, 0.07, A),
    P([[0.46, 0.4], [0.5, 0.44], [0.5, 0.64], [0.88, 0.64], [0.9, 0.44], [0.86, 0.4]], false, 'dash'),
    R(0.05, 0.64, 0.6, 0.2, 'dash'),
    L(0.05, 0.64, 0.65, 0.64, 'accent'),
  ], PORTRAIT),

  def('Child Eye Level Portrait', 17, 'portrait', 'Low frame at the child\'s eye level: eye line on the upper third, headroom band above, and a dashed play-space zone to the sides.', (A) => [
    ...thirds(),
    L(0, T, 1, T, 'accent'),
    headRing(0.5, 0.34, 0.12, A),
    R(0.04, 0.04, 0.92, 0.18, 'dash'),
    R(0.04, 0.5, 0.2, 0.42, 'dash'),
    R(0.76, 0.5, 0.2, 0.42, 'dash'),
  ], { previewAspect: 0.75, scene: 'portrait' }),

  def('Selfie Arm Length Frame', 17, 'portrait', 'Selfie at arm\'s length: face ring on the upper third, shoulders arc below, and a dashed margin so the face is not cropped by the edges.', (A) => [
    ...thirds(),
    headRing(0.5, 0.38, 0.17, A, 'accent'),
    P([[0.08, 0.95], [0.12, 0.74], [0.3, 0.66], [0.7, 0.66], [0.88, 0.74], [0.92, 0.95]], false, 'dash'),
    R(0.06, 0.06, 0.88, 0.88, 'dash'),
  ], { previewAspect: 0.6, scene: 'portrait' }),

  def('Face and Hands Detail', 17, 'portrait', 'Face ring on the upper-left power point with a second ring on the hand near the chin; the line between them is where the gesture sits.', (A) => [
    ...thirds(),
    headRing(T + 0.02, T + 0.02, 0.13, A, 'accent'),
    P(ellipse(0.62, 0.62, 0.1, 0.07, A, -20, 36), true, 'dash'),
    L(0.4, 0.4, 0.55, 0.57, 'dash'),
    DOT(T, T),
  ], { previewAspect: 0.8, scene: 'portrait' }),

  def('Action Jump Pose Frame', 17, 'portrait', 'Rising diagonal for a jump or dance move, a figure ring at the apex, a landing zone below and a dashed headroom band above.', (A) => [
    ...thirds(),
    L(0.15, 0.9, 0.75, 0.2, 'accent'),
    headRing(0.72, 0.24, 0.05, A, 'accent'),
    R(0.05, 0.02, 0.9, 0.12, 'dash'),
    P(ellipse(0.2, 0.9, 0.12 * A, 0.03, A, 0, 36), true, 'dash'),
  ], PORTRAIT),

  def('Walking Away Lone Figure', 17, 'portrait', 'A small figure from behind on the lower power point with a huge dashed empty area ahead, for solitude and scale.', (A) => [
    ...thirds(),
    ...figure(TT, 0.62, 0.025, A, 0.84, 'accent'),
    R(0.04, 0.04, 0.92, 0.5, 'dash'),
    DOT(TT, TT),
  ], PORTRAIT),

  def('Couple Sunset Silhouette', 17, 'portrait', 'Two figures on the left and centre-left lines, a sun ring on the upper right power point, and a horizon on the lower third.', (A) => [
    L(0, TT, 1, TT, 'accent'),
    ...vlines([T, TT], 'minor'),
    ...figure(0.34, 0.5, 0.032, A, TT, 'accent'),
    ...figure(0.43, 0.52, 0.03, A, TT, 'accent'),
    P(ellipse(TT, T, 0.06, 0.06, A, 0, 40), true, 'dash'),
  ], { previewAspect: 0.9, scene: 'portrait' }),

  def('Trio Head Triangle', 17, 'portrait', 'Three head rings arranged in a triangle (one high, two lower) joined by dashed lines so faces sit at different heights.', (A) => [
    ...thirds(),
    headRing(0.5, 0.27, 0.07, A),
    headRing(0.28, 0.42, 0.07, A),
    headRing(0.72, 0.44, 0.07, A),
    P([[0.5, 0.27], [0.28, 0.42], [0.72, 0.44]], true, 'minor'),
    L(0.05, 0.9, 0.95, 0.9, 'dash'),
  ], { previewAspect: 0.9, scene: 'portrait' }),

  def('Waist Up Fashion Frame', 17, 'portrait', 'Golden-proportion crop at the waist: face on the upper φ line, hands zone at the lower φ line, and shoulder width marks left and right.', (A) => [
    ...hlines([G1, G2], 'minor'),
    ...vlines([0.18, 0.82], 'dash'),
    headRing(0.5, G1 - 0.05, 0.09, A, 'accent'),
    R(0.22, G2 - 0.05, 0.56, 0.12, 'dash'),
    DOT(0.5, G1),
  ], PORTRAIT),

  def('Low Angle Hero Figure', 17, 'portrait', 'Camera low and the figure tall: converging lines to the head ring on the upper third centre, feet at the bottom edge for a heroic stance.', (A) => [
    L(0, 1, 0.5, T, 'minor'),
    L(1, 1, 0.5, T, 'minor'),
    ...figure(0.5, T - 0.02, 0.05, A, 0.98, 'accent'),
    L(0, T, 1, T, 'dash'),
  ], PORTRAIT),

  def('Mirror Selfie Full Length', 17, 'portrait', 'Tall narrow box for a full-length mirror shot with the phone ring at chest height, head near the top and feet inside the lower edge.', (A) => [
    ...thirds(),
    R(0.22, 0.04, 0.56, 0.92, 'dash'),
    headRing(0.5, 0.14, 0.05, A),
    P(ellipse(0.5, 0.36, 0.03, 0.03, A, 0, 24), true, 'accent'),
    L(0.22, 0.92, 0.78, 0.92, 'minor'),
  ], PORTRAIT),

  def('Window Light Triangle Portrait', 17, 'portrait', 'Window on the left throwing a light triangle onto the shadow-side cheek: face ring on the right third and a dashed light wedge across it.', (A) => [
    ...thirds(),
    R(0.02, 0.1, 0.16, 0.5, 'dash'),
    headRing(0.58, 0.4, 0.14, A, 'accent'),
    P([[0.18, 0.1], [0.62, 0.34], [0.5, 0.52]], true, 'dash'),
  ], { previewAspect: 0.75, scene: 'portrait' }),
];
