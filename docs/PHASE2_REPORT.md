# Phase 2 Report (2026-11-08)

Device: OPPO CPH2421 ("A16e"), Android 11, 3.9 GB RAM, debug builds. Evidence levels: **DEVICE** = observed on the phone, **TESTS** = automated (jsdom), **CODE** = written, not observed.
Test suite: 787 passing (738 at the start of the project). `tsc -b` and `oxlint` clean on all changed files.

## A. Fixed (with evidence)
| Issue | Cause found | Fix | Evidence |
|---|---|---|---|
| Look photos saved at 1080x1440 | With a look active, capture read the live GPU canvas (preview size) and skipped the full-resolution still | Full-res still is re-rendered through a throwaway pipeline with the same shader (`renderLookStill.ts`); preview-size canvas stays as fallback | DEVICE: look = original = 2160x2880 |
| Still request wasted pixels | App asked for the camera's two independent maxima (3840x2448); the camera answered 16:9 (2160x3840) and the 4:3 frame then cropped 25% away | Request a size matching the frame ratio inside the camera's advertised limits (`stillSizeFor`) | DEVICE: 4:3 photos now 2448x3264 (8.0 MP), look and original identical size; TESTS |
| Look sheet hid the viewfinder | Full-screen `bg-black/60 backdrop-blur` overlay and 85vh sheet | Transparent non-blocking overlay, opens at 44dvh, drag handle expands to 85dvh, opaque sheet | DEVICE: sheet 352 of 800 px, preview fully visible; TESTS |
| Header always "Clean Raw" | Hard-coded fallback | Shows active camera (and LUT/filter) name, live | DEVICE + TESTS |
| Camera reset every launch | Look state is wiped by `resetOnLaunch` | Active camera stored under its own key, validated on load (deleted/corrupt id -> No camera) | DEVICE: force-stop + cold start kept Gold 400 active; TESTS |
| Highlights never reached white | Shoulder `knee + (1-knee)*k/(1+k)` mapped white 1.0 to ~0.7 | C1 shoulder `u + B*u^2*(1-u)`, f(1)=1 (CPU reference and GLSL) | Found from DEVICE stats (Gold 400 luma 161 vs raw 182); TESTS |
| Yellow blob on CCD Compact | The new shoulder is only valid for u<=1; matrix/glow exceed 1 | Clip u to 1 | DEVICE contact sheet before/after; TESTS |
| Border / date / vignette / light leak cut off | Computed on the sensor frame, but the visible and saved image is a centred crop | `u_frame` uniform; effects use frame uv; `frameRect` mirrors the saved-photo crop rule | DEVICE contact sheet (borders complete, date visible); TESTS (matches capture crop for 4 cases) |
| Effects looked different at 4K vs preview | Blur/glow radii were in texels | Radii and dust scale with image height / 1080 | CODE + shader review (not pixel-compared at 4K) |
| Profile Export reported success but wrote nothing | Blob `<a download>` is ignored by Android WebView | `shareTextFile`: writes to app cache via Filesystem and opens the share sheet; success is reported only after it resolves; cancel and failure reported as such | DEVICE: old behaviour reproduced (status "Profile exported.", no file). New build compiled; **not installed** (phone dropped off adb). TESTS: success/cancel/failure + round trip |

## B. Device-tested
Preview with each of the 8 cameras (stats + contact sheet); photo capture at 4:3 with Gold 400; 8 consecutive look captures (no death); persistence across force-stop; compact sheet; header; video recording with a look (file inspected); 3x screen sleep/wake with the app foreground (process survived each time); Export (old build).

## C. Automated
787 unit/UI tests: profile model, store, panel UI, still size, frame rect, tone curve (monotonic, bounded, white = 1, over-range), probe maths, export honesty, round trip. Build: `npm run build` and `gradlew assembleDebug` succeed.

