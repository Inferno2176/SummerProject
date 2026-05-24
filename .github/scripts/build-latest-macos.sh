#!/bin/bash
set -euo pipefail

# Pre-build all variables
VERSION="${GITHUB_REF_NAME#v}"
SIG_FILE=$(find app/src-tauri/target/release/bundle -type f \( -name "*.app.tar.gz.sig" -o -name "*.dmg.sig" \) | head -n 1)

if [ -z "${SIG_FILE:-}" ]; then
  echo "No macOS updater signature file found."
  exit 1
fi

UPDATER_FILE="${SIG_FILE%.sig}"
UPDATER_NAME="$(basename "$UPDATER_FILE")"
DOWNLOAD_URL="https://github.com/${GITHUB_REPOSITORY}/releases/download/${GITHUB_REF_NAME}/${UPDATER_NAME}"

# Export all variables
export VERSION UPDATER_NAME SIG_FILE DOWNLOAD_URL

# Generate the JSON file
cat > generate-latest-macos.js <<'EOF'
const fs = require("fs");
const sig = fs.readFileSync(process.env.SIG_FILE, "utf8").trim();
const out = {
  version: process.env.VERSION,
  notes: process.env.GITHUB_EVENT_RELEASE_BODY || "",
  pub_date: process.env.GITHUB_EVENT_RELEASE_PUBLISHED_AT,
  platforms: {
    "darwin-x86_64": {
      signature: sig,
      url: process.env.DOWNLOAD_URL
    }
  }
};
fs.writeFileSync("latest-darwin-x86_64.json", JSON.stringify(out, null, 2));
EOF

node generate-latest-macos.js
