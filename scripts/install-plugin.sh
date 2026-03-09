#!/usr/bin/env bash
set -euo pipefail

# Install the Unreal Master Agent plugin into a UE project.
# Usage: ./scripts/install-plugin.sh <UE_PROJECT_PATH>
# Example: ./scripts/install-plugin.sh /path/to/MyGame

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGIN_SRC="$ROOT_DIR/UnrealMasterAgent"
PLUGIN_NAME="UnrealMasterAgent"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <UE_PROJECT_PATH>" >&2
  echo "Example: $0 /path/to/MyGame" >&2
  exit 1
fi

PROJECT_PATH="$1"

# Validate target project exists
if [ ! -d "$PROJECT_PATH" ]; then
  echo "Error: Project directory not found: $PROJECT_PATH" >&2
  exit 1
fi

# Check for .uproject file
UPROJECT_COUNT=$(find "$PROJECT_PATH" -maxdepth 1 -name "*.uproject" | wc -l)
if [ "$UPROJECT_COUNT" -eq 0 ]; then
  echo "Warning: No .uproject file found in $PROJECT_PATH" >&2
  echo "Are you sure this is an Unreal Engine project directory?" >&2
  read -p "Continue anyway? [y/N] " -r
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

DEST="$PROJECT_PATH/Plugins/$PLUGIN_NAME"

# Check if already installed
if [ -d "$DEST" ]; then
  echo "Plugin already exists at $DEST"
  read -p "Overwrite? [y/N] " -r
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
  rm -rf "$DEST"
fi

# Copy plugin
echo "Installing $PLUGIN_NAME to $DEST..."
mkdir -p "$DEST"
cp -r "$PLUGIN_SRC/Source" "$DEST/"
cp -r "$PLUGIN_SRC/Content" "$DEST/"
[ -d "$PLUGIN_SRC/Resources" ] && cp -r "$PLUGIN_SRC/Resources" "$DEST/"
cp "$PLUGIN_SRC/UnrealMasterAgent.uplugin" "$DEST/"

echo "Plugin installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Add to your .uproject Plugins array:"
echo "     { \"Name\": \"$PLUGIN_NAME\", \"Enabled\": true }"
echo "  2. Rebuild your project"
echo "  3. Enable 'Python Editor Script Plugin' in UE Editor if not already enabled"
