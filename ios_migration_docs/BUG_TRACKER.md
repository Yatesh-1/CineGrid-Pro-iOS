# CineGrid Pro — Persistent Bug Tracker
**Generated:** November 9, 2026

| Issue ID | Priority | Module | Description | Status | Verification Evidence |
|---|---|---|---|---|---|
| **BUG-001** | P1 | `photoFiles.ts` | iOS file path recognition in `isFileBacked` | **VERIFIED** | Matches `/photos/` and `/files/photos/`; all tests green |
| **BUG-002** | P1 | `timelapseService.ts` | Codec priority defaulted to WebM instead of iOS-native MP4 | **VERIFIED** | Defaulted to MP4/AVC1 container; `timelapseService.test.ts` passed |
| **BUG-003** | P2 | `slowMotionService.ts` | Fallback MIME type defaulted to WebM | **VERIFIED** | Defaulted to `video/mp4;codecs=avc1`; `slowMotionService.test.ts` passed |
| **BUG-004** | P2 | `hardwareIntelligenceService.ts` | Native bridge detection falsely triggered by stubs | **VERIFIED** | Tested with `isNativePlatform()`; `hardwareIntelligenceService.test.ts` passed |
