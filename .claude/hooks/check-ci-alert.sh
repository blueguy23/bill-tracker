#!/usr/bin/env bash
# CI Alert Surface Hook — PostToolUse (Bash)
# If the background ci-watch.sh watcher left an alert file, surface it to
# the model via stderr + exit 2 (PostToolUse exit 2 feeds stderr back to
# Claude). Otherwise exit 0 silently. Never blocks the tool call itself —
# only reports on completed/failed CI runs from earlier in the session.
#
# Based on Claude Code Mastery Guides V1-V5 by TheDecipherist

set -uo pipefail

ALERT_FILE="/home/garci/projects/bill-tracker/logs/.ci-alert"

if [ ! -f "$ALERT_FILE" ]; then
    exit 0
fi

CONTENT=$(cat "$ALERT_FILE" 2>/dev/null || echo "")
rm -f "$ALERT_FILE" 2>/dev/null || true

if [ -z "$CONTENT" ]; then
    exit 0
fi

echo "CI FAILURE DETECTED: $CONTENT" >&2
exit 2
