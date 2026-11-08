# Professional Composition Grids & Alignment Engine — CineGrid Pro

CineGrid Pro features a comprehensive collection of mathematical composition guides implemented in SVG via [`src/components/grid-engine/GridRenderer.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/grid-engine/GridRenderer.tsx) and defined in [`src/data/gridLibrary.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/data/gridLibrary.ts).

---

## 1. Composition Grid Catalog

CineGrid Pro includes over 25 distinct composition models organized across 5 specialized categories:

### A. Classical & Basic Composition
1. **Rule of Thirds (`rule_of_thirds`):** $3 \times 3$ grid dividing the frame at $33.3\%$ and $66.6\%$, with intersection target points for natural focal positioning.
2. **Golden Ratio (`golden_ratio`):** Divine proportion grid based on $\Phi \approx 1.618$, dividing the frame at $38.2\%$ and $61.8\%$ for harmonious balance.
3. **Golden Spiral (`golden_spiral`):** Logarithmic spiral based on $\Phi$, sweeping from the outer edge to a golden focal eye.
4. **Fibonacci Spiral (`fibonacci_spiral`):** Nested geometric proportion boxes ($1, 1, 2, 3, 5, 8$) guiding organic visual flow.
5. **Golden Triangles (`golden_triangles`):** Diagonal corner-to-corner axis intersected by perpendicular lines from opposite vertices.
6. **Dynamic Symmetry (`dynamic_symmetry`):** Root-rectangle reciprocal diagonals and baroque/sinister diagonal armatures for classical visual rhythm.
7. **Center Crosshair (`center_crosshair`):** Precision center reticle for symmetrical and architectural framing.
8. **Center Symmetry (`center_symmetry`):** Quadrant split with horizontal and vertical symmetry axes.
9. **Diagonal Composition (`diagonal_composition`):** $45^\circ$ diagonal lines creating dynamic tension and motion in street and landscape framing.
10. **Perspective / Vanishing Point (`perspective_grid`):** 3D converging perspective lines receding to an infinite vanishing point for hallways, roads, and architectural depth.

### B. Technical & Layout Guides
11. **Grid 4x4, 5x5, 6x6, 8x8, 10x10:** High-density matrix lines for technical documentation, flat lays, and product alignment.
12. **Safe Area Guides (`safe_area_guide`):** Broadcast standard $80\%$ title safe and $90\%$ action safe boundaries to prevent clipping on television displays and social media overlays.
13. **Horizon Level (`horizon_level`):** Dual horizontal reference lines preventing tilted ocean or landscape horizons.

### C. Portraiture & Human Alignment
14. **Portrait Eyeline (`portrait_eyeline`):** Horizontal reference positioned at upper-third level for natural eye placement.
15. **Portrait Headroom (`portrait_headroom`):** Oval head guide ensuring proper distance between subject's crown and top border.
16. **Portrait Head & Shoulder (`portrait_head_shoulder`):** Studio bust framing reference.
17. **Portrait Full Body (`portrait_full_body`):** Full-length fashion and editorial framing reference.

---

## 2. SVG Rendering Engine Architecture

### A. Resolution Independence & Vector Precision
All composition guides are rendered as pure SVG vector elements (`<svg viewBox="0 0 100 100" preserveAspectRatio="none">`). 
- Coordinates are defined in normalized percentage space ($0$ to $100$).
- Lines render with mathematical crispness regardless of whether the preview is on a 5-inch smartphone or a 32-inch 4K desktop monitor.
- Rendering is executed in a dedicated SVG overlay layer (`GridOverlay.tsx`), completely isolated from the camera canvas buffer. Switching grids never touches the camera stream.

### B. Custom Styling Engine (`GridCustomizerModal.tsx`)
Users can configure grid appearance with persistent state:
- **Color:** White, Amber Gold, Cyber Cyan, Neon Green, High-Vis Red, Subtle Gray.
- **Line Width:** 1px (Hairline), 2px (Standard), 3px (Bold).
- **Line Opacity:** 10% to 100%.
- **Line Style:** Solid or Dashed (`strokeDasharray="4 3"`).
- **Intersection Points:** Toggleable highlight dots at golden intersections.

---

## 3. Reference Photo Showcase (`GridReferenceModal.tsx`)

Every composition grid features 3 real-world sample photographs demonstrating exact photographic application:
- **Rule of Thirds:** Portrait, Landscape, Street Photography.
- **Golden Ratio:** Architecture, Environmental Portrait, Nature.
- **Golden Spiral:** Macro Flower, Food Plating, Editorial Portrait.
- **Golden Triangle:** Mountain Range, Architectural Angles, Street Photography.
- **Center Symmetry:** Symmetrical Building, Reflections, Product Photography.

Each card overlays the exact grid lines directly on the sample photograph and provides a technical breakdown of how the subject was framed.

---

## 4. Ghost Overlay Alignment Engine

The Ghost Overlay allows photographers to superimpose an existing photograph or sketch as a transparent guide over the live camera preview.

- **Source:** Loaded from the local device photo gallery or active photography session reference assets.
- **Controls:**
  - `opacity`: 0% to 100% opacity slider.
  - `scale`: 0.5x to 3.0x magnification.
  - `rotation`: 0° to 360° rotational orientation.
  - `offsetX` & `offsetY`: Multi-touch drag positioning.
  - `isLocked`: Freezes overlay geometry to prevent accidental movement during shooting.
- **Use Cases:** Before/After progression photography, architectural reconstruction matching, Stop-Motion animation onion-skinning, and brand consistency framing.
