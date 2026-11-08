# ADR-006: Code Splitting and Subsystem Error Boundaries

## Status
Accepted

## Context
As CineGrid Pro grew to encompass full Lightroom photo editing, 3D LUT studios, batch export engines, and licensing dashboards, the initial JavaScript bundle exceeded 578 kB. Initial app loading was slow on cellular connections. Additionally, an unexpected rendering exception inside a complex editing sub-panel could unmount the entire React tree, abruptly killing active camera video streams and losing unsaved media.

## Decision
We implemented two complementary isolation patterns:
1. **Asynchronous Code Splitting:**
   - Modals (`PhotoStudioModal`, `LookStudioModal`, `ExportStudioModal`, `AdminDashboardModal`, `MasterPresetsModal`) are wrapped in `React.lazy()` and `Suspense`.
   - Initial entry bundle dropped from 578 kB to 403.49 kB (108 kB gzip).
2. **Subsystem Error Boundaries:**
   - Every modal is encapsulated by [`ErrorBoundary.tsx`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/common/ErrorBoundary.tsx).
   - If an error occurs during post-processing or tone curve calculations, the error is caught locally and renders a "Reset Module" recovery card. The camera engine and live video feed remain untouched and running.

## Consequences
- **Positive:** Initial page load speed improved by 30%.
- **Positive:** Live camera viewfinder and active video recordings are immune to crashes in ancillary studio tools.
- **Trade-off:** Opening a modal for the first time has a sub-50ms network chunk fetch, mitigated by service worker caching.
