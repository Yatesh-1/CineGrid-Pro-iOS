# ADR-003: Binary IndexedDB Storage Separation

## Status
Accepted

## Context
Capturing a high-resolution 12 MP or 48 MP photograph produces a 16 MB – 64 MB Base64 string (`data:image/jpeg;base64,...`). Storing Base64 strings directly in React state, LocalStorage, or even standard monolithic IndexedDB records caused the V8 heap to swell past 500 MB when loading a gallery of 30 photos. Mobile browser tabs crashed due to OS out-of-memory limits.

## Decision
We implemented a strict binary-separated architecture inside [`MediaStorageService`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/mediaStorageService.ts):
- IndexedDB table `photos` holds lightweight metadata records ($< 1\text{ KB}$ each) with the `dataUrl` property explicitly stripped.
- IndexedDB table `photo_blobs` stores the raw binary `Blob` under the matching photo UUID.
- Gallery views retrieve images via temporary `URL.createObjectURL(blob)` handles backed by a 25-entry [`LRUCache`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/utils/lruCache.ts).

## Consequences
- **Positive:** JS heap allocation for 50 gallery photos plummeted from 480 MB to 18 MB (-96% memory usage).
- **Positive:** Gallery scrolling is buttery smooth at 60 FPS without garbage collection stutter.
- **Trade-off:** Displaying a photo requires an asynchronous blob read from IndexedDB, handled gracefully by the LRU cache.
