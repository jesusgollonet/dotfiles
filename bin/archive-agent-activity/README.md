# archive-agent-activity

Pushes this machine's agent session data to a remote host on a schedule, so that host can report coding activity across machines:

- `~/.claude/projects/` → `<dest>/<machine>/projects/` (mirrored with `--delete`)
- `~/.codex/session_index.jsonl` → `<dest>/<machine>/` (if present)
- `~/.codex/sessions/` and `~/.codex/archived_sessions/` → `<dest>/<machine>/codex-sessions/` and `codex-archived-sessions/` (mirrored with `--delete`, if present)

## Setup

1. `cp archive-agent-activity.conf.example archive-agent-activity.conf` and fill it in (the `.conf` is gitignored).
2. Make sure this machine can SSH to the remote without a prompt, and create `<dest>/<machine>/` on the remote. With plain sshd that means a key in the remote's `authorized_keys`; with Tailscale SSH, see [Remote setup with Tailscale SSH](#remote-setup-with-tailscale-ssh).
3. Run `./archive-agent-activity.sh` once by hand to check it works.
4. Schedule it with launchd:
   ```bash
   cp archive-agent-activity.plist ~/Library/LaunchAgents/local.archive-agent-activity.plist
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.archive-agent-activity.plist
   ```

It runs every 30 minutes and at login. launchd is used rather than cron because cron silently skips runs while a laptop is asleep.

## Remote setup with Tailscale SSH

A Tailscale SSH `check` rule asks for browser re-approval every `checkPeriod`, and a background job can't give it, so pushes fail with `rsync: unexpected end of file`. Instead, push as a dedicated `archive` user that gets `accept`, and keep `check` for your own login.

On the remote (Linux):

```bash
sudo useradd --system --create-home archive
sudo install -d -o archive -g archive -m 755 /srv/remote-activity
```

Optionally lock `archive` to rsync only. Tailscale SSH ignores `authorized_keys`, so `command=`/`rrsync` doesn't apply. Use a login shell instead:

```bash
sudo tee /usr/local/bin/rsync-only-shell >/dev/null <<'EOF'
#!/bin/sh
# Login shell for the archive user: only rsync's server side may run.
case "$2" in
    "rsync --server "*) exec $2 ;;
esac
echo "rsync only" >&2
exit 1
EOF
sudo chmod 755 /usr/local/bin/rsync-only-shell
echo /usr/local/bin/rsync-only-shell | sudo tee -a /etc/shells
sudo chsh -s /usr/local/bin/rsync-only-shell archive
```

In the tailnet policy file, the two rules don't overlap on `users`, so their order doesn't matter:

```jsonc
"ssh": [
  { "action": "check",  "src": ["autogroup:member"], "dst": ["autogroup:self"], "users": ["<your-remote-user>"], "checkPeriod": "12h" },
  { "action": "accept", "src": ["<your-tailnet-login>"], "dst": ["autogroup:self"], "users": ["archive"] }
]
```

Then set `PUSH_ACTIVITY_DEST=archive@<host>:/srv/remote-activity` and check that `ssh archive@<host> true` is refused while a push goes through without a prompt.

## Operating

- Log: `~/Library/Logs/archive-agent-activity.log`
- Run now: `launchctl kickstart gui/$(id -u)/local.archive-agent-activity`
- Status: `launchctl print gui/$(id -u)/local.archive-agent-activity | grep -E "state|last exit"`
- Uninstall: `launchctl bootout gui/$(id -u)/local.archive-agent-activity`
