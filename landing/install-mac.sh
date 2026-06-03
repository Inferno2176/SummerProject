#!/bin/bash

set -e

APP_NAME="CareerForges"
MODEL_NAME="qwen3:8b"

DOWNLOAD_URL="https://github.com/JoshiNaidu/career-forges/releases/latest/download/CareerForges.app.tar.gz"

TMP_DIR=$(mktemp -d)

trap "rm -rf $TMP_DIR" EXIT

echo "Checking Ollama..."

if ! command -v ollama >/dev/null 2>&1; then
echo "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh
else
echo "Ollama already installed"
fi

echo "Starting Ollama..."

if ! pgrep -x "ollama" > /dev/null; then
ollama serve >/dev/null 2>&1 &
sleep 5
fi

echo "Checking model..."

if ! ollama list | grep -q "$MODEL_NAME"; then
echo "Downloading $MODEL_NAME..."
ollama pull "$MODEL_NAME"
else
echo "$MODEL_NAME already installed"
fi

echo "Downloading $APP_NAME..."

curl -L "$DOWNLOAD_URL" -o "$TMP_DIR/app.tar.gz"

echo "Extracting..."

tar -xzf "$TMP_DIR/app.tar.gz" -C "$TMP_DIR"

echo "Removing old installation..."

rm -rf "/Applications/$APP_NAME.app"

echo "Installing..."

mv "$TMP_DIR/$APP_NAME.app" /Applications/

echo "Removing quarantine flags..."

xattr -cr "/Applications/$APP_NAME.app"

echo "Fixing permissions..."

chmod -R 755 "/Applications/$APP_NAME.app"

echo "Applying ad-hoc signature..."

codesign --force --deep --sign - "/Applications/$APP_NAME.app"

echo "Launching app..."

open "/Applications/$APP_NAME.app"

echo ""
echo "✅ CareerForges installed successfully!"
