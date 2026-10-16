#!/bin/bash

# Sync agent conversations (Claude Code transcripts, Codex transcripts and session index) to a remote machine.
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
if [ -d "$HOME/.codex/sessions" ]; then
    /usr/bin/rsync -az --delete "$HOME/.codex/sessions/" "${DEST}codex-sessions/"
fi
if [ -d "$HOME/.codex/archived_sessions" ]; then
    /usr/bin/rsync -az --delete "$HOME/.codex/archived_sessions/" "${DEST}codex-archived-sessions/"
fi
if [ -f "$HOME/.codex/session_index.jsonl" ]; then
    /usr/bin/rsync -az "$HOME/.codex/session_index.jsonl" "$DEST"
fi
# Full Codex transcripts; archiving moves a session out of sessions/, so push both.
for dir in sessions archived_sessions; do
    if [ -d "$HOME/.codex/$dir" ]; then
        /usr/bin/rsync -az --delete "$HOME/.codex/$dir/" "${DEST}codex-${dir//_/-}/"
    fi
done
echo "$(date '+%Y-%m-%d %H:%M:%S') done"
