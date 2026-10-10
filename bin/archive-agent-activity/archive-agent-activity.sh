#!/bin/bash

# Sync agent conversations (Claude Code transcripts, Codex session index) to a remote machine.
# Reads settings from $PUSH_ACTIVITY_CONFIG, or archive-agent-activity.conf next to this script
# (gitignored; copy archive-agent-activity.conf.example to start).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="${PUSH_ACTIVITY_CONFIG:-$SCRIPT_DIR/archive-agent-activity.conf}"
[ -f "$CONFIG" ] || { echo "missing $CONFIG" >&2; exit 1; }
. "$CONFIG"

: "${PUSH_ACTIVITY_DEST:?set PUSH_ACTIVITY_DEST in $CONFIG}"
: "${PUSH_ACTIVITY_MACHINE:=$(hostname -s)}"

echo "$(date '+%Y-%m-%d %H:%M:%S') pushing to ${PUSH_ACTIVITY_MACHINE}"
DEST="${PUSH_ACTIVITY_DEST%/}/${PUSH_ACTIVITY_MACHINE}/"
/usr/bin/rsync -az --delete "$HOME/.claude/projects/" "${DEST}projects/"
if [ -f "$HOME/.codex/session_index.jsonl" ]; then
    /usr/bin/rsync -az "$HOME/.codex/session_index.jsonl" "$DEST"
fi
