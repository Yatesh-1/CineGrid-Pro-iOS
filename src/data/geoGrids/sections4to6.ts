import type { GeoGridDefinition, GridAlias, Prim, Pt } from '../../types/gridGeometry';
import {
  DOT,
  G1,
  G2,
  L,
  P,
  R,
  circle,
  crossAt,
  ellipse,
  fitRect,
  gridDots,
  gridLines,
  hlines,
  lerp,
  person,
  rayThrough,
  rays,
  spiralPrims,
  vlines,
  wave,
} from '../../utils/gridGeometry/kit';
import { alias, def } from './define';

const THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;

/** Face oval (frame-height units) with an eye line, centre line and eye dots. */
const face = (cx: number, cy: number, h: number, A: number, tiltDeg = 0, k?: 'accent' | 'minor'): Prim[] => [
  P(ellipse(cx, cy, h * 0.39, h / 2, A, tiltDeg), true, k ?? 'accent'),
  L(cx - (h * 0.36) / A, cy - h * 0.08, cx + (h * 0.36) / A, cy - h * 0.08, 'minor'),
  DOT(cx - (h * 0.16) / A, cy - h * 0.08),
  DOT(cx + (h * 0.16) / A, cy - h * 0.08),
];

// ---------------- SECTION 4: PORTRAIT ----------------
export const SECTION4_ALIASES: GridAlias[] = [
  alias('Portrait Eye-Line Guide', 4, 'portrait_eyeline'),
  alias('Face Center Guide', 4, 'portrait_face_align'),
  alias('Headroom Guide', 4, 'portrait_headroom'),
  alias('Head and Shoulders Frame', 4, 'portrait_head_shoulder'),
  alias('Full-Body Portrait Frame', 4, 'portrait_full_body'),
];

const PORTRAIT = { previewAspect: 0.75, scene: 'portrait' as const };

