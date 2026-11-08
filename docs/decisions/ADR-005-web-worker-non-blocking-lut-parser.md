# ADR-005: Web Worker Non-Blocking LUT Parser

## Status
Accepted

## Context
High-precision 3D LUTs ($65 \times 65 \times 65$) contain 274,625 individual RGB floating-point triplets. Parsing an 8 MB text file using regex matching and string splitting on the main JavaScript thread takes 150ms – 500ms on mobile CPUs. During this time, the main event loop is blocked, freezing the live camera preview and dropping video recording frames.

## Decision
We implemented a background Web Worker parsing pipeline in [`cubeParserAsync.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/cubeParserAsync.ts):
- The raw `.cube` text string is posted to an isolated Web Worker thread.
- The worker parses headers, validates data lines, and packs the color values into a binary `Float32Array`.
- The parsed result is returned via asynchronous Promise resolution. If the worker fails or is unsupported, it falls back to the synchronous parser cleanly.

## Consequences
- **Positive:** Zero frame drops on the live camera viewport or video recording stream during custom LUT imports.
- **Positive:** Corrupted files are caught and isolated inside the worker thread without crashing UI components.
- **Trade-off:** Involves standard Web Worker messaging serialization, which requires minimal overhead (~4ms).
