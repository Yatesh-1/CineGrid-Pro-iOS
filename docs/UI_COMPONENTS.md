# UI Component Directory and Design System

CineGrid Pro's user interface is constructed from modular, decoupled React components organized by operational domain. The design language combines the ergonomics of high-end cinema hardware (Blackmagic Camera, ARRI) with modern touch-first interfaces.

---

## 1. Component Hierarchy Overview

```mermaid
graph TD
    App[App.tsx / Camera Studio Root] --> Nav[MainNavigationBar]
    App --> VF[Viewfinder]
    App --> HUD[ProHUD]
    App --> Shutter[ShutterDock]
    App --> Overlays[Active Overlays]

    VF --> Grid[GridOverlay]
    VF --> Ghost[GhostOverlayView]
    VF --> Focus[TapToFocus Indicator]
    VF --> Slider[BeforeAfterSlider]

    HUD --> AudioMeter[BlackmagicAudioMeter]
    HUD --> PillPop[BlackmagicPillPopover]
    HUD --> QuickPresets[BlackmagicQuickPresets]

    Overlays --> Modals[Modals & Subsystems (Lazy Loaded)]
    Modals --> LookModal[LookStudioModal]
    Modals --> StudioModal[PhotoStudioModal]
    Modals --> ExportModal[ExportStudioModal]
    Modals --> GalleryModal[GalleryModal]
    Modals --> AdminModal[AdminDashboardModal]
```

---

## 2. Core Viewport & Camera Components

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| `Viewfinder` | [`src/components/Viewfinder.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/Viewfinder.tsx) | Houses the primary `<video>` element, WebGL `<canvas>`, touch gesture listeners, tap-to-focus ring, and virtual horizon level. |
| `GridOverlay` | [`src/components/GridOverlay.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/GridOverlay.tsx) | SVG composition grid overlay rendering lines, thirds, golden spirals, triangles, and safe zones. |
| `GridRenderer` | [`src/components/grid-engine/GridRenderer.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/grid-engine/GridRenderer.tsx) | Mathematical engine converting grid parameters into SVG paths and coordinate matrices. |
| `BeforeAfterSlider` | [`src/components/BeforeAfterSlider.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/BeforeAfterSlider.tsx) | Interactive split-screen wipe handle allowing users to drag across the viewport to compare LUT grade vs raw feed. |
| `ZoomControl` | [`src/components/ZoomControl.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/ZoomControl.tsx) | Multi-stop zoom stepper (`1x`, `2x`, `5x`, `10x`) and pinch-to-zoom gesture interpreter. |
| `TickDial` | [`src/components/TickDial.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/TickDial.tsx) | Tactile horizontal ruler dial for fine manual adjustments (EV compensation, White Balance Kelvin). |

---

## 3. Heads-Up Display (HUD) & Navigation

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| `MainNavigationBar` | [`src/components/navigation/MainNavigationBar.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/navigation/MainNavigationBar.tsx) | Persistent top bar displaying session tag, battery meter, license badge, timecode clock, and drawer toggles. |
| `ProHUD` | [`src/components/ProHUD.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/ProHUD.tsx) | Blackmagic-style interactive telemetry pills: FPS, Shutter Speed/Angle, ISO, White Balance, EV, Codec. |
| `BlackmagicAudioMeter` | [`src/components/hud/BlackmagicAudioMeter.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/hud/BlackmagicAudioMeter.tsx) | Real-time stereo VU meter with dB graduation marks ($-48\text{ dB}$ to $0\text{ dB}$) and peak hold indicator. |
| `BlackmagicPillPopover` | [`src/components/hud/BlackmagicPillPopover.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/hud/BlackmagicPillPopover.tsx) | Interactive slider and segmented options card triggered by tapping any telemetry pill. |
| `ShutterDock` | [`src/components/ShutterDock.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/ShutterDock.tsx) | Primary trigger dock: shutter button (photo capture / video record), gallery thumbnail, mode selector, ghost overlay toggle. |

---

## 4. Studio Modals & Drawers

### A. Color & LUT Studio
- **`LookStudioModal`** ([`src/components/look/LookStudioModal.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/look/LookStudioModal.tsx)): Complete LUT management workspace. Browse 12 built-in cinema LUTs, import custom `.cube` files (17x, 33x, 65x), adjust LUT opacity/intensity, create custom look presets, and export modified grades as `.cube` files.

### B. Photo Editing Studio
- **`PhotoEditorModal` / `StudioWorkspace`** ([`src/components/studio/StudioWorkspace.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/studio/StudioWorkspace.tsx)): Lightroom-inspired post-processing workspace with panels:
  - `LightPanel`: Exposure, Contrast, Highlights, Shadows, Whites, Blacks.
  - `ColorPanel`: Temperature, Tint, Vibrance, Saturation.
  - `ToneCurveEditor`: Interactive spline curves for RGB, Red, Green, Blue channels.
  - `HslMixer`: Individual Hue, Saturation, and Luminance sliders for 8 distinct color channels.
  - `ColorWheel`: Professional 3-way color balance wheels (Lift / Gamma / Gain).
  - `DetailOpticsPanel`: Texture, Clarity, Dehaze, Vignette, and Grain simulation.
  - `GeometryPanel`: Crop ratios, rotation angle, horizontal/vertical perspective correction.
  - `MaskingPanel`: Radial and linear gradient adjustments.

### C. Ghost Overlay System
- **`GhostOverlayDrawer` & `GhostOverlayView`** ([`src/components/ghost/GhostOverlayView.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/ghost/GhostOverlayView.tsx)): Allows selecting an existing image from the gallery to project transparently over the live camera preview. Supports two-finger pinch-to-scale, pan, rotate, and 0%–100% opacity tuning.

### D. Export & Session Systems
- **`ExportStudioModal`** ([`src/components/export/ExportStudioModal.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/export/ExportStudioModal.tsx)): Multi-format batch export engine (JPEG, PNG, WebP) with resolution scaling and watermark insertion.
- **`SessionsManagerModal`** ([`src/components/sessions/SessionsManagerModal.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/sessions/SessionsManagerModal.tsx)): Client photography session manager tracking shoot names, locations, target shot counts, and progress bars.

### E. Licensing Subsystems
- **`WelcomeActivationScreen`**, **`AdminDashboardModal`**, **`LicenseInfoModal`**, **`ContactAdminModal`**: Full client license onboarding, machine entitlement status, key activation, and administrative license generation.
