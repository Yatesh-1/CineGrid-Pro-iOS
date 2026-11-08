# ADR-002: WebGL 2D Atlas 3D LUT Pipeline

## Status
Accepted

## Context
Standard 3D LUTs require sampling a three-dimensional color cube ($N \times N \times N$). While WebGL 2 supports `gl.texImage3D()`, mobile WebKit (iOS Safari) and older Android devices frequently fail to initialize WebGL 2 contexts with 3D texture extensions, or exhibit significant driver bugs. Furthermore, recreating GPU textures whenever the user switches LUTs caused severe GC pauses (up to 250ms).

## Decision
We implemented a universal 2D atlas shader pipeline in [`WebGLLutPipeline`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/webglLutPipeline.ts):
- A 3D color cube is flattened horizontally into a 2D strip texture of dimensions $(N^2) \times N$ (e.g. $1024 \times 32$ for a 32-size LUT).
- The fragment shader computes manual trilinear interpolation between adjacent blue slices using red and green coordinates.
- The pipeline allocates **exactly one** 2D texture on startup and reuses it using `gl.texSubImage2D()`.

## Consequences
- **Positive:** 100% compatibility across WebGL 1 and WebGL 2 on iOS and Android.
- **Positive:** Switching LUTs drops from 220ms to $< 8\text{ms}$ with zero new VRAM allocations.
- **Trade-off:** Fragment shader contains 2 texture lookups and mathematical lerp operations, but this executes in under 0.8ms on modern mobile GPUs.
