# Device Compatibility

## Test device (connected via USB, adb serial IR4T59AYDERWWKE6)
- OPPO CPH2421, Android 11 (API 30), build target SDK 36 / minSdk 24.
- Debug build (`gradlew assembleDebug`) installed with `adb install -r` over the existing app; existing user photos remained intact. Launches without crash; Capacitor loads all lazy chunks.
- `adb shell pm grant` is blocked on this OPPO ROM (no GRANT_RUNTIME_PERMISSIONS). Camera/mic permissions must be accepted manually on the phone.

## Camera2 capabilities reported by the app's NativeCamera plugin (device log, 2026-11-08)
| Camera | Level | RAW | Burst | Manual | Notes |
|---|---|---|---|---|---|
| 0 back | FULL | yes, 4208x3120 | yes | yes | JPEG up to 3840x2160; high-speed 120 fps |
| 1 front | LEVEL_3 | yes, 2592x1944 | yes | yes | JPEG up to 2560x1920 |

Implications: DNG capture and 120 fps high-speed are genuinely available on this phone. 10-bit output, LOG/HLG and RAW *video* are NOT yet probed (the plugin does not query dynamic-range profiles or RAW_SENSOR video streams). That probe is the first Phase 4 task. No claims about them until measured here.

## Not testable here
- iOS devices (no Mac, no iPhone connected). All iOS rows in FEATURE_STATUS.md stay unverified/BLOCKED.
- Other Android manufacturers/versions: only this one device is available.

## Encoders (device log)
hevcEncoder=false, heicEncoder=false on CPH2421 (API 30) as reported by the NativeCamera plugin. HEVC recording must not be offered on this device until confirmed otherwise.
