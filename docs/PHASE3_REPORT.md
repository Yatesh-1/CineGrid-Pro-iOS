# Phase 3 Report (2026-11-08)

Device: OPPO CPH2421 ("A16e"), Android 11, 3.9 GB RAM, debug builds. Evidence: **DEVICE** = observed on the phone, **TESTS** = automated, **CODE** = written, not observed.
Automated: 794 tests passing, `tsc -b` clean, oxlint clean on new files, `gradlew assembleDebug` succeeds. Installed build = latest commit.

## A. Reference camera comparison
**The reference applications (Rumi Cam, OldRoll, FiLMiC Pro, Spectre Camera, MotionCam Pro) are not available.** No APK, recording or screenshot of any of them exists on this PC or on the phone (only an unrelated app icon and cartoon images were found). Their behaviour was NOT compared and is not described here.

What was measured instead is the phone's own native camera (`com.oppo.camera`), as the real-hardware baseline:

| Feature | Stock OPPO camera (DEVICE) | Our app before Phase 3 | Our app after Phase 3 (DEVICE) | Status |
|---|---|---|---|---|
| Live preview rate | 29.5 fps (SurfaceFlinger, median gap 33.6 ms) | 9-19 fps (WebView) | 29.5-31 fps native, film look on | fixed for film cameras in photo mode |
| Photo capture | not measured | 2448x3264 (web ImageCapture) | 3264x2448 JPEG from Camera2, delivered 2448x3264 | equal size, now through Camera2 |
| Exposure | not measured | CSS brightness (software) | Camera2 exposure compensation: +2 EV luma 250, 0 EV 183, -2 EV 104 | real, plugin-verified |
| White balance | not measured | CSS hue/sepia (software) | hardware `incandescent` preset: red-blue 15 -> -50; unsupported modes rejected | real, plugin-verified |
| Zoom | not measured | CSS crop + track constraint | `CONTROL_ZOOM_RATIO` 3x applied, output size unchanged | real, plugin-verified |
| Flash | not measured | track torch | `FLASH_MODE_TORCH` implemented | CODE only, not fired on device |
| Video | not measured | 9.3 fps, 720x1280 with a look | **unchanged: not implemented natively** | OPEN |
| Focus | not measured | web | native continuous AF only; tap-to-focus not implemented in native mode | OPEN |

## B. Architecture (chosen on measurements)
Hybrid: native Camera2 + OpenGL ES owns the camera while a film camera is selected in photo mode; the TypeScript app keeps UI, profiles, storage and the photo processing.
- Camera2 -> `SurfaceTexture` (external OES) -> **pass 1** copies the frame once into an ordinary RGBA texture -> **pass 2** film shader -> `TextureView` behind the transparent WebView. No frame crosses the JS bridge.
- The film fragment shader is **generated from the web shader** (`scripts/gen-native-shader.mjs`), with a test that fails if they drift apart; profile JSON is shared.
- Stills: Camera2 JPEG -> existing JS full-resolution film render + original preservation (unchanged).
- Falls back to the existing web camera if native cannot start; the web camera is handed back when native is not wanted.
Why measured, not assumed: native passthrough ran at 29.8 fps / 5 ms. The film shader reading the external camera texture ~35x per pixel ran at 15 fps / 66 ms. The two-pass design brought it to 29.6 fps / 4.3 ms. (The WebView path was upload-bound; shrinking its render size never helped.)

## C. Performance before / after (DEVICE)
| Metric | Before | After |
|---|---:|---:|
| Live preview, film look (render fps) | 9-19 | 29.5-31 (native log, and SurfaceFlinger 14.9 when the shader sampled YUV, 29.8 when fixed) |
| Camera feed while processing | ~16 | 29.5-29.8, 0-1 dropped camera frames per 4 s |
| Per-frame GPU submit | 8-14 ms CPU, GPU-bound | 4.3 ms avg, 5.5-8.8 ms max |
| Photo resolution | 2448x3264 | 2448x3264 (Camera2) |
| Photo capture end-to-end (in-app probe, one sample) | not measured | 6542 ms (mostly JS canvas encode of two JPEGs; not optimised) |
| Video fps / resolution (film look) | 9.3 / 720x1280 | **unchanged, 9.3 / 720x1280 (video not migrated)** |
Thermal: CPU/GPU ~48.7 C earlier, Android reported no throttling; no long-duration run was done.

