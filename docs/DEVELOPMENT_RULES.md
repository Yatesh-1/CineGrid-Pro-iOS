# Engineering Rules and Development Standards

All contributors and AI coding agents working on CineGrid Pro must adhere to the engineering standards detailed below.

---

## 1. Code Integrity & Type Safety

1. **Strict TypeScript Standards:**
   - All public interfaces, functions, and props must be strictly typed.
   - Avoid `any`. If a dynamic type is necessary, use `unknown` with type guards.
2. **Comment and Docstring Preservation:**
   - Maintain documentation integrity. Preserve existing comments, JSDocs, and architectural headers unless explicitly instructed by the user.
3. **No Unsanitized HTML:**
   - `dangerouslySetInnerHTML` is prohibited. Always render dynamic text using standard JSX curly braces.

---

## 2. Component & UI Architecture

1. **Lazy Loading for Ancillary Subsystems:**
   - Any modal or tool not visible on the default viewfinder screen (e.g. `PhotoEditorModal`, `LookStudioModal`, `ExportStudioModal`, `AdminDashboardModal`) must be loaded asynchronously using `lazy()` and `Suspense`.
2. **Subsystem Error Boundaries:**
   - Modals and drawers must be wrapped with [`ErrorBoundary`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/components/common/ErrorBoundary.tsx) to ensure rendering errors do not crash the live camera stream.
3. **Mobile-First Touch Ergonomics:**
   - Touch targets must measure at least $44 \times 44\text{ px}$.
   - Elements must implement safe-area insets (`.safe-top`, `.safe-bottom`) to avoid notch and home indicator clipping.

---

## 3. Resource & Memory Hygiene

1. **Ownership Lifecycle Registration:**
   - Any WebGL texture, WebGL program, MediaStream track, AudioContext, timer, or DOM event listener must be registered in [`ResourceManager`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/resourceManager.ts) with an explicit `ownerId`.
   - Components must trigger `resourceManager.releaseByOwner(ownerId)` during unmounting.
2. **Zero Base64 Thrashing:**
   - Captured photos must be stored as binary Blobs in IndexedDB via `mediaStorageService.savePhoto()`.
   - Base64 data URLs must never be stored in persistent LocalStorage or large component state arrays.
3. **Zero-Allocation GPU Textures:**
   - The WebGL LUT atlas texture must be updated using `gl.texSubImage2D()`. Do not call `gl.createTexture()` on every user interaction.

---

## 4. Testing & Quality Gates

1. **Automated Test Coverage:**
   - Every new singleton service or utility algorithm must be covered by a corresponding test file in `src/test/unit/` or `src/test/components/`.
2. **Mandatory Quality Gates:**
   - Before completing any task or push, run the three mandatory checks:
     ```bash
     npm run lint    # Oxlint must return 0 errors
     npm test        # All 90 tests must pass in Vitest
     npm run build   # TypeScript and Vite build must compile without errors
     ```
