# CineGrid Pro — Apple App Store Compliance & Review Dossier
**Generated:** November 9, 2026  
**Bundle Identifier:** `com.cinegrid.procamera`  
**Target Platform:** iOS 15.0+ (iPhone & iPad)  
**Classification:** Photo & Video (Primary) / Utilities (Secondary)

---

## 1. App Store Metadata & Identifiers

- **App Name:** CineGrid Pro
- **Subtitle:** Professional Cinema Camera & Color Grading
- **Category:** Photo & Video
- **Content Rating:** 4+ (No unrestricted web access, no user-generated mature content, privacy-first offline operation).
- **Default Language:** English (U.S.)

---

## 2. Privacy Manifest & Apple Privacy Compliance

Apple mandates a signed `PrivacyInfo.xcprivacy` declaring all required reasons for covered API usage.

### Declared API Categories in `PrivacyInfo.xcprivacy`:
1. **`NSPrivacyAccessedAPICategoryFileTimestamp` (`C617.1`):** Required to verify local file modifications, manage WebGL LUT caches, and timestamp recorded video containers.
2. **`NSPrivacyAccessedAPICategorySystemBootTime` (`35F9.1`):** Utilized for high-precision microsecond frame pacing in the rolling pre-record buffer and shutter angle math.
3. **`NSPrivacyAccessedAPICategoryDiskSpace` (`E174.1`):** Inspects available device capacity prior to 4K recording and multi-frame RAW burst acquisition to prevent mid-recording storage exhaustion.
4. **`NSPrivacyAccessedAPICategoryUserDefaults` (`CA92.1`):** Stores camera user preferences, composition grid defaults, and exposure presets.

### User Data Collection Declaration:
- **Data Used to Track You:** **None** (`NSPrivacyTracking: false`).
- **Data Linked to You:** **None**.
- **Data Collected:** **None**. All video streams, audio DSP buffers, photos, and LUT conversions execute entirely on-device with zero cloud telemetry.

---

## 3. iOS Permission Usage Descriptions (`Info.plist`)

| Key | Description Provided to User |
|---|---|
| `NSCameraUsageDescription` | CineGrid Pro uses the camera to show the live viewfinder and to take photos and videos. |
| `NSMicrophoneUsageDescription` | CineGrid Pro uses the microphone to record sound with your videos. |
| `NSPhotoLibraryUsageDescription` | CineGrid Pro reads your photo library so you can import reference photos and edit them. |
| `NSPhotoLibraryAddUsageDescription` | CineGrid Pro saves the photos and videos you capture to your photo library. |

---

## 4. Human Interface Guidelines (HIG) & Device Support

- **Supported Orientations:** Portrait, Landscape Left, Landscape Right (Responsive rotation lock and dynamic HUD layout).
- **Safe Area Insets:** All controls and HUD elements dynamically respect iPhone Dynamic Island and home indicator safe areas.
- **Display Idle Timer:** `UIApplication.shared.isIdleTimerDisabled = true` ensures the viewfinder remains illuminated during filming.
