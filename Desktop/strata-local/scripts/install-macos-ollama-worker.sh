#!/bin/sh
set -eu

label="com.strata.ollama-11435"
src="$(cd "$(dirname "$0")/.." && pwd)/launchd/${label}.plist"
dest="${HOME}/Library/LaunchAgents/${label}.plist"
domain="gui/$(id -u)"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed or is not on PATH." >&2
  exit 1
fi

mkdir -p "${HOME}/Library/LaunchAgents"
cp "$src" "$dest"

launchctl bootout "$domain" "$dest" >/dev/null 2>&1 || true
launchctl bootstrap "$domain" "$dest"
launchctl kickstart -k "${domain}/${label}"

for _ in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:11435/ >/dev/null 2>&1; then
    echo "Strata Ollama worker is running at http://localhost:11435/"
    exit 0
  fi
  sleep 1
done

echo "Worker did not become ready. Check /tmp/strata-ollama-11435.err.log" >&2
exit 1
