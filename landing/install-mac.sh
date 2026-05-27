#!/bin/bash

set -e

APP_NAME="CareerForges"

DOWNLOAD_URL="https://github.com/JoshiNaidu/career-forges/releases/latest/download/CareerForges.app.tar.gz"

TMP_DIR=$(mktemp -d)

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
echo "✅ $APP_NAME installed successfully!"