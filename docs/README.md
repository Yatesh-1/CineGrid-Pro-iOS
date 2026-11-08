# CineGrid Pro — Technical Documentation System

Welcome to the central technical documentation repository for **CineGrid Pro**, a production-grade professional mobile cinematography, composition guidance, and color grading camera application.

This documentation suite is engineered to provide complete architectural clarity for human software engineers, QA specialists, DevOps architects, and autonomous AI coding agents (such as Antigravity, Cursor, and Claude Code). Every document reflects the **actual codebase implementation** without theoretical abstractions.

---

## Documentation Navigation Index

### 1. General & Architecture
- [**PROJECT_OVERVIEW.md**](./PROJECT_OVERVIEW.md) — Product vision, target users, supported platforms, and verified feature status matrix.
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) — Comprehensive architecture, subsystem boundaries, data flows, and Mermaid diagrams.
- [**TECH_STACK.md**](./TECH_STACK.md) — Verified inventory of languages, frameworks, GPU APIs, build tools, and dependencies.
- [**APPLICATION_WORKFLOW.md**](./APPLICATION_WORKFLOW.md) — End-to-end user and system lifecycle workflows from launch to export.

### 2. Camera & Optical Engines
- [**CAMERA_ENGINE.md**](./CAMERA_ENGINE.md) — Formal 7-state camera machine, concurrency protection, stream lifecycle, and video detachment.
- [**CAMERA_CONTROLS.md**](./CAMERA_CONTROLS.md) — Blackmagic-inspired manual controls: ISO, shutter speed/angle, white balance, EV, and tap-to-focus.
- [**GRID_AND_COMPOSITION.md**](./GRID_AND_COMPOSITION.md) — Library of selectable composition grids, SVG rendering engine, and reference photos.
- [**FILTERS_AND_LUTS.md**](./FILTERS_AND_LUTS.md) — WebGL 3D LUT shader pipeline, `.cube` parser/generator, 12 built-in LUTs, and split comparison.
- [**PORTRAIT_AND_MIRROR.md**](./PORTRAIT_AND_MIRROR.md) — Front/rear camera switching, mirror selfie transformation, and aspect ratio crop mathematics.

### 3. Media Processing & Data Management
- [**IMAGE_PROCESSING.md**](./IMAGE_PROCESSING.md) — High-resolution photo capture pipeline, CSS/WebGL filters, analog film grain, and export rasterization.
- [**VIDEO_PROCESSING.md**](./VIDEO_PROCESSING.md) — MediaRecorder recording engine, codec selection (H.264, H.265, ProRes), bitrates, timecode, and VU meters.
- [**STORAGE_AND_CACHE.md**](./STORAGE_AND_CACHE.md) — Triple-tier storage model: IndexedDB binary store, Memory LRU Cache, and LocalStorage preferences.
- [**MEMORY_MANAGEMENT.md**](./MEMORY_MANAGEMENT.md) — Central `ResourceManager` architecture, ownership tracking, Object URL lifecycle, and GC leak prevention.
- [**PERFORMANCE.md**](./PERFORMANCE.md) — GPU texture reuse (`texSubImage2D`), `requestVideoFrameCallback` sync, 30 FPS gyro throttling, and code splitting.

### 4. Reliability, Security & User Interface
- [**ERROR_HANDLING.md**](./ERROR_HANDLING.md) — Subsystem `ErrorBoundary`, WebGL context loss recovery, and fallback scene rendering.
- [**SECURITY.md**](./SECURITY.md) — Client-side license verification, HMAC SHA-256 tokens, offline grace periods, and admin authentication.
- [**RESPONSIVE_DESIGN.md**](./RESPONSIVE_DESIGN.md) — Mobile-first viewport sizing, safe-area insets, notch handling, and pinch-to-zoom touch gestures.
- [**UI_COMPONENTS.md**](./UI_COMPONENTS.md) — Inventory of all UI components, modals, HUD docks, and drawers.
- [**STATE_MANAGEMENT.md**](./STATE_MANAGEMENT.md) — Independent state domains, shutter mutex locking, and React re-render optimization.

### 5. Developer, DevOps & AI Agent Guides
- [**API_REFERENCE.md**](./API_REFERENCE.md) — Complete public TypeScript API reference for all core services, utilities, and pipelines.
- [**DEPENDENCIES.md**](./DEPENDENCIES.md) — Dependency audit, versions, licenses, security review, and necessity evaluation.
- [**TESTING.md**](./TESTING.md) — Automated testing strategy (90/90 tests passing), Vitest configuration, and test execution.
- [**BUILD_AND_DEPLOYMENT.md**](./BUILD_AND_DEPLOYMENT.md) — Production build commands, Vite bundling, and Capacitor iOS/Android packaging.
- [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md) — Diagnosis and resolution guide for camera, WebGL, permissions, and storage issues.
- [**KNOWN_ISSUES.md**](./KNOWN_ISSUES.md) — Hardware limits, browser-specific nuances, and platform variances.
- [**ROADMAP.md**](./ROADMAP.md) — Technical backlog, architectural milestones, and future feature exploration.
- [**CHANGELOG.md**](./CHANGELOG.md) — Comprehensive chronological history of changes, fixes, and architectural evolutions.
- [**DECISIONS.md**](./DECISIONS.md) — Architectural Decision Records (ADR-001 through ADR-007).
- [**AI_AGENT_GUIDE.md**](./AI_AGENT_GUIDE.md) — Master onboarding manual for AI coding agents (Antigravity, Cursor, Claude Code).
- [**DEVELOPMENT_RULES.md**](./DEVELOPMENT_RULES.md) — Non-negotiable coding standards, state rules, and verification checklist.
- [**BACKUP_AND_RECOVERY.md**](./BACKUP_AND_RECOVERY.md) — Snapshot protocols, automated backup scripts, and disaster recovery procedures.

---

## Quick Start for Engineers & AI Agents

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Execute full automated test suite (90 tests across 17 suites)
npm test

# 4. Run static linter
npm run lint

# 5. Build production bundle (tsc -b && vite build)
npm run build
```
