# Feature Status

Allowed statuses: ALREADY IMPLEMENTED AND VERIFIED | SKIPPED - DUPLICATE | NEEDS IMPROVEMENT | PARTIALLY IMPLEMENTED | IMPLEMENTED | TESTING PASSED | HARDWARE UNSUPPORTED | BLOCKED
Nothing is marked verified yet: the audit was a keyword scan plus a green unit-test baseline (738 tests, jsdom only). Device verification is Phase 0.

| Feature | Reference | Previous status (SCAN) | New status | Android | iOS | Tests run | Notes |
|---|---|---|---|---|---|---|---|
| Live camera preview (base, no LUT) | all | exists | ALREADY IMPLEMENTED AND VERIFIED (CPH2421, 2026-11-08: back camera streams live; Camera2 client CONNECTed; startup roughly 2-3 s before first frame, not yet measured precisely) | verified on 1 device | unverified | 738 unit + device launch | LUT/profile effect on preview still to verify |
| Live LUT preview | FiLMiC | exists | NEEDS VERIFICATION | unverified | unverified | unit only | check preview == export |
| Film grain / halation / bloom / vignette / CA / softness (GPU, live) | Rumi/OldRoll | grain+vignette were capture-only (CPU, Math.random), not live | IMPLEMENTED (GPU film stage in webglLutPipeline) - see Phase 1 section below | grain, softness, vignette, colour, tone VERIFIED live + in saved photo on CPH2421; halation, bloom, CA not individually inspected | unverified | 23 new unit/UI tests | Phase 1 |
| Virtual camera profiles + presets (8 built-in, edit, duplicate, reset, import, export, delete) | Rumi/OldRoll | not found | IMPLEMENTED; TESTING PARTIAL | selection + editor UI render and select verified on CPH2421; import/export/duplicate/reset verified in jsdom only | unverified | 23 unit/UI tests pass | Phase 1 |
| Light leak / date imprint / borders / dust | Rumi/OldRoll | not found | IMPLEMENTED (shader + date texture); NOT yet verified on device | unverified | unverified | formatter unit-tested only | date imprint is a plain text overlay; needs on-device check |
| Scopes (waveform, false colour, zebra, peaking, histogram) | FiLMiC | exists | NEEDS VERIFICATION | unverified | unverified | unit only | verify on real frames |
| Rack focus / zoom ramp | FiLMiC | exists | NEEDS VERIFICATION | unverified | unverified | unit only | verify hardware focus control |
| 4K/1080, 24-60 fps, HEVC recording | FiLMiC | partial | PARTIALLY IMPLEMENTED | unverified | unverified | - | WebView MediaRecorder |
| 10-bit / HDR / LOG | FiLMiC | not found | not started | - | BLOCKED (no Mac) | - | needs native plugin |
| Camera to cloud | FiLMiC | not found | not started | - | - | - | needs backend decision |
| Long exposure / night | Spectre | partial | PARTIALLY IMPLEMENTED | unverified | unverified | unit only | alignment unverified |
| Crowd removal / light trails / waterfall | Spectre | not found | not started | - | - | - | Phase 3 |
| Motion photo | Spectre | not found | not started | - | - | - | Phase 3 |
| RAW DNG photo | MotionCam | exists (Android native) | NEEDS VERIFICATION | unverified | HARDWARE UNSUPPORTED path unbuilt | - | validate DNG on device |
| RAW video | MotionCam | not found | not started | - | HARDWARE UNSUPPORTED (iOS) | - | Phase 4 |
| AI assistant | all | partial | PARTIALLY IMPLEMENTED | - | - | unit only | confirm ML vs heuristic |
| Billing (Play/StoreKit) | - | not found | not started | - | BLOCKED (no Mac) | - | Phase 5 |
| Clean HDMI | FiLMiC | not found | HARDWARE UNSUPPORTED (investigate) | - | - | - | OS restricted |

## Phase 1 evidence (2026-11-08, OPPO CPH2421, debug build)
VERIFIED on device:
- New fragment shader compiles and links (no shader errors in logcat); Cameras tab appears in Look Studio; selecting "Gold 400 Film" changes the live viewfinder (warm cast, faded blacks, visible grain, softness).
- A photo taken with Gold 400 active was saved as `*_look.jpg` with the same rendering as the preview; `*_full.jpg` is the untouched original (both 1080x1440).
- Existing photos and the plain preview survived the upgrade install.

NOT yet verified on device (do not treat as passed): the other 7 cameras, light leak, dust, border, date imprint, halation/bloom/chromatic aberration individually, slider live-update, duplicate/reset/import/export in the real WebView, camera look baked into recorded video (code path reused from the LUT recorder, untested), preview FPS and GPU cost (gfxinfo returned no data; needs an in-app probe).

Known limitations / defects found:
1. Look-processed photos are preview resolution (1080x1440), not sensor resolution. The existing LUT path has the same behaviour (full-res still is skipped when the GPU canvas is used). Fix planned: run the film shader on the full-res still.
2. While the Look Studio sheet is open it covers almost the whole viewfinder, so slider edits cannot be judged live. Fix planned: shorter sheet / peek mode on the Cameras tab.
3. Look Studio header subtitle still says "Clean Raw" while a camera is active.
4. Active camera resets to "No camera" on every launch (existing resetOnLaunch design; edited profiles persist).
5. Grain/vignette stored on legacy CameraFilter are still applied by the old CPU path at capture; they are untouched.
6. Date imprint uses the current time at render, not the capture timestamp, and is not yet burned into EXIF-aware output.
7. App process died once at 08:57:32 while foreground, coinciding with a system-wide process purge when the OPPO lock screen engaged. No crash/tombstone logged; not attributed to the app, but not ruled out.
8. Device finding: Camera2 plugin reports hevcEncoder=false and heicEncoder=false (Android 11, API 30). Relevant to Phase 4 video.