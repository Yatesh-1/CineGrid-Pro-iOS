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
| Video | not measured | 9.3 fps, 720x1280 with a look | native H.264+AAC, 720x960 at 22.8-29.7 fps (see E) | fixed at 720x960; 1080x1440 only ~16 fps with the look |
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
| Video fps / resolution (film look) | 9.3 / 720x1280 | **29.4-29.7 / 720x960 in controlled runs (22.8-27.8 through the app UI as the phone warmed up); 1080x1440 with the look: 15.9** |
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

## E. Video validation (DEVICE)
Native recorder: the film shader renders ONCE into an offscreen texture, which is copied to the encoder surface and the screen; hardware H.264 (`OMX.MTK.VIDEO.ENCODER.AVC`) + AAC-LC 44.1 kHz mono, muxed by MediaMuxer, timestamps on one clock. Wired to the real Video-mode record button (cinema HUD) and the plain video toggle; the clip is saved to the in-app gallery and the phone's gallery (MediaStore verified).

| Run | Size | Frames | Actual length | Avg fps | File | Audio |
|---|---|---:|---:|---:|---:|---|
| nominal 15 s | 720x960 | 602 | 20.3 s | 29.7 | 20.8 MB | yes |
| nominal 30 s | 720x960 | 1001 | 33.8 s | 29.5 | 34.8 MB | yes |
| nominal 60 s | 720x960 | 1965 | 66.7 s | 29.4 | 68.2 MB | yes |
(My test loop overshot the nominal times because of adb latency; the table shows the real lengths.)
- File inspection (15 s clip): video track avc1 720x960, 602 samples, 20.324 s; audio track mp4a 44.1 kHz, 874 AAC frames, 20.294 s (30 ms apart). Decodes and plays in the WebView; the decoded frame has the film look and the same orientation as the preview.
- Through the real UI button: 593 frames at 27.8 fps (one run) and 374 frames at 22.8 fps (a later run, CPU 68.5 C). So expect ~23-30 fps on this phone depending on heat; the app warns if a clip averages under 24 fps.
- Size trade-off (film look on, same phone): 1080x1440 = 15.9 fps, 720x960 = 29.7, 540x720 = 24.7 (before the single-render change: 11.4 / 19.7 / 24.7). With no film shader, 1080x1440 records at 26-27 fps, so the encoder is not the limit: the film shader's GPU cost is. **1080p-class recording at 30 fps with the film look is NOT achievable on this phone**; 720x960 is the default (`NATIVE_RECORD_HEIGHT`).
- Cause of an earlier 11-12 fps result: the camera's AE range [5,30] let exposure drop to 12 fps in a dim room (the stock-camera-like fix is a fixed [30,30] range, requested from the start; switching ranges mid-session had no effect on this HAL). The preview now holds 29.4-29.9 fps in the same room.
- Thermal: CPU ~60 C at start of the 15 s run, 66 C after the 67 s run, 68.5 C later; Android reported no throttling.
- Not tested: A/V sync beyond duration/track agreement (no audible/visual sync test), recording interrupted by lock/Home, recordings over 67 s, HEVC (not offered: the phone has no HEVC encoder).
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
- 1080p-class film-look video at 30 fps: not achievable on this phone (see E). Video orientation/aspect: the file is always the 3:4 upright frame, regardless of the 16:9 / 1:1 viewfinder setting.
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
| Medium | Film-look video is 720x960 (not 1080p) and 23-30 fps depending on heat; 1080x1440 only ~16 fps with the look |
| Medium | Native mode silently disables web-only tools (scopes, detection, pro colour sliders, legacy filters) with no UI explanation |
| Medium | Native photo capture takes ~6.5 s end to end (JS encoding) |
| Medium | Pro EV/zoom/flip wiring unverified through the real controls |
| Low | Native stills are left in the app cache (`cache/native_stills`) |
| Low | Native preview rotation rule untested on a camera whose transform lacks rotation, and on the front camera |

