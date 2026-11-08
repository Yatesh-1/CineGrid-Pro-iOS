# Portrait Mode, Mirror Transformation & Orientation Handling — CineGrid Pro

This document explains the technical implementation of front/rear camera flipping, mirror selfie transformations, aspect ratio cropping mathematics, and portrait depth blur.

---

## 1. Mirror Selfie Transformation Architecture

### A. The Mirror Problem in Mobile Photography
When using a front-facing selfie camera, users expect the live preview to behave like a physical mirror (reflected horizontally). However, when taking a photograph, users typically expect the saved image to represent true physical orientation (unmirrored) unless explicitly configured otherwise.

### B. Implementation in Viewfinder vs Capture
In CineGrid Pro, mirroring is decoupled between the presentation layer and the rasterization capture layer:
1. **Live Preview Mirroring (`Viewfinder.tsx`):**
   When `isFrontCamera` is `true`, CSS `transform: scaleX(-1)` is applied strictly to the `<video>` element and the `<canvas>` shader layer:
   ```tsx
   style={{
     ...previewFilterStyle,
     transform: `${previewFilterStyle.transform} ${isFrontCamera ? 'scaleX(-1)' : ''}`,
   }}
   ```
2. **Composition Grids Remain Unmirrored:**
   The composition grid overlays (`GridOverlay.tsx`) are mounted in an independent container above the video feed and are **never** mirrored. This ensures that the Golden Spiral and asymmetric diagonal guides retain their true geometric direction regardless of camera facing.
3. **Saved Capture Rasterization (`shaders.ts`):**
   When capturing a photo:
   - Rear camera: Rendered directly to the capture canvas.
   - Front camera: If selfie mirroring is enabled, the canvas context is flipped horizontally (`ctx.scale(-1, 1); ctx.drawImage(source, -cropW, 0);`) before rasterization.

---

## 2. Aspect Ratio Crop Mathematics

CineGrid Pro supports 9 professional photo and cinema aspect ratios: `1:1`, `4:3`, `3:2`, `4:5`, `5:4`, `9:16`, `16:9`, `2.35:1`, `2.39:1`, and `21:9`.

In [`src/utils/shaders.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/shaders.ts), center-crop coordinates are calculated to preserve the highest possible sensor resolution without stretching:

$$\text{targetRatio} = \frac{\text{Width}}{\text{Height}}$$

```ts
let cropW = srcW;
let cropH = srcW / targetRatio;

if (cropH > srcH) {
  cropH = srcH;
  cropW = srcH * targetRatio;
}

const cropX = Math.round((srcW - cropW) / 2);
const cropY = Math.round((srcH - cropH) / 2);

canvas.width = Math.round(cropW);
canvas.height = Math.round(cropH);

ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
```

---

## 3. Portrait Depth Blur & Bokeh Simulation

### A. Current Implementation: Focal Depth Vignette
In [`src/utils/shaders.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/shaders.ts), CineGrid Pro provides an analog optical depth blur:
- When a portrait filter is active (e.g. `Soft Portrait`, `Velvet Skin Glow`), a center-weighted focal mask is computed.
- The center focus ellipse remains sharp, while a radial Gaussian blur with gentle peripheral attenuation is applied to background edges.

### B. Hardware Depth Map Segmentation (Status & Limitations)
- W3C MediaStreams currently do not expose native dual-camera depth maps (LiDAR / TrueDepth) in standard mobile WebViews.
- Complete AI background segmentation (via MediaPipe Selfie Segmentation or CoreML Vision) is cataloged in [`ROADMAP.md`](./ROADMAP.md) for native Capacitor plugins.
