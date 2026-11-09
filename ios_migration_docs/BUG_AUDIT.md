# CineGrid Pro — Bug Audit & Vulnerability Assessment
**Generated:** November 9, 2026  
**Target Platform:** iOS Native App (Capacitor + AVFoundation + Photos)  
**Status:** ALL ISSUES DIAGNOSED AND RESOLVED

---

## 1. Discovered Defects & Potential Failure Modes

### [BUG-001] (Severity: P1 - HIGH)
- **Module:** `src/services/photoFiles.ts`
- **Issue:** `isFileBacked()` matched strictly on `/files/photos/`.
- **Impact on iOS:** On iOS, Capacitor Filesystem with `Directory.Data` writes to `Library/NoCloud/photos/` or `Library/photos/` rather than Android's `/data/user/0/.../files/photos/`. This caused photos stored on disk in iOS to fail `isFileBacked()` validation, triggering unnecessary disk re-writes and fallback to IndexedDB base64 strings.
- **Root Cause:** Hardcoded Android filesystem path component.
- **Resolution:** Updated regex/matcher to check `(url.includes('/files/photos/') || url.includes('/photos/'))`.
- **Status:** **VERIFIED**

### [BUG-002] (Severity: P1 - HIGH)
- **Module:** `src/services/timelapseService.ts`
- **Issue:** Timelapse assembly preferred `video/webm;codecs=vp9` before checking for MP4/AVC1.
- **Impact on iOS:** Safari and iOS WKWebView native media players do not support WebM VP9 in native photo libraries or QuickTime previewers. This caused generated time-lapse videos to save in WebM format which cannot play natively in the iOS Photos app.
- **Root Cause:** Default codec preference was set for Android Chrome.
- **Resolution:** Re-ordered video format probing to prefer `video/mp4;codecs=avc1` first, falling back to WebM only if MP4 encoding is unsupported.
- **Status:** **VERIFIED**

### [BUG-003] (Severity: P2 - MEDIUM)
- **Module:** `src/services/slowMotionService.ts`
- **Issue:** Initial fallback MIME type initialization defaulted to `video/webm;codecs=vp9`.
- **Impact on iOS:** In environments where `isTypeSupported` checks return unexpected results or undefined codecs, slow motion clips fell back to WebM container.
- **Resolution:** Defaulted initialization to `video/mp4;codecs=avc1`.
- **Status:** **VERIFIED**

### [BUG-004] (Severity: P2 - MEDIUM)
- **Module:** `src/services/hardwareIntelligenceService.ts`
- **Issue:** `hasCapacitor` check evaluated `typeof window.Capacitor !== 'undefined'`.
- **Impact on iOS:** When loaded in a browser or test mock that injected a stubbed `window.Capacitor` without native bridges, the service incorrectly reported `iOS Native App (AVFoundation Bridge)` instead of `iOS WebKit / Mobile Safari`.
- **Resolution:** Added safe check for `window.Capacitor?.isNativePlatform?.()`.
- **Status:** **VERIFIED**
