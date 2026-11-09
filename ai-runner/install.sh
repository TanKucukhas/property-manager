#!/bin/sh
# Installs/reloads the runner as a launchd agent on this Mac.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Library/LaunchAgents/com.cresiq.ai-runner.plist"
[ -f "$REPO/ai-runner/.env" ] || { echo "Create ai-runner/.env first (see .env.example)"; exit 1; }
mkdir -p "$HOME/Library/LaunchAgents"
sed -e "s#__REPO__#$REPO#g" -e "s#__HOME__#$HOME#g" "$REPO/ai-runner/com.cresiq.ai-runner.plist" > "$DEST"
launchctl bootout "gui/$(id -u)/com.cresiq.ai-runner" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "Runner installed. Logs: tail -f ~/Library/Logs/cresiq-ai-runner.log"
