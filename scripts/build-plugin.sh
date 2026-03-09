#!/usr/bin/env bash
set -euo pipefail

# Build a distributable zip of the Unreal Master Agent plugin.
# Usage: ./scripts/build-plugin.sh [VERSION]
# Example: ./scripts/build-plugin.sh 0.1.0

VERSION="${1:-0.1.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGIN_DIR="$ROOT_DIR/UnrealMasterAgent"
BUILD_DIR="$ROOT_DIR/build"
OUTPUT_NAME="UnrealMasterAgent-${VERSION}"

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "Error: UnrealMasterAgent/ directory not found at $PLUGIN_DIR" >&2
  exit 1
fi

echo "Building Unreal Master Agent plugin v${VERSION}..."

# Clean and create build directory
rm -rf "$BUILD_DIR/$OUTPUT_NAME"
mkdir -p "$BUILD_DIR/$OUTPUT_NAME"

# Copy plugin contents
cp -r "$PLUGIN_DIR/Source" "$BUILD_DIR/$OUTPUT_NAME/"
cp -r "$PLUGIN_DIR/Content" "$BUILD_DIR/$OUTPUT_NAME/"
[ -d "$PLUGIN_DIR/Resources" ] && cp -r "$PLUGIN_DIR/Resources" "$BUILD_DIR/$OUTPUT_NAME/"
cp "$PLUGIN_DIR/UnrealMasterAgent.uplugin" "$BUILD_DIR/$OUTPUT_NAME/"

# Copy root license if present
[ -f "$ROOT_DIR/LICENSE" ] && cp "$ROOT_DIR/LICENSE" "$BUILD_DIR/$OUTPUT_NAME/"

# Create zip
cd "$BUILD_DIR"
if command -v zip &>/dev/null; then
  zip -r "${OUTPUT_NAME}.zip" "$OUTPUT_NAME"
elif command -v tar &>/dev/null; then
  tar -czf "${OUTPUT_NAME}.tar.gz" "$OUTPUT_NAME"
  echo "Note: zip not available, created .tar.gz instead"
else
  echo "Error: Neither zip nor tar found" >&2
  exit 1
fi

# Clean up extracted directory
rm -rf "$OUTPUT_NAME"

echo "Plugin package created: build/${OUTPUT_NAME}.zip"
echo "To install: Unzip into your UE project's Plugins/ directory"
