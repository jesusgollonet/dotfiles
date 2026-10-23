# Dotfiles

## Docs
- [Vim](vim.md) - plugins, keybindings, and shortcuts

## How to install
- clone this repo
- move to `~/.dotfiles` (paths are currently hardcoded)
```bash

# (from the repo)
brew bundle 

cd ~

# symlink dotflies

ln -s ~/.dotfiles/zsh/zshrc .zshrc

ln -s ~/.dotfiles/zsh/zshenv .zshenv

ln -s ~/.dotfiles/git/gitconfig .gitconfig

ln -s ~/.dotfiles/tmux/tmux.conf .tmux.conf

# install vim-plug then all vim plugins

curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

ln -s ~/.dotfiles/vim/vimrc .vimrc

vim -c PlugInstall
```

## Local config
Identity, work paths and secrets stay out of the repo, in untracked files that are loaded if present:
- `~/.gitconfig.local` — `[user]` name/email, `includeIf` for work dirs
- `~/.zshrc.local` — env vars (e.g. `NTFY_TOPIC`) and machine-specific functions
- `~/.vimrc.local` — vim settings, e.g. `g:dotfiles_tree_root_markers` for the F3 tree
- `~/.vim/secrets.vim` — vim-only secrets

## ttf (time to first)
`bin/ttf` jumps to a project's tmux session, or creates it, starts the dev server and opens the browser once the server prints a URL.
- `ttf <project>`: attach or switch (`ttf` alone uses the current dir, unknown names fall back to zoxide like `zt`)
- `ttf list`: projects and running sessions
- `ttf open <project> --no-server | --no-browser | --detach`

Project roots are kept out of the repo, in `~/.config/ttf/roots` (one dir per line) or `$TTF_ROOTS` (colon-separated).
Sessions use the same names as `tnn`/`zt`, and `.tmux.project` still sets the layout. It can also set `TTF_SERVER="..."` (or `TTF_SERVER=""` for none); otherwise `npm run dev` runs when `package.json` has a dev script.

`raycast/ttf` is the Raycast front end: `cd raycast/ttf && npm install && npm run dev` once to import it into Raycast.

## agent-status
`bin/agent-status` keeps track of what each coding agent is doing, so you can kick one off in a worktree, switch away and still know what it's up to and whether it needs you. The agents' own hooks report three states: ● working, ? needs you (a permission prompt), ✓ done. The summary is the first line of the last real prompt (short replies like "yes" keep the old one), and `agent-status name "<text>"` pins your own.

Where it shows up:
- tmux: next to each window name, in the pane border, and as one dot per agent on the right of the status line (every session, so you see an agent waiting elsewhere)
- Raycast: the ttf extension's Agents command lists them by project, Enter jumps to the pane
- notifications on ? and ✓: a Mac notification (click to jump) unless you're looking at that pane, and `ntfy.sh/$NTFY_TOPIC` when the Mac has been idle for 5 min (`AGENT_STATUS_PHONE_IDLE`, in seconds; 0 = always, -1 = never)
- `agent-status list` in a terminal

State lives in `~/.local/state/ttf/agents/`, one JSON file per tmux pane, and is dropped when the pane or the agent session ends. Needs `jq`.

Claude Code, in `~/.claude/settings.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "~/.dotfiles/bin/agent-status claude" }] }],
    "PostToolUse": [{ "matcher": "*", "hooks": [{ "type": "command", "command": "~/.dotfiles/bin/agent-status claude" }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "~/.dotfiles/bin/agent-status claude" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "~/.dotfiles/bin/agent-status claude" }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "~/.dotfiles/bin/agent-status claude" }] }]
  }
}
```

Codex, in `~/.codex/config.toml` (absolute path, Codex doesn't expand `~`). Codex only reports finished turns, so its agents go straight to ✓:
```toml
notify = ["/Users/<you>/.dotfiles/bin/agent-status", "codex"]
```
