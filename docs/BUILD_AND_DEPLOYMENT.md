# Build and Deployment Guide

CineGrid Pro is architected as a cross-platform progressive application that compiles to optimized static web bundles, native Android APK/AAB packages via Capacitor, native iOS Xcode projects, and standalone licensing server binaries.

---

## 1. Web Production Build

### Compile Assets
```bash
# 1. Typecheck and bundle with Vite
npm run build

# 2. Verify production bundle locally
npm run preview
```

### Build Output Structure (`dist/`):
```
dist/
├── assets/
│   ├── index-[hash].js        # Main camera entry bundle (~403 kB)
│   ├── index-[hash].css       # Tailored Tailwind CSS (~24 kB)
│   ├── LookStudioModal-[hash].js
│   ├── PhotoEditorModal-[hash].js
│   ├── ExportStudioModal-[hash].js
│   ├── AdminDashboardModal-[hash].js
│   └── [other code-split modal chunks]
├── favicon.ico
└── index.html
```

---

## 2. Capacitor Mobile Build & Packaging

CineGrid Pro utilizes Capacitor 8 configured in [`capacitor.config.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/capacitor.config.ts):
- **Application ID:** `com.cinegrid.procamera`
- **Application Name:** `CineGrid Pro`
- **Web Directory:** `dist`

### Android Deployment Workflow
```bash
# 1. Build the production web bundle
npm run build

# 2. Add Android platform (first time only)
npx cap add android

# 3. Synchronize web assets and plugins to Android native project
npx cap sync android

# 4. Open in Android Studio
npx cap open android
```

#### Android Permissions (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

### iOS Deployment Workflow
```bash
# 1. Build the production web bundle
npm run build

# 2. Add iOS platform (first time only)
npx cap add ios

# 3. Synchronize web assets and plugins to iOS native project
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

#### iOS Permissions (`ios/App/App/Info.plist`):
```xml
<key>NSCameraUsageDescription</key>
<string>CineGrid Pro requires camera access to capture professional photographs and 4K cinema video.</string>
<key>NSMicrophoneUsageDescription</key>
<string>CineGrid Pro requires microphone access to record synchronized studio audio and display live VU meters.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>CineGrid Pro requires photo library permissions to export graded photos to your device gallery.</string>
```

---

## 3. Standalone Licensing Server Deployment

The standalone licensing REST server lives in `server/standalone.ts` and can be deployed to Node.js environments (Docker, AWS ECS, Fly.io, Railway, DigitalOcean).

### Environment Configuration:
```bash
# Environment variables (.env)
PORT=3001
CINEGRID_LICENSE_SECRET="your-cryptographic-hmac-secret-key"
ADMIN_PASSWORD_HASH="sha256-hashed-admin-password"
```

### Run Server:
```bash
# Using tsx / node
npx tsx server/standalone.ts
```

### Dockerfile Pattern:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
EXPOSE 3001
CMD ["node", "--loader", "tsx", "server/standalone.ts"]
```
