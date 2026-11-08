#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.resolve(rootDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const now = new Date();
const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const snapshotName = `cinegrid-backup-${timestamp}`;
const targetDir = path.resolve(backupsDir, snapshotName);

console.log(`[Backup Engine] Initiating CineGrid Pro snapshot: ${snapshotName}`);

// Inclusion directories and files
const includePaths = [
  'src',
  'server',
  'docs',
  'public',
  'scripts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'capacitor.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
  'README.md',
];

// Recursive copy helper
// Never snapshot runtime license data: it holds the signing secret and license keys.
const EXCLUDED = [path.resolve(rootDir, 'server', 'data')];

function copyRecursive(src, dest) {
  if (EXCLUDED.includes(path.resolve(src))) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

let fileCount = 0;
fs.mkdirSync(targetDir, { recursive: true });

for (const item of includePaths) {
  const itemPath = path.resolve(rootDir, item);
  if (fs.existsSync(itemPath)) {
    const destPath = path.resolve(targetDir, item);
    copyRecursive(itemPath, destPath);
    console.log(`  + Archived: ${item}`);
  }
}

// Calculate total archived files
function countFiles(dir) {
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      count += countFiles(full);
    } else {
      count++;
    }
  }
  return count;
}

fileCount = countFiles(targetDir);

// Attempt ZIP compression via PowerShell if available
const zipPath = path.resolve(backupsDir, `${snapshotName}.zip`);
let compressed = false;

try {
  console.log(`[Backup Engine] Compressing snapshot to ZIP archive...`);
  execSync(`powershell -Command "Compress-Archive -Path '${targetDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
    stdio: 'ignore',
  });
  if (fs.existsSync(zipPath)) {
    compressed = true;
    // Clean up uncompressed staging directory
    fs.rmSync(targetDir, { recursive: true, force: true });
    const zipSizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
    console.log(`[Backup Engine] Success: Compressed ${fileCount} files into ${zipPath} (${zipSizeMb} MB)`);
  }
} catch {
  console.log(`[Backup Engine] PowerShell ZIP not available. Kept directory snapshot at: ${targetDir}`);
}

if (!compressed) {
  console.log(`[Backup Engine] Success: Stored ${fileCount} files in ${targetDir}`);
}
