# ADR-001: Camera Engine State Machine & Concurrency Lock

## Status
Accepted

## Context
In early camera prototypes, calling `startCamera()`, switching camera facing modes (`user` $\leftrightarrow$ `environment`), or changing capture modes in rapid succession triggered race conditions. Browsers threw `AbortError` or `NotReadableError` because the underlying hardware was requested while a previous MediaStream track was still releasing its hardware lock.

## Decision
We implemented a strict, deterministic 7-state finite state machine inside [`CameraService`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/cameraService.ts):
- States: `idle`, `requesting_permission`, `initializing`, `running`, `switching_facing`, `error`, `terminated`.
- A re-entrant mutex lock (`isAcquiringLock`) rejects concurrent camera initialization calls.
- `transitionTo(targetState)` validates all state transitions against a state transition matrix before executing.

## Consequences
- **Positive:** Zero hardware race conditions or uncaught `AbortError` exceptions during rapid user toggling.
- **Positive:** Predictable UI feedback (spinners, disabled shutter buttons) during hardware handoffs.
- **Trade-off:** Method calls requesting illegal state transitions fail safely with warning logs rather than throwing runtime errors.
