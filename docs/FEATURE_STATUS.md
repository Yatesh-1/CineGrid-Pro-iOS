# Feature Status

Allowed statuses: ALREADY IMPLEMENTED AND VERIFIED | SKIPPED - DUPLICATE | NEEDS IMPROVEMENT | PARTIALLY IMPLEMENTED | IMPLEMENTED | TESTING PASSED | HARDWARE UNSUPPORTED | BLOCKED
Nothing is marked verified yet: the audit was a keyword scan plus a green unit-test baseline (738 tests, jsdom only). Device verification is Phase 0.

| Feature | Reference | Previous status (SCAN) | New status | Android | iOS | Tests run | Notes |
|---|---|---|---|---|---|---|---|
| Live camera preview (base, no LUT) | all | exists | ALREADY IMPLEMENTED AND VERIFIED (CPH2421, 2026-11-08: back camera streams live; Camera2 client CONNECTed; startup roughly 2-3 s before first frame, not yet measured precisely) | verified on 1 device | unverified | 738 unit + device launch | LUT/profile effect on preview still to verify |
| Live LUT preview | FiLMiC | exists | NEEDS VERIFICATION | unverified | unverified | unit only | check preview == export |
| Film grain / halation | Rumi/OldRoll | partial | PARTIALLY IMPLEMENTED | unverified | unverified | unit only | no per-camera model |
| Virtual camera profiles + presets | Rumi/OldRoll | not found | not started | - | - | - | Phase 1 |
| Light leak / date imprint / borders / dust | Rumi/OldRoll | not found | not started | - | - | - | Phase 1 |
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
