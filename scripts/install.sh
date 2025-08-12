#!/bin/bash

# ANSI color codes
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print with zama prefix
zama_echo() {
  echo -e "${BLUE}[zama]${NC} $1"
}

REPO="myferr/zama"
LATEST_RELEASE=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_RELEASE" ]; then
  zama_echo "Could not fetch the latest release tag."
  exit 1
fi

zama_echo "Latest release: $LATEST_RELEASE"

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
    zama_echo "Unsupported architecture for Linux: $ARCH"
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
    zama_echo "Unsupported architecture for macOS: $ARCH"
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
    zama_echo "Unsupported architecture for Windows: $ARCH"
    exit 1
    ;;
  esac
  ;;
*)
  zama_echo "Unsupported operating system: $OS"
  exit 1
  ;;
esac

if [ -z "$FILENAME" ]; then
  zama_echo "Could not determine filename for your system."
  exit 1
fi

DOWNLOAD_URL="$DOWNLOAD_URL_BASE/$FILENAME"
zama_echo "Downloading $FILENAME from $DOWNLOAD_URL"

curl -LJO "$DOWNLOAD_URL"

if [ $? -eq 0 ]; then
  zama_echo "Download complete: $FILENAME"
  open $FILENAME
else
  zama_echo "Download failed."
  exit 1
fi

# Add installation steps here based on file type
# For .AppImage: chmod +x $FILENAME && ./$FILENAME
# For .dmg: open $FILENAME
# For .deb: sudo dpkg -i $FILENAME
# For .exe/.msi: start $FILENAME (Windows specific, not directly in bash)
