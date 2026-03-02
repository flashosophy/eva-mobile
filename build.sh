#!/usr/bin/env bash
# build.sh — log into EAS and build the APK
# Run this once from ~/git/eva-mobile/
set -e

cd "$(dirname "$0")/app"

echo "==> Logging into Expo..."
npx eas-cli login

echo ""
echo "==> Linking project to EAS (first time only)..."
npx eas-cli init --id "" 2>/dev/null || true

echo ""
echo "==> Building APK..."
npx eas-cli build --platform android --profile apk --non-interactive 2>/dev/null \
  || npx eas-cli build --platform android --profile apk

echo ""
echo "Done. Download the APK from the URL above and sideload it."