export const SECTION4: GeoGridDefinition[] = [
  def('Portrait Rule of Thirds', 4, 'portrait', 'Thirds grid with the eye line on the upper third line and the face oval on the left-hand power point.', (A) => [
    ...gridLines(3, 3, 'minor'),
    L(0, THIRD, 1, THIRD, 'accent'),
    P(ellipse(THIRD, THIRD + 0.03, 0.15, 0.2, A), true, 'accent'),
    ...gridDots(3, 3),
  ], PORTRAIT),
  def('Portrait Golden Ratio', 4, 'portrait', 'Golden grid plus a golden spiral whose eye lands on the face.', (A) => [
    ...vlines([G1, G2], 'minor'),
    ...hlines([G1, G2], 'minor'),
    ...spiralPrims('tl', 'cw'),
    ...face(G1, G1, 0.3, A, 0, 'minor'),
  ], PORTRAIT),
  def('Face Symmetry Guide', 4, 'portrait', 'Centre axis with matched eye, nose and mouth bars to check a frontal face is level and balanced.', (A) => [
    L(0.5, 0, 0.5, 1, 'accent'),
    ...[0.38, 0.5, 0.62].map((y, i) => L(0.5 - (0.2 - i * 0.04) / A, y, 0.5 + (0.2 - i * 0.04) / A, y, 'minor')),
    P(ellipse(0.5, 0.5, 0.2, 0.28, A), true, 'minor'),
  ], PORTRAIT),
  def('Footroom Guide', 4, 'portrait', 'Bottom margin line and a band below it so feet and base are not cropped awkwardly.', () => [
    L(0.05, 0.92, 0.95, 0.92, 'accent'),
    R(0.05, 0.92, 0.9, 0.06, 'dash'),
    L(0.5, 0.08, 0.5, 0.92, 'minor'),
  ], PORTRAIT),
  def('Half-Body Portrait Frame', 4, 'portrait', 'Figure outline cropped at the waist with the head on the upper third.', (A) => person(0.5, 0.08, 0.25, A, 0.92), PORTRAIT),
  def('Three-Quarter Body Frame', 4, 'portrait', 'Figure outline cropped at mid-thigh, the classic “cowboy” shot.', (A) => person(0.5, 0.07, 0.17, A, 0.9), PORTRAIT),
  def('Environmental Portrait Grid', 4, 'portrait', 'Small full-length figure on the left third with a horizon and a dashed zone for the surroundings.', (A) => [
    ...person(THIRD, 0.34, 0.07, A, 0.9),
    L(0, 0.62, 1, 0.62, 'minor'),
    R(0.52, 0.12, 0.43, 0.76, 'dash'),
    ...vlines([THIRD, TWO_THIRDS], 'minor'),
  ], { previewAspect: 1.4, scene: 'portrait' }),
  def('Close-Up Face Frame', 4, 'portrait', 'Large face oval filling the frame with the eyes on the upper third.', (A) => [
    ...face(0.5, 0.48, 0.78, A),
    L(0, THIRD + 0.06, 1, THIRD + 0.06, 'accent'),
    ...vlines([THIRD, TWO_THIRDS], 'minor'),
  ], PORTRAIT),
  def('Eye-to-Eye Alignment', 4, 'portrait', 'Two faces looking at each other with a shared eye line and a centre gap.', (A) => [
    L(0, 0.4, 1, 0.4, 'accent'),
    ...face(0.27, 0.42, 0.36, A, 8, 'minor'),
    ...face(0.73, 0.42, 0.36, A, -8, 'minor'),
    L(0.5, 0.15, 0.5, 0.7, 'minor'),
  ], { previewAspect: 1.4, scene: 'portrait' }),
  def('Two-Person Portrait Grid', 4, 'portrait', 'Two half-length figures on the third lines with heads level.', (A) => [
    ...person(0.3, 0.14, 0.17, A, 0.9),
    ...person(0.7, 0.14, 0.17, A, 0.9),
    L(0, 0.14 + 0.085, 1, 0.14 + 0.085, 'minor'),
  ], { previewAspect: 1.2, scene: 'portrait' }),
  def('Couple Portrait Grid', 4, 'portrait', 'Two heads leaning together inside one shared oval for tight couple shots.', (A) => [
    ...face(0.42, 0.34, 0.26, A, 10, 'minor'),
    ...face(0.58, 0.38, 0.26, A, -10, 'minor'),
    P(ellipse(0.5, 0.45, 0.42, 0.34, A), true, 'accent'),
    L(0.5, 0.1, 0.5, 0.9, 'minor'),
  ], PORTRAIT),
  def('Group Portrait Grid', 4, 'portrait', 'Five head positions in a shallow arc with staggered shoulders for small groups.', (A) => {
    const heads: [number, number][] = [[0.2, 0.34], [0.35, 0.26], [0.5, 0.22], [0.65, 0.26], [0.8, 0.34]];
    return [...heads.flatMap(([x, y]) => person(x, y, 0.12, A, y + 0.12 * 2.4)), P([[0.1, 0.28], [0.5, 0.15], [0.9, 0.28]], false, 'dash')];
  }, { previewAspect: 1.4, scene: 'portrait' }),
  def('Seated Portrait Guide', 4, 'portrait', 'Figure cropped at the lap with a seat line and chair back outline.', (A) => [
    ...person(0.5, 0.14, 0.14, A, 0.68),
    L(0.15, 0.68, 0.85, 0.68, 'accent'),
    R(0.22, 0.3, 0.56, 0.52, 'dash'),
  ], PORTRAIT),
  def('Standing Portrait Guide', 4, 'portrait', 'Full-length figure on the left golden line with a ground line and headroom marker.', (A) => [
    ...person(G1, 0.06, 0.115, A, 0.95),
    L(0.05, 0.93, 0.95, 0.93, 'minor'),
    L(0.05, 0.05, 0.95, 0.05, 'dash'),
  ], PORTRAIT),
  def('Head Tilt Alignment Guide', 4, 'portrait', 'Upright axis with ±15° tilt axes so a deliberate head tilt can be matched on both sides.', (A) => {
    const axis = (deg: number): Prim => {
      const r = (deg * Math.PI) / 180;
      const dy = 0.45 * Math.cos(r);
      const dx = (0.45 * Math.sin(r)) / A;
      return L(0.5 - dx, 0.5 - dy, 0.5 + dx, 0.5 + dy, deg === 0 ? 'accent' : 'minor');
    };
    return [axis(0), axis(15), axis(-15), P(ellipse(0.5, 0.5, 0.19, 0.26, A), true, 'minor')];
  }, PORTRAIT),
  def('Portrait Negative Space Guide', 4, 'portrait', 'Subject on the left third with a dashed block of deliberate empty space on the right.', (A) => [
    ...person(0.28, 0.1, 0.2, A, 0.92),
    R(0.52, 0.1, 0.43, 0.8, 'dash'),
    L(THIRD, 0, THIRD, 1, 'minor'),
  ], PORTRAIT),
  def('Profile Portrait Guide', 4, 'portrait', 'Head in profile facing right with a dashed lead-room box in front of the nose.', (A) => {
    const unit: Pt[] = [[0.4, 0], [0.7, 0.04], [0.82, 0.18], [0.85, 0.34], [0.98, 0.5], [0.86, 0.54], [0.88, 0.62], [0.8, 0.7], [0.78, 0.82], [0.6, 0.92], [0.45, 1], [0.15, 0.9], [0.05, 0.5], [0.12, 0.15]];
    const h = 0.42;
    const pts = unit.map(([ux, uy]): Pt => [0.3 + (ux * h * 0.8) / A, 0.12 + uy * h]);
    return [P(pts, true, 'accent'), R(0.58, 0.14, 0.37, 0.36, 'dash'), L(0, 0.12 + h * 0.4, 1, 0.12 + h * 0.4, 'minor')];
  }, PORTRAIT),
  def('Side-Facing Portrait Guide', 4, 'portrait', 'Figure turned toward the left with the lead-room zone and a gaze arrow pointing into it.', (A) => [
    ...person(0.66, 0.08, 0.2, A, 0.92, 'left'),
    R(0.06, 0.1, 0.4, 0.8, 'dash'),
    L(0.55, 0.22, 0.2, 0.22, 'accent'),
    P([[0.26, 0.19], [0.2, 0.22], [0.26, 0.25]], false, 'accent'),
  ], PORTRAIT),
  def('Face Positioning Grid', 4, 'portrait', 'A face-sized box on the upper power point with nose cross and chin tick for repeatable headshots.', (A) => [
    ...gridLines(3, 3, 'minor'),
    R(THIRD - 0.17, THIRD - 0.13, 0.34, 0.4, 'accent'),
    ...crossAt(THIRD, THIRD + 0.05, 'minor'),
    ...face(THIRD, THIRD + 0.05, 0.3, A, 0, 'minor'),
  ], PORTRAIT),
  def('Portrait Symmetry Balance Grid', 4, 'portrait', 'Mirror axis with matched faces and matching side margins for symmetrical diptych-style framing.', (A) => [
    L(0.5, 0, 0.5, 1, 'accent'),
    ...face(0.27, 0.45, 0.4, A, 0, 'minor'),
    ...face(0.73, 0.45, 0.4, A, 0, 'minor'),
    R(0.05, 0.12, 0.9, 0.76, 'dash'),
  ], { previewAspect: 1.4, scene: 'portrait' }),
];

