# Backup and Disaster Recovery Guide

This guide details procedures for creating reproducible project archives, recovering from system failures, and backing up client photography assets.

---

## 1. Project Snapshot Tooling

Because the host environment lacks Git in its PATH, CineGrid Pro includes an automated Node.js backup script located in [`scripts/backup.mjs`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/scripts/backup.mjs).

### Automated Snapshot Command:
```bash
# From the project root:
node scripts/backup.mjs
```

### What Is Included in Project Backups:
- `src/` (All source code, components, services, utils, and tests)
- `server/` (Standalone licensing server & database engine)
- `docs/` (All architectural and operational documentation)
- `public/` (Static assets, logos, and icons)
- Project configurations (`package.json`, `tsconfig.json`, `vite.config.ts`, `capacitor.config.ts`, `tailwind.config.js`)

### What Is Excluded:
- `node_modules/` (Re-installable via `npm ci` or `npm install`)
- `dist/` (Rebuilt via `npm run build`)
- `.checkpoints/` and temporary OS files

---

## 2. Disaster Recovery Protocol

If project files become corrupted or the environment needs to be restored to a clean machine:

### Recovery Steps:
1. **Extract Archive:**
   Extract the latest snapshot from `backups/cinegrid-cam-backup-[TIMESTAMP].zip` into the target directory.
2. **Install Dependencies:**
   ```bash
   cd cinegrid-cam
   npm install
   ```
3. **Verify Integrity Gates:**
   ```bash
   # 1. Run linter
   npm run lint

   # 2. Run automated test suite (all 90 tests must pass)
   npm test

   # 3. Compile production build
   npm run build
   ```
4. **Launch Dev Server:**
   ```bash
   npm run dev
   ```

---

## 3. Client Media & Preset Recovery

### Photography Assets
- **Location:** Stored in the browser's persistent `CineGridMediaStore` IndexedDB database.
- **Exporting Raw Media:** Use the in-app **Export Studio** (`ExportStudioModal`) to export all photos to the local filesystem or camera roll before clearing browser cache.

### Custom 3D LUTs and User Look Presets
- **Location:** Stored in `CineGridLutStore` and `localStorage['cinegrid_user_look_presets']`.
- **Exporting Presets:** In the **LUT Studio** (`LookStudioModal`), switch to the "Export" tab to download any modified look as a universal `.cube` file compatible with DaVinci Resolve, Premiere Pro, and Final Cut Pro.
