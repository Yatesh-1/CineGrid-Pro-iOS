# Architecture Decision Records (ADRs)

This directory documents the key architectural decisions made in CineGrid Pro, detailing the context, options considered, decisions made, and technical consequences.

---

## Architecture Decision Index

| ADR ID | Title | Status | Date | Decision Summary |
| :--- | :--- | :--- | :--- | :--- |
| [**ADR-001**](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/docs/decisions/ADR-001-camera-engine-state-machine.md) | Camera Engine State Machine & Concurrency Lock | Accepted | 2026-10-30 | Enforce deterministic 7-state transitions to prevent camera track race conditions. |
| [**ADR-002**](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/docs/decisions/ADR-002-webgl-2d-atlas-3d-lut-pipeline.md) | WebGL 2D Atlas 3D LUT Pipeline | Accepted | 2026-10-30 | Use 2D texture atlas with shader trilinear interpolation for universal mobile WebGL support. |
| [**ADR-003**](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/docs/decisions/ADR-003-binary-indexeddb-storage-separation.md) | Binary IndexedDB Storage Separation | Accepted | 2026-10-30 | Separate binary Blobs from metadata to eliminate multi-megabyte Base64 memory thrashing. |
| [**ADR-004**](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/docs/decisions/ADR-004-central-resource-management-lifecycle.md) | Central Resource Management Lifecycle | Accepted | 2026-10-30 | Track and cleanly dispose of streams, WebGL textures, and Object URLs by owner ID. |
| [**ADR-005**](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/docs/decisions/ADR-005-web-worker-non-blocking-lut-parser.md) | Web Worker Non-Blocking LUT Parser | Accepted | 2026-10-30 | Parse large `.cube` files in background workers to maintain 60 FPS viewport rendering. |
| [**ADR-006**](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/docs/decisions/ADR-006-code-splitting-and-subsystem-error-boundaries.md) | Code Splitting & Subsystem Error Boundaries | Accepted | 2026-10-30 | Lazy load heavy modals and isolate failures to protect the live camera viewport. |
| [**ADR-007**](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/docs/decisions/ADR-007-cryptographic-client-licensing-architecture.md) | Cryptographic Client Licensing Architecture | Accepted | 2026-10-30 | Implement HMAC-SHA256 entitlement tokens with 7-day offline grace period. |