## D. NOT verified (do not treat as passed)
- Share-sheet export on the phone (new build not installed) and **import through the system file picker** (cannot be automated; only the parsing is tested).
- Photos at 16:9 and 1:1 (my attempt to cycle ratio silently did nothing; the control is not always in the DOM). Frame-relative maths is tested, not seen in a saved photo.
- Pixel comparison of a 4K still against the preview.
- Lock/unlock recovery of the camera and the active camera after a real lock screen; background/foreground via Home button; long-duration run; thermal behaviour over time.
- HEVC/HEIC: MediaRecorder reports `hvc1=false`; the plugin reports no HEVC/HEIC encoder. The app records H.264+AAC. I did not audit every code path that mentions HEVC.
- Custom (non-built-in) camera rendering on device, and a render-equality check after import.
- WebGL context-loss recovery (listeners exist in the pipeline; never triggered on device).
- Per-effect isolation tests (grain flicker, halation outlines, CA amount, dust pattern). Only visual contact sheets were reviewed, and with a heavily over-exposed scene.

## E. Performance (DEVICE, OPPO CPH2421, CPU/GPU ~48.7 C, Android reported no throttling)
- Raw camera into the page, pipeline idle: **29.2-29.6 fps**.
- GPU film preview: **9-19 fps** depending on run and camera. Full 1080x1920 render: 9-15 fps; capped at 1280 long side (720x1280): 15-19 fps on one pass, 8.5 on a later pass. Rendering at 360x640 gave only 17 fps, so the limit is not shading or fill-rate below ~1280.
- Existing LUT-only pipeline, no film stage: **13.3 fps** at full size, so most of the cost pre-dates the film stage.
- Frame submission (CPU time per frame): 8-14 ms avg, spikes to 20-136 ms. Dropped frames 0-7 per 6 s.
- While the pipeline runs, the raw video itself falls from 30 to ~16 fps (shared GPU / compositor).
- **Recorded video with a look: 720x1280 at 9.3 fps, H.264 + AAC.** This is not acceptable for motion. The 720p size is a side effect of my preview cap (before, looked videos were 1080x1920 at a similarly low rate).
- JS heap 37.8 MB at idle. Native memory was not measured (my `dumpsys meminfo` parse failed).
- Photo capture end-to-end time (in-app probe) was added but not read on device before the phone disconnected.
- GPU execution time: not measurable (EXT_disjoint_timer_query not exposed; probe reports this rather than inventing a number).
- Adaptive preview resolution was built, measured as useless on this device, and reverted (commit fd2a9b1).

## F. Changed files
src/utils/cameraProfile.ts (shoulder fix, clamp), src/utils/webglLutPipeline.ts (shoulder, frame uniform, resolution-independent radii, maxSide, ImageBitmap, setFrame/frameRect, context release, probe hooks), src/utils/renderLookStill.ts (new), src/utils/renderProbe.ts (new), src/services/cameraService.ts (`stillSizeFor`, ratio-aware request), src/services/cameraProfileStore.ts (active id), src/services/shareService.ts (`shareTextFile`), src/components/look/LookStudioModal.tsx (compact sheet, handle, header, tab roles), src/components/look/CameraProfilePanel.tsx (honest export, Performance readout), src/components/Viewfinder.tsx (probe, preview cap, frame), src/App.tsx (full-res look still, active camera persistence, capture timing), src/types/lut.ts, tests (8 new/updated files).

## G. Remaining bugs
| Severity | Issue | Reproduce |
|---|---|---|
| High | Video with a look records at ~9 fps and 720x1280 | Select any camera, record 5 s, play the file back and count frames |
| High | Live preview 9-19 fps, drags the whole camera video to ~16 fps | Select any camera, open Performance in the Cameras tab |
| Medium | `.cube` export in Look Studio has the same fake-success blob download as the profile export had | Export a LUT: no file appears |
| Medium | Pro EV / white balance are skipped when the GPU canvas is used for capture (existing behaviour, `skipCss`) | Set EV +2 with a look on, take a photo |
| Medium | Two app deaths with no crash record (08:57 at screen lock, 09:12 mid-test). Sleep/wake x3 and 8 consecutive captures did not reproduce them | Unattributed; DropBox shows only an older Chromium JNI abort (Nov 7) |
| Low | First capture after cold start is slow (> 7 s observed) | Cold start, capture immediately |
| Low | Date imprint uses the render-time clock, not the capture time | Take a photo with a dated camera |

## H. Build
Web build, `tsc -b`, and `assembleDebug` succeed. The installed APK on the phone is the build **before** the export fix; the export-fix build is compiled but was not installed because the phone went offline. No release build was made.
