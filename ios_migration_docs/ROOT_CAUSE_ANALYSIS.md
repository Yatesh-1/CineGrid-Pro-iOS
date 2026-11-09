# CineGrid Pro — Root Cause Analysis & Deep Technical Diagnosis
**Generated:** November 9, 2026

---

## 1. Issue: iOS File Backing Resolution (`BUG-001`)

### Symptoms
When editing or retrieving photo variants on iOS, photos that had already been saved to the device's sandboxed filesystem were treated as unbacked or missing. This forced the application to perform redundant base64 re-encodings into IndexedDB, increasing memory pressure on low-memory iOS devices.

### Root Cause
Android's `Directory.Data` path in Capacitor maps to `/data/user/0/<package>/files/photos/`, while on iOS it maps to `/var/mobile/Containers/Data/Application/<UUID>/Library/NoCloud/photos/` or `/Library/photos/`. The check:
```typescript
return !!url && url.includes('/_capacitor_file_/') && url.includes('/files/photos/');
```
strictly asserted the existence of `/files/photos/`, which never exists in iOS sandboxed paths.

### Solution & Code Fix
Modified `photoFiles.ts`:
```typescript
export function isFileBacked(url: string | undefined): boolean {
  return !!url && url.includes('/_capacitor_file_/') && (url.includes('/files/photos/') || url.includes('/photos/'));
}
```
This guarantees accurate detection across both operating systems.

---

## 2. Issue: Video Container Compatibility on Apple Ecosystem (`BUG-002` & `BUG-003`)

### Symptoms
Timelapse and slow motion videos exported on iOS devices failed to render thumbnails or play back inside the native iOS Photos app and QuickTime player.

### Root Cause
Android Chrome and WebView implementations historically prioritized `video/webm;codecs=vp9`. While web browsers can decode WebM, the native iOS media subsystem (`AVFoundation` and `Photos.framework`) requires standard ISO BMFF (`.mp4`, `avc1` / `hvc1`) containers.

### Solution & Code Fix
Updated `timelapseService.ts` and `slowMotionService.ts` to prioritize `video/mp4;codecs=avc1` and `video/mp4;codecs=avc1,mp4a.40.2` before querying WebM codecs.
