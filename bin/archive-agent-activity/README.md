# archive-agent-activity

Pushes this machine's agent session data to a remote host on a schedule, so that host can report coding activity across machines:

- `~/.claude/projects/` → `<dest>/<machine>/projects/` (mirrored with `--delete`)
- `~/.codex/session_index.jsonl` → `<dest>/<machine>/` (if present)

## Setup

1. `cp archive-agent-activity.conf.example archive-agent-activity.conf` and fill it in (the `.conf` is gitignored).
2. Make sure this machine can SSH to the remote without a prompt (key in the remote's `authorized_keys`, host in `known_hosts`), and create `<dest>/<machine>/` on the remote.
3. Run `./archive-agent-activity.sh` once by hand to check it works.
4. Schedule it with launchd:
   ```bash
   cp archive-agent-activity.plist ~/Library/LaunchAgents/local.archive-agent-activity.plist
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.archive-agent-activity.plist
   ```

It runs every 30 minutes and at login. launchd is used rather than cron because cron silently skips runs while a laptop is asleep.

## Operating

- Log: `~/Library/Logs/archive-agent-activity.log`
- Run now: `launchctl kickstart gui/$(id -u)/local.archive-agent-activity`
- Status: `launchctl print gui/$(id -u)/local.archive-agent-activity | grep -E "state|last exit"`
- Uninstall: `launchctl bootout gui/$(id -u)/local.archive-agent-activity`
