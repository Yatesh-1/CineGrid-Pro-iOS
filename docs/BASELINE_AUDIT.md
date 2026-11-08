# Baseline Audit (2026-11-08)

Covers Steps 1-5 of the upgrade workflow. Evidence levels:
**RAN** = command executed this session. **SCAN** = keyword grep only, behaviour NOT verified on a device.

## 1. Baseline results (RAN)
| Check | Result |
|---|---|
| `npx vitest run` | 67 files, 738 tests passed (jsdom; canvas `getContext` is unimplemented there, so GPU/canvas paths are not exercised) |
| `npx oxlint` | passes with warnings only (react-compiler / hooks warnings in App.tsx, GalleryModal, ProSettingsDrawer, StudioWorkspace, AdminDashboardModal, GeoGridInfoModal) |
| `npm run build` (tsc -b + vite) | succeeds, ~1.7 s |
| Android device | CPH2421 (serial IR4T59AYDERWWKE6) visible via adb. App not yet run on it this session. |
| Git | **Not installed / repo is not a git repository.** Small-commit and rollback rules cannot be followed until git is installed and `git init` is done. `backups/` and `scripts/backup.mjs` are the only rollback mechanism. |
| iOS | Cannot build on Windows. iOS status = BLOCKED for build/test. |

## 2. Architecture (SCAN)
React 19 + TypeScript + Vite + Tailwind, wrapped by Capacitor 8. Camera path is **WebView `getUserMedia` + MediaRecorder + WebGL/Canvas**, not CameraX/Camera2 preview.
Native code that exists:
- Android: `NativeCameraPlugin.java` (1307 lines; methods `getCapabilities`, `captureRaw`, `startHighSpeed`, `stopHighSpeed`, `captureStack`), `MediaSaverPlugin.java`, `MainActivity.java`.
- iOS: only the stock Capacitor shell (AppDelegate, SceneDelegate, SPM package). **No custom AVFoundation/Metal code.**
- Services in `src/services` (camera, cameraControl, cinemaVideo, dual, night, slowMotion, timelapse, panorama, audioIntelligence, hardwareIntelligence, licensing, lutStorage, mediaStorage, nativeCamera, etc.) and GPU pipeline in `src/utils` (`webglLutPipeline`, `shaders`, `cinemaScopes`, `studioEngine`, `portraitBlur`, `subjectDetection`).
- Server: `server/` licence API (HMAC tokens). No cloud-media backend.

## 3. Feature scan by reference app (SCAN, unverified)
| Area | Evidence found | Provisional class |
|---|---|---|
| Live GPU preview with LUT | `webglLutPipeline`, `shaders` | B (verify preview == saved output) |
| Film grain / halation | present in 10 / 4 files | B/C (need per-camera param model) |
| Light leaks, date imprint, film borders, dust | 0 hits | E |
| Virtual camera collection with independent configs | not found as a profile system | C/E |
| Preset save/duplicate/import/export | LUT import/storage exists; camera-profile presets not found | C |
| Scopes: waveform, false colour, zebra, peaking, histogram, vectorscope | `cinemaScopes.ts` | A/B (verify on real frames) |
| Focus peaking / rack focus / zoom ramp | rack focus in many files, `zoomPlan.ts` | B (verify against hardware focus control) |
| Video 4K/1080, 24-60 fps, HEVC | MediaRecorder in 9 files, HEVC in 6 | C (capability matrix unverified) |
| 10-bit / HDR / LOG | 0 hits for 10-bit | E / F (WebView MediaRecorder cannot do native 10-bit; needs native Camera2/AVFoundation) |
| RAW DNG photo (Android) | `captureRaw` in native plugin | B (verify DNG validity on device) |
| RAW video | none | F on iOS; Android needs new native NDK path |
| Long exposure / night | `nightCaptureService` | C (alignment, ghost handling unverified) |
| Crowd removal, light trails, waterfall, optical flow | 0 hits | E |
| Motion photo | none | E |
| Cloud upload | upload in 7 files (likely licence/admin) | E (no media upload queue found) |
| Billing (Play / StoreKit) | 0 hits; custom licence system only | E |
| Clean HDMI | none | F (OS-restricted; investigation only) |
| AI assistant: subject detection, portrait blur | `subjectDetection`, `portraitBlur` | B (check it is real ML vs heuristic) |

## 4. Key constraints discovered
1. **Architecture ceiling.** Genuine 10-bit, LOG, RAW video, 120 fps, flash-sync and Metal/Vulkan processing need native capture code. The WebView path cannot provide them. Those require new Android (Camera2/MediaCodec/NDK) and iOS (AVFoundation/Metal) plugins, a large addition rather than a tweak.
2. **iOS cannot be built or tested from this Windows machine.** iOS work would be written but unverified.
3. **No git**, so required small commits and rollback are not possible yet.
4. **Existing licence system** is custom. Play Billing / StoreKit would be additive and must not lock currently-unlocked features.
5. jsdom tests cannot validate GPU/camera behaviour. Real verification needs on-device runs (CPH2421 available over adb).

See `IMPLEMENTATION_PLAN.md` for the phased plan and `FEATURE_STATUS.md` for the tracker.
