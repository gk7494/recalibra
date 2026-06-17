#!/bin/sh
set -eu

label="com.strata.ollama-11435"
dest="${HOME}/Library/LaunchAgents/${label}.plist"
domain="gui/$(id -u)"

launchctl bootout "$domain" "$dest" >/dev/null 2>&1 || true
rm -f "$dest"

echo "Strata Ollama worker removed from launchd."
