#!/bin/bash

set -e

APP_NAME="CareerForges"
MODEL_NAME="qwen3:8b"

DOWNLOAD_URL="https://github.com/JoshiNaidu/career-forges/releases/latest/download/CareerForges.app.tar.gz"

TMP_DIR=$(mktemp -d)

trap 'rm -rf "$TMP_DIR"' EXIT

echo ""
echo "=== CareerForges Installer ==="
echo ""

echo "Checking Ollama..."

if ! command -v ollama >/dev/null 2>&1; then
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "Ollama already installed."
fi

echo "Checking Ollama service..."

READY=false

if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then

    READY=true

    echo "Ollama already running."

else

    echo "Starting Ollama..."

    ollama serve >/dev/null 2>&1 &

    echo "Waiting for Ollama..."

    for i in $(seq 1 60); do

        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then

            READY=true
            break

        fi

        sleep 1

    done

fi

if [ "$READY" = false ]; then
    echo "❌ Ollama failed to start."
    exit 1
fi

echo "Checking model..."

if ! ollama list | grep -q "^$MODEL_NAME"; then
    echo "Downloading $MODEL_NAME..."
    ollama pull "$MODEL_NAME"
else
    echo "$MODEL_NAME already installed."
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