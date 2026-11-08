# Professional Filters & 3D LUT Color Engine — CineGrid Pro

The Look & Color Engine in CineGrid Pro provides real-time 3D LUT color grading inspired by **Blackmagic Camera** and **VN Editor**. It processes 3D color cubes entirely within a GPU WebGL shader pipeline, offering zero-latency live grading, before/after split wipe comparison, custom `.cube` importing, and standard `.cube` file export.

---

## 1. Built-in 3D LUT & Filter Catalog

### A. 12 Cinema-Grade 3D LUTs ([`src/data/lutLibrary.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/data/lutLibrary.ts))
1. **Teal & Orange Hollywood (`cine_teal_orange`):** Blockbuster cinema contrast with cyan shadows and golden skin tones.
2. **Kodak Vision 5207 (`film_kodak_vision`):** Authentic 35mm motion picture film stock with rich warm highlights.
3. **Fuji Pro 400H Soft (`film_fuji_pro400h`):** Gentle pastel greens, soft tonal roll-off, and luminous portrait skin tones.
4. **Tokyo Cyber Neon (`cine_tokyo_cyber`):** High-saturation electric magentas and cyans for nighttime cityscapes.
5. **Golden Hour Glow (`land_golden_hour`):** Radiant amber sunset grading with rich golden highlights.
6. **70s Polaroid Vintage (`vint_polaroid_70s`):** Lifted black level with nostalgic sepia-gold fade.
7. **Film Noir B&W (`bw_film_noir`):** Deep monochrome with crushed shadow densities.
8. **Velvet Skin Glow (`port_velvet_skin`):** Flattering warm midtones tailored for human skin tones.
9. **Moody Forest Green (`land_moody_forest`):** Desaturated earthy greens with deep pine shadows.
10. **Bleach Bypass 300 (`cine_bleach_bypass`):** Retained silver emulsion look with high contrast and desaturated midtones.
11. **Sunset Horizon (`land_sunset_horizon`):** Saturated crimson and violet sky gradation.
12. **Silver Gelatin Fine Art (`bw_silver_gelatin`):** Silvery monochrome highlights and smooth archival grayscale tonality.

### B. 12 Look Filters ([`src/data/filterLibrary.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/data/filterLibrary.ts))
Includes: `Clean Natural`, `Cinematic Warm`, `Cinematic Cool`, `Kodak-inspired Film`, `Fuji-inspired Film`, `Vintage Fade`, `Teal & Orange`, `Soft Portrait`, `Moody Shadows`, `Black & White`, `High Contrast`, and `Golden Hour`.

---

## 2. `.CUBE` Format Specifications & Validation

CineGrid Pro supports the industry-standard Adobe / DaVinci Resolve `.cube` 3D format:
- **Dimensions:** Supported table dimensions between 2 and 65 (Standard sizes: 17x17x17, 33x33x33, 65x65x65).
- **Supported Headers:**
  - `TITLE "LUT Name"`
  - `LUT_3D_SIZE N`
  - `DOMAIN_MIN R G B` (Defaults to 0.0 0.0 0.0)
  - `DOMAIN_MAX R G B` (Defaults to 1.0 1.0 1.0)
- **Validation Safeguards (`cubeParser.ts`):**
  1. **25MB File Size Limit:** Rejects files exceeding 25MB to prevent browser heap out-of-memory crashes.
  2. **Dimension Check:** Rejects 1D LUT formats (`LUT_1D_SIZE`) and dimensions $<2$ or $>65$.
  3. **Numerical Integrity:** Validates that all lines contain 3 real numbers. Rejects `NaN`, `Infinity`, or non-numeric tokens.
  4. **Row Count Match:** Verifies that exactly $N \times N \times N$ color points exist in the data table.

---

## 3. Asynchronous Web Worker Architecture ([`src/utils/cubeParserAsync.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/cubeParserAsync.ts))

Parsing a 65x65x65 LUT requires reading $274,625$ lines and converting 823,875 string tokens to floats. To keep the camera preview running at a locked 60 FPS without dropping frames:

1. `parseCubeFileAsync` launches an inline Blob Web Worker.
2. The entire string parsing, validation, float table normalization, and dynamic thumbnail gradient generation runs on the background thread.
3. The resulting `Float32Array` is transferred to the main thread via **Transferable Objects** (`[floatData.buffer]`), copying zero memory.
4. If Web Workers are restricted by browser policy, the engine falls back to non-blocking microtask chunking.

---

## 4. GPU WebGL Shader Pipeline ([`src/utils/webglLutPipeline.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/webglLutPipeline.ts))

### A. 2D Texture Atlas Packing
WebGL 1.0 and standard mobile WebViews do not have universal support for 3D textures (`gl.TEXTURE_3D`). CineGrid Pro packs an $N \times N \times N$ 3D LUT into an $N^2 \times N$ 2D texture atlas:
- Width = $N \times N$
- Height = $N$
- Each horizontal slice represents a 2D red/green plane for a specific blue slice.

### B. Trilinear Shader Interpolation
In the fragment shader, arbitrary $(R, G, B)$ coordinates are sampled by identifying the two bounding blue slices $B_0 = \lfloor B \times (N - 1) \rfloor$ and $B_1 = \min(N - 1, B_0 + 1)$. Half-texel offsets are applied to prevent edge bleeding:
```glsl
vec2 computeSliceCoord(float r, float g, float bSlice, float size) {
  float sliceWidth = size;
  float totalWidth = size * size;
  float u = (bSlice * sliceWidth + r * (size - 1.0) + 0.5) / totalWidth;
  float v = (g * (size - 1.0) + 0.5) / size;
  return vec2(u, v);
}
```
The two 2D samples are blended using fractional blue:
$$\text{Color}_{\text{LUT}} = \text{mix}(\text{Sample}_0, \text{Sample}_1, \text{fract}(B \times (N - 1)))$$

### C. Live LUT Intensity & Adjustments
The LUT is blended with the original sensor frame using the intensity slider:
$$\text{Color}_{\text{graded}} = \text{mix}(\text{Color}_{\text{raw}}, \text{Color}_{\text{LUT}}, \text{Intensity})$$
Adjustments for Exposure ($2^{\text{EV}}$), Contrast, Saturation, Temperature, Tint, Highlights, Shadows, and Fade are computed in the same shader pass.

### D. Before/After Split Comparison
The shader tests the fragment's horizontal coordinate $x$ against the split line position `u_compareSplit`:
- Left of split: Renders untouched sensor image (`Color_raw`).
- Right of split: Renders fully graded look (`Color_graded`).
- A 2px amber divider line with `RAW` and `LOOK` badges is rendered over the split position.

---

## 5. Storage, Caching & Re-Export

1. **IndexedDB Persistence:** Custom imported LUTs and their raw `.cube` text are saved in IndexedDB (`CineGridLutStore`).
2. **LRU Texture Cache:** The WebGL pipeline caches up to 6 GPU textures. Oldest textures are released via `gl.deleteTexture` upon eviction.
3. **Export Grade as `.cube` (`exportLookAsCube`):**
   - The user can export their current live grade (base LUT + adjustments) into a standard 33x33x33 `.cube` file.
   - The engine iterates through $33 \times 33 \times 33$ lattice coordinates, evaluates the LUT and adjustments, and downloads a clean, valid `.cube` file compatible with DaVinci Resolve, Premiere Pro, and Final Cut Pro.
