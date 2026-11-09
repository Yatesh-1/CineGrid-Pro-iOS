#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " CineGrid Pro — Native iOS IPA Archive & Packaging Build"
echo "=========================================================="

CONFIG="${1:-Release}"
OUTPUT_DIR="release/ios"
BUILD_DIR="build"
IPA_NAME="CineGrid-Pro-v1.0.0-b1.ipa"

echo "Configuration: ${CONFIG}"
echo "Target IPA:    ${OUTPUT_DIR}/${IPA_NAME}"

# 1. Clean previous build output
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}" "${OUTPUT_DIR}"

# 2. Build Web Bundle & Sync Capacitor iOS
echo "--> Compiling TypeScript web assets..."
npm run build
echo "--> Synchronizing Capacitor iOS native project..."
npx cap sync ios

# 3. Compile & Archive using Xcode
echo "--> Executing xcodebuild archive..."
xcodebuild archive \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration "${CONFIG}" \
  -archivePath "${BUILD_DIR}/App.xcarchive" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY=""

# 4. Package Payload into standard iOS IPA
echo "--> Packaging Payload directory into IPA container..."
mkdir -p "${BUILD_DIR}/Payload"
cp -R "${BUILD_DIR}/App.xcarchive/Products/Applications/App.app" "${BUILD_DIR}/Payload/"

cd "${BUILD_DIR}"
zip -r -y "../${OUTPUT_DIR}/${IPA_NAME}" Payload
cd ..

echo "=========================================================="
echo " IPA BUILD COMPLETE: ${OUTPUT_DIR}/${IPA_NAME}"
ls -lh "${OUTPUT_DIR}/${IPA_NAME}"
echo "=========================================================="