## D. Camera controls in native mode
| Control | Status |
|---|---|
| Preview | DEVICE verified, upright and matching the saved photo orientation |
| Photo (shutter button, real UI) | DEVICE verified: look + untouched original, both 2448x3264, 0 crashes |
| EV | hardware, verified via plugin; wired to the Pro EV value in the app but **not verified through the app's slider** |
| White balance presets | hardware, verified via plugin; **no UI control added** |
| Zoom | hardware, verified via plugin; app zoom strip wired, **not verified through the strip** |
| Torch | CODE only |
| Front/back flip | wired (restarts native on facing change), **not tested** |
| Tap-to-focus | not available in native mode (continuous AF only) |
| Web-only tools in native mode | histogram/waveform/zebra/peaking, subject detection, pro colour sliders and the legacy filter strip read the web video or apply CSS, so they do not act on the native preview. Not hidden or labelled in the UI yet. |

## E. Video validation
**Not done.** Native recording (MediaCodec + MediaMuxer + AAC from the film pipeline) was not implemented. Film-look video still goes through the old WebGL canvas path (9.3 fps, 720x1280, H.264+AAC; HEVC unavailable on this phone). No 15/30/60 s native recordings exist.

## F. Image quality
Look photo and original stay the same size and framing (2448x3264 each) and the original is untouched. The film render of the still (shader, frame crop, borders) is the Phase 2 path, not re-validated pixel-by-pixel.

## G. Fixed this phase (all with device evidence unless stated)
- Native pipeline built and measured (above).
- Orientation: preview and photo agree. Cause of two wrong attempts: this phone's `SurfaceTexture` transform already contains the 90 deg rotation (`[0,-1,..,-1,0,..,1,1]`), so adding the sensor rotation double-counted it. Rule now: rotate only if the transform has no rotation.
- Crash: `StackOverflowError` (stopSession <-> TextureView.onSurfaceTextureDestroyed recursion). Found on the first real run.
- Crash: `IllegalArgumentException: Surface was abandoned` when the screen locked while the camera was opening. Fixed by checking the session is alive in every camera callback and catching broadly.
- Lifecycle after fixes: Home + return, 3x lock/unlock: same process, native back at 29.5-29.8 fps, 0 crash lines. 3x native<->web toggle through the UI: clean handoff each way.
- Capture gate: the web camera state machine blocked native captures; bypassed in native mode.
- `.cube` export fake-success: now writes a validated file and opens the share sheet. DEVICE: share sheet shown for `cinegrid_custom_grade_33x.cube`, file has the right header and 35,937 rows; cancel reports "Export cancelled. Nothing was saved." TESTS: header/domain/row count/round trip/identity/applied grade.

## H. Not verified / not done
- Native video recording (P0) not implemented. Higher-than-720p / 30 fps processed video is still open.
- EV/WB double-application rule: in native mode the CSS EV/WB filter is skipped at capture; confirmed by code and by the photo looking correct, not by an A/B EV test through the app's UI.
- 16:9 and 1:1: the native preview crops to the viewfinder rect (code); not tested on device. No ratio photo tests.
- Profile export/import via the share sheet and file picker (same `shareTextFile` as the verified `.cube` export); import picker not exercised; invalid/corrupt/unsupported-version import only tested in jsdom.
- Per-effect and lighting-condition tests; custom camera rendering after import.
- Diagnostics panel: only the earlier render probe (web path) exists; native stats are available via `getStats()` but have no UI and no export.
- Long-duration run, thermal trend, repeated video recordings.
- The earlier unattributed process deaths: not reproduced; the two crashes found this phase are different (StackOverflow, abandoned surface) and fixed.
- iOS: untouched (no Mac).

## I. Remaining bugs
| Severity | Issue |
|---|---|
| High | Film-look video is 9.3 fps / 720p (not native) |
| Medium | Native mode silently disables web-only tools (scopes, detection, pro colour sliders, legacy filters) with no UI explanation |
| Medium | Native photo capture takes ~6.5 s end to end (JS encoding) |
| Medium | Pro EV/zoom/flip wiring unverified through the real controls |
| Low | Native stills are left in the app cache (`cache/native_stills`) |
| Low | Native preview rotation rule untested on a camera whose transform lacks rotation, and on the front camera |

## J. Files
New: `android/.../NativeFilmCameraPlugin.java`, `android/app/src/main/assets/film_fragment.glsl` (generated), `scripts/gen-native-shader.mjs`, `src/services/nativeFilmCamera.ts`, `src/hooks/useNativeFilmCamera.ts`, `src/test/nativeShaderSync.test.ts`, `src/test/cubeExport.test.ts`, `docs/PHASE3_REPORT.md`.
Changed: `MainActivity.java` (register plugin), `src/App.tsx` (hook, guards, native capture, torch), `src/components/Viewfinder.tsx` (`nativePreview`), `src/index.css` (native-film transparency), `src/components/look/LookStudioModal.tsx` (real .cube export), `src/services/cameraProfileStore.ts` (debug handle).
