#!/bin/bash

REPO="myferr/zama"
LATEST_RELEASE=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_RELEASE" ]; then
  echo "Could not fetch the latest release tag."
  exit 1
fi

echo "Latest release: $LATEST_RELEASE"

OS=$(uname -s)
ARCH=$(uname -m)

DOWNLOAD_URL_BASE="https://github.com/$REPO/releases/download/$LATEST_RELEASE"
FILENAME=""

case "$OS" in
Linux*)
  case "$ARCH" in
  x86_64)
    FILENAME="zama_${LATEST_RELEASE#v}_amd64.AppImage"
    ;;
  aarch64)
    # Assuming AppImage for aarch64 if it exists, otherwise deb
    FILENAME="zama_${LATEST_RELEASE#v}_arm64.AppImage" # Placeholder, adjust if different
    ;;
  *)
    echo "Unsupported architecture for Linux: $ARCH"
    exit 1
    ;;
  esac
  ;;
Darwin*)
  case "$ARCH" in
  x86_64)
    FILENAME="zama_${LATEST_RELEASE#v}_x64.dmg" # Placeholder, adjust if different
    ;;
  arm64)
    FILENAME="zama_${LATEST_RELEASE#v}_aarch64.dmg"
    ;;
  *)
    echo "Unsupported architecture for macOS: $ARCH"
    exit 1
    ;;
  esac
  ;;
CYGWIN* | MINGW32* | MSYS* | MINGW*)
  case "$ARCH" in
  x86_64)
    FILENAME="zama_${LATEST_RELEASE#v}_x64-setup.exe"
    ;;
  *)
    echo "Unsupported architecture for Windows: $ARCH"
    exit 1
    ;;
  esac
  ;;
*)
  echo "Unsupported operating system: $OS"
  exit 1
  ;;
esac

if [ -z "$FILENAME" ]; then
  echo "Could not determine filename for your system."
  exit 1
fi

DOWNLOAD_URL="$DOWNLOAD_URL_BASE/$FILENAME"
echo "Downloading $FILENAME from $DOWNLOAD_URL"

curl -LJO "$DOWNLOAD_URL"

if [ $? -eq 0 ]; then
  echo "Download complete: $FILENAME"
  open $FILENAME
else
  echo "Download failed."
  exit 1
fi

# Add installation steps here based on file type
# For .AppImage: chmod +x $FILENAME && ./$FILENAME
# For .dmg: open $FILENAME
# For .deb: sudo dpkg -i $FILENAME
# For .exe/.msi: start $FILENAME (Windows specific, not directly in bash)