// ---------------- SECTION 5: LANDSCAPE ----------------
export const SECTION5_ALIASES: GridAlias[] = [
  alias('Landscape Rule of Thirds', 5, 'landscape_horizon_thirds'),
  alias('Landscape Golden Ratio', 5, 'landscape_golden_ratio'),
  alias('Mountain Peak Alignment', 5, 'landscape_mountain_align'),
  alias('Foreground-Midground-Background Grid', 5, 'landscape_foreground'),
  alias('Wildlife Placement Grid', 5, 'wildlife_tracking_frame'),
  alias('Panoramic Landscape Guide', 5, 'landscape_panoramic'),
];

const LAND = { previewAspect: 1.4, scene: 'landscape' as const };

export const SECTION5: GeoGridDefinition[] = [
  def('Landscape Golden Spiral', 5, 'landscape', 'Golden spiral with its eye at the upper right and a horizon on the lower golden line.', () => [...spiralPrims('tr', 'cw'), L(0, G2, 1, G2, 'minor')], LAND),
  def('Horizon Line Guide', 5, 'landscape', 'Horizon at the exact centre with ±3% level tolerance band and end ticks.', () => [
    L(0, 0.5, 1, 0.5, 'accent'),
    L(0, 0.47, 1, 0.47, 'dash'),
    L(0, 0.53, 1, 0.53, 'dash'),
    ...[0.1, 0.9].map((x) => L(x, 0.44, x, 0.56, 'minor')),
  ], LAND),
  def('Upper Horizon Guide', 5, 'landscape', 'Horizon on the upper third line: two thirds ground and foreground interest.', () => [L(0, THIRD, 1, THIRD, 'accent'), ...vlines([THIRD, TWO_THIRDS], 'minor'), R(0, THIRD, 1, TWO_THIRDS, 'dash')], LAND),
  def('Lower Horizon Guide', 5, 'landscape', 'Horizon on the lower third line: two thirds sky for clouds and light.', () => [L(0, TWO_THIRDS, 1, TWO_THIRDS, 'accent'), ...vlines([THIRD, TWO_THIRDS], 'minor'), R(0, 0, 1, TWO_THIRDS, 'dash')], LAND),
  def('Mountain Triangle Composition', 5, 'landscape', 'Triangle whose apex sits on an upper power point, base on the lower third with a horizon.', () => [
    P([[THIRD, 0.18], [-0.05, 0.7], [0.78, 0.7]], true, 'accent'),
    L(0, 0.7, 1, 0.7, 'minor'),
    DOT(THIRD, 0.18),
  ], LAND),
  def('Leading Lines Guide', 5, 'landscape', 'Rays converging on the right-hand lower power point to lead the eye into the scene.', () => {
    const vx = TWO_THIRDS;
    const vy = 0.55;
    return [L(0, vy, 1, vy, 'minor'), rayThrough(vx, vy, 0, 1, 'accent'), rayThrough(vx, vy, 0.3, 1), rayThrough(vx, vy, 0.6, 1), rayThrough(vx, vy, 1, 1), DOT(vx, vy)];
  }, LAND),
  def('Diagonal Landscape Grid', 5, 'landscape', 'A rising diagonal band from lower left to upper right with thirds nodes.', () => [L(0, 1, 1, 0, 'accent'), L(0, 0.8, 0.8, 0, 'minor'), L(0.2, 1, 1, 0.2, 'minor'), ...gridDots(3, 3)], LAND),
  def('River Flow Composition', 5, 'landscape', 'An S-curve running from the lower foreground to a vanishing point at the upper third.', () => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push([0.5 + 0.28 * Math.sin(t * Math.PI * 2.2) * (1 - t * 0.7), 1 - t * 0.7]);
    }
    return [P(pts, false, 'accent'), L(0, 0.3, 1, 0.3, 'minor'), DOT(pts[pts.length - 1][0], pts[pts.length - 1][1])];
  }, LAND),
  def('Water Reflection Symmetry', 5, 'landscape', 'Waterline at the centre with mirrored thirds lines above and below and ripple ticks.', () => [
    L(0, 0.5, 1, 0.5, 'accent'),
    ...hlines([0.5 - 1 / 6, 0.5 + 1 / 6], 'minor'),
    ...vlines([THIRD, TWO_THIRDS], 'minor'),
    P(wave(0.012, 6, 0.56), false, 'dash'),
    P(wave(0.012, 6, 0.62), false, 'dash'),
  ], LAND),
  def('Sky-to-Land Ratio Guide', 5, 'landscape', 'Three candidate horizons: 1:2, 1:1 and 2:1 sky to land, with the middle one emphasised.', () => [L(0, THIRD, 1, THIRD, 'minor'), L(0, 0.5, 1, 0.5, 'accent'), L(0, TWO_THIRDS, 1, TWO_THIRDS, 'minor'), ...[THIRD, 0.5, TWO_THIRDS].map((y) => L(0, y - 0.015, 0, y + 0.015)), ...[THIRD, 0.5, TWO_THIRDS].map((y) => L(0.02, y - 0.02, 0.02, y + 0.02))], LAND),
  def('Natural Frame Guide', 5, 'landscape', 'Dashed arch over the top and sides marking where branches or rock should frame the scene.', () => {
    const top: Pt[] = [];
    for (let i = 0; i <= 30; i++) {
      const a = Math.PI * (i / 30);
      top.push([0.5 - 0.46 * Math.cos(a), 0.32 - 0.26 * Math.sin(a) + 0.1]);
    }
    return [P([[0.04, 1], [0.04, 0.42], ...top, [0.96, 0.42], [0.96, 1]], false, 'accent'), R(0.18, 0.2, 0.64, 0.62, 'dash')];
  }, LAND),
  def('Tree Alignment Guide', 5, 'landscape', 'Trunk band on the left third with a canopy circle and ground line.', (A) => [
    R(THIRD - 0.025, 0.4, 0.05, 0.55, 'accent'),
    circle(THIRD, 0.28, 0.2, A, 'accent'),
    L(0, 0.95, 1, 0.95, 'minor'),
    L(TWO_THIRDS, 0, TWO_THIRDS, 1, 'minor'),
  ], LAND),
  def('Forest Depth Grid', 5, 'landscape', 'Tree lines in three depth rows, each smaller and nearer the horizon, converging to a vanishing point.', () => {
    const out: Prim[] = [L(0, 0.55, 1, 0.55, 'minor')];
    const rows: [number, number, number][] = [[0.92, 0.46, 4], [0.75, 0.3, 6], [0.62, 0.18, 8]];
    for (const [yBase, height, n] of rows) {
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) / n;
        out.push(L(x, yBase, x, yBase - height, 'accent'));
      }
    }
    return out;
  }, LAND),
  def('Coastal Composition Grid', 5, 'landscape', 'Horizon on the upper third and a diagonal shoreline from lower left to the right third.', () => [L(0, THIRD, 1, THIRD, 'minor'), P([[0, 0.95], [0.4, 0.78], [0.72, 0.58], [1, 0.5]], false, 'accent'), ...vlines([THIRD, TWO_THIRDS], 'minor'), DOT(TWO_THIRDS, THIRD)], LAND),
  def('Lake Reflection Grid', 5, 'landscape', 'Shoreline on the lower golden line with the reflection mirrored below it.', () => [L(0, G2, 1, G2, 'accent'), L(0, G2 + (G2 - G1) * 0.5, 1, G2 + (G2 - G1) * 0.5, 'dash'), L(0, G1, 1, G1, 'minor'), ...vlines([G1, G2], 'minor')], LAND),
  def('Waterfall Composition Guide', 5, 'landscape', 'Falling-water strip on the right third from cliff edge to plunge pool.', (A) => [
    R(TWO_THIRDS - 0.05, 0.12, 0.1, 0.62, 'accent'),
    P(ellipse(TWO_THIRDS, 0.8, 0.14, 0.06, A), true, 'accent'),
    L(0, 0.12, 0.62, 0.12, 'minor'),
    L(THIRD, 0, THIRD, 1, 'minor'),
  ], LAND),
  def('Sun Position Guide', 5, 'landscape', 'Sun disc on the upper-right power point with rays and a horizon on the lower third.', (A) => {
    const out: Prim[] = [circle(TWO_THIRDS, THIRD, 0.11, A, 'accent'), L(0, TWO_THIRDS, 1, TWO_THIRDS, 'minor')];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      out.push(L(TWO_THIRDS + (0.15 * Math.cos(a)) / A, THIRD + 0.15 * Math.sin(a), TWO_THIRDS + (0.22 * Math.cos(a)) / A, THIRD + 0.22 * Math.sin(a), 'minor'));
    }
    return out;
  }, LAND),
  def('Moon Position Guide', 5, 'landscape', 'Small moon disc on the upper-left power point with a wide empty sky region.', (A) => [circle(THIRD, 0.25, 0.07, A, 'accent'), ...gridLines(3, 3, 'minor'), R(0.5, 0.05, 0.45, 0.4, 'dash')], LAND),
  def('Landscape Negative Space Grid', 5, 'landscape', 'Thirds grid with the top two-thirds shaded as open sky and a small subject zone low in the frame.', () => [...gridLines(3, 3, 'minor'), R(0, 0, 1, TWO_THIRDS, 'dash'), R(THIRD, 0.7, THIRD, 0.25, 'accent')], LAND),
];

