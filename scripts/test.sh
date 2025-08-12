#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "[zama] Building Tauri app..."
if bun run tauri build; then
    echo "[zama] Complete!"
    echo "[zama] Cleaning up..."
    (cd src-tauri && cargo clean)
else
    echo "[zama] Build failed, stopping process."
    exit 1
fi
