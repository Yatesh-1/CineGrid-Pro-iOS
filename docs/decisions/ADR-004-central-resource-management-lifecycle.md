# ADR-004: Central Resource Management Lifecycle

## Status
Accepted

## Context
A real-time camera app allocates dozens of unmanaged browser primitives: `MediaStreamTracks`, `WebGLTextures`, `WebGLPrograms`, `AudioContexts`, `AudioNodes`, `setInterval` timers, window event listeners, and `URL.createObjectURL` references. When components mount and unmount rapidly, orphaned allocations accumulate in browser memory, triggering memory leaks and camera lockups.

## Decision
We engineered a central singleton coordinator, [`ResourceManager`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/resourceManager.ts):
- Every unmanaged allocation must register with a specific `ownerId` and custom `dispose()` hook.
- Subsystems invoke `resourceManager.releaseByOwner(ownerId)` on unmount.
- The manager hooks into `beforeunload` and `pagehide` to guarantee total cleanup on browser exit.
- Dynamic device memory profiling detects available RAM and scales cache limits accordingly.

## Consequences
- **Positive:** Deterministic zero-leak memory profile across multi-hour photography shoots.
- **Positive:** Centralized audit logging for any lingering GPU or audio resources.
- **Trade-off:** Developers must register allocated resources with `resourceManager` instead of using raw `setInterval` or `addEventListener`.