// ---------------- SECTION 6: ARCHITECTURE ----------------
export const SECTION6_ALIASES: GridAlias[] = [
  alias('Architectural Symmetry Grid', 6, 'arch_building_symmetry'),
  alias('Vanishing Point Guide', 6, 'vanishing_point_guide'),
  alias('Vertical Alignment Grid', 6, 'arch_vertical_correction'),
  alias('Horizontal Alignment Grid', 6, 'horizontal_alignment'),
  alias('Building Facade Grid', 6, 'arch_facade_divisions'),
];

const ARCH = { previewAspect: 0.9, scene: 'architecture' as const };

export const SECTION6: GeoGridDefinition[] = [
  def('Architecture Rule of Thirds', 6, 'architecture', 'Thirds grid with doubled plumb lines so verticals can be checked against two references.', () => [...gridLines(3, 3, 'minor'), ...vlines([THIRD - 0.01, THIRD + 0.01, TWO_THIRDS - 0.01, TWO_THIRDS + 0.01], 'accent')], ARCH),
  def('One-Point Perspective', 6, 'architecture', 'Single vanishing point at eye level with converging rays to the frame edge and a horizon.', () => [L(0, 0.45, 1, 0.45, 'accent'), ...rays(0.5, 0.45, 16, 'minor'), DOT(0.5, 0.45)], ARCH),
  def('Two-Point Perspective', 6, 'architecture', 'Two off-frame vanishing points on one horizon; edges converge left and right with a vertical corner line.', () => {
    const vl: Pt = [-0.6, 0.45];
    const vr: Pt = [1.6, 0.45];
    const out: Prim[] = [L(0, 0.45, 1, 0.45, 'accent'), L(0.5, 0.05, 0.5, 0.95, 'accent')];
    for (const y of [0.1, 0.25, 0.65, 0.8, 0.95]) {
      out.push(L(0.5, y, vl[0], vl[1], 'minor'), L(0.5, y, vr[0], vr[1], 'minor'));
    }
    return out;
  }, { previewAspect: 1.2, scene: 'architecture' }),
  def('Three-Point Perspective', 6, 'architecture', 'Two horizon vanishing points plus a third far above, so verticals converge when looking up.', () => {
    const out: Prim[] = [L(0, 0.6, 1, 0.6, 'minor')];
    for (const x of [0.15, 0.35, 0.65, 0.85]) out.push(L(x, 1, 0.5 + (x - 0.5) * 0.15, -1.2, 'accent'));
    for (const y of [0.7, 0.85]) out.push(L(0, y, 1.4, 0.6, 'minor'), L(1, y, -0.4, 0.6, 'minor'));
    return out;
  }, ARCH),
  def('Window Repetition Grid', 6, 'architecture', 'Four-by-three block of equal window cells with gutters for repeating facade elements.', () => {
    const out: Prim[] = [];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) out.push(R(0.08 + c * 0.22, 0.1 + r * 0.29, 0.16, 0.2, 'minor'));
    return [...out, R(0.04, 0.06, 0.92, 0.88, 'accent')];
  }, ARCH),
  def('Architectural Diagonal Grid', 6, 'architecture', 'True 45° hatch in both directions for checking leaning lines and angular façades.', (A) => {
    const out: Prim[] = [];
    for (let i = -5; i <= 5; i++) {
      const o = i * 0.2;
      out.push(L(o, 0, o + 1 / A, 1, 'minor'), L(o + 1 / A, 0, o, 1, 'minor'));
    }
    return [...out, L(0, 0, 1, 1, 'accent'), L(1, 0, 0, 1, 'accent')];
  }, ARCH),
  def('Building Center Guide', 6, 'architecture', 'Centre axis, base line and an apex triangle for centred landmark shots.', () => [L(0.5, 0, 0.5, 1, 'accent'), L(0.06, 0.9, 0.94, 0.9, 'accent'), P([[0.5, 0.06], [0.2, 0.3], [0.8, 0.3]], true, 'minor'), L(0.2, 0.3, 0.2, 0.9, 'minor'), L(0.8, 0.3, 0.8, 0.9, 'minor')], ARCH),
  def('Staircase Perspective Grid', 6, 'architecture', 'Rising stair edges: treads spaced by a shrinking ratio toward a vanishing point at the upper right.', () => {
    const out: Prim[] = [L(0, 1, 0.7, 0.3, 'accent'), L(0.3, 1, 0.7, 0.3, 'minor')];
    let y = 0.96;
    let step = 0.14;
    for (let i = 0; i < 7; i++) {
      const t = (1 - y) / 0.7;
      out.push(L(lerp(0, 0.7, t), y, lerp(0.3, 0.7, t), y, 'minor'));
      y -= step;
      step *= 0.8;
    }
    return out;
  }, ARCH),
  def('Corridor Perspective Grid', 6, 'architecture', 'Nested rectangles converging on a centre vanishing point with corner rays: a tunnel view.', () => {
    const out: Prim[] = [];
    for (const s of [0.08, 0.22, 0.4, 0.62, 1]) out.push(R(0.5 - 0.5 * s, 0.5 - 0.5 * s, s, s, s === 0.08 ? 'accent' : 'minor'));
    out.push(L(0, 0, 0.46, 0.46), L(1, 0, 0.54, 0.46), L(0, 1, 0.46, 0.54), L(1, 1, 0.54, 0.54));
    return out;
  }, ARCH),
  def('Ceiling Perspective Guide', 6, 'architecture', 'Looking up: beams spaced by decreasing steps and rays meeting a vanishing point at the lower centre.', () => {
    const out: Prim[] = [...rays(0.5, 0.82, 14, 'minor').filter((p) => p.t === 'l' && p.y2 < 0.8)];
    let y = 0.7;
    let step = 0.22;
    for (let i = 0; i < 5; i++) {
      out.push(L(0, y, 1, y, 'accent'));
      y -= step;
      step *= 0.62;
    }
    return out;
  }, ARCH),
  def('Interior Architecture Grid', 6, 'architecture', 'Three-wall room box: back wall rectangle with floor, ceiling and corner lines.', () => [R(0.25, 0.25, 0.5, 0.45, 'accent'), L(0, 0, 0.25, 0.25), L(1, 0, 0.75, 0.25), L(0, 1, 0.25, 0.7), L(1, 1, 0.75, 0.7), L(0.5, 0.25, 0.5, 0.7, 'minor')], ARCH),
  def('Exterior Architecture Grid', 6, 'architecture', 'Low horizon, ground plane and a building block on the left third with sky margin above.', () => [L(0, 0.72, 1, 0.72, 'accent'), R(0.1, 0.18, 0.4, 0.54, 'accent'), L(THIRD, 0, THIRD, 1, 'minor'), L(0.1, 0.08, 0.9, 0.08, 'dash')], ARCH),
  def('Column Alignment Grid', 6, 'architecture', 'Seven equally spaced verticals with capital and base ticks for colonnades and arcades.', () => {
    const out: Prim[] = [];
    for (let i = 0; i < 7; i++) {
      const x = (i + 0.5) / 7;
      out.push(L(x, 0.12, x, 0.88, 'accent'), L(x - 0.025, 0.12, x + 0.025, 0.12, 'minor'), L(x - 0.025, 0.88, x + 0.025, 0.88, 'minor'));
    }
    return out;
  }, ARCH),
  def('Frame Within Frame Architecture', 6, 'architecture', 'Door or arch opening at 62% of the frame with a thicker surround inside the border.', () => [R(0.02, 0.02, 0.96, 0.96, 'minor'), P([[0.19, 0.9], [0.19, 0.38], [0.5, 0.1], [0.81, 0.38], [0.81, 0.9]], false, 'accent'), L(0.19, 0.9, 0.81, 0.9, 'accent')], ARCH),
  def('Architectural Golden Ratio', 6, 'architecture', 'Golden grid with a φ-proportioned façade rectangle centred in the frame.', (A) => {
    const r = fitRect(1 / 1.618, A, 0.82);
    return [...vlines([G1, G2], 'minor'), ...hlines([G1, G2], 'minor'), R(r.x, r.y, r.w, r.h, 'accent')];
  }, ARCH),
];

