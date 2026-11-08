# Implementation Plan

Rule: PRESERVE > INSPECT > VERIFY > REUSE > FIX > IMPROVE > IMPLEMENT. One phase at a time; a phase is closed only when its tests have actually run.

| Phase | Scope | Platform | Gate |
|---|---|---|---|
| 0 | Install git, `git init`, baseline commit; run app on CPH2421 and verify existing features (scopes, LUT, rack focus, night, RAW capture) on device | env | Verification evidence recorded in FEATURE_STATUS.md |
| 1 | **Virtual camera profile system**: per-camera parameter model (matrix, curves, grain, noise, halation, bloom, vignette, softness, CA, light leaks, date imprint, borders, dust), presets save/duplicate/import/export/reset. Extend `webglLutPipeline`/`shaders`; same parameters drive preview and saved photo | Web (both OS) | Unit tests on colour math; preview vs export pixel-diff test; device check |
| 2 | Retro video: process recorded video (canvas/WebGL capture stream), date/timestamp overlay, aspect ratios, frame rate; hardware flash/torch + software retro flash | Web + Android | Recorded file inspected with ffprobe; device recording |
| 3 | Computational photography: burst alignment, long exposure fusion, crowd removal (temporal median + motion mask), light trails, waterfall, scene detection, motion photo | Web/TS (workers/WebGL) | Synthetic-frame unit tests + device runs |
| 4 | Native capture plugins: Android Camera2 + MediaCodec (10-bit HEVC, capability matrix, HLG/log-like only where hardware exposes), RAW pipeline improvements; iOS AVFoundation (unverified, no Mac) | Android first | Validate pixel format / bit depth of output file |
| 5 | Camera-to-cloud upload queue (needs a backend decision), Play Billing integration (needs account/product decisions) | Android | Real upload / sandbox purchase |
| 6 | AI assistant gaps (horizon, blur, exposure advice, best frame), deterministic CV first | Web | Unit tests |
| 7 | Release builds, regression, performance measurements on device | Android | Signed release APK |

Not planned / hardware-restricted (documented, no fake implementation): clean HDMI output, RAW video on iOS, 10-bit/LOG on devices whose Camera2 does not expose them.