## J. Files
New: `android/.../NativeFilmCameraPlugin.java`, `android/app/src/main/assets/film_fragment.glsl` (generated), `scripts/gen-native-shader.mjs`, `src/services/nativeFilmCamera.ts`, `src/hooks/useNativeFilmCamera.ts`, `src/test/nativeShaderSync.test.ts`, `src/test/cubeExport.test.ts`, `docs/PHASE3_REPORT.md`.
Changed: `MainActivity.java` (register plugin), `src/App.tsx` (hook, guards, native capture, torch), `src/components/Viewfinder.tsx` (`nativePreview`), `src/index.css` (native-film transparency), `src/components/look/LookStudioModal.tsx` (real .cube export), `src/services/cameraProfileStore.ts` (debug handle).

## K. Settings persistence (reported by the user: "when app restarts all settings go to default")
- Cause 1: `resetOnLaunch` deliberately wiped grid, look, pro photo/video settings, mirror and ghost overlay on every launch. It now clears only the stale active-session marker.
- Cause 2: aspect ratio, the legacy filter and its strength, the self-timer, HDR and flash mode were never saved at all. They are now saved in `cinegrid_ui_prefs_v1` and validated on load (`src/utils/uiPrefs.ts`).
- DEVICE: changed the aspect ratio to 16:9, force-stopped and cold-started: it came back as 16:9 (also after a second restart on the final build), along with the film camera.
- Deliberately NOT persisted: zoom and front/rear facing (the camera opens on the rear camera at 1x). Pro-settings persistence relies on the existing keys; only the ratio/camera were re-verified on the device, not every individual pro control.
## L. Follow-up verification (same day, DEVICE unless stated)
All through the app's own controls on the OPPO CPH2421, 0 crash-buffer lines throughout.
| Item | Result |
|---|---|
| Front/back flip | rear -> front (sensor orientation 270, 29.9 fps) -> rear (90, 29.5 fps); web stream stays closed. Front-camera picture orientation/mirror **not visually checked** |
| Zoom strip | 2x -> camera reports 2.0, 5x -> 5.0, 1x -> 1.0, ~30 fps throughout |
| EV slider ("Exposure compensation") | 1 -> 1.0, 2 -> 2.0, -2 -> -2.0, 0.5 -> 0.5, 0 -> 0 (the camera's own readback) |
| Photo ratios | 16:9 -> 2160x3840 (the camera's real 16:9 mode, 8.3 MP; was a 6 MP crop), 1:1 -> 2448x2448, 4:3 -> 2448x3264; look and original identical size each time |
| Recording interrupted by Home | was BROKEN (clip orphaned in cache, HUD stuck on "Stop Recording"). Fixed: finalised on pause, saved to the gallery (10.3 MB), HUD reset, native back at 29.9 fps |
| Recording interrupted by screen lock | same fix: clip saved (11.1 MB, avc1 720x960 307 frames 10.60 s + AAC 10.59 s, decodes, mean luma 163), take number advanced, native back at 29.7 fps |
| Long recordings | 164 s run held ~30 fps at every 25 s sample but its clip was never saved (BUG: blob URL pushed a 169 MB clip through web-view memory, heap 256 MB). Fixed by passing the file URL to the native copy path and storing recordings in app storage. Re-test: 20 s clip in the gallery after 4 s, 158 s clip (161 MB) after 8 s, heap 22 MB. The 158 s clip averaged **21.4 fps** (3394 frames, CPU 63-73 C): sustained recording slows as the phone heats; audio/video lengths agree within 26 ms |
| Diagnostics panel | Performance section now shows live native values (camera, fps, submit time, dropped frames, buffers, photo size, AE range, zoom/EV, recording) and states that thermal state is not exposed; "Export diagnostics" opens the share sheet with a real file. TESTS cover rows, off-Android behaviour and export honesty |
| Native-mode notice | Pro drawer now says what does not apply while the native film camera is on (ISO, shutter, Kelvin, tint, colour sliders, scopes, detection; focus is continuous auto). Shown on every tab |

Still NOT verified: a deliberate audio/video sync test (only track-length agreement is measured), profile import through the Android file picker (it lists the user's files, so I did not drive it), front-camera visual orientation, hotter/longer sessions than ~160 s, 1080p film-look at 30 fps (not achievable here), iOS (no Mac).
Known limitation added: ISO/shutter sliders are not hardware controls in native mode (Camera2 manual exposure is not implemented); the notice says so.