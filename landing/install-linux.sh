#!/bin/bash

set -e

MODEL_NAME="qwen3:8b"
REPO_OWNER="JoshiNaidu"
REPO_NAME="career-forges"

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

echo "Starting Ollama..."

if ! pgrep -x "ollama" >/dev/null 2>&1; then
    ollama serve >/dev/null 2>&1 &
fi

echo "Waiting for Ollama..."

READY=false

for i in $(seq 1 20); do
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        READY=true
        break
    fi

    sleep 1
done

if [ "$READY" = false ]; then
    echo "❌ Ollama failed to start."
    exit 1
fi

echo "Checking model..."

if ! ollama list | grep -q "$MODEL_NAME"; then
    echo "Downloading $MODEL_NAME..."
    ollama pull "$MODEL_NAME"
else
    echo "$MODEL_NAME already installed."
fi

TMP_DIR=$(mktemp -d)

trap 'rm -rf "$TMP_DIR"' EXIT

echo "Finding latest CareerForges release..."

RELEASE_JSON=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest")

DOWNLOAD_URL=$(echo "$RELEASE_JSON" | grep browser_download_url | grep AppImage | grep -v ".sig" | cut -d '"' -f 4 | head -n 1)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "❌ Unable to locate AppImage release."
    exit 1
fi

echo "Downloading CareerForges..."

curl -L "$DOWNLOAD_URL" -o "$TMP_DIR/CareerForges.AppImage"

chmod +x "$TMP_DIR/CareerForges.AppImage"

mkdir -p "$HOME/.local/bin"

rm -f "$HOME/.local/bin/CareerForges"

mv "$TMP_DIR/CareerForges.AppImage" "$HOME/.local/bin/CareerForges"

chmod +x "$HOME/.local/bin/CareerForges"

echo "Launching CareerForges..."

"$HOME/.local/bin/CareerForges" &

echo ""
echo "✅ CareerForges installed successfully!"